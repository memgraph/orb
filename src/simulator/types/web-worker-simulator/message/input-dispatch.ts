import { IPosition } from '../../../../common';
import { ISimulationNode, ISimulationGraph, ISimulationIds } from '../../../shared';
import { IWorkerInputPayload, WorkerInputType } from './worker-input';

/**
 * The layout-mutation surface shared by `ILayoutEngine` (worker side) and `ISimulator`
 * (main-thread fallback). Both encode an identical `WorkerInputType -> method` mapping,
 * so it lives here once and is applied to either target.
 *
 * `SetSettings` is intentionally excluded: the two targets apply settings differently
 * (engine recreation vs. `setSettings`) and handle it at their own call sites.
 */
export interface ILayoutInputTarget {
  setupData(data: ISimulationGraph): void;
  mergeData(data: ISimulationGraph): void;
  updateData(data: ISimulationGraph): void;
  deleteData(data: Partial<ISimulationIds>): void;
  patchData(data: Partial<ISimulationGraph>): void;
  clearData(): void;
  activateSimulation(): void;
  stopSimulation(): void;
  startDragNode(): void;
  dragNode(nodeId: number, position: IPosition): void;
  endDragNode(nodeId: number): void;
  fixNodes(nodes?: ISimulationNode[]): void;
  releaseNodes(nodes?: ISimulationNode[]): void;
}

export function dispatchLayoutInput(target: ILayoutInputTarget, message: IWorkerInputPayload): void {
  switch (message.type) {
    case WorkerInputType.SetupData:
      target.setupData(message.data);
      break;
    case WorkerInputType.MergeData:
      target.mergeData(message.data);
      break;
    case WorkerInputType.UpdateData:
      target.updateData(message.data);
      break;
    case WorkerInputType.DeleteData:
      target.deleteData(message.data);
      break;
    case WorkerInputType.PatchData:
      target.patchData(message.data);
      break;
    case WorkerInputType.ClearData:
      target.clearData();
      break;
    case WorkerInputType.ActivateSimulation:
      target.activateSimulation();
      break;
    case WorkerInputType.StopSimulation:
      target.stopSimulation();
      break;
    case WorkerInputType.StartDragNode:
      target.startDragNode();
      break;
    case WorkerInputType.DragNode:
      target.dragNode(message.data.id, { x: message.data.x, y: message.data.y });
      break;
    case WorkerInputType.EndDragNode:
      target.endDragNode(message.data.id);
      break;
    case WorkerInputType.FixNodes:
      target.fixNodes(message.data.nodes);
      break;
    case WorkerInputType.ReleaseNodes:
      target.releaseNodes(message.data.nodes);
      break;
    default:
      // SetSettings is handled by callers; UpdateSimulation has no engine handler.
      break;
  }
}
