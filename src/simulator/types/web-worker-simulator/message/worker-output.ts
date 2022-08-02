import { ISimulationNode, ISimulationEdge } from '../../../interface';
import { IWorkerPayload } from './worker-payload';
import { ID3SimulatorEngineSettings } from '../../../engine/d3-simulator-engine';

export enum WorkerOutputType {
  StabilizationStarted = 'Stabilization Started',
  StabilizationProgress = 'Stabilization Progress',
  StabilizationEnded = 'Stabilization Ended',
  NodeDragged = 'Node Dragged',
  NodeDragEnded = 'Node Drag Ended',
  SettingsUpdated = 'Settings Updated',
}

type IWorkerOutputStabilizationStartedPayload = IWorkerPayload<WorkerOutputType.StabilizationStarted>;

type IWorkerOutputStabilizationProgressPayload = IWorkerPayload<
  WorkerOutputType.StabilizationProgress,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
    progress: number;
  }
>;

type IWorkerOutputStabilizationEndedPayload = IWorkerPayload<
  WorkerOutputType.StabilizationEnded,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerOutputNodeDraggedPayload = IWorkerPayload<
  WorkerOutputType.NodeDragged,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerOutputNodeDragEndedPayload = IWorkerPayload<
  WorkerOutputType.NodeDragEnded,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerOutputSettingsUpdatedPayload = IWorkerPayload<
  WorkerOutputType.SettingsUpdated,
  {
    settings: ID3SimulatorEngineSettings;
  }
>;

export type IWorkerOutputPayload =
  | IWorkerOutputStabilizationStartedPayload
  | IWorkerOutputStabilizationProgressPayload
  | IWorkerOutputStabilizationEndedPayload
  | IWorkerOutputNodeDraggedPayload
  | IWorkerOutputNodeDragEndedPayload
  | IWorkerOutputSettingsUpdatedPayload;
