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
import { IPosition } from '../../common/position';
import { ISimulationNode, ISimulationEdge } from '../interface';
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

interface ID3SimulatorPhysics {
  isEnabled: boolean;
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

  protected edges: ISimulationEdge[] = [];
  protected nodes: ISimulationNode[] = [];
  protected nodeIndexByNodeId: Record<number, number> = {};

  protected isPhysicsEnabled = true;
  protected isDragging = false;
  protected isStabilizing = false;

  constructor(settings?: ID3SimulatorEngineSettings) {
    super();

    this.linkForce = forceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>(this.edges).id((node) => node.id);
    this.simulation = forceSimulation(this.nodes).force('link', this.linkForce).stop();

    this.settings = Object.assign(copyObject(DEFAULT_SETTINGS), settings);
    this.initSimulation(this.settings);

    this.simulation.on('tick', () => {
      this.emit(D3SimulatorEngineEventType.TICK, { nodes: this.nodes, edges: this.edges });
    });

    this.simulation.on('end', () => {
      this.isDragging = false;
      this.isStabilizing = false;
      this.emit(D3SimulatorEngineEventType.END, { nodes: this.nodes, edges: this.edges });
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

  setPhysics(data: ID3SimulatorPhysics) {
    this.isPhysicsEnabled = data.isEnabled;

    if (this.isPhysicsEnabled && !this.isStabilizing) {
      this.releaseNodes();
      this.simulation.alpha(0.1).restart();
    } else {
      this.fixNodes();
      this.isStabilizing = false;
    }
  }

  startDragNode() {
    this.isDragging = true;

    if (!this.isStabilizing) {
      this.activateSimulation();
    }
  }

  dragNode(data: ID3SimulatorNodeId & IPosition) {
    const node = this.nodes[this.nodeIndexByNodeId[data.id]];
    if (!node) {
      return;
    }

    if (!this.isDragging) {
      this.startDragNode();
    }

    node.fx = data.x;
    node.fy = data.y;

    if (!this.isPhysicsEnabled) {
      node.x = data.x;
      node.y = data.y;

      // Notify the client that the node position changed.
      // This is otherwise handled by the simulation tick if physics is enabled.
      this.emit(D3SimulatorEngineEventType.NODE_DRAGGED, { nodes: this.nodes, edges: this.edges });
    }
  }

  endDragNode(data: ID3SimulatorNodeId) {
    this.isDragging = false;

    this.simulation.alphaTarget(0);
    const node = this.nodes[this.nodeIndexByNodeId[data.id]];
    if (node) {
      releaseNode(node);
    }
  }

  activateSimulation() {
    if (this.isPhysicsEnabled) {
      // Re-heat simulation.
      // This does not count as "stabilization" and won't emit any progress.
      this.simulation.alphaTarget(this.settings.alpha.alphaTarget).restart();
    }
  }

  startSimulation(data: ID3SimulatorGraph) {
    this.nodes = data.nodes;
    this.edges = data.edges;
    this.setNodeIndexByNodeId();

    // Update simulation with new data.
    this.simulation.nodes(this.nodes);
    this.linkForce.links(this.edges);

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
    const newNodes = data.nodes.filter((node) => this.nodeIndexByNodeId[node.id] === undefined);
    const oldNodes = this.nodes.filter((node) => newNodeIds.has(node.id));

    if (!this.isPhysicsEnabled) {
      oldNodes.forEach((node) => fixNode(node));
    }

    // Remove old nodes that aren't present in the new data.
    this.nodes = [...oldNodes, ...newNodes];
    this.setNodeIndexByNodeId();

    // Only keep new links and discard all old links.
    // Old links won't work as some discrepancies arise between the D3 index property
    // and Memgraph's `id` property which affects the source->target mapping.
    this.edges = data.edges;

    // Update simulation with new data.
    this.simulation.nodes(this.nodes);
    this.linkForce.links(this.edges);

    // If there are no new nodes, there is no need for the stabilization
    if (!this.isPhysicsEnabled && !newNodes.length) {
      this.emit(D3SimulatorEngineEventType.STABILIZATION_ENDED, { nodes: this.nodes, edges: this.edges });
      return;
    }

    // Run stabilization "physics".
    this.runStabilization();
  }

  stopSimulation() {
    this.simulation.stop();
    this.nodes = [];
    this.edges = [];
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
    if (this.isStabilizing) {
      return;
    }

    this.emit(D3SimulatorEngineEventType.STABILIZATION_STARTED, undefined);

    this.isStabilizing = true;
    this.simulation.alpha(this.settings.alpha.alpha).alphaTarget(this.settings.alpha.alphaTarget).stop();

    const totalSimulationSteps = Math.ceil(
      Math.log(this.settings.alpha.alphaMin) / Math.log(1 - this.settings.alpha.alphaDecay),
    );

    this.releaseNodes();

    let lastProgress = -1;
    for (let i = 0; i < totalSimulationSteps; i++) {
      const currentProgress = Math.round((i * 100) / totalSimulationSteps);
      // Emit progress maximum of 100 times (every percent)
      if (currentProgress > lastProgress) {
        lastProgress = currentProgress;
        this.emit(D3SimulatorEngineEventType.STABILIZATION_PROGRESS, {
          nodes: this.nodes,
          edges: this.edges,
          progress: currentProgress / 100,
        });
      }
      this.simulation.tick();
    }

    if (!this.isPhysicsEnabled) {
      this.fixNodes();
    }

    this.isStabilizing = false;
    this.emit(D3SimulatorEngineEventType.STABILIZATION_ENDED, { nodes: this.nodes, edges: this.edges });
  }

  protected setNodeIndexByNodeId() {
    this.nodeIndexByNodeId = {};
    for (let i = 0; i < this.nodes.length; i++) {
      this.nodeIndexByNodeId[this.nodes[i].id] = i;
    }
  }

  protected fixNodes() {
    for (let i = 0; i < this.nodes.length; i++) {
      fixNode(this.nodes[i]);
    }
  }

  protected releaseNodes() {
    for (let i = 0; i < this.nodes.length; i++) {
      releaseNode(this.nodes[i]);
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
