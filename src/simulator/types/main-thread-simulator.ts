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
import { ILayoutEngine, ILayoutSettings } from '../engine/shared';
import { LayoutEngineFactory } from '../engine/factory';
import { DeepPartial } from '../../utils/type.utils';

export class MainThreadSimulator extends Emitter<SimulatorEvents> implements ISimulator {
  private _engine: ILayoutEngine;
  private _isSimulationRunning = false;

  constructor(settings: DeepPartial<ILayoutSettings>) {
    super();
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

  setSettings(settings: ILayoutSettings) {
    if (settings.type === this._engine.type && settings.options) {
      this._engine.setSettings(settings.options);
      return;
    }

    this._engine.removeAllListeners();
    this._engine.terminate();
    this._engine = LayoutEngineFactory.create(settings);
    this._wireEngineEvents();
  }

  isSimulationRunning(): boolean {
    return this._isSimulationRunning;
  }

  terminate() {
    this._engine.removeAllListeners();
    this._engine.terminate();
    this.removeAllListeners();
  }

  private _wireEngineEvents() {
    this._engine.on(SimulatorEventType.SIMULATION_START, () => {
      this.emit(SimulatorEventType.SIMULATION_START, undefined);
      this._isSimulationRunning = true;
    });
    this._engine.on(SimulatorEventType.SIMULATION_PROGRESS, (data) => {
      this.emit(SimulatorEventType.SIMULATION_PROGRESS, data);
    });
    this._engine.on(SimulatorEventType.SIMULATION_END, (data) => {
      this.emit(SimulatorEventType.SIMULATION_END, data);
      this._isSimulationRunning = false;
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
