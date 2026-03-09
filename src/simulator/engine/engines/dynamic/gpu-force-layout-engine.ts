import { IPosition } from '../../../../common';
import { ISimulationNode, ISimulationGraph, ISimulationIds, SimulatorEventType } from '../../../shared';
import { copyObject, isObjectEqual } from '../../../../utils/object.utils';
import { IEngineSettingsUpdate, IForceLayoutOptions, DEFAULT_FORCE_LAYOUT_OPTIONS, LayoutType } from '../../shared';
import { BaseLayoutEngine } from '../base-layout-engine';
import { compileShader, ShaderType } from '../../../../utils/shaders.utils';
import forceVertSource from '../../shaders/force/force.vert';
import forceFragSource from '../../shaders/force/force.frag';
import copyVertSource from '../../shaders/copy/copy.vert';
import copyFragSource from '../../shaders/copy/copy.frag';
import { OrbError } from '../../../../exceptions';

const MAX_SIMULATION_STEPS = 500;
const CHUNK_SIZE = 500;

/**
 * GPU-accelerated force layout engine using WebGL2 transform feedback.
 *
 * Phase 1: Skeleton that falls back to CPU-based Euler integration.
 * Phase 2: N-body repulsion via transform feedback (O(n^2) pairwise on GPU).
 * Phase 3: Full GPU simulation with link forces via adjacency textures.
 */
export class GPUForceLayoutEngine extends BaseLayoutEngine {
  private readonly _gl: WebGL2RenderingContext;

  private _settings: IForceLayoutOptions;
  private _initialSettings: IForceLayoutOptions | undefined;

  private _isStabilizing = false;
  private _isDragging = false;

  // WebGL resources
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

  readonly type: LayoutType = 'force';

  constructor(options?: IForceLayoutOptions) {
    super();
    this._settings = {
      ...DEFAULT_FORCE_LAYOUT_OPTIONS,
      ...options,
    };

    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      throw new OrbError('Failed to create WebGL2 context for GPU force layout engine.');
    }
    this._gl = gl;

    this._initGPU();
    this.clearData();
  }

  setSettings(settings: IEngineSettingsUpdate) {
    const forceSettings = settings as Partial<IForceLayoutOptions>;

    if (!this._initialSettings) {
      this._initialSettings = Object.assign(copyObject(DEFAULT_FORCE_LAYOUT_OPTIONS), forceSettings);
    }

    const previousSettings = copyObject(this._settings);
    Object.assign(this._settings, forceSettings);

    if (isObjectEqual(this._settings, previousSettings)) {
      return;
    }

    this.emit(SimulatorEventType.SETTINGS_UPDATE, {
      settings: { type: 'force', options: this._settings },
    });

    const hasPhysicsBeenDisabled = previousSettings.isPhysicsEnabled && !forceSettings.isPhysicsEnabled;

    if (hasPhysicsBeenDisabled) {
      this.stopSimulation();
    } else if (this._settings.isSimulatingOnSettingsUpdate && this._nodes.length > 0) {
      this.activateSimulation();
    }
  }

  setupData(data: ISimulationGraph) {
    this.clearData();
    this._initializeNewData(data);

    if (this._settings.isSimulatingOnDataUpdate) {
      this._runSimulation();
    }
  }

  mergeData(data: ISimulationGraph) {
    this._initializeNewData(data);

    if (!this._settings.isPhysicsEnabled) {
      this._pinNodes();
    }

    if (this._settings.isSimulatingOnDataUpdate) {
      this.activateSimulation();
    }
  }

  updateData(data: ISimulationGraph) {
    const newNodeIds = new Set(data.nodes.map((node) => node.id));
    const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
    const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === undefined);

    this._nodes = [...oldNodes, ...newNodes];
    this._rebuildNodeIndex();
    this._edges = data.edges;

    if (this._settings.isSimulatingOnSettingsUpdate) {
      this.activateSimulation();
    }
  }

  deleteData(data: Partial<ISimulationIds>) {
    if (data.nodeIds) {
      const nodeIds = new Set(data.nodeIds);
      this._nodes = this._nodes.filter((node) => !nodeIds.has(node.id));
    }
    if (data.edgeIds) {
      const edgeIds = new Set(data.edgeIds);
      this._edges = this._edges.filter((edge) => !edgeIds.has(edge.id));
    }
    this._rebuildNodeIndex();

    if (this._settings.isSimulatingOnDataUpdate) {
      this.activateSimulation();
    }
  }

  patchData(data: Partial<ISimulationGraph>) {
    if (data.nodes) {
      const nodeIds: { [id: number]: number } = {};

      for (let i = 0; i < this._nodes.length; i++) {
        nodeIds[this._nodes[i].id] = i;
      }

      for (let i = 0; i < data.nodes.length; i += 1) {
        const nodeId: number = data.nodes[i].id;

        if (nodeId in nodeIds) {
          const index = nodeIds[nodeId];
          this._nodeIndexByNodeId[nodeId] = index;
          this._nodes[index] = data.nodes[i];
        } else {
          this._nodes.push(data.nodes[i]);
        }
      }
    }

    if (data.edges) {
      const edgeIds: { [id: number]: number } = {};
      for (let i = 0; i < this._edges.length; i++) {
        edgeIds[this._edges[i].id] = i;
      }
      for (let i = 0; i < data.edges.length; i++) {
        const edgeId = data.edges[i].id;
        if (edgeId in edgeIds) {
          this._edges[edgeIds[edgeId]] = data.edges[i];
        } else {
          this._edges.push(data.edges[i]);
        }
      }
    }
  }

  clearData() {
    this._nodes = [];
    this._edges = [];
    this._rebuildNodeIndex();
  }

  activateSimulation() {
    if (this._settings.isPhysicsEnabled) {
      this._unpinNodes();
    } else {
      this._pinNodes();
    }
    this._runSimulation();
  }

  stopSimulation() {
    this._cancelSimulation = true;
  }

  startDragNode() {
    this._isDragging = true;

    if (!this._isStabilizing && this._settings.isPhysicsEnabled) {
      this.activateSimulation();
    }
  }

  dragNode(nodeId: number, position: IPosition) {
    const node = this._nodes[this._nodeIndexByNodeId[nodeId]];
    if (!node) {
      return;
    }

    if (!this._isDragging) {
      this.startDragNode();
    }

    node.fx = position.x;
    node.fy = position.y;

    if (!this._settings.isPhysicsEnabled) {
      node.x = position.x;
      node.y = position.y;
    }

    this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
  }

  endDragNode(nodeId: number) {
    this._isDragging = false;

    const node = this._nodes[this._nodeIndexByNodeId[nodeId]];
    if (node && this._settings.isPhysicsEnabled) {
      this._unpinNode(node);
    }
  }

  fixNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }
    for (let i = 0; i < nodes.length; i++) {
      this._stickNode(nodes[i]);
    }
  }

  releaseNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }
    for (let i = 0; i < nodes.length; i++) {
      this._unstickNode(nodes[i]);
    }

    if (this._settings.isSimulatingOnUnstick && this._nodes.length > 0) {
      this.activateSimulation();
    }
  }

  terminate(): void {
    super.terminate();

    const gl = this._gl;
    if (gl) {
      gl.deleteBuffer(this._bufferA);
      gl.deleteBuffer(this._bufferB);
      gl.deleteTransformFeedback(this._transformFeedback);
      gl.deleteVertexArray(this._vaoAtoB);
      gl.deleteVertexArray(this._vaoBtoA);
      gl.deleteProgram(this._forceProgram);
      gl.deleteProgram(this._copyProgram);
      gl.deleteTexture(this._positionTexture);
      gl.deleteFramebuffer(this._copyFBO);
      gl.deleteVertexArray(this._copyVaoA);
      gl.deleteVertexArray(this._copyVaoB);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  private _runSimulation(): void {
    if (this._isStabilizing || this._cancelSimulation) {
      return;
    }

    this.emit(SimulatorEventType.SIMULATION_START, undefined);
    this._isStabilizing = true;

    // Assign random initial positions to nodes that don't have one
    for (const node of this._nodes) {
      if (node.x === undefined || node.x === null) {
        node.x = (Math.random() - 0.5) * this._nodes.length;
      }
      if (node.y === undefined || node.y === null) {
        node.y = (Math.random() - 0.5) * this._nodes.length;
      }
    }

    this._uploadDataToGPU();

    const alphaSettings = this._settings.alpha;
    let alpha = alphaSettings.alpha;
    const alphaMin = alphaSettings.alphaMin;
    const alphaDecay = alphaSettings.alphaDecay;

    const totalSteps = Math.min(MAX_SIMULATION_STEPS, Math.ceil(Math.log(alphaMin) / Math.log(1 - alphaDecay)));

    let lastProgress = -1;
    let step = 0;

    const runChunk = () => {
      if (this._cancelSimulation) {
        this._isStabilizing = false;
        this._cancelSimulation = false;
        return;
      }

      const end = Math.min(step + CHUNK_SIZE, totalSteps);

      for (; step < end; step++) {
        alpha += (alphaSettings.alphaTarget - alpha) * alphaDecay;
        if (alpha < alphaMin) {
          step = totalSteps;
          break;
        }
        this._simulateGPUStep(alpha);
      }

      // Readback once per chunk (minimizes expensive GPU→CPU transfer)
      this._readbackFromGPU();

      const currentProgress = Math.round((step * 100) / totalSteps);
      if (currentProgress > lastProgress) {
        lastProgress = currentProgress;
        this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges,
          progress: currentProgress / 100,
        });
      }

      if (step < totalSteps && !this._cancelSimulation) {
        this._scheduleNext(runChunk);
      } else {
        if (!this._settings.isPhysicsEnabled) {
          this._pinNodes();
        }

        this._isStabilizing = false;
        this._cancelSimulation = false;
        this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
      }
    };

    runChunk();
  }

  private _pinNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }
    for (let i = 0; i < nodes.length; i++) {
      this._pinNode(this._nodes[i]);
    }
  }

  private _unpinNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }
    for (let i = 0; i < nodes.length; i++) {
      this._unpinNode(this._nodes[i]);
    }
  }

  private _pinNode(node: ISimulationNode) {
    if (node.sx === null || node.sx === undefined) {
      node.fx = node.x;
    }
    if (node.sy === null || node.sy === undefined) {
      node.fy = node.y;
    }
  }

  private _unpinNode(node: ISimulationNode) {
    if (node.sx === null || node.sx === undefined) {
      node.fx = null;
    }
    if (node.sy === null || node.sy === undefined) {
      node.fy = null;
    }
  }

  private _stickNode(node: ISimulationNode) {
    node.sx = node.x;
    node.fx = node.x;
    node.sy = node.y;
    node.fy = node.y;
  }

  private _unstickNode(node: ISimulationNode) {
    node.sx = null;
    node.sy = null;

    if (this._settings.isPhysicsEnabled) {
      node.fx = null;
      node.fy = null;
    }
  }

  private _initializeNewData(data: Partial<ISimulationGraph>) {
    if (data.nodes) {
      for (let i = 0; i < data.nodes.length; i += 1) {
        const nodeId = data.nodes[i].id;

        if (this._nodeIndexByNodeId[nodeId] !== undefined) {
          this._nodeIndexByNodeId[nodeId] = i;
        } else {
          this._nodes.push(data.nodes[i]);
        }
      }
    } else {
      this._nodes = [];
    }

    if (data.edges) {
      const edgeIds: { [id: number]: number } = {};
      for (let i = 0; i < this._edges.length; i++) {
        edgeIds[this._edges[i].id] = i;
      }
      for (let i = 0; i < data.edges.length; i++) {
        const edgeId = data.edges[i].id;
        if (edgeId in edgeIds) {
          this._edges[edgeIds[edgeId]] = data.edges[i];
        } else {
          this._edges.push(data.edges[i]);
        }
      }
    } else {
      this._edges = [];
    }

    this._rebuildNodeIndex();
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

    const STRIDE = GPUForceLayoutEngine.FLOATS_PER_NODE * 4;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, STRIDE, 0);

    const velLoc = gl.getAttribLocation(program, 'aVelocity');
    gl.enableVertexAttribArray(velLoc);
    gl.vertexAttribPointer(velLoc, 2, gl.FLOAT, false, STRIDE, 2 * 4);

    const fixedLoc = gl.getAttribLocation(program, 'aFixed');
    gl.enableVertexAttribArray(fixedLoc);
    gl.vertexAttribPointer(fixedLoc, 1, gl.FLOAT, false, STRIDE, 4 * 4);

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

    const STRIDE = GPUForceLayoutEngine.FLOATS_PER_NODE * 4;

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
    const FPN = GPUForceLayoutEngine.FLOATS_PER_NODE;

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

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._positionTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'uPositions'), 0);

    const readVAO = this._pingPong ? this._vaoAtoB : this._vaoBtoA;
    const writeBuffer = this._pingPong ? this._bufferB : this._bufferA;

    gl.bindVertexArray(readVAO);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this._transformFeedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, writeBuffer);

    gl.enable(gl.RASTERIZER_DISCARD);

    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, N);
    gl.endTransformFeedback();

    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.bindVertexArray(null);

    this._pingPong = !this._pingPong;

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
   * Called once per chunk boundary to minimize expensive GPU→CPU transfers.
   */
  private _readbackFromGPU(): void {
    const gl = this._gl;
    const N = this._nodes.length;
    const FPN = GPUForceLayoutEngine.FLOATS_PER_NODE;
    const data = new Float32Array(N * FPN);

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
