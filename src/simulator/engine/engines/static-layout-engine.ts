import { IPosition } from '../../../common';
import { Emitter } from '../../../utils/emitter.utils';
import { copyObject, isObjectEqual } from '../../../utils/object.utils';
import {
  ISimulationNode,
  ISimulationEdge,
  ISimulationGraph,
  ISimulationIds,
  SimulatorEvents,
  SimulatorEventType,
} from '../../shared';
import { ILayoutEngine, IEngineSettingsUpdate } from '../shared';

export abstract class StaticLayoutEngine extends Emitter<SimulatorEvents> implements ILayoutEngine {
  protected abstract _config: Record<string, unknown>;

  protected _nodes: ISimulationNode[] = [];
  protected _edges: ISimulationEdge[] = [];
  protected _nodeIndexByNodeId: Record<number, number> = {};

  setupData(data: ISimulationGraph) {
    this._nodes = [...data.nodes];
    this._edges = [...data.edges];
    this._rebuildNodeIndex();
    this._calculateAndEmit();
  }

  mergeData(data: ISimulationGraph) {
    if (data.nodes) {
      for (let i = 0; i < data.nodes.length; i++) {
        const existingIndex = this._nodeIndexByNodeId[data.nodes[i].id];
        if (existingIndex !== undefined) {
          this._nodes[existingIndex] = data.nodes[i];
        } else {
          this._nodes.push(data.nodes[i]);
        }
      }
    }

    if (data.edges) {
      this._edges = this._edges.concat(data.edges);
    }

    this._rebuildNodeIndex();
    this._calculateAndEmit();
  }

  updateData(data: ISimulationGraph) {
    const newNodeIds = new Set(data.nodes.map((node) => node.id));
    const oldNodes = this._nodes.filter((node) => newNodeIds.has(node.id));
    const newNodes = data.nodes.filter((node) => this._nodeIndexByNodeId[node.id] === undefined);

    this._nodes = [...oldNodes, ...newNodes];
    this._edges = data.edges;
    this._rebuildNodeIndex();
    this._calculateAndEmit();
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
    this._calculateAndEmit();
  }

  patchData(data: Partial<ISimulationGraph>) {
    if (data.nodes) {
      for (let i = 0; i < data.nodes.length; i++) {
        const id: number = data.nodes[i].id;
        const index = this._nodeIndexByNodeId[id];
        if (index !== undefined) {
          this._nodes[index] = data.nodes[i];
        } else {
          this._nodes.push(data.nodes[i]);
          this._nodeIndexByNodeId[id] = this._nodes.length - 1;
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
    this._nodeIndexByNodeId = {};
  }

  activateSimulation() {
    // No-op for static layouts
  }

  stopSimulation() {
    // No-op for static layouts
  }

  startDragNode() {
    // No-op for static layouts
  }

  dragNode(nodeId: number, position: IPosition) {
    const index = this._nodeIndexByNodeId[nodeId];
    if (index !== undefined) {
      const node = this._nodes[index];
      node.x = position.x;
      node.y = position.y;
      node.fx = position.x;
      node.fy = position.y;
      this.emit(SimulatorEventType.NODE_DRAG, { nodes: this._nodes, edges: this._edges });
    }
  }

  endDragNode(_nodeId: number) {
    // No-op for static layouts
  }

  fixNodes(_nodes?: ISimulationNode[]) {
    // No-op for static layouts
  }

  releaseNodes(_nodes?: ISimulationNode[]) {
    // No-op for static layouts
  }

  setSettings(settings: IEngineSettingsUpdate) {
    const previous = copyObject(this._config);
    Object.assign(this._config, settings);

    if (!isObjectEqual(this._config, previous) && this._nodes.length > 0) {
      this._calculateAndEmit();
    }
  }

  terminate() {
    this.removeAllListeners();
  }

  protected _calculateAndEmit() {
    if (this._nodes.length === 0) {
      return;
    }

    this.emit(SimulatorEventType.SIMULATION_START, undefined);

    this.calculatePositions(this._nodes, this._edges, (progress) => {
      this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
        nodes: this._nodes,
        edges: this._edges,
        progress,
      });
    });

    this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
  }

  protected abstract calculatePositions(
    nodes: ISimulationNode[],
    edges: ISimulationEdge[],
    onProgress: (progress: number) => void,
  ): void;

  protected _rebuildNodeIndex() {
    this._nodeIndexByNodeId = {};
    for (let i = 0; i < this._nodes.length; i++) {
      this._nodeIndexByNodeId[this._nodes[i].id] = i;
    }
  }

  protected _emitProgress(index: number, total: number, lastProgress: number, onProgress: (p: number) => void): number {
    const currentProgress = Math.round((index * 100) / total);
    if (currentProgress > lastProgress) {
      onProgress(currentProgress / 100);
      return currentProgress;
    }
    return lastProgress;
  }
}
