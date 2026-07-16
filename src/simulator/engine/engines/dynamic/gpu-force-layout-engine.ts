import { IPosition } from '../../../../common';
import { ISimulationNode, ISimulationGraph, ISimulationIds, SimulatorEventType } from '../../../shared';
import { copyObject, isObjectEqual } from '../../../../utils/object.utils';
import {
  IEngineSettingsUpdate,
  IForceLayoutOptions,
  DEFAULT_FORCE_LAYOUT_OPTIONS,
  LayoutType,
  getManyBodyMaxDistance,
} from '../../shared';
import { BaseLayoutEngine } from '../base-layout-engine';
import { compileShader, ShaderType } from '../../../../utils/shaders.utils';
import forceVertSource from '../../shaders/force/force.vert';
import forceFragSource from '../../shaders/force/force.frag';
import { OrbError } from '../../../../exceptions';
import { buildQuadTree } from '../../utils/quadtree-builder';
import { buildAdjacency, IAdjacencyResult } from '../../utils/adjacency-builder';

const MAX_SIMULATION_STEPS = 500;
const CHUNK_SIZE = 1;

export class GPUForceLayoutEngine extends BaseLayoutEngine {
  private readonly _gl: WebGL2RenderingContext;

  private _settings: IForceLayoutOptions;
  private _initialSettings: IForceLayoutOptions | undefined;

  private _isStabilizing = false;
  private _isDragging = false;
  private _dragLoopRunning = false;
  private _pendingRestart = false;
  private _simulationGeneration = 0;

  private _currentAlpha = 0;
  private _currentStep = 0;
  private _totalSteps = 0;

  private _dragAlpha = 0;
  private _dragNeedsReheat = false;

  private _dirtyNodes: Set<number> = new Set();

  private _forceProgram: WebGLProgram | null = null;
  private _quadBuffer: WebGLBuffer | null = null;
  private _quadVAO: WebGLVertexArrayObject | null = null;

  private _stateTexA: WebGLTexture | null = null;
  private _stateTexB: WebGLTexture | null = null;
  private _fixedTex: WebGLTexture | null = null;
  private _fboA: WebGLFramebuffer | null = null;
  private _fboB: WebGLFramebuffer | null = null;
  private _texWidth = 0;

  private _treeDataTexture: WebGLTexture | null = null;
  private _treeChildrenTexture: WebGLTexture | null = null;
  private _treeGeometryTexture: WebGLTexture | null = null;
  private _adjOffsetsTexture: WebGLTexture | null = null;
  private _adjEdgesTexture: WebGLTexture | null = null;

  private _cachedAdjacency: IAdjacencyResult | null = null;
  private _treeTexWidth = 1;
  private _treeNodeCount = 0;

  private _pingPong = true;

  private _uniforms: Record<string, WebGLUniformLocation | null> = {};

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
    this._cachedAdjacency = null;

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
    this._cachedAdjacency = null;

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
    this._cachedAdjacency = null;
  }

  activateSimulation() {
    if (this._settings.isPhysicsEnabled) {
      this._unpinNodes();
    } else {
      this._pinNodes();
    }

    if (this._isStabilizing) {
      this._pendingRestart = true;
      return;
    }

    this._ensurePositions();
    this._uploadDataToGPU();
    if (!this._cachedAdjacency) {
      this._buildAndUploadAdjacency();
    }

    this._startSimulationLoop();
  }

  stopSimulation() {
    if (this._isStabilizing) {
      this._cancelSimulation = true;
    }
    // Don't set flag when nothing is running — it would linger and block future simulations
  }

  startDragNode() {
    this._isDragging = true;

    // Stop the full simulation if running — drag uses its own lightweight loop
    if (this._isStabilizing) {
      this._cancelSimulation = true;
    }

    if (this._settings.isPhysicsEnabled) {
      this._startDragLoop();
    }
  }

  dragNode(nodeId: number, position: IPosition) {
    const nodeIndex = this._nodeIndexByNodeId[nodeId];
    const node = this._nodes[nodeIndex];
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

    this._dirtyNodes.add(nodeIndex);
    this._dragNeedsReheat = true;

    this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
  }

  endDragNode(nodeId: number) {
    this._isDragging = false;

    const node = this._nodes[this._nodeIndexByNodeId[nodeId]];
    if (node && this._settings.isPhysicsEnabled) {
      this._unpinNode(node);
      const nodeIndex = this._nodeIndexByNodeId[nodeId];
      this._dirtyNodes.add(nodeIndex);
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
    if (!gl) {
      return;
    }

    gl.deleteBuffer(this._quadBuffer);
    gl.deleteVertexArray(this._quadVAO);
    gl.deleteProgram(this._forceProgram);
    gl.deleteTexture(this._stateTexA);
    gl.deleteTexture(this._stateTexB);
    gl.deleteTexture(this._fixedTex);
    gl.deleteTexture(this._treeDataTexture);
    gl.deleteTexture(this._treeChildrenTexture);
    gl.deleteTexture(this._treeGeometryTexture);
    gl.deleteTexture(this._adjOffsetsTexture);
    gl.deleteTexture(this._adjEdgesTexture);
    gl.deleteFramebuffer(this._fboA);
    gl.deleteFramebuffer(this._fboB);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  reheat() {
    const alphaSettings = this._settings.alpha;

    this._currentAlpha = alphaSettings.alpha;
    this._totalSteps = Math.min(
      MAX_SIMULATION_STEPS,
      Math.ceil(Math.log(alphaSettings.alphaMin) / Math.log(1 - alphaSettings.alphaDecay)),
    );
    this._currentStep = 0;

    if (this._isStabilizing) {
      return;
    }

    this._ensurePositions();
    this._uploadDataToGPU();
    if (!this._cachedAdjacency) {
      this._buildAndUploadAdjacency();
    }
    this._startSimulationLoop();
  }

  private _runSimulation(): void {
    if (this._isStabilizing || this._cancelSimulation) {
      return;
    }

    this._ensurePositions();
    this._uploadDataToGPU();
    this._buildAndUploadAdjacency();
    this._startSimulationLoop();
  }

  private _startDragLoop(): void {
    if (this._dragLoopRunning) {
      return;
    }
    this._dragLoopRunning = true;

    const alphaDecay = this._settings.alpha.alphaDecay;
    const alphaMin = this._settings.alpha.alphaMin;

    this._dragAlpha = 0.3;
    this._dragNeedsReheat = false;

    const tick = () => {
      if (!this._isDragging) {
        this._dragLoopRunning = false;
        return;
      }

      if (this._dragNeedsReheat) {
        this._dragAlpha = 0.3;
        this._dragNeedsReheat = false;
      }

      this._dragAlpha += (0 - this._dragAlpha) * alphaDecay;

      if (this._dragAlpha < alphaMin) {
        requestAnimationFrame(tick);
        return;
      }

      this._readbackFromGPU();
      this._flushDirtyNodes();
      this._buildAndUploadQuadTree();

      this._simulateGPUStep(this._dragAlpha);

      this._readbackFromGPU();
      this._applyCentering();

      this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  private _startSimulationLoop(): void {
    if (this._isStabilizing || this._cancelSimulation) {
      return;
    }

    this.emit(SimulatorEventType.SIMULATION_START, undefined);
    this._isStabilizing = true;
    this._pendingRestart = false;
    const generation = ++this._simulationGeneration;

    const alphaSettings = this._settings.alpha;
    const alphaMin = alphaSettings.alphaMin;
    const alphaDecay = alphaSettings.alphaDecay;

    this._currentAlpha = alphaSettings.alpha;
    this._totalSteps = Math.min(MAX_SIMULATION_STEPS, Math.ceil(Math.log(alphaMin) / Math.log(1 - alphaDecay)));
    this._currentStep = 0;

    let lastProgress = -1;

    const runChunk = () => {
      if (generation !== this._simulationGeneration) {
        return;
      }

      if (this._cancelSimulation) {
        this._isStabilizing = false;
        this._cancelSimulation = false;
        this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
        return;
      }

      this._readbackFromGPU();

      if (this._pendingRestart) {
        this._isStabilizing = false;
        this._pendingRestart = false;
        this._ensurePositions();
        this._uploadDataToGPU();
        if (!this._cachedAdjacency) {
          this._buildAndUploadAdjacency();
        }
        this._startSimulationLoop();
        return;
      }

      this._flushDirtyNodes();
      this._buildAndUploadQuadTree();

      const end = Math.min(this._currentStep + CHUNK_SIZE, this._totalSteps);

      for (; this._currentStep < end; this._currentStep++) {
        this._currentAlpha += (alphaSettings.alphaTarget - this._currentAlpha) * alphaDecay;
        if (this._currentAlpha < alphaMin || this._cancelSimulation) {
          this._currentStep = this._totalSteps;
          break;
        }
        this._simulateGPUStep(this._currentAlpha);
      }

      this._readbackFromGPU();
      this._applyCentering();

      const currentProgress = Math.round((this._currentStep * 100) / this._totalSteps);
      if (currentProgress > lastProgress) {
        lastProgress = currentProgress;
        this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges,
          progress: currentProgress / 100,
        });
      }

      if (this._currentStep < this._totalSteps && !this._cancelSimulation) {
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

    this._scheduleNext(runChunk);
  }

  private _ensurePositions(): void {
    const linkDist = this._settings.links?.distance ?? 50;
    const spread = linkDist * Math.sqrt(this._nodes.length);
    for (const node of this._nodes) {
      if (node.x === undefined || node.x === null) {
        node.x = (Math.random() - 0.5) * spread;
      }
      if (node.y === undefined || node.y === null) {
        node.y = (Math.random() - 0.5) * spread;
      }
    }
  }

  private _applyCentering(): void {
    const c = this._settings.centering;
    if (!c) {
      return;
    }
    const N = this._nodes.length;
    if (N === 0) {
      return;
    }
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < N; i++) {
      sx += this._nodes[i].x ?? 0;
      sy += this._nodes[i].y ?? 0;
    }
    const dx = (sx / N - c.x) * c.strength;
    const dy = (sy / N - c.y) * c.strength;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
      return;
    }
    for (let i = 0; i < N; i++) {
      const node = this._nodes[i];
      // Don't shift fixed/dragged nodes — their position must stay at fx/fy
      if (node.fx !== null && node.fx !== undefined) {
        continue;
      }
      node.x = (node.x ?? 0) - dx;
      node.y = (node.y ?? 0) - dy;
    }

    this._syncStateToGPU();
  }

  private _syncStateToGPU(): void {
    const N = this._nodes.length;
    if (N === 0) {
      return;
    }

    const texSize = this._texWidth * this._texWidth;
    const stateData = new Float32Array(texSize * 4);

    for (let i = 0; i < N; i++) {
      const node = this._nodes[i];
      const off = i * 4;
      stateData[off] = node.x ?? 0;
      stateData[off + 1] = node.y ?? 0;
      stateData[off + 2] = node.vx ?? 0;
      stateData[off + 3] = node.vy ?? 0;
    }

    this._uploadTexture(this._stateTexA!, stateData, this._texWidth);
    this._uploadTexture(this._stateTexB!, stateData, this._texWidth);
    this._pingPong = true;
  }

  private _flushDirtyNodes(): void {
    if (this._dirtyNodes.size === 0) {
      return;
    }

    const gl = this._gl;

    for (const nodeIndex of this._dirtyNodes) {
      const node = this._nodes[nodeIndex];
      if (!node) {
        continue;
      }

      const col = nodeIndex % this._texWidth;
      const row = Math.floor(nodeIndex / this._texWidth);

      const statePixel = new Float32Array([node.x ?? 0, node.y ?? 0, node.vx ?? 0, node.vy ?? 0]);

      gl.bindTexture(gl.TEXTURE_2D, this._stateTexA);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, col, row, 1, 1, gl.RGBA, gl.FLOAT, statePixel);
      gl.bindTexture(gl.TEXTURE_2D, this._stateTexB);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, col, row, 1, 1, gl.RGBA, gl.FLOAT, statePixel);

      const fixedPixel = new Float32Array([
        node.fx !== null && node.fx !== undefined ? 1.0 : 0.0,
        node.fx ?? node.x ?? 0,
        node.fy ?? node.y ?? 0,
        0.0,
      ]);

      gl.bindTexture(gl.TEXTURE_2D, this._fixedTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, col, row, 1, 1, gl.RGBA, gl.FLOAT, fixedPixel);
    }

    this._dirtyNodes.clear();
  }

  private _buildAndUploadQuadTree(): void {
    const N = this._nodes.length;
    if (N === 0) {
      return;
    }

    const strength = this._settings.manyBody?.strength ?? -100;

    let positions: { x: number; y: number }[] = this._nodes as { x: number; y: number }[];
    if (this._settings.manyBody?.edgeMidpointRepulsion) {
      const edgeMidpoints = this._getEdgeMidpoints();
      if (edgeMidpoints.length > 0) {
        positions = positions.concat(edgeMidpoints);
      }
    }

    const tree = buildQuadTree(positions, strength);

    this._uploadTexture(this._treeDataTexture!, tree.treeData, tree.texWidth);
    this._uploadTexture(this._treeChildrenTexture!, tree.treeChildren, tree.texWidth);
    this._uploadTexture(this._treeGeometryTexture!, tree.treeGeometry, tree.texWidth);

    this._treeTexWidth = tree.texWidth;
    this._treeNodeCount = tree.nodeCount;
  }

  private _getEdgeMidpoints(): { x: number; y: number }[] {
    const midpoints: { x: number; y: number }[] = [];
    for (let i = 0; i < this._edges.length; i++) {
      const edge = this._edges[i];
      const srcId = typeof edge.source === 'object' ? (edge.source as ISimulationNode).id : (edge.source as number);
      const tgtId = typeof edge.target === 'object' ? (edge.target as ISimulationNode).id : (edge.target as number);
      const srcIdx = this._nodeIndexByNodeId[srcId];
      const tgtIdx = this._nodeIndexByNodeId[tgtId];
      if (srcIdx === undefined || tgtIdx === undefined) {
        continue;
      }
      const src = this._nodes[srcIdx];
      const tgt = this._nodes[tgtIdx];
      midpoints.push({
        x: ((src.x ?? 0) + (tgt.x ?? 0)) * 0.5,
        y: ((src.y ?? 0) + (tgt.y ?? 0)) * 0.5,
      });
    }
    return midpoints;
  }

  private _buildAndUploadAdjacency(): void {
    const N = this._nodes.length;
    if (N === 0) {
      return;
    }

    const linkDist = this._settings.links?.distance ?? 50;
    const adj = buildAdjacency(this._nodes, this._edges, linkDist, undefined);
    this._cachedAdjacency = adj;

    this._uploadTexture(this._adjOffsetsTexture!, adj.offsets, adj.offsetsTexWidth);
    this._uploadTexture(this._adjEdgesTexture!, adj.edges, adj.edgesTexWidth);
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
    this._cachedAdjacency = null;
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
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new OrbError(`Failed to link force program: ${info}`);
    }

    this._cacheUniformLocations(program);

    this._quadBuffer = gl.createBuffer();
    const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    this._quadVAO = gl.createVertexArray();
    gl.bindVertexArray(this._quadVAO);
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this._stateTexA = gl.createTexture();
    this._stateTexB = gl.createTexture();
    this._fixedTex = gl.createTexture();
    this._treeDataTexture = gl.createTexture();
    this._treeChildrenTexture = gl.createTexture();
    this._treeGeometryTexture = gl.createTexture();
    this._adjOffsetsTexture = gl.createTexture();
    this._adjEdgesTexture = gl.createTexture();

    this._fboA = gl.createFramebuffer();
    this._fboB = gl.createFramebuffer();
  }

  private _cacheUniformLocations(program: WebGLProgram): void {
    const gl = this._gl;
    const names = [
      'uState',
      'uFixed',
      'uTreeData',
      'uTreeChildren',
      'uTreeGeometry',
      'uAdjOffsets',
      'uAdjEdges',
      'uNodeCount',
      'uTexWidth',
      'uAlpha',
      'uDamping',
      'uManyBodyStrength',
      'uTheta2',
      'uDistanceMin2',
      'uDistanceMax2',
      'uTreeNodeCount',
      'uTreeTexWidth',
      'uAdjOffsetsTexWidth',
      'uAdjEdgesTexWidth',
      'uCenter',
      'uCenterStrength',
      'uCollisionRadius',
      'uCollisionStrength',
      'uForceXTarget',
      'uForceXStrength',
      'uForceYTarget',
      'uForceYStrength',
      'uHasManyBody',
      'uHasLinks',
      'uHasCentering',
      'uHasCollision',
      'uHasPositioning',
    ];
    for (const name of names) {
      this._uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  private _uploadDataToGPU(): void {
    const gl = this._gl;
    const N = this._nodes.length;

    this._texWidth = Math.max(1, Math.ceil(Math.sqrt(N)));
    const texSize = this._texWidth * this._texWidth;

    const stateData = new Float32Array(texSize * 4);
    const fixedData = new Float32Array(texSize * 4);

    for (let i = 0; i < N; i++) {
      const node = this._nodes[i];
      const off = i * 4;
      stateData[off] = node.x ?? 0;
      stateData[off + 1] = node.y ?? 0;
      stateData[off + 2] = node.vx ?? 0;
      stateData[off + 3] = node.vy ?? 0;

      fixedData[off] = node.fx !== null && node.fx !== undefined ? 1.0 : 0.0;
      fixedData[off + 1] = node.fx ?? node.x ?? 0;
      fixedData[off + 2] = node.fy ?? node.y ?? 0;
      fixedData[off + 3] = 0.0;
    }

    this._uploadTexture(this._stateTexA!, stateData, this._texWidth);
    this._uploadTexture(this._stateTexB!, stateData, this._texWidth);
    this._uploadTexture(this._fixedTex!, fixedData, this._texWidth);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fboA);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._stateTexA, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._fboB);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._stateTexB, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this._pingPong = true;
  }

  private _uploadTexture(texture: WebGLTexture, data: Float32Array, texWidth: number): void {
    const gl = this._gl;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texWidth, texWidth, 0, gl.RGBA, gl.FLOAT, data);
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

    const u = this._uniforms;

    gl.uniform1i(u['uNodeCount'], N);
    gl.uniform1i(u['uTexWidth'], this._texWidth);
    gl.uniform1f(u['uAlpha'], alpha);
    gl.uniform1f(u['uDamping'], 0.6);

    const hasManyBody = this._settings.manyBody !== null && this._settings.manyBody !== undefined;
    gl.uniform1f(u['uHasManyBody'], hasManyBody ? 1.0 : 0.0);
    if (hasManyBody) {
      const mb = this._settings.manyBody!;
      gl.uniform1f(u['uManyBodyStrength'], mb.strength);
      const theta = mb.theta;
      gl.uniform1f(u['uTheta2'], theta * theta);
      gl.uniform1f(u['uDistanceMin2'], mb.distanceMin * mb.distanceMin);
      const dMax = mb.distanceMax > 0 ? mb.distanceMax : getManyBodyMaxDistance(this._settings.links?.distance ?? 50);
      gl.uniform1f(u['uDistanceMax2'], dMax * dMax);
      gl.uniform1i(u['uTreeNodeCount'], this._treeNodeCount);
      gl.uniform1i(u['uTreeTexWidth'], this._treeTexWidth);
    }

    const hasLinks = this._cachedAdjacency !== null && this._edges.length > 0;
    gl.uniform1f(u['uHasLinks'], hasLinks ? 1.0 : 0.0);
    if (hasLinks) {
      gl.uniform1i(u['uAdjOffsetsTexWidth'], this._cachedAdjacency!.offsetsTexWidth);
      gl.uniform1i(u['uAdjEdgesTexWidth'], this._cachedAdjacency!.edgesTexWidth);
    }

    gl.uniform1f(u['uHasCentering'], 0.0);

    const hasCollision = this._settings.collision !== null && this._settings.collision !== undefined;
    gl.uniform1f(u['uHasCollision'], hasCollision ? 1.0 : 0.0);
    if (hasCollision) {
      gl.uniform1f(u['uCollisionRadius'], this._settings.collision!.radius);
      gl.uniform1f(u['uCollisionStrength'], this._settings.collision!.strength);
    }

    const hasPositioning = this._settings.positioning !== null && this._settings.positioning !== undefined;
    gl.uniform1f(u['uHasPositioning'], hasPositioning ? 1.0 : 0.0);
    if (hasPositioning) {
      const pos = this._settings.positioning!;
      gl.uniform1f(u['uForceXTarget'], pos.forceX?.x ?? 0);
      gl.uniform1f(u['uForceXStrength'], pos.forceX?.strength ?? 0);
      gl.uniform1f(u['uForceYTarget'], pos.forceY?.y ?? 0);
      gl.uniform1f(u['uForceYStrength'], pos.forceY?.strength ?? 0);
    }

    const readStateTex = this._pingPong ? this._stateTexA : this._stateTexB;
    const writeFBO = this._pingPong ? this._fboB : this._fboA;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readStateTex);
    gl.uniform1i(u['uState'], 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this._fixedTex);
    gl.uniform1i(u['uFixed'], 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this._treeDataTexture);
    gl.uniform1i(u['uTreeData'], 2);

    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this._treeChildrenTexture);
    gl.uniform1i(u['uTreeChildren'], 3);

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this._adjOffsetsTexture);
    gl.uniform1i(u['uAdjOffsets'], 4);

    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this._adjEdgesTexture);
    gl.uniform1i(u['uAdjEdges'], 5);

    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this._treeGeometryTexture);
    gl.uniform1i(u['uTreeGeometry'], 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO);
    gl.viewport(0, 0, this._texWidth, this._texWidth);

    gl.bindVertexArray(this._quadVAO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this._pingPong = !this._pingPong;
  }

  private _readbackFromGPU(): void {
    const gl = this._gl;
    const N = this._nodes.length;
    if (N === 0) {
      return;
    }

    const readFBO = this._pingPong ? this._fboA : this._fboB;
    const texSize = this._texWidth * this._texWidth;
    const data = new Float32Array(texSize * 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, readFBO);
    gl.readPixels(0, 0, this._texWidth, this._texWidth, gl.RGBA, gl.FLOAT, data);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    for (let i = 0; i < N; i++) {
      const node = this._nodes[i];
      const off = i * 4;
      node.x = data[off];
      node.y = data[off + 1];
      node.vx = data[off + 2];
      node.vy = data[off + 3];
    }
  }
}
