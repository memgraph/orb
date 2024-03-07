import { IPosition } from '../common';
import { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import { ID3SimulatorEngineSettings, ID3SimulatorEngineSettingsUpdate } from './engine/d3-simulator-engine';
import { IEmitter } from '../utils/emitter.utils';

/**
 * Node with sticky coordinates.
 * A sticky node is immovable and represents a positioned node with user defined coordinates.
 * This node isn't affected by physics.
 * This enables a combination of sticky and free nodes where the free nodes are positioned
 * by the simulator engine to adjust to the immobilized sticky nodes.
 * Not to be confused with fixed coordinates `{ fx, fy }` which are used for physics.
 */
export interface IStickyNode {
  sx?: number | null;
  sy?: number | null;
}

export type ISimulationNode = SimulationNodeDatum &
  IStickyNode & {
    id: number;
    mass?: number;
  };
export type ISimulationEdge = SimulationLinkDatum<ISimulationNode> & { id: number };

export interface ISimulationGraph {
  nodes: ISimulationNode[];
  edges: ISimulationEdge[];
}

export interface ISimulationIds {
  nodeIds: number[];
  edgeIds: number[];
}

export enum SimulatorEventType {
  SIMULATION_START = 'simulation-start',
  SIMULATION_STEP = 'simulation-step',
  SIMULATION_PROGRESS = 'simulation-progress',
  SIMULATION_END = 'simulation-end',
  NODE_DRAG = 'node-drag',
  NODE_DRAG_END = 'node-drag-end',
  SETTINGS_UPDATE = 'settings-update',
}

export type SimulatorEvents = {
  [SimulatorEventType.SIMULATION_START]: undefined;
  [SimulatorEventType.SIMULATION_STEP]: ISimulatorEventGraph;
  [SimulatorEventType.SIMULATION_PROGRESS]: ISimulatorEventGraph & ISimulatorEventProgress;
  [SimulatorEventType.SIMULATION_END]: ISimulatorEventGraph;
  [SimulatorEventType.NODE_DRAG]: ISimulatorEventGraph;
  [SimulatorEventType.NODE_DRAG_END]: ISimulatorEventGraph;
  [SimulatorEventType.SETTINGS_UPDATE]: ISimulatorEventSettings;
};

export interface ISimulator extends IEmitter<SimulatorEvents> {
  setupData(data: ISimulationGraph): void;
  mergeData(data: ISimulationGraph): void;
  updateData(data: ISimulationGraph): void;
  deleteData(data: Partial<ISimulationIds>): void;
  patchData(data: Partial<ISimulationGraph>): void;
  clearData(): void;

  // Simulation handlers
  simulate(): void;
  activateSimulation(): void;
  startSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]): void;
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
  onSimulationStep: (data: ISimulatorEventGraph) => void;
  onSimulationProgress: (data: ISimulatorEventGraph & ISimulatorEventProgress) => void;
  onSimulationEnd: (data: ISimulatorEventGraph) => void;
  onSettingsUpdate: (data: ISimulatorEventSettings) => void;
}
