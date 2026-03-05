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
import { IPosition } from '../../../../common';
import { ISimulationNode, ISimulationGraph, ISimulationIds, SimulatorEventType } from '../../../shared';
import { isObjectEqual, copyObject } from '../../../../utils/object.utils';
import { IEngineSettingsUpdate, IForceLayoutOptions, DEFAULT_FORCE_LAYOUT_OPTIONS, LayoutType } from '../../shared';
import { BaseLayoutEngine } from '../base-layout-engine';

const MAX_SIMULATION_STEPS = 500;
const CHUNK_SIZE = 100;

interface IRunSimulationOptions {
  isUpdatingSettings: boolean;
}

export class ForceLayoutEngine extends BaseLayoutEngine {
  private _linkForce!: ForceLink<ISimulationNode, SimulationLinkDatum<ISimulationNode>>;
  private _simulation!: Simulation<ISimulationNode, undefined>;
  private _settings: IForceLayoutOptions;

  private _isDragging = false;
  private _isStabilizing = false;

  private _initialSettings: IForceLayoutOptions | undefined;

  readonly type: LayoutType = 'force';

  constructor(options?: IForceLayoutOptions) {
    super();
    this._settings = {
      ...DEFAULT_FORCE_LAYOUT_OPTIONS,
      ...options,
    };
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

    this._applySettingsToSimulation(forceSettings);
    this.emit(SimulatorEventType.SETTINGS_UPDATE, {
      settings: { type: 'force', options: this._settings },
    });

    const hasPhysicsBeenDisabled = previousSettings.isPhysicsEnabled && !forceSettings.isPhysicsEnabled;

    if (hasPhysicsBeenDisabled) {
      this._simulation.stop();
    } else if (this._settings.isSimulatingOnSettingsUpdate && this._nodes.length > 0) {
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
    const newNodeIds = new Set(data.nodes.map((node) => node.id));
    const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
    const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === undefined);

    this._nodes = [...oldNodes, ...newNodes];
    this._rebuildNodeIndex();
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
    this._rebuildNodeIndex();

    if (this._settings.isSimulatingOnDataUpdate) {
      this._updateSimulationData();
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

  terminate() {
    super.terminate();
    this._simulation?.stop();
  }

  // TODO(Alex): Listeners memory leak (D3 force research)
  private _resetSimulation() {
    if (this._simulation) {
      this._simulation.stop();
      this._simulation.on('tick', null).on('end', null);
    }

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
    if (this._isStabilizing || this._cancelSimulation) {
      return;
    }

    if (this._settings.isPhysicsEnabled || options?.isUpdatingSettings) {
      this._unpinNodes();
    }

    this.emit(SimulatorEventType.SIMULATION_START, undefined);

    this._isStabilizing = true;
    this._simulation.alpha(this._settings.alpha.alpha).alphaTarget(this._settings.alpha.alphaTarget).stop();

    const totalSimulationSteps = Math.min(
      MAX_SIMULATION_STEPS,
      Math.ceil(Math.log(this._settings.alpha.alphaMin) / Math.log(1 - this._settings.alpha.alphaDecay)),
    );

    let lastProgress = -1;
    let step = 0;

    const runChunk = () => {
      if (this._cancelSimulation) {
        this._isStabilizing = false;
        this._cancelSimulation = false;
        return;
      }

      const end = Math.min(step + CHUNK_SIZE, totalSimulationSteps);

      for (; step < end; step++) {
        this._simulation.tick();

        const currentProgress = Math.round((step * 100) / totalSimulationSteps);
        if (currentProgress > lastProgress) {
          lastProgress = currentProgress;
          this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
            nodes: this._nodes,
            edges: this._edges,
            progress: currentProgress / 100,
          });
        }
      }

      if (step < totalSimulationSteps && !this._cancelSimulation) {
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

  private _updateSimulationData() {
    this._simulation.nodes(this._nodes);
    this._linkForce.links(this._edges);
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

  private _applySettingsToSimulation(settings: Partial<IForceLayoutOptions>) {
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

    if (settings.positioning?.forceX) {
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
}
