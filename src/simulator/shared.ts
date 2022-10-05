import { IPosition } from '../common';
import { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { IEmitter } from '../../dist/utils/emitter.utils';
import { ID3SimulatorEngineSettings, ID3SimulatorEngineSettingsUpdate } from './engine/d3-simulator-engine';

export type ISimulationNode = SimulationNodeDatum & { id: number; mass?: number };
export type ISimulationEdge = SimulationLinkDatum<ISimulationNode> & { id: number };

export enum SimulatorEventType {
  STABILIZATION_STARTED = 'stabilizationStarted',
  STABILIZATION_PROGRESS = 'stabilizationProgress',
  STABILIZATION_ENDED = 'stabilizationEnded',
  NODE_DRAGGED = 'nodeDragged',
  NODE_DRAG_ENDED = 'nodeDragEnded',
  SETTINGS_UPDATED = 'settingsUpdated',
}

export type SimulatorEvents = {
  [SimulatorEventType.STABILIZATION_STARTED]: undefined;
  [SimulatorEventType.STABILIZATION_PROGRESS]: ISimulatorEventGraph & ISimulatorEventProgress;
  [SimulatorEventType.STABILIZATION_ENDED]: ISimulatorEventGraph;
  [SimulatorEventType.NODE_DRAGGED]: ISimulatorEventGraph;
  [SimulatorEventType.NODE_DRAG_ENDED]: ISimulatorEventGraph;
  [SimulatorEventType.SETTINGS_UPDATED]: ISimulatorEventSettings;
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
  onStabilizationStart: () => void;
  onStabilizationProgress: (data: ISimulatorEventGraph & ISimulatorEventProgress) => void;
  onStabilizationEnd: (data: ISimulatorEventGraph) => void;
  onSettingsUpdate: (data: ISimulatorEventSettings) => void;
}
