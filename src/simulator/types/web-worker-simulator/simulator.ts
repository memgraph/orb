import { IPosition } from '../../../common/position';
import { ISimulator, ISimulatorEvents, ISimulationNode, ISimulationEdge } from '../../interface';
import { ID3SimulatorEngineSettingsUpdate } from '../../engine/d3-simulator-engine';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';

export class WebWorkerSimulator implements ISimulator {
  protected readonly worker: Worker;

  constructor(events: Partial<ISimulatorEvents>) {
    this.worker = new Worker(new URL('./process.worker', import.meta.url));

    this.worker.onmessage = ({ data }: MessageEvent<IWorkerOutputPayload>) => {
      switch (data.type) {
        case WorkerOutputType.StabilizationStarted: {
          events.onStabilizationStart?.();
          break;
        }
        case WorkerOutputType.StabilizationProgress: {
          events.onStabilizationProgress?.(data.data);
          break;
        }
        case WorkerOutputType.StabilizationEnded: {
          events.onStabilizationEnd?.(data.data);
          break;
        }
        case WorkerOutputType.NodeDragged: {
          events.onNodeDrag?.(data.data);
          break;
        }
        case WorkerOutputType.NodeDragEnded: {
          events.onNodeDragEnd?.(data.data);
          break;
        }
        case WorkerOutputType.SettingsUpdated: {
          events.onSettingsUpdate?.(data.data);
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
    this.emitToWorker({ type: WorkerInputType.FixNodes, data: { nodes }});
  }

  releaseNodes(nodes?: ISimulationNode[]): void {
    this.emitToWorker({ type: WorkerInputType.ReleaseNodes, data: { nodes }});
  }

  setSettings(settings: ID3SimulatorEngineSettingsUpdate) {
    this.emitToWorker({ type: WorkerInputType.SetSettings, data: settings });
  }

  setPhysics(isEnabled: boolean) {
    this.emitToWorker({ type: WorkerInputType.SetPhysics, data: { isEnabled } });
  }

  terminate() {
    this.worker.terminate();
  }

  protected emitToWorker(message: IWorkerInputPayload) {
    this.worker.postMessage(message);
  }
}
