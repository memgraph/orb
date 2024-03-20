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
import { IPosition } from '../../common';
import { ISimulationNode, ISimulationEdge, ISimulationGraph } from '../shared';
import { Emitter } from '../../utils/emitter.utils';
import { isObjectEqual, copyObject } from '../../utils/object.utils';

const MANY_BODY_MAX_DISTANCE_TO_LINK_DISTANCE_RATIO = 100;
const DEFAULT_LINK_DISTANCE = 50;

export enum D3SimulatorEngineEventType {
  SIMULATION_START = 'simulation-start',
  SIMULATION_PROGRESS = 'simulation-progress',
  SIMULATION_END = 'simulation-end',
  SIMULATION_TICK = 'simulation-tick',
  SIMULATION_RESET = 'simulation-reset',
  NODE_DRAG = 'node-drag',
  SETTINGS_UPDATE = 'settings-update',
  DATA_CLEARED = 'data-cleared',
}

export interface ID3SimulatorEngineSettingsAlpha {
  alpha: number;
  alphaMin: number;
  alphaDecay: number;
  alphaTarget: number;
}

export interface ID3SimulatorEngineSettingsCentering {
  x: number;
  y: number;
  strength: number;
}

export interface ID3SimulatorEngineSettingsCollision {
  radius: number;
  strength: number;
  iterations: number;
}

export interface ID3SimulatorEngineSettingsLinks {
  distance: number;
  strength?: number;
  iterations: number;
}

export interface ID3SimulatorEngineSettingsManyBody {
  strength: number;
  theta: number;
  distanceMin: number;
  distanceMax: number;
}

export interface ID3SimulatorEngineSettingsPositioning {
  forceX: {
    x: number;
    strength: number;
  };
  forceY: {
    y: number;
    strength: number;
  };
}

export interface ID3SimulatorEngineSettings {
  isSimulatingOnDataUpdate: boolean;
  isSimulatingOnSettingsUpdate: boolean;
  isSimulatingOnUnstick: boolean;
  isPhysicsEnabled: boolean;
  alpha: ID3SimulatorEngineSettingsAlpha;
  centering: ID3SimulatorEngineSettingsCentering | null;
  collision: ID3SimulatorEngineSettingsCollision | null;
  links: ID3SimulatorEngineSettingsLinks;
  manyBody: ID3SimulatorEngineSettingsManyBody | null;
  positioning: ID3SimulatorEngineSettingsPositioning | null;
}

export type ID3SimulatorEngineSettingsUpdate = Partial<ID3SimulatorEngineSettings>;

export const getManyBodyMaxDistance = (linkDistance: number) => {
  const distance = linkDistance > 0 ? linkDistance : 1;
  return distance * MANY_BODY_MAX_DISTANCE_TO_LINK_DISTANCE_RATIO;
};

export const DEFAULT_SETTINGS: ID3SimulatorEngineSettings = {
  isSimulatingOnDataUpdate: true,
  isSimulatingOnSettingsUpdate: true,
  isSimulatingOnUnstick: true,
  isPhysicsEnabled: false,
  alpha: {
    alpha: 1,
    alphaMin: 0.001,
    alphaDecay: 0.0228,
    alphaTarget: 0,
  },
  centering: {
    x: 0,
    y: 0,
    strength: 1,
  },
  collision: {
    radius: 15,
    strength: 1,
    iterations: 1,
  },
  links: {
    distance: DEFAULT_LINK_DISTANCE,
    strength: 1,
    iterations: 1,
  },
  manyBody: {
    strength: -100,
    theta: 0.9,
    distanceMin: 0,
    distanceMax: getManyBodyMaxDistance(DEFAULT_LINK_DISTANCE),
  },
  positioning: {
    forceX: {
      x: 0,
      strength: 0.1,
    },
    forceY: {
      y: 0,
      strength: 0.1,
    },
  },
};

export interface ID3SimulatorProgress {
  progress: number;
}

export interface ID3SimulatorNodeId {
  id: number;
}

export interface ID3SimulatorSettings {
  settings: ID3SimulatorEngineSettings;
}

interface IRunSimulationOptions {
  isUpdatingSettings: boolean;
}

export type D3SimulatorEvents = {
  [D3SimulatorEngineEventType.SIMULATION_START]: undefined;
  [D3SimulatorEngineEventType.SIMULATION_PROGRESS]: ISimulationGraph & ID3SimulatorProgress;
  [D3SimulatorEngineEventType.SIMULATION_END]: ISimulationGraph;
  [D3SimulatorEngineEventType.SIMULATION_TICK]: ISimulationGraph;
  [D3SimulatorEngineEventType.SIMULATION_RESET]: ISimulationGraph;
  [D3SimulatorEngineEventType.NODE_DRAG]: ISimulationGraph;
  [D3SimulatorEngineEventType.SETTINGS_UPDATE]: ID3SimulatorSettings;
  [D3SimulatorEngineEventType.DATA_CLEARED]: ISimulationGraph;
};

export class D3SimulatorEngine extends Emitter<D3SimulatorEvents> {
  protected _linkForce!: ForceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>;
  protected _simulation!: Simulation<ISimulationNode, undefined>;
  protected _settings: ID3SimulatorEngineSettings;

  protected _edges: ISimulationEdge[] = [];
  protected _nodes: ISimulationNode[] = [];
  protected _nodeIndexByNodeId: Record<number, number> = {};

  protected _isDragging = false;
  protected _isStabilizing = false;

  // These are settings provided during construction if they are specified,
  // or during the first call of setSettings if unspecified during construction.
  protected _initialSettings: ID3SimulatorEngineSettings | undefined;

  constructor(settings?: ID3SimulatorEngineSettings) {
    super();

    if (settings !== undefined) {
      this._initialSettings = Object.assign(copyObject(DEFAULT_SETTINGS), settings);
    }

    this._settings = this.resetSettings();
    this.clearData();
  }

  getSettings(): ID3SimulatorEngineSettings {
    return copyObject(this._settings);
  }

  /**
   * Applies the specified settings to the D3 simulator engine.
   *
   * @param {ID3SimulatorEngineSettingsUpdate} settings Partial D3 simulator engine settings (any property of settings)
   */
  setSettings(settings: ID3SimulatorEngineSettingsUpdate) {
    if (!this._initialSettings) {
      this._initialSettings = Object.assign(copyObject(DEFAULT_SETTINGS), settings);
    }

    const previousSettings = this.getSettings();
    Object.assign(this._settings, settings);

    if (isObjectEqual(this._settings, previousSettings)) {
      return;
    }

    this._applySettingsToSimulation(settings);
    this.emit(D3SimulatorEngineEventType.SETTINGS_UPDATE, { settings: this._settings });

    const hasPhysicsBeenDisabled = previousSettings.isPhysicsEnabled && !settings.isPhysicsEnabled;

    if (hasPhysicsBeenDisabled) {
      this._simulation.stop();
    } else if (this._settings.isSimulatingOnSettingsUpdate) {
      // this.runSimulation({ isUpdatingSettings: true });
      this.activateSimulation();
    }
  }

  /**
   * Restores simulator engine settings to the initial settings provided during construction.
   *
   * @return {ID3SimulatorEngineSettings} The default settings patched with the specified parameters in the
   * initial settings provided in the constructor or during the first settings update.
   */
  resetSettings(): ID3SimulatorEngineSettings {
    return Object.assign(copyObject(DEFAULT_SETTINGS), this._initialSettings);
  }

  startDragNode() {
    this._isDragging = true;

    if (!this._isStabilizing && this._settings.isPhysicsEnabled) {
      this.activateSimulation();
    }
  }

  dragNode(data: ID3SimulatorNodeId & IPosition) {
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

    // Notify the client that the node position changed.
    this.emit(D3SimulatorEngineEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
  }

  endDragNode(data: ID3SimulatorNodeId) {
    this._isDragging = false;

    if (this._settings.isPhysicsEnabled) {
      this._simulation.alphaTarget(0);
    }
    const node = this._nodes[this._nodeIndexByNodeId[data.id]];
    // TODO(dlozic): Add special behavior for sticky nodes that have been dragged
    if (node && this._settings.isPhysicsEnabled) {
      this.unfixNode(node);
    }
  }

  /**
   * Activates the simulation and "re-heats" the nodes so that they converge to a new layout.
   * This does not count as "stabilization" and won't emit any progress.
   */
  activateSimulation() {
    this.unfixNodes(); // If physics is disabled, the nodes get fixed in the callback from the initial setup (`simulation.on('end', () => {})`).
    this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).restart();
  }

  setupData(data: ISimulationGraph) {
    this.clearData();

    this._initializeNewData(data);

    if (this._settings.isSimulatingOnDataUpdate) {
      this._updateSimulationData();
      this._runSimulation();
    }
  }

  mergeData(data: Partial<ISimulationGraph>) {
    this._initializeNewData(data);

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
        const nodeId: any = data.nodes[i].id;

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

  updateData(data: ISimulationGraph) {
    data.nodes = this._fixAndStickDefinedNodes(data.nodes);

    // Keep existing nodes along with their (x, y, fx, fy) coordinates to avoid
    // rearranging the graph layout.
    // These nodes should not be reloaded into the array because the D3 simulation
    // will assign to them completely new coordinates, effectively restarting the animation.
    const newNodeIds = new Set(data.nodes.map((node) => node.id));

    // Keep old nodes that are present in the new data instead of reassigning them.
    const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
    const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === undefined);

    this._nodes = [...oldNodes, ...newNodes];
    this._setNodeIndexByNodeId();

    // Only keep new links and discard all old links.
    // Old links won't work as some discrepancies arise between the D3 index property
    // and Memgraph's `id` property which affects the source->target mapping.
    this._edges = data.edges;

    if (this._settings.isSimulatingOnSettingsUpdate) {
      this._updateSimulationData();
      this.activateSimulation();
    }
  }

  /**
   * Removes specified data from the simulation.
   *
   * @param {ISimulationGraph} data Nodes and edges that will be deleted
   */
  deleteData(data: Partial<{ nodeIds: number[] | undefined; edgeIds: number[] | undefined }>) {
    const nodeIds = new Set(data.nodeIds);
    this._nodes = this._nodes.filter((node) => !nodeIds.has(node.id));
    const edgeIds = new Set(data.edgeIds);
    this._edges = this._edges.filter((edge) => !edgeIds.has(edge.id));
    this._setNodeIndexByNodeId();
    this._updateSimulationData();
  }

  /**
   * Removes all internal and D3 simulation node and relationship data.
   */
  clearData() {
    const nodes = this._nodes;
    const edges = this._edges;
    this._nodes = [];
    this._edges = [];
    this._setNodeIndexByNodeId();
    this.resetSimulation();
    this.emit(D3SimulatorEngineEventType.DATA_CLEARED, { nodes: nodes, edges: edges });
  }

  /**
   * Updates the internal D3 simulation data with the current data.
   */
  private _updateSimulationData() {
    // Update simulation with new data.
    this._simulation.nodes(this._nodes);
    this._linkForce.links(this._edges);
  }

  /**
   * Resets the simulator engine by discarding all existing simulator data (nodes and edges),
   * and keeping the current simulator engine settings.
   */
  // TODO(Alex): Listeners memory leak (D3 force research)
  resetSimulation() {
    this._linkForce = forceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>(this._edges).id(
      (node) => node.id,
    );
    this._simulation = forceSimulation(this._nodes).force('link', this._linkForce).stop();

    this._applySettingsToSimulation(this._settings);

    this._simulation.on('tick', () => {
      this.emit(D3SimulatorEngineEventType.SIMULATION_TICK, { nodes: this._nodes, edges: this._edges });
    });

    this._simulation.on('end', () => {
      this._isDragging = false;
      this._isStabilizing = false;
      this.emit(D3SimulatorEngineEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });

      if (!this._settings.isPhysicsEnabled) {
        this.fixNodes();
      }
    });

    this.emit(D3SimulatorEngineEventType.SIMULATION_RESET, { nodes: this._nodes, edges: this._edges });
  }

  /**
   * Fixes all nodes by setting their `fx` and `fy` properties to `x` and `y`.
   * If no nodes are provided, this function fixes all nodes.
   *
   * @param {ISimulationNode[]} nodes Nodes that are going to be fixed. If undefined, all nodes get fixed.
   */
  fixNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }

    for (let i = 0; i < nodes.length; i++) {
      this.fixNode(this._nodes[i]);
    }
  }

  /**
   * Releases specified nodes.
   * If no nodes are provided, this function releases all nodes.
   *
   * @param {ISimulationNode[]} nodes Nodes that are going to be released. If undefined, all nodes get released.
   */
  unfixNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }

    for (let i = 0; i < nodes.length; i++) {
      this.unfixNode(this._nodes[i]);
    }
  }

  /**
   * Fixes a node by setting its `fx` and `fy` properties to `x` and `y`.
   * This function is called when disabling physics.
   *
   * @param {ISimulationNode} node Simulation node that is going to be fixed
   */
  fixNode(node: ISimulationNode) {
    if (node.sx === null || node.sx === undefined) {
      node.fx = node.x;
    }
    if (node.sy === null || node.sy === undefined) {
      node.fy = node.y;
    }
  }

  /**
   * Releases a node if it's not sticky by setting its `fx` and `fy` properties to `null`.
   * This function is called when enabling physics but the sticky property overpowers physics.
   *
   * @param {ISimulationNode} node Simulation node that is going to be released
   */
  unfixNode(node: ISimulationNode) {
    if (node.sx === null || node.sx === undefined) {
      node.fx = null;
    }
    if (node.sy === null || node.sy === undefined) {
      node.fy = null;
    }
  }

  /**
   * Sticks the specified nodes into place.
   * This overpowers any physics state and also sticks the node to their current positions.
   * If no nodes are provided, this function sticks all nodes.
   *
   * @param {ISimulationNode[]} nodes Nodes that are going to become sticky. If undefined, all nodes get sticked.
   */
  stickNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }

    for (let i = 0; i < nodes.length; i++) {
      this.stickNode(this._nodes[i]);
    }
  }

  /**
   * Removes the sticky properties from all specified nodes.
   * If physics is enabled, the nodes get unfixed as well.
   * If no nodes are provided, this function unsticks all nodes.
   *
   * @param {ISimulationNode[]} nodes Nodes that are going to be unsticked. If undefined, all nodes get unsticked.
   */
  unstickNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }

    for (let i = 0; i < nodes.length; i++) {
      this.unstickNode(this._nodes[i]);
    }

    if (this._settings.isSimulatingOnUnstick) {
      this.activateSimulation();
    }
  }

  /**
   * Sticks a node into place.
   * This function overpowers any physics state and also sticks the node to its current coordinates.
   *
   * @param {ISimulationNode} node Simulation node that is going to become sticky
   */
  stickNode(node: ISimulationNode) {
    node.sx = node.x;
    node.fx = node.x;
    node.sy = node.y;
    node.fy = node.y;
  }

  /**
   * Removes the sticky properties from the node.
   * If physics is enabled, the node gets released as well.
   *
   * @param {ISimulationNode} node Simulation node that gets unstuck
   */
  unstickNode(node: ISimulationNode) {
    node.sx = null;
    node.sy = null;

    if (this._settings.isPhysicsEnabled) {
      node.fx = null;
      node.fy = null;
    }
  }

  /**
   * Sticks all nodes thath have a defined position (x and y coordinates).
   * This function should be called when the user initially sets up or merges some data.
   * If the user provided nodes already have defined `x` **or** `y` properties, they are treated as _"sticky"_.
   * Only the specified axis gets immobilized.
   *
   * @param {ISimulationNode[]} nodes Graph nodes.
   * @return {ISimulationNodes[]} Graph nodes with attached `{fx, sx}`, and/or `{fy, sy}` coordinates.
   */
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

  /**
   * Applies the provided settings to the D3 simulation.
   *
   * @param {ID3SimulatorEngineSettingsUpdate} settings Simulator engine settings
   */
  private _applySettingsToSimulation(settings: ID3SimulatorEngineSettingsUpdate) {
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

  // This is a blocking action - the user will not be able to interact with the graph
  // during the simulation process.
  private _runSimulation(options?: IRunSimulationOptions) {
    if (this._isStabilizing) {
      return;
    }
    if (this._settings.isPhysicsEnabled || options?.isUpdatingSettings) {
      this.unfixNodes();
    }

    this.emit(D3SimulatorEngineEventType.SIMULATION_START, undefined);

    this._isStabilizing = true;
    this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).stop();

    const totalSimulationSteps = Math.ceil(
      Math.log(this._settings.alpha.alphaMin) / Math.log(1 - this._settings.alpha.alphaDecay),
    );

    let lastProgress = -1;
    for (let i = 0; i < totalSimulationSteps; i++) {
      const currentProgress = Math.round((i * 100) / totalSimulationSteps);
      // Emit progress maximum of 100 times (every percent)
      if (currentProgress > lastProgress) {
        lastProgress = currentProgress;
        this.emit(D3SimulatorEngineEventType.SIMULATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges,
          progress: currentProgress / 100,
        });
      }
      this._simulation.tick();
    }

    if (!this._settings.isPhysicsEnabled) {
      this.fixNodes();
    }

    this._isStabilizing = false;
    this.emit(D3SimulatorEngineEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
  }

  private _setNodeIndexByNodeId() {
    this._nodeIndexByNodeId = {};
    for (let i = 0; i < this._nodes.length; i++) {
      this._nodeIndexByNodeId[this._nodes[i].id] = i;
    }
  }
}
