import { IPosition } from '../../../../common';
import { copyObject, isObjectEqual } from '../../../../utils/object.utils';
import {
  ISimulationNode,
  ISimulationEdge,
  ISimulationGraph,
  ISimulationIds,
  SimulatorEventType,
} from '../../../shared';
import { IEngineSettingsUpdate, ILayoutOptionsBase, LayoutType } from '../../shared';
import { BaseLayoutEngine } from '../base-layout-engine';

export const CHUNK_SIZE = 5000;

export abstract class StaticLayoutEngine<T extends ILayoutOptionsBase = ILayoutOptionsBase> extends BaseLayoutEngine {
  protected abstract _config: T;

  private _isCalculating = false;
  private _pendingRecalculation = false;

  abstract readonly type: LayoutType;

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endDragNode(_nodeId: number) {
    // No-op for static layouts
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fixNodes(_nodes?: ISimulationNode[]) {
    // No-op for static layouts
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    this._pendingRecalculation = false;
    super.terminate();
  }

  protected _calculateAndEmit() {
    if (this._nodes.length === 0 || this._cancelSimulation) {
      return;
    }

    if (this._isCalculating) {
      this._pendingRecalculation = true;
      return;
    }

    this._isCalculating = true;
    this.emit(SimulatorEventType.SIMULATION_START, undefined);

    this.calculatePositions(
      this._nodes,
      this._edges,
      (progress) => {
        this.emit(SimulatorEventType.SIMULATION_PROGRESS, {
          nodes: this._nodes,
          edges: this._edges,
          progress,
        });
      },
      () => this._cancelSimulation,
      () => {
        this._isCalculating = false;

        if (!this._cancelSimulation) {
          this.emit(SimulatorEventType.SIMULATION_END, { nodes: this._nodes, edges: this._edges });
        }

        this._cancelSimulation = false;

        if (this._pendingRecalculation) {
          this._pendingRecalculation = false;
          this._calculateAndEmit();
        }
      },
    );
  }

  protected abstract calculatePositions(
    nodes: ISimulationNode[],
    edges: ISimulationEdge[],
    onProgress: (progress: number) => void,
    isCancelled: () => boolean,
    onComplete: () => void,
  ): void;

  protected _emitProgress(index: number, total: number, lastProgress: number, onProgress: (p: number) => void): number {
    const currentProgress = Math.round((index * 100) / total);
    if (currentProgress > lastProgress) {
      onProgress(currentProgress / 100);
      return currentProgress;
    }
    return lastProgress;
  }
}
