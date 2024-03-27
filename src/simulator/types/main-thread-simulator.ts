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
import {
  D3SimulatorEngine,
  D3SimulatorEngineEventType,
  ID3SimulatorEngineSettingsUpdate,
} from '../engine/d3-simulator-engine';

export class MainThreadSimulator extends Emitter<SimulatorEvents> implements ISimulator {
  protected readonly _simulator: D3SimulatorEngine;

  constructor() {
    super();
    this._simulator = new D3SimulatorEngine();
    this._simulator.on(D3SimulatorEngineEventType.SIMULATION_START, () => {
      this.emit(SimulatorEventType.SIMULATION_START, undefined);
    });
    this._simulator.on(D3SimulatorEngineEventType.SIMULATION_PROGRESS, (data) => {
      this.emit(SimulatorEventType.SIMULATION_PROGRESS, data);
    });
    this._simulator.on(D3SimulatorEngineEventType.SIMULATION_END, (data) => {
      this.emit(SimulatorEventType.SIMULATION_END, data);
    });
    this._simulator.on(D3SimulatorEngineEventType.NODE_DRAG, (data) => {
      this.emit(SimulatorEventType.NODE_DRAG, data);
    });
    this._simulator.on(D3SimulatorEngineEventType.SIMULATION_TICK, (data) => {
      this.emit(SimulatorEventType.SIMULATION_STEP, data);
    });
    this._simulator.on(D3SimulatorEngineEventType.SETTINGS_UPDATE, (data) => {
      this.emit(SimulatorEventType.SETTINGS_UPDATE, data);
    });
  }

  setupData(data: ISimulationGraph) {
    this._simulator.setupData(data);
  }

  mergeData(data: ISimulationGraph) {
    this._simulator.mergeData(data);
  }

  updateData(data: ISimulationGraph) {
    this._simulator.updateData(data);
  }

  deleteData(data: ISimulationIds) {
    this._simulator.deleteData(data);
  }

  patchData(data: Partial<ISimulationGraph>): void {
    this._simulator.patchData(data);
  }

  clearData() {
    this._simulator.clearData();
  }

  simulate() {
    console.log('not implemented');
    // this.simulator.runSimulation();
  }

  activateSimulation() {
    this._simulator.activateSimulation();
  }

  startDragNode() {
    this._simulator.startDragNode();
  }

  dragNode(nodeId: number, position: IPosition) {
    this._simulator.dragNode({ id: nodeId, ...position });
  }

  endDragNode(nodeId: number) {
    this._simulator.endDragNode({ id: nodeId });
  }

  fixNodes(nodes: ISimulationNode[]) {
    this._simulator.stickNodes(nodes);
  }

  releaseNodes(nodes?: ISimulationNode[] | undefined): void {
    this._simulator.unstickNodes(nodes);
  }

  setSettings(settings: ID3SimulatorEngineSettingsUpdate) {
    this._simulator.setSettings(settings);
  }

  terminate() {
    this._simulator.removeAllListeners();
    this.removeAllListeners();
  }
}
