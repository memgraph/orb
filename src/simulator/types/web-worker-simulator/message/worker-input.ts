import { IPosition } from '../../../../common';
import { ISimulationNode, ISimulationEdge } from '../../../shared';
import { ID3SimulatorEngineSettingsUpdate } from '../../../engine/d3-simulator-engine';
import { IWorkerPayload } from './worker-payload';

// Messages are objects going into the simulation worker.
// They can be thought of similar to requests.
// (not quite as there is no immediate response to a request)

export enum WorkerInputType {
  SetupData = 'Set Data',
  MergeData = 'Add Data',
  UpdateData = 'Update Data',
  DeleteData = 'Delete Data',
  ClearData = 'Clear Data',

  // Simulation message types
  Simulate = 'Simulate',
  ActivateSimulation = 'Activate Simulation',
  StartSimulation = 'Start Simulation',
  UpdateSimulation = 'Update Simulation',
  StopSimulation = 'Stop Simulation',

  // Node dragging message types
  StartDragNode = 'Start Drag Node',
  DragNode = 'Drag Node',
  EndDragNode = 'End Drag Node',
  FixNodes = 'Fix Nodes',
  ReleaseNodes = 'Release Nodes',

  // Settings and special params
  SetSettings = 'Set Settings',
}

type IWorkerInputSetupDataPayload = IWorkerPayload<
  WorkerInputType.SetupData,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerInputMergeDataPayload = IWorkerPayload<
  WorkerInputType.MergeData,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerInputUpdateDataPayload = IWorkerPayload<
  WorkerInputType.UpdateData,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerInputDeleteDataPayload = IWorkerPayload<
  WorkerInputType.DeleteData,
  {
    nodeIds: number[] | undefined;
    edgeIds: number[] | undefined;
  }
>;

type IWorkerInputClearDataPayload = IWorkerPayload<WorkerInputType.ClearData>;

type IWorkerInputSimulatePayload = IWorkerPayload<WorkerInputType.Simulate>;

type IWorkerInputActivateSimulationPayload = IWorkerPayload<WorkerInputType.ActivateSimulation>;

type IWorkerInputStartSimulationPayload = IWorkerPayload<WorkerInputType.StartSimulation>;

type IWorkerInputUpdateSimulationPayload = IWorkerPayload<
  WorkerInputType.UpdateSimulation,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerInputStopSimulationPayload = IWorkerPayload<WorkerInputType.StopSimulation>;

type IWorkerInputStartDragNodePayload = IWorkerPayload<WorkerInputType.StartDragNode>;

type IWorkerInputDragNodePayload = IWorkerPayload<WorkerInputType.DragNode, { id: number } & IPosition>;

type IWorkerInputEndDragNodePayload = IWorkerPayload<
  WorkerInputType.EndDragNode,
  {
    id: number;
  }
>;

type IWorkerInputFixNodesPayload = IWorkerPayload<
  WorkerInputType.FixNodes,
  {
    nodes: ISimulationNode[] | undefined;
  }
>;

type IWorkerInputReleaseNodesPayload = IWorkerPayload<
  WorkerInputType.ReleaseNodes,
  {
    nodes: ISimulationNode[] | undefined;
  }
>;

type IWorkerInputSetSettingsPayload = IWorkerPayload<WorkerInputType.SetSettings, ID3SimulatorEngineSettingsUpdate>;

export type IWorkerInputPayload =
  | IWorkerInputSetupDataPayload
  | IWorkerInputMergeDataPayload
  | IWorkerInputUpdateDataPayload
  | IWorkerInputDeleteDataPayload
  | IWorkerInputClearDataPayload
  | IWorkerInputSimulatePayload
  | IWorkerInputActivateSimulationPayload
  | IWorkerInputStartSimulationPayload
  | IWorkerInputUpdateSimulationPayload
  | IWorkerInputStopSimulationPayload
  | IWorkerInputStartDragNodePayload
  | IWorkerInputDragNodePayload
  | IWorkerInputFixNodesPayload
  | IWorkerInputReleaseNodesPayload
  | IWorkerInputEndDragNodePayload
  | IWorkerInputSetSettingsPayload;
