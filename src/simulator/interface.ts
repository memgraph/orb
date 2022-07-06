import { IPosition } from '../common/position';
import { ID3SimulatorEngineSettings, ID3SimulatorEngineSettingsUpdate } from './engine/d3-simulator-engine';
import { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

export type ISimulationNode = SimulationNodeDatum & { id: number; mass?: number };
export type ISimulationEdge = SimulationLinkDatum<ISimulationNode> & { id: number };

export interface ISimulator {
  // Simulation handlers
  activateSimulation(): void;
  startSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
  updateSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
  stopSimulation(): void;
  // Node handlers
  startDragNode(): void;
  dragNode(nodeId: number, position: IPosition): void;
  endDragNode(nodeId: number): void;
  // Settings handlers
  setSettings(settings: ID3SimulatorEngineSettingsUpdate): void;
  setPhysics(isEnabled: boolean): void;

  terminate(): void;
}

export interface ISimulatorEventGraph {
  nodes: ISimulationNode[];
  edges: ISimulationEdge[];
}

export interface ISimulatorEventProgress {
  progress: number;
}

export interface ISimulatorEventSettings {
  settings: ID3SimulatorEngineSettings;
}

export interface ISimulatorEvents {
  onNodeDrag: (data: ISimulatorEventGraph) => void;
  onNodeDragEnd: (data: ISimulatorEventGraph) => void;
  onStabilizationStart: () => void;
  onStabilizationProgress: (data: ISimulatorEventGraph & ISimulatorEventProgress) => void;
  onStabilizationEnd: (data: ISimulatorEventGraph) => void;
  onSettingsUpdate: (data: ISimulatorEventSettings) => void;
}
