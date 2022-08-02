import { IPosition } from '../../../../common/position';
import { ISimulationNode, ISimulationEdge } from '../../../interface';
import { ID3SimulatorEngineSettingsUpdate } from '../../../engine/d3-simulator-engine';
import { IWorkerPayload } from './worker-payload';

// Messages are objects going into the simulation worker.
// They can be thought of similar to requests.
// (not quite as there is no immediate response to a request)

export enum WorkerInputType {
  // Simulation message types
  ActivateSimulation = 'Activate Simulation',
  StartSimulation = 'Start Simulation',
  UpdateSimulation = 'Update Simulation',
  StopSimulation = 'Stop Simulation',

  // Node dragging message types
  StartDragNode = 'Start Drag Node',
  DragNode = 'Drag Node',
  EndDragNode = 'End Drag Node',

  // Settings and special params
  SetPhysics = 'Set Physics',
  SetSettings = 'Set Settings',
}

type IWorkerInputActivateSimulationPayload = IWorkerPayload<WorkerInputType.ActivateSimulation>;

type IWorkerInputStartSimulationPayload = IWorkerPayload<
  WorkerInputType.StartSimulation,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

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

type IWorkerInputSetPhysicsPayload = IWorkerPayload<
  WorkerInputType.SetPhysics,
  {
    isEnabled: boolean;
  }
>;

type IWorkerInputSetSettingsPayload = IWorkerPayload<WorkerInputType.SetSettings, ID3SimulatorEngineSettingsUpdate>;

export type IWorkerInputPayload =
  | IWorkerInputActivateSimulationPayload
  | IWorkerInputStartSimulationPayload
  | IWorkerInputUpdateSimulationPayload
  | IWorkerInputStopSimulationPayload
  | IWorkerInputStartDragNodePayload
  | IWorkerInputDragNodePayload
  | IWorkerInputEndDragNodePayload
  | IWorkerInputSetPhysicsPayload
  | IWorkerInputSetSettingsPayload;
