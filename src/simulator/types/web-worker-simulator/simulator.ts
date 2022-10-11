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
        /* webpackChunkName: 'process.worker' */
        './process.worker',
        import.meta.url,
      ),
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

  setData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.SetData, data: { nodes, edges } });
  }

  addData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.AddData, data: { nodes, edges } });
  }

  updateData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.UpdateData, data: { nodes, edges } });
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

  startSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.StartSimulation, data: { nodes, edges } });
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
