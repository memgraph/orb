import {
  forceCenter,
  forceCollide,
  forceLink,
  ForceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  Simulation,
  SimulationLinkDatum,
} from 'd3-force';
import { IPosition } from '../../../common';
import {
  ISimulationNode,
  ISimulationEdge,
  ISimulationGraph,
  ISimulationIds,
  SimulatorEvents,
  SimulatorEventType,
} from '../../shared';
import { Emitter } from '../../../utils/emitter.utils';
import { isObjectEqual, copyObject } from '../../../utils/object.utils';
import { ILayoutEngine, IEngineSettingsUpdate, IForceLayoutSettings, DEFAULT_FORCE_LAYOUT_SETTINGS } from '../shared';

interface IRunSimulationOptions {
  isUpdatingSettings: boolean;
}

export class ForceLayoutEngine extends Emitter<SimulatorEvents> implements ILayoutEngine {
  private _linkForce!: ForceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>;
  private _simulation!: Simulation<ISimulationNode, undefined>;
  private _settings: IForceLayoutSettings;

  private _edges: ISimulationEdge[] = [];
  private _nodes: ISimulationNode[] = [];
  private _nodeIndexByNodeId: Record<number, number> = {};

  private _isDragging = false;
  private _isStabilizing = false;

  private _initialSettings: IForceLayoutSettings | undefined;

  constructor() {
    super();
    this._settings = this._resetSettings();
    this.clearData();
  }

  setSettings(settings: IEngineSettingsUpdate) {
    const forceSettings = settings as Partial<IForceLayoutSettings>;

    if (!this._initialSettings) {
      this._initialSettings = Object.assign(copyObject(DEFAULT_FORCE_LAYOUT_SETTINGS), forceSettings);
    }

    const previousSettings = copyObject(this._settings);
    Object.assign(this._settings, forceSettings);

    if (isObjectEqual(this._settings, previousSettings)) {
      return;
    }

    this._applySettingsToSimulation(forceSettings);
    this.emit(SimulatorEventType.SETTINGS_UPDATE, { settings: this._settings });

    const hasPhysicsBeenDisabled = previousSettings.isPhysicsEnabled && !forceSettings.isPhysicsEnabled;

    if (hasPhysicsBeenDisabled) {
      this._simulation.stop();
    } else if (this._settings.isSimulatingOnSettingsUpdate) {
      this.activateSimulation();
    }
  }

  setupData(data: ISimulationGraph) {
    this.clearData();
    this._initializeNewData(data);

    if (this._settings.isSimulatingOnDataUpdate) {
      this._updateSimulationData();
      this._runSimulation();
    }
  }

  mergeData(data: ISimulationGraph) {
    this._initializeNewData(data);

    if (!this._settings.isPhysicsEnabled) {
      this._pinNodes();
    }

    if (this._settings.isSimulatingOnDataUpdate) {
      this._updateSimulationData();
      this.activateSimulation();
    }
  }

  updateData(data: ISimulationGraph) {
    data.nodes = this._fixAndStickDefinedNodes(data.nodes);

    const newNodeIds = new Set(data.nodes.map((node) => node.id));
    const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
    const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === undefined);

    this._nodes = [...oldNodes, ...newNodes];
    this._setNodeIndexByNodeId();
    this._edges = data.edges;

    if (this._settings.isSimulatingOnSettingsUpdate) {
      this._updateSimulationData();
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
    this._setNodeIndexByNodeId();

    if (this._settings.isSimulatingOnDataUpdate) {
      this._updateSimulationData();
      this.activateSimulation();
    }
  }

  patchData(data: Partial<ISimulationGraph>) {
    if (data.nodes) {
      data.nodes = this._fixAndStickDefinedNodes(data.nodes);
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
      this._edges = this._edges.concat(data.edges);
    }
  }

  clearData() {
    this._nodes = [];
    this._edges = [];
    this._setNodeIndexByNodeId();
    this._resetSimulation();
  }

  activateSimulation() {
    if (this._settings.isPhysicsEnabled) {
      this._unpinNodes();
    } else {
      this._pinNodes();
    }
    this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).restart();
  }

  stopSimulation() {
    this._simulation.stop();
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

    if (this._settings.isPhysicsEnabled) {
      this._simulation.alphaTarget(0);
    }
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
      this._stickNode(this._nodes[i]);
    }
  }

  releaseNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }
    for (let i = 0; i < nodes.length; i++) {
      this._unstickNode(this._nodes[i]);
    }

    if (this._settings.isSimulatingOnUnstick) {
      this.activateSimulation();
    }
  }

  terminate() {
    this.removeAllListeners();
  }

  private _resetSettings(): IForceLayoutSettings {
    return Object.assign(copyObject(DEFAULT_FORCE_LAYOUT_SETTINGS), this._initialSettings);
  }

  // TODO(Alex): Listeners memory leak (D3 force research)
  private _resetSimulation() {
    this._linkForce = forceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>(this._edges).id(
      (node) => node.id,
    );
    this._simulation = forceSimulation(this._nodes).force('link', this._linkForce).stop();

    this._applySettingsToSimulation(this._settings);

    this._simulation.on('tick', () => {
      this.emit(SimulatorEventType.SIMULATION_STEP, { nodes: this._nodes, edges: this._edges });
    });

    this._simulation.on('end', () => {
      this._isDragging = false;
      this._isStabilizing = false;
      this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });

      if (!this._settings.isPhysicsEnabled) {
        this._pinNodes();
      }
    });
  }

  private _runSimulation(options?: IRunSimulationOptions) {
    if (this._isStabilizing) {
      return;
    }
    if (this._settings.isPhysicsEnabled || options?.isUpdatingSettings) {
      this._unpinNodes();
    }

    this.emit(SimulatorEventType.SIMULATION_START, undefined);

    this._isStabilizing = true;
    this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).stop();

    const totalSimulationSteps = Math.ceil(
      Math.log(this._settings.alpha.alphaMin) / Math.log(1 - this._settings.alpha.alphaDecay),
    );

    let lastProgress = -1;
    for (let i = 0; i < totalSimulationSteps; i++) {
      const currentProgress = Math.round((i * 100) / totalSimulationSteps);
      if (currentProgress > lastProgress) {
        lastProgress = currentProgress;
        this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges,
          progress: currentProgress / 100,
        });
      }
      this._simulation.tick();
    }

    if (!this._settings.isPhysicsEnabled) {
      this._pinNodes();
    }

    this._isStabilizing = false;
    this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
  }

  private _updateSimulationData() {
    this._simulation.nodes(this._nodes);
    this._linkForce.links(this._edges);
  }

  private _initializeNewData(data: Partial<ISimulationGraph>) {
    if (data.nodes) {
      data.nodes = this._fixAndStickDefinedNodes(data.nodes);
      for (let i = 0; i < data.nodes.length; i += 1) {
        const nodeId = data.nodes[i].id;

        if (this._nodeIndexByNodeId[nodeId]) {
          this._nodeIndexByNodeId[nodeId] = i;
        } else {
          this._nodes.push(data.nodes[i]);
        }
      }
    } else {
      this._nodes = [];
    }
    if (data.edges) {
      this._edges = this._edges.concat(data.edges);
    } else {
      this._edges = [];
    }
    this._setNodeIndexByNodeId();
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

  private _fixAndStickDefinedNodes(nodes: ISimulationNode[]): ISimulationNode[] {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].x !== null && nodes[i].x !== undefined) {
        nodes[i].fx = nodes[i].x;
        nodes[i].sx = nodes[i].x;
      }
      if (nodes[i].y !== null && nodes[i].y !== undefined) {
        nodes[i].fy = nodes[i].y;
        nodes[i].sy = nodes[i].y;
      }
    }
    return nodes;
  }

  private _applySettingsToSimulation(settings: Partial<IForceLayoutSettings>) {
    if (settings.alpha) {
      this._simulation
        .alpha(settings.alpha.alpha)
        .alphaMin(settings.alpha.alphaMin)
        .alphaDecay(settings.alpha.alphaDecay)
        .alphaTarget(settings.alpha.alphaTarget);
    }
    if (settings.links) {
      this._linkForce.distance(settings.links.distance).iterations(settings.links.iterations);
    }
    if (settings.collision) {
      const collision = forceCollide()
        .radius(settings.collision.radius)
        .strength(settings.collision.strength)
        .iterations(settings.collision.iterations);
      this._simulation.force('collide', collision);
    }
    if (settings.collision === null) {
      this._simulation.force('collide', null);
    }
    if (settings.manyBody) {
      const manyBody = forceManyBody()
        .strength(settings.manyBody.strength)
        .theta(settings.manyBody.theta)
        .distanceMin(settings.manyBody.distanceMin)
        .distanceMax(settings.manyBody.distanceMax);
      this._simulation.force('charge', manyBody);
    }
    if (settings.manyBody === null) {
      this._simulation.force('charge', null);
    }
    if (settings.positioning?.forceY) {
      const positioningForceX = forceX(settings.positioning.forceX.x).strength(settings.positioning.forceX.strength);
      this._simulation.force('x', positioningForceX);
    }
    if (settings.positioning?.forceX === null) {
      this._simulation.force('x', null);
    }
    if (settings.positioning?.forceY) {
      const positioningForceY = forceY(settings.positioning.forceY.y).strength(settings.positioning.forceY.strength);
      this._simulation.force('y', positioningForceY);
    }
    if (settings.positioning?.forceY === null) {
      this._simulation.force('y', null);
    }
    if (settings.centering) {
      const centering = forceCenter(settings.centering.x, settings.centering.y).strength(settings.centering.strength);
      this._simulation.force('center', centering);
    }
    if (settings.centering === null) {
      this._simulation.force('center', null);
    }
  }

  private _setNodeIndexByNodeId() {
    this._nodeIndexByNodeId = {};
    for (let i = 0; i < this._nodes.length; i++) {
      this._nodeIndexByNodeId[this._nodes[i].id] = i;
    }
  }
}
