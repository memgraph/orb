import {
  ISimulationNode,
  ISimulator,
  SimulatorEvents,
  SimulatorEventType,
  ISimulationGraph,
  ISimulationIds,
} from '../shared';
import { IPosition } from '../../common';
import { Emitter } from '../../utils/emitter.utils';
import { ILayoutEngine, ILayoutSettings, IEngineSettingsUpdate } from '../engine/shared';
import { LayoutEngineFactory } from '../engine/factory';

export class MainThreadSimulator extends Emitter<SimulatorEvents> implements ISimulator {
  private _engine: ILayoutEngine;

  constructor(settings: ILayoutSettings) {
    super();
    this._engine = LayoutEngineFactory.create(settings);
    this._wireEngineEvents();
  }

  setLayoutEngine(settings: ILayoutSettings) {
    this._engine.removeAllListeners();
    this._engine.terminate();
    this._engine = LayoutEngineFactory.create(settings);
    this._wireEngineEvents();
  }

  setupData(data: ISimulationGraph) {
    this._engine.setupData(data);
  }

  mergeData(data: ISimulationGraph) {
    this._engine.mergeData(data);
  }

  updateData(data: ISimulationGraph) {
    this._engine.updateData(data);
  }

  deleteData(data: ISimulationIds) {
    this._engine.deleteData(data);
  }

  patchData(data: Partial<ISimulationGraph>): void {
    this._engine.patchData(data);
  }

  clearData() {
    this._engine.clearData();
  }

  simulate() {
    // Not implemented
  }

  activateSimulation() {
    this._engine.activateSimulation();
  }

  stopSimulation() {
    this._engine.stopSimulation();
  }

  startDragNode() {
    this._engine.startDragNode();
  }

  dragNode(nodeId: number, position: IPosition) {
    this._engine.dragNode(nodeId, position);
  }

  endDragNode(nodeId: number) {
    this._engine.endDragNode(nodeId);
  }

  fixNodes(nodes: ISimulationNode[]) {
    this._engine.fixNodes(nodes);
  }

  releaseNodes(nodes?: ISimulationNode[] | undefined): void {
    this._engine.releaseNodes(nodes);
  }

  setSettings(settings: IEngineSettingsUpdate) {
    this._engine.setSettings(settings);
  }

  terminate() {
    this._engine.removeAllListeners();
    this._engine.terminate();
    this.removeAllListeners();
  }

  private _wireEngineEvents() {
    this._engine.on(SimulatorEventType.SIMULATION_START, () => {
      this.emit(SimulatorEventType.SIMULATION_START, undefined);
    });
    this._engine.on(SimulatorEventType.SIMULATION_PROGRESS, (data) => {
      this.emit(SimulatorEventType.SIMULATION_PROGRESS, data);
    });
    this._engine.on(SimulatorEventType.SIMULATION_END, (data) => {
      this.emit(SimulatorEventType.SIMULATION_END, data);
    });
    this._engine.on(SimulatorEventType.SIMULATION_STEP, (data) => {
      this.emit(SimulatorEventType.SIMULATION_STEP, data);
    });
    this._engine.on(SimulatorEventType.NODE_DRAG, (data) => {
      this.emit(SimulatorEventType.NODE_DRAG, data);
    });
    this._engine.on(SimulatorEventType.SETTINGS_UPDATE, (data) => {
      this.emit(SimulatorEventType.SETTINGS_UPDATE, data);
    });
  }
}
