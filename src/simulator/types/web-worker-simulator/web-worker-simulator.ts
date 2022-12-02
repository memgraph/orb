import { IPosition } from '../../../common';
import { ISimulator, ISimulationNode, ISimulationEdge, SimulatorEventType, SimulatorEvents } from '../../shared';
import { ID3SimulatorEngineSettingsUpdate } from '../../engine/d3-simulator-engine';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';
import { Emitter } from '../../../utils/emitter.utils';

export class WebWorkerSimulator extends Emitter<SimulatorEvents> implements ISimulator {
  protected readonly worker: Worker;

  constructor() {
    super();
    this.worker = new Worker(
      new URL(
        /* webpackChunkName: 'simulator.worker' */
        './simulator.worker',
        import.meta.url,
      ),
      { type: 'module' },
    );

    this.worker.onmessage = ({ data }: MessageEvent<IWorkerOutputPayload>) => {
      switch (data.type) {
        case WorkerOutputType.SIMULATION_START: {
          this.emit(SimulatorEventType.SIMULATION_START, undefined);
          break;
        }
        case WorkerOutputType.SIMULATION_PROGRESS: {
          this.emit(SimulatorEventType.SIMULATION_PROGRESS, data.data);
          break;
        }
        case WorkerOutputType.SIMULATION_END: {
          this.emit(SimulatorEventType.SIMULATION_END, data.data);
          break;
        }
        case WorkerOutputType.NODE_DRAG: {
          this.emit(SimulatorEventType.NODE_DRAG, data.data);
          break;
        }
        case WorkerOutputType.NODE_DRAG_END: {
          this.emit(SimulatorEventType.NODE_DRAG_END, data.data);
          break;
        }
        case WorkerOutputType.SETTINGS_UPDATE: {
          this.emit(SimulatorEventType.SETTINGS_UPDATE, data.data);
          break;
        }
      }
    };
  }

  /**
   * Creates a new graph with the specified data. Any existing data gets discarded.
   * This action creates a new simulation object but keeps the existing simulation settings.
   *
   * @param {ISimulationNode[]} nodes New nodes
   * @param {ISimulationEdge[]} edges New edges
   */
  setupData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.SetupData, data: { nodes, edges } });
  }

  /**
   * Inserts or updates data to an existing graph. (Also known as upsert)
   *
   * @param {ISimulationNode[]} nodes Added nodes
   * @param {ISimulationEdge[]} edges Added edges
   */
  mergeData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.MergeData, data: { nodes, edges } });
  }

  updateData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.UpdateData, data: { nodes, edges } });
  }

  deleteData(nodeIds: number[] | undefined, edgeIds: number[] | undefined) {
    this.emitToWorker({ type: WorkerInputType.DeleteData, data: { nodeIds, edgeIds } });
  }

  clearData() {
    this.emitToWorker({ type: WorkerInputType.ClearData });
  }

  simulate() {
    this.emitToWorker({ type: WorkerInputType.Simulate });
  }

  activateSimulation() {
    this.emitToWorker({ type: WorkerInputType.ActivateSimulation });
  }

  startSimulation() {
    this.emitToWorker({ type: WorkerInputType.StartSimulation });
  }

  updateSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.UpdateSimulation, data: { nodes, edges } });
  }

  stopSimulation() {
    this.emitToWorker({ type: WorkerInputType.StopSimulation });
  }

  startDragNode() {
    this.emitToWorker({ type: WorkerInputType.StartDragNode });
  }

  dragNode(nodeId: number, position: IPosition) {
    this.emitToWorker({ type: WorkerInputType.DragNode, data: { id: nodeId, ...position } });
  }

  endDragNode(nodeId: number) {
    this.emitToWorker({ type: WorkerInputType.EndDragNode, data: { id: nodeId } });
  }

  fixNodes(nodes?: ISimulationNode[]) {
    this.emitToWorker({ type: WorkerInputType.FixNodes, data: { nodes } });
  }

  releaseNodes(nodes?: ISimulationNode[]): void {
    this.emitToWorker({ type: WorkerInputType.ReleaseNodes, data: { nodes } });
  }

  setSettings(settings: ID3SimulatorEngineSettingsUpdate) {
    this.emitToWorker({ type: WorkerInputType.SetSettings, data: settings });
  }

  terminate() {
    this.worker.terminate();
    this.removeAllListeners();
  }

  protected emitToWorker(message: IWorkerInputPayload) {
    this.worker.postMessage(message);
  }
}
