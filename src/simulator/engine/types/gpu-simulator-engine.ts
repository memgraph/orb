import { IPosition } from '../../../common';
import { ISimulationGraph, ISimulationIds, ISimulationNode } from '../../shared';
import { Emitter } from '../../../utils/emitter.utils';
import { copyObject } from '../../../utils/object.utils';
import {
  ISimulatorEngine,
  ISimulatorEngineSettingsConfig,
  ISimulatorEngineSettingsUpdate,
  SimulatorEngineEventType,
  SimulatorEngineEvents,
} from '../shared';
import { DEFAULT_SETTINGS } from './d3-simulator-engine';
import { compileShader, ShaderType } from '../../../utils/shaders.utils';
import forceVertSource from '../shaders/force/force.vert';
import forceFragSource from '../shaders/force/force.frag';
import copyVertSource from '../shaders/copy/copy.vert';
import copyFragSource from '../shaders/copy/copy.frag';
import { OrbError } from '../../../exceptions';

/**
 * GPU-accelerated simulator engine using WebGL2 transform feedback.
 *
 * Phase 1: Skeleton that falls back to CPU-based Euler integration.
 * Phase 2: N-body repulsion via transform feedback (O(n^2) pairwise on GPU).
 * Phase 3: Full GPU simulation with link forces via adjacency textures.
 */
export class GPUSimulatorEngine extends Emitter<SimulatorEngineEvents> implements ISimulatorEngine {
  private readonly _gl: WebGL2RenderingContext;

  private _settings: ISimulatorEngineSettingsConfig;
  private _initialSettings: ISimulatorEngineSettingsConfig | undefined;

  private _nodes: ISimulationNode[] = [];
  private _edges: { id: number; source: number | ISimulationNode; target: number | ISimulationNode }[] = [];
  private _nodeIndexByNodeId: Record<number, number> = {};

  private _isStabilizing = false;
  private _isDragging = false;

  private _bufferA: WebGLBuffer | null = null;
  private _bufferB: WebGLBuffer | null = null;
  private _transformFeedback: WebGLTransformFeedback | null = null;
  private _vaoAtoB: WebGLVertexArrayObject | null = null;
  private _vaoBtoA: WebGLVertexArrayObject | null = null;

  private _forceProgram: WebGLProgram | null = null;
  private _copyProgram: WebGLProgram | null = null;
  private _positionTexture: WebGLTexture | null = null;
  private _copyFBO: WebGLFramebuffer | null = null;
  private _copyVaoA: WebGLVertexArrayObject | null = null;
  private _copyVaoB: WebGLVertexArrayObject | null = null;
  private _texWidth = 0;

  private _pingPong = true;

  private static readonly FLOATS_PER_NODE = 7;

  constructor(settings?: ISimulatorEngineSettingsConfig) {
    super();

    if (settings !== undefined) {
      this._initialSettings = Object.assign(copyObject(DEFAULT_SETTINGS), settings);
    }

    this._settings = this.resetSettings();

    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      throw new OrbError('Failed to create WebGL context.');
    }
    this._gl = gl;

    this._initGPU();
  }

  getSettings(): ISimulatorEngineSettingsConfig {
    return copyObject(this._settings);
  }

  setSettings(settings: ISimulatorEngineSettingsUpdate): void {
    const previousSettings = this.getSettings();

    if (!this._initialSettings) {
      this._initialSettings = Object.assign(copyObject(DEFAULT_SETTINGS), settings);
    }

    Object.assign(this._settings, settings);
    this.emit(SimulatorEngineEventType.SETTINGS_UPDATE, { settings: this._settings });

    const hasPhysicsBeenDisabled = previousSettings.isPhysicsEnabled && !settings.isPhysicsEnabled;
    if (hasPhysicsBeenDisabled) {
      this.stopSimulation();
    } else if (this._settings.isSimulatingOnSettingsUpdate) {
      this.activateSimulation();
    }
  }

  resetSettings(): ISimulatorEngineSettingsConfig {
    return Object.assign(copyObject(DEFAULT_SETTINGS), this._initialSettings);
  }

  setupData(data: ISimulationGraph): void {
    this.clearData();
    this._ingestData(data);

    if (this._settings.isSimulatingOnDataUpdate) {
      this._runSimulation();
    }
  }

  mergeData(data: Partial<ISimulationGraph>): void {
    this._ingestData(data);

    if (this._settings.isSimulatingOnDataUpdate) {
      this.activateSimulation();
    }
  }

  updateData(data: ISimulationGraph): void {
    const newNodeIds = new Set(data.nodes.map((n) => n.id));
    const oldNodes = this._nodes.filter((n) => newNodeIds.has(n.id));
    const newNodes = data.nodes.filter((n) => this._nodeIndexByNodeId[n.id] === undefined);

    this._nodes = [...oldNodes, ...newNodes];
    this._edges = data.edges as any;
    this._rebuildIndex();

    if (this._settings.isSimulatingOnSettingsUpdate) {
      this.activateSimulation();
    }
  }

  deleteData(data: Partial<ISimulationIds>): void {
    const nodeIds = new Set(data.nodeIds);
    const edgeIds = new Set(data.edgeIds);
    this._nodes = this._nodes.filter((n) => !nodeIds.has(n.id));
    this._edges = this._edges.filter((e) => !edgeIds.has(e.id));
    this._rebuildIndex();

    if (this._settings.isSimulatingOnDataUpdate) {
      this.activateSimulation();
    }
  }

  patchData(data: Partial<ISimulationGraph>): void {
    if (data.nodes) {
      for (const node of data.nodes) {
        const idx = this._nodeIndexByNodeId[node.id];
        if (idx !== undefined) {
          this._nodes[idx] = node;
        } else {
          this._nodes.push(node);
        }
      }
      this._rebuildIndex();
    }
    if (data.edges) {
      this._edges = this._edges.concat(data.edges as any);
    }
  }

  clearData(): void {
    const nodes = this._nodes;
    const edges = this._edges;
    this._nodes = [];
    this._edges = [];
    this._nodeIndexByNodeId = {};
    this.emit(SimulatorEngineEventType.DATA_CLEARED, {
      nodes,
      edges: edges as any,
    });
  }

  activateSimulation(): void {
    if (!this._settings.isPhysicsEnabled) {
      this.fixNodes();
    }
    this._runSimulation();
  }

  stopSimulation(): void {
    this._isStabilizing = false;
  }

  resetSimulation(): void {
    this.emit(SimulatorEngineEventType.SIMULATION_RESET, {
      nodes: this._nodes,
      edges: this._edges as any,
    });
  }

  startDragNode(): void {
    this._isDragging = true;
  }

  dragNode(data: { id: number } & IPosition): void {
    const node = this._nodes[this._nodeIndexByNodeId[data.id]];
    if (!node) {
      return;
    }

    if (!this._isDragging) {
      this.startDragNode();
    }

    node.fx = data.x;
    node.fy = data.y;

    if (!this._settings.isPhysicsEnabled) {
      node.x = data.x;
      node.y = data.y;
    }

    this.emit(SimulatorEngineEventType.NODE_DRAG, {
      nodes: this._nodes,
      edges: this._edges as any,
    });
  }

  endDragNode(data: { id: number }): void {
    this._isDragging = false;
    const node = this._nodes[this._nodeIndexByNodeId[data.id]];
    if (node && this._settings.isPhysicsEnabled) {
      this.unfixNode(node);
    }
  }

  fixNodes(nodes?: ISimulationNode[]): void {
    const targets = nodes ?? this._nodes;
    for (const node of targets) {
      this.fixNode(node);
    }
  }

  unfixNodes(nodes?: ISimulationNode[]): void {
    const targets = nodes ?? this._nodes;
    for (const node of targets) {
      this.unfixNode(node);
    }
  }

  stickNodes(nodes?: ISimulationNode[]): void {
    const targets = nodes ?? this._nodes;
    for (const node of targets) {
      node.sx = node.x;
      node.fx = node.x;
      node.sy = node.y;
      node.fy = node.y;
    }
  }

  unstickNodes(nodes?: ISimulationNode[]): void {
    const targets = nodes ?? this._nodes;
    for (const node of targets) {
      node.sx = null;
      node.sy = null;
      if (this._settings.isPhysicsEnabled) {
        node.fx = null;
        node.fy = null;
      }
    }
    if (this._settings.isSimulatingOnUnstick) {
      this.activateSimulation();
    }
  }

  // --- GPU simulation via WebGL2 transform feedback ---

  private _runSimulation(): void {
    if (this._isStabilizing) {
      return;
    }

    this._isStabilizing = true;
    this.emit(SimulatorEngineEventType.SIMULATION_START, undefined);

    // Assign random initial positions to nodes that don't have one
    for (const node of this._nodes) {
      if (node.x === undefined || node.x === null) {
        node.x = (Math.random() - 0.5) * this._nodes.length;
      }
      if (node.y === undefined || node.y === null) {
        node.y = (Math.random() - 0.5) * this._nodes.length;
      }
    }

    // Upload current node data to GPU buffers + position texture
    this._uploadDataToGPU();

    const alphaSettings = this._settings.alpha;
    let alpha = alphaSettings.alpha;
    const alphaMin = alphaSettings.alphaMin;
    const alphaDecay = alphaSettings.alphaDecay;

    const totalSteps = Math.ceil(Math.log(alphaMin) / Math.log(1 - alphaDecay));

    let lastProgressBucket = -1;
    for (let step = 0; step < totalSteps; step++) {
      alpha += (alphaSettings.alphaTarget - alpha) * alphaDecay;
      if (alpha < alphaMin) {
        break;
      }

      this._simulateGPUStep(alpha);

      const progressBucket = Math.floor((step * 100) / totalSteps);
      if (progressBucket > lastProgressBucket) {
        lastProgressBucket = progressBucket;

        this._readbackFromGPU();

        this.emit(SimulatorEngineEventType.SIMULATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges as any,
          progress: progressBucket / 10,
        });
      }
    }

    this._readbackFromGPU();

    if (!this._settings.isPhysicsEnabled) {
      this.fixNodes();
    }

    this._isStabilizing = false;
    this.emit(SimulatorEngineEventType.SIMULATION_END, {
      nodes: this._nodes,
      edges: this._edges as any,
    });
  }

  private fixNode(node: ISimulationNode): void {
    if (node.sx === null || node.sx === undefined) {
      node.fx = node.x;
    }
    if (node.sy === null || node.sy === undefined) {
      node.fy = node.y;
    }
  }

  private unfixNode(node: ISimulationNode): void {
    if (node.sx === null || node.sx === undefined) {
      node.fx = null;
    }
    if (node.sy === null || node.sy === undefined) {
      node.fy = null;
    }
  }

  private _ingestData(data: Partial<ISimulationGraph>): void {
    if (data.nodes) {
      for (const node of data.nodes) {
        if (node.x !== null && node.x !== undefined) {
          node.fx = node.x;
          node.sx = node.x;
        }
        if (node.y !== null && node.y !== undefined) {
          node.fy = node.y;
          node.sy = node.y;
        }
        this._nodes.push(node);
      }
    }
    if (data.edges) {
      this._edges = this._edges.concat(data.edges as any);
    }
    this._rebuildIndex();
  }

  private _rebuildIndex(): void {
    this._nodeIndexByNodeId = {};
    for (let i = 0; i < this._nodes.length; i++) {
      this._nodeIndexByNodeId[this._nodes[i].id] = i;
    }
  }

  private _initGPU(): void {
    const gl = this._gl;

    gl.getExtension('EXT_color_buffer_float');

    const vs = compileShader(gl, forceVertSource, ShaderType.VERTEX);
    const fs = compileShader(gl, forceFragSource, ShaderType.FRAGMENT);
    const program = gl.createProgram();
    if (!program) {
      throw new OrbError('Failed to create program.');
    }
    this._forceProgram = program;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);

    gl.transformFeedbackVaryings(program, ['vPosition', 'vVelocity', 'vFixed', 'vFixedPos'], gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new OrbError(`Failed to link force program: ${info}`);
    }

    this._bufferA = gl.createBuffer();
    this._bufferB = gl.createBuffer();

    this._transformFeedback = gl.createTransformFeedback();

    this._vaoAtoB = this._createVAO(this._bufferA);
    this._vaoBtoA = this._createVAO(this._bufferB);

    this._initCopyProgram();
  }

  private _createVAO(buffer: WebGLBuffer | null): WebGLVertexArrayObject {
    const gl = this._gl;
    const program = this._forceProgram;
    if (!program) {
      throw new OrbError('Force program not initialized.');
    }

    const vao = gl.createVertexArray();
    if (!vao) {
      throw new OrbError('Failed to create vertex array object.');
    }

    const STRIDE = GPUSimulatorEngine.FLOATS_PER_NODE * 4;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    // aPosition (vec2) — offset 0
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, STRIDE, 0);

    // aVelocity (vec2) — offset 2*4 = 8
    const velLoc = gl.getAttribLocation(program, 'aVelocity');
    gl.enableVertexAttribArray(velLoc);
    gl.vertexAttribPointer(velLoc, 2, gl.FLOAT, false, STRIDE, 2 * 4);

    // aFixed (float) — offset 4*4 = 16
    const fixedLoc = gl.getAttribLocation(program, 'aFixed');
    gl.enableVertexAttribArray(fixedLoc);
    gl.vertexAttribPointer(fixedLoc, 1, gl.FLOAT, false, STRIDE, 4 * 4);

    // aFixedPos (vec2) — offset 5*4 = 20
    const fixedPosLoc = gl.getAttribLocation(program, 'aFixedPos');
    gl.enableVertexAttribArray(fixedPosLoc);
    gl.vertexAttribPointer(fixedPosLoc, 2, gl.FLOAT, false, STRIDE, 5 * 4);

    gl.bindVertexArray(null);
    return vao;
  }

  private _initCopyProgram(): void {
    const gl = this._gl;

    const vs = compileShader(gl, copyVertSource, ShaderType.VERTEX);
    const fs = compileShader(gl, copyFragSource, ShaderType.FRAGMENT);
    const program = gl.createProgram();
    if (!program) {
      throw new OrbError('Failed to create copy program.');
    }
    this._copyProgram = program;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new OrbError(`Failed to link copy program: ${info}`);
    }

    this._copyFBO = gl.createFramebuffer();

    this._copyVaoA = this._createCopyVAO(this._bufferA);
    this._copyVaoB = this._createCopyVAO(this._bufferB);
  }

  private _createCopyVAO(buffer: WebGLBuffer | null): WebGLVertexArrayObject {
    const gl = this._gl;
    const program = this._copyProgram;
    if (!program) {
      throw new OrbError('Copy program not initialized.');
    }

    const vao = gl.createVertexArray();
    if (!vao) {
      throw new OrbError('Failed to create copy VAO.');
    }

    const STRIDE = GPUSimulatorEngine.FLOATS_PER_NODE * 4;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, STRIDE, 0);

    gl.bindVertexArray(null);
    return vao;
  }

  private _uploadDataToGPU(): void {
    const gl = this._gl;
    const N = this._nodes.length;
    const FPN = GPUSimulatorEngine.FLOATS_PER_NODE;

    const data = new Float32Array(N * FPN);

    for (let i = 0; i < N; i++) {
      const node = this._nodes[i];
      const off = i * FPN;
      data[off] = node.x ?? 0;
      data[off + 1] = node.y ?? 0;
      data[off + 2] = node.vx ?? 0;
      data[off + 3] = node.vy ?? 0;
      data[off + 4] = node.fx !== null && node.fx !== undefined ? 1.0 : 0.0;
      data[off + 5] = node.fx ?? node.x ?? 0;
      data[off + 6] = node.fy ?? node.y ?? 0;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this._bufferA);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_COPY);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._bufferB);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_COPY);

    // Reset ping-pong state so the first tick reads from bufferA
    this._pingPong = true;

    this._updatePositionTexture();
  }

  private _updatePositionTexture(): void {
    const gl = this._gl;
    const N = this._nodes.length;
    this._texWidth = Math.ceil(Math.sqrt(N));
    const texSize = this._texWidth * this._texWidth;

    const texData = new Float32Array(texSize * 4);
    for (let i = 0; i < N; i++) {
      texData[i * 4] = this._nodes[i].x ?? 0;
      texData[i * 4 + 1] = this._nodes[i].y ?? 0;
    }

    if (!this._positionTexture) {
      this._positionTexture = gl.createTexture();
    }

    gl.bindTexture(gl.TEXTURE_2D, this._positionTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this._texWidth, this._texWidth, 0, gl.RGBA, gl.FLOAT, texData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private _simulateGPUStep(alpha: number): void {
    const gl = this._gl;
    const program = this._forceProgram;
    if (!program) {
      throw new OrbError('Force program not initialized.');
    }
    const N = this._nodes.length;
    if (N === 0) {
      return;
    }

    gl.useProgram(program);

    // Set uniforms
    gl.uniform1i(gl.getUniformLocation(program, 'uNodeCount'), N);
    gl.uniform1i(gl.getUniformLocation(program, 'uTexWidth'), this._texWidth);
    gl.uniform1f(gl.getUniformLocation(program, 'uAlpha'), alpha);
    gl.uniform1f(gl.getUniformLocation(program, 'uRepulsionStrength'), this._settings.manyBody?.strength ?? -30);
    gl.uniform2f(
      gl.getUniformLocation(program, 'uCenter'),
      this._settings.centering?.x ?? 0,
      this._settings.centering?.y ?? 0,
    );
    gl.uniform1f(gl.getUniformLocation(program, 'uCenterStrength'), this._settings.centering?.strength ?? 1);
    gl.uniform1f(gl.getUniformLocation(program, 'uDamping'), 0.6);

    // Bind position texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._positionTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uPositions'), 0);

    // Ping-pong: read from one buffer, write to the other
    const readVAO = this._pingPong ? this._vaoAtoB : this._vaoBtoA;
    const writeBuffer = this._pingPong ? this._bufferB : this._bufferA;

    gl.bindVertexArray(readVAO);

    // Bind transform feedback to the write buffer
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this._transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, writeBuffer);

    // Disable rasterization — we only want the transform feedback output
    gl.enable(gl.RASTERIZER_DISCARD);

    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.endTransformFeedback();

    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);

    // Swap for next tick
    this._pingPong = !this._pingPong;

    // Sync position texture from the output buffer for the next tick
    this._updatePositionTextureFromBuffer();
  }

  /**
   * GPU-only position texture update via render-to-texture.
   * Renders N points into the position texture FBO — each point writes its
   * position to the texel corresponding to its vertex ID. No CPU readback.
   */
  private _updatePositionTextureFromBuffer(): void {
    const gl = this._gl;
    const program = this._copyProgram;
    if (!program) {
      throw new OrbError('Copy program not initialized.');
    }
    const N = this._nodes.length;
    if (N === 0) {
      return;
    }

    // After the swap, the "read" side holds the latest data
    const copyVao = this._pingPong ? this._copyVaoA : this._copyVaoB;

    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, 'uTexWidth'), this._texWidth);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._copyFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._positionTexture, 0);

    gl.viewport(0, 0, this._texWidth, this._texWidth);

    gl.bindVertexArray(copyVao);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.bindVertexArray(null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Reads final positions/velocities from the latest GPU buffer back to CPU nodes.
   * Called once after the simulation loop completes.
   */
  private _readbackFromGPU(): void {
    const gl = this._gl;
    const N = this._nodes.length;
    const FPN = GPUSimulatorEngine.FLOATS_PER_NODE;
    const data = new Float32Array(N * FPN);

    // After the loop, _pingPong points to the next "read" buffer = latest data
    const latestBuffer = this._pingPong ? this._bufferA : this._bufferB;
    gl.bindBuffer(gl.ARRAY_BUFFER, latestBuffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data);

    for (let i = 0; i < N; i++) {
      const node = this._nodes[i];
      const off = i * FPN;
      node.x = data[off];
      node.y = data[off + 1];
      node.vx = data[off + 2];
      node.vy = data[off + 3];
    }
  }
}
