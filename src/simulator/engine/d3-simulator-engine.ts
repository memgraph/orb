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
import { ISimulationNode, ISimulationEdge } from '../shared';
import { Emitter } from '../../utils/emitter.utils';
import { isObjectEqual, copyObject } from '../../utils/object.utils';

const MANY_BODY_MAX_DISTANCE_TO_LINK_DISTANCE_RATIO = 100;
const DEFAULT_LINK_DISTANCE = 30;

export enum D3SimulatorEngineEventType {
  TICK = 'tick',
  END = 'end',
  STABILIZATION_STARTED = 'stabilizationStarted',
  STABILIZATION_PROGRESS = 'stabilizationProgress',
  STABILIZATION_ENDED = 'stabilizationEnded',
  NODE_DRAGGED = 'nodeDragged',
  SETTINGS_UPDATED = 'settingsUpdated',
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
  isPhysicsEnabled: false,
  alpha: {
    alpha: 1,
    alphaMin: 0.001,
    alphaDecay: 0.0228,
    alphaTarget: 0.1,
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
    strength: undefined,
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

interface ID3SimulatorProgress {
  progress: number;
}

interface ID3SimulatorGraph {
  nodes: ISimulationNode[];
  edges: ISimulationEdge[];
}

interface ID3SimulatorNodeId {
  id: number;
}

interface ID3SimulatorSettings {
  settings: ID3SimulatorEngineSettings;
}

export class D3SimulatorEngine extends Emitter<{
  [D3SimulatorEngineEventType.TICK]: ID3SimulatorGraph;
  [D3SimulatorEngineEventType.END]: ID3SimulatorGraph;
  [D3SimulatorEngineEventType.STABILIZATION_STARTED]: undefined;
  [D3SimulatorEngineEventType.STABILIZATION_PROGRESS]: ID3SimulatorGraph & ID3SimulatorProgress;
  [D3SimulatorEngineEventType.STABILIZATION_ENDED]: ID3SimulatorGraph;
  [D3SimulatorEngineEventType.NODE_DRAGGED]: ID3SimulatorGraph;
  [D3SimulatorEngineEventType.SETTINGS_UPDATED]: ID3SimulatorSettings;
}> {
  protected readonly linkForce: ForceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>;
  protected readonly simulation: Simulation<ISimulationNode, undefined>;
  protected readonly settings: ID3SimulatorEngineSettings;

  protected _edges: ISimulationEdge[] = [];
  protected _nodes: ISimulationNode[] = [];
  protected _nodeIndexByNodeId: Record<number, number> = {};

  protected _isDragging = false;
  protected _isStabilizing = false;

  constructor(settings?: ID3SimulatorEngineSettings) {
    super();

    this.linkForce = forceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>(this._edges).id(
      (node) => node.id,
    );
    this.simulation = forceSimulation(this._nodes).force('link', this.linkForce).stop();

    this.settings = Object.assign(copyObject(DEFAULT_SETTINGS), settings);
    this.initSimulation(this.settings);

    this.simulation.on('tick', () => {
      this.emit(D3SimulatorEngineEventType.TICK, { nodes: this._nodes, edges: this._edges });
    });

    this.simulation.on('end', () => {
      this._isDragging = false;
      this._isStabilizing = false;
      this.emit(D3SimulatorEngineEventType.END, { nodes: this._nodes, edges: this._edges });
    });
  }

  getSettings(): ID3SimulatorEngineSettings {
    return copyObject(this.settings);
  }

  setSettings(settings: ID3SimulatorEngineSettingsUpdate) {
    const previousSettings = this.getSettings();
    Object.keys(settings).forEach((key) => {
      // @ts-ignore
      this.settings[key] = settings[key];
    });

    if (isObjectEqual(this.settings, previousSettings)) {
      return;
    }

    this.initSimulation(settings);
    this.emit(D3SimulatorEngineEventType.SETTINGS_UPDATED, { settings: this.settings });
  }

  startDragNode() {
    this._isDragging = true;

    if (!this._isStabilizing) {
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

    if (!this.settings.isPhysicsEnabled) {
      node.x = data.x;
      node.y = data.y;

      // Notify the client that the node position changed.
      // This is otherwise handled by the simulation tick if physics is enabled.
      this.emit(D3SimulatorEngineEventType.NODE_DRAGGED, { nodes: this._nodes, edges: this._edges });
    }
  }

  endDragNode(data: ID3SimulatorNodeId) {
    this._isDragging = false;

    this.simulation.alphaTarget(0);
    const node = this._nodes[this._nodeIndexByNodeId[data.id]];
    if (node) {
      releaseNode(node);
    }
  }

  activateSimulation() {
    if (this.settings.isPhysicsEnabled) {
      // Re-heat simulation.
      // This does not count as "stabilization" and won't emit any progress.
      this.simulation.alphaTarget(this.settings.alpha.alphaTarget).restart();
    }
  }

  private fixDefinedNodes(data: ID3SimulatorGraph) {
    // Treat nodes that have existing coordinates as "fixed".
    for (let i = 0; i < data.nodes.length; i++) {
      if (data.nodes[i].x !== null && data.nodes[i].x !== undefined) {
        data.nodes[i].fx = data.nodes[i].x;
      }
      if (data.nodes[i].y !== null && data.nodes[i].y !== undefined) {
        data.nodes[i].fy = data.nodes[i].y;
      }
    }
    return data;
  }

  addData(data: ID3SimulatorGraph) {
    data = this.fixDefinedNodes(data);
    this._nodes.concat(data.nodes);
    this._edges.concat(data.edges);
    this.setNodeIndexByNodeId();
  }

  clearData() {
    this._nodes = [];
    this._edges = [];
    this.setNodeIndexByNodeId();
  }

  setData(data: ID3SimulatorGraph) {
    data = this.fixDefinedNodes(data);
    this.clearData();
    this.addData(data);
  }

  updateData(data: ID3SimulatorGraph) {
    data = this.fixDefinedNodes(data);
    // Keep existing nodes along with their (x, y, fx, fy) coordinates to avoid
    // rearranging the graph layout.
    // These nodes should not be reloaded into the array because the D3 simulation
    // will assign to them completely new coordinates, effectively restarting the animation.
    const newNodeIds = new Set(data.nodes.map((node) => node.id));

    // Remove old nodes that aren't present in the new data.
    const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
    const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === undefined);

    this._nodes = [...oldNodes, ...newNodes];
    this.setNodeIndexByNodeId();

    // Only keep new links and discard all old links.
    // Old links won't work as some discrepancies arise between the D3 index property
    // and Memgraph's `id` property which affects the source->target mapping.
    this._edges = data.edges;
  }

  simulate() {
    // Update simulation with new data.
    this.simulation.nodes(this._nodes);
    this.linkForce.links(this._edges);

    // Run stabilization "physics".
    this.runStabilization();

    if (!this.settings.isPhysicsEnabled) {
      this.fixNodes();
    }
  }

  startSimulation(data: ID3SimulatorGraph) {
    this.setData(data);

    // Update simulation with new data.
    this.simulation.nodes(this._nodes);
    this.linkForce.links(this._edges);

    // Run stabilization "physics".
    this.runStabilization();
  }

  updateSimulation(data: ID3SimulatorGraph) {
    // To avoid rearranging the graph layout during node expand/collapse/hide,
    // it is necessary to keep existing nodes along with their (x, y) coordinates.
    // These nodes should not be reloaded into the array because the D3 simulation
    // will assign to them completely new coordinates, effectively restarting the animation.
    const newNodeIds = new Set(data.nodes.map((node) => node.id));

    // const newNodes = data.nodes.filter((node) => !this.nodeIdentities.has(node.id));
    const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === undefined);
    const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));

    if (!this.settings.isPhysicsEnabled) {
      oldNodes.forEach((node) => fixNode(node));
    }

    // Remove old nodes that aren't present in the new data.
    this._nodes = [...oldNodes, ...newNodes];
    this.setNodeIndexByNodeId();

    // Only keep new links and discard all old links.
    // Old links won't work as some discrepancies arise between the D3 index property
    // and Memgraph's `id` property which affects the source->target mapping.
    this._edges = data.edges;

    // Update simulation with new data.
    this.simulation.nodes(this._nodes);
    this.linkForce.links(this._edges);

    // If there are no new nodes, there is no need for the stabilization
    if (!this.settings.isPhysicsEnabled && !newNodes.length) {
      this.emit(D3SimulatorEngineEventType.STABILIZATION_ENDED, { nodes: this._nodes, edges: this._edges });
      return;
    }

    // Run stabilization "physics".
    this.runStabilization();
  }

  stopSimulation() {
    this.simulation.stop();
    this._nodes = [];
    this._edges = [];
    this.setNodeIndexByNodeId();
    this.simulation.nodes();
    this.linkForce.links();
  }

  protected initSimulation(settings: ID3SimulatorEngineSettingsUpdate) {
    if (settings.alpha) {
      this.simulation
        .alpha(settings.alpha.alpha)
        .alphaMin(settings.alpha.alphaMin)
        .alphaDecay(settings.alpha.alphaDecay)
        .alphaTarget(settings.alpha.alphaTarget);
    }
    if (settings.links) {
      this.linkForce.distance(settings.links.distance).iterations(settings.links.iterations);
    }
    if (settings.collision) {
      const collision = forceCollide()
        .radius(settings.collision.radius)
        .strength(settings.collision.strength)
        .iterations(settings.collision.iterations);
      this.simulation.force('collide', collision);
    }
    if (settings.collision === null) {
      this.simulation.force('collide', null);
    }
    if (settings.manyBody) {
      const manyBody = forceManyBody()
        .strength(settings.manyBody.strength)
        .theta(settings.manyBody.theta)
        .distanceMin(settings.manyBody.distanceMin)
        .distanceMax(settings.manyBody.distanceMax);
      this.simulation.force('charge', manyBody);
    }
    if (settings.manyBody === null) {
      this.simulation.force('charge', null);
    }
    if (settings.positioning?.forceY) {
      const positioningForceX = forceX(settings.positioning.forceX.x).strength(settings.positioning.forceX.strength);
      this.simulation.force('x', positioningForceX);
    }
    if (settings.positioning?.forceX === null) {
      this.simulation.force('x', null);
    }
    if (settings.positioning?.forceY) {
      const positioningForceY = forceY(settings.positioning.forceY.y).strength(settings.positioning.forceY.strength);
      this.simulation.force('y', positioningForceY);
    }
    if (settings.positioning?.forceY === null) {
      this.simulation.force('y', null);
    }
    if (settings.centering) {
      const centering = forceCenter(settings.centering.x, settings.centering.y).strength(settings.centering.strength);
      this.simulation.force('center', centering);
    }
    if (settings.centering === null) {
      this.simulation.force('center', null);
    }
  }

  // This is a blocking action - the user will not be able to interact with the graph
  // during the stabilization process.
  protected runStabilization() {
    if (this._isStabilizing) {
      return;
    }

    this.emit(D3SimulatorEngineEventType.STABILIZATION_STARTED, undefined);

    this._isStabilizing = true;
    this.simulation.alpha(this.settings.alpha.alpha).alphaTarget(this.settings.alpha.alphaTarget).stop();

    const totalSimulationSteps = Math.ceil(
      Math.log(this.settings.alpha.alphaMin) / Math.log(1 - this.settings.alpha.alphaDecay),
    );

    let lastProgress = -1;
    for (let i = 0; i < totalSimulationSteps; i++) {
      const currentProgress = Math.round((i * 100) / totalSimulationSteps);
      // Emit progress maximum of 100 times (every percent)
      if (currentProgress > lastProgress) {
        lastProgress = currentProgress;
        this.emit(D3SimulatorEngineEventType.STABILIZATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges,
          progress: currentProgress / 100,
        });
      }
      this.simulation.tick();
    }

    this._isStabilizing = false;
    this.emit(D3SimulatorEngineEventType.STABILIZATION_ENDED, { nodes: this._nodes, edges: this._edges });
  }

  protected setNodeIndexByNodeId() {
    this._nodeIndexByNodeId = {};
    for (let i = 0; i < this._nodes.length; i++) {
      this._nodeIndexByNodeId[this._nodes[i].id] = i;
    }
  }

  fixNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }

    for (let i = 0; i < nodes.length; i++) {
      fixNode(this._nodes[i]);
    }
  }

  releaseNodes(nodes?: ISimulationNode[]) {
    if (!nodes) {
      nodes = this._nodes;
    }

    for (let i = 0; i < nodes.length; i++) {
      releaseNode(this._nodes[i]);
    }
  }
}

const fixNode = (node: ISimulationNode) => {
  // fx and fy fix the node position in the D3 simulation.
  node.fx = node.x;
  node.fy = node.y;
};

const releaseNode = (node: ISimulationNode) => {
  node.fx = null;
  node.fy = null;
};
