import { IPosition } from '../../common';
import { IEmitter } from '../../utils/emitter.utils';
import { ISimulationGraph, ISimulationIds, ISimulationNode } from '../shared';

export enum SimulatorEngineEventType {
  SIMULATION_START = 'simulation-start',
  SIMULATION_STOP = 'simulation-stop',
  SIMULATION_PROGRESS = 'simulation-progress',
  SIMULATION_END = 'simulation-end',
  SIMULATION_TICK = 'simulation-tick',
  SIMULATION_RESET = 'simulation-reset',
  NODE_DRAG = 'node-drag',
  SETTINGS_UPDATE = 'settings-update',
  DATA_CLEARED = 'data-cleared',
}

export interface ISimulatorEngineProgress {
  progress: number;
}

export interface ISimulatorEngineNodeId {
  id: number;
}

export interface ISimulatorEngineSettings {
  settings: ISimulatorEngineSettingsConfig;
}

export interface ISimulatorEngineSettingsConfig {
  isSimulatingOnDataUpdate: boolean;
  isSimulatingOnSettingsUpdate: boolean;
  isSimulatingOnUnstick: boolean;
  isPhysicsEnabled: boolean;
  alpha: {
    alpha: number;
    alphaMin: number;
    alphaDecay: number;
    alphaTarget: number;
  };
  centering: { x: number; y: number; strength: number } | null;
  collision: { radius: number; strength: number; iterations: number } | null;
  links: { distance: number; strength?: number; iterations: number };
  manyBody: { strength: number; theta: number; distanceMin: number; distanceMax: number } | null;
  positioning: {
    forceX: { x: number; strength: number };
    forceY: { y: number; strength: number };
  } | null;
}

export type ISimulatorEngineSettingsUpdate = Partial<ISimulatorEngineSettingsConfig>;

export type SimulatorEngineEvents = {
  [SimulatorEngineEventType.SIMULATION_START]: undefined;
  [SimulatorEngineEventType.SIMULATION_PROGRESS]: ISimulationGraph & ISimulatorEngineProgress;
  [SimulatorEngineEventType.SIMULATION_END]: ISimulationGraph;
  [SimulatorEngineEventType.SIMULATION_TICK]: ISimulationGraph;
  [SimulatorEngineEventType.SIMULATION_RESET]: ISimulationGraph;
  [SimulatorEngineEventType.NODE_DRAG]: ISimulationGraph;
  [SimulatorEngineEventType.SETTINGS_UPDATE]: ISimulatorEngineSettings;
  [SimulatorEngineEventType.DATA_CLEARED]: ISimulationGraph;
};

export enum SimulatorEngineType {
  D3 = 'd3',
  GPU = 'gpu',
}

export interface ISimulatorEngine extends IEmitter<SimulatorEngineEvents> {
  getSettings(): ISimulatorEngineSettingsConfig;
  setSettings(settings: ISimulatorEngineSettingsUpdate): void;
  resetSettings(): ISimulatorEngineSettingsConfig;

  setupData(data: ISimulationGraph): void;
  mergeData(data: Partial<ISimulationGraph>): void;
  updateData(data: ISimulationGraph): void;
  deleteData(data: Partial<ISimulationIds>): void;
  patchData(data: Partial<ISimulationGraph>): void;
  clearData(): void;

  activateSimulation(): void;
  stopSimulation(): void;
  resetSimulation(): void;

  startDragNode(): void;
  dragNode(data: ISimulatorEngineNodeId & IPosition): void;
  endDragNode(data: ISimulatorEngineNodeId): void;

  fixNodes(nodes?: ISimulationNode[]): void;
  unfixNodes(nodes?: ISimulationNode[]): void;
  stickNodes(nodes?: ISimulationNode[]): void;
  unstickNodes(nodes?: ISimulationNode[]): void;
}
