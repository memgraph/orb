import { IPosition } from '../common';
import { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { ID3SimulatorEngineSettings, ID3SimulatorEngineSettingsUpdate } from './engine/d3-simulator-engine';
import { IEmitter } from '../utils/emitter.utils';

export type ISimulationNode = SimulationNodeDatum & { id: number; mass?: number };
export type ISimulationEdge = SimulationLinkDatum<ISimulationNode> & { id: number };

export enum SimulatorEventType {
  SIMULATION_START = 'simulation-start',
  SIMULATION_PROGRESS = 'simulation-progress',
  SIMULATION_END = 'simulation-end',
  NODE_DRAG = 'node-drag',
  NODE_DRAG_END = 'node-drag-end',
  SETTINGS_UPDATE = 'settings-update',
}

export type SimulatorEvents = {
  [SimulatorEventType.SIMULATION_START]: undefined;
  [SimulatorEventType.SIMULATION_PROGRESS]: ISimulatorEventGraph & ISimulatorEventProgress;
  [SimulatorEventType.SIMULATION_END]: ISimulatorEventGraph;
  [SimulatorEventType.NODE_DRAG]: ISimulatorEventGraph;
  [SimulatorEventType.NODE_DRAG_END]: ISimulatorEventGraph;
  [SimulatorEventType.SETTINGS_UPDATE]: ISimulatorEventSettings;
};

export interface ISimulator extends IEmitter<SimulatorEvents> {
  // Sets nodes and edges without running simulation
  setData(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
  addData(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
  updateData(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
  clearData(): void;

  // Simulation handlers
  simulate(): void;
  activateSimulation(): void;
  startSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
  updateSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
  stopSimulation(): void;

  // Node handlers
  startDragNode(): void;
  dragNode(nodeId: number, position: IPosition): void;
  endDragNode(nodeId: number): void;
  fixNodes(nodes?: ISimulationNode[]): void;
  releaseNodes(nodes?: ISimulationNode[]): void;

  // Settings handlers
  setSettings(settings: ID3SimulatorEngineSettingsUpdate): void;

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
  onSimulationStart: () => void;
  onSimulationProgress: (data: ISimulatorEventGraph & ISimulatorEventProgress) => void;
  onSimulationEnd: (data: ISimulatorEventGraph) => void;
  onSettingsUpdate: (data: ISimulatorEventSettings) => void;
}
