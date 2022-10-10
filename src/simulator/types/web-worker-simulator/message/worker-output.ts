import { ISimulationNode, ISimulationEdge } from '../../../shared';
import { IWorkerPayload } from './worker-payload';
import { ID3SimulatorEngineSettings } from '../../../engine/d3-simulator-engine';

export enum WorkerOutputType {
  SIMULATION_START = 'simulation-start',
  SIMULATION_PROGRESS = 'simulation-progress',
  SIMULATION_END = 'simulation-end',
  NODE_DRAG = 'node-drag',
  NODE_DRAG_END = 'node-drag-end',
  SETTINGS_UPDATE = 'settings-update',
}

type IWorkerOutputSimulationStartPayload = IWorkerPayload<WorkerOutputType.SIMULATION_START>;

type IWorkerOutputSimulationProgressPayload = IWorkerPayload<
  WorkerOutputType.SIMULATION_PROGRESS,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
    progress: number;
  }
>;

type IWorkerOutputSimulationEndPayload = IWorkerPayload<
  WorkerOutputType.SIMULATION_END,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerOutputNodeDragPayload = IWorkerPayload<
  WorkerOutputType.NODE_DRAG,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerOutputNodeDragEndPayload = IWorkerPayload<
  WorkerOutputType.NODE_DRAG_END,
  {
    nodes: ISimulationNode[];
    edges: ISimulationEdge[];
  }
>;

type IWorkerOutputSettingsUpdatePayload = IWorkerPayload<
  WorkerOutputType.SETTINGS_UPDATE,
  {
    settings: ID3SimulatorEngineSettings;
  }
>;

export type IWorkerOutputPayload =
  | IWorkerOutputSimulationStartPayload
  | IWorkerOutputSimulationProgressPayload
  | IWorkerOutputSimulationEndPayload
  | IWorkerOutputNodeDragPayload
  | IWorkerOutputNodeDragEndPayload
  | IWorkerOutputSettingsUpdatePayload;
