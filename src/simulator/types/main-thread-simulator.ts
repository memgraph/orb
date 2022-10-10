import { ISimulationEdge, ISimulationNode, ISimulator, SimulatorEvents, SimulatorEventType } from '../shared';
import { IPosition } from '../../common';
import { Emitter } from '../../utils/emitter.utils';
import {
  D3SimulatorEngine,
  D3SimulatorEngineEventType,
  ID3SimulatorEngineSettingsUpdate,
} from '../engine/d3-simulator-engine';

export class MainThreadSimulator extends Emitter<SimulatorEvents> implements ISimulator {
  protected readonly simulator: D3SimulatorEngine;

  constructor() {
    super();
    this.simulator = new D3SimulatorEngine();
    this.simulator.on(D3SimulatorEngineEventType.SIMULATION_START, () => {
      this.emit(SimulatorEventType.SIMULATION_START, undefined);
    });
    this.simulator.on(D3SimulatorEngineEventType.SIMULATION_PROGRESS, (data) => {
      this.emit(SimulatorEventType.SIMULATION_PROGRESS, data);
    });
    this.simulator.on(D3SimulatorEngineEventType.SIMULATION_END, (data) => {
      this.emit(SimulatorEventType.SIMULATION_END, data);
    });
    this.simulator.on(D3SimulatorEngineEventType.NODE_DRAG, (data) => {
      this.emit(SimulatorEventType.NODE_DRAG_END, data);
    });
    this.simulator.on(D3SimulatorEngineEventType.TICK, (data) => {
      this.emit(SimulatorEventType.NODE_DRAG, data);
    });
    this.simulator.on(D3SimulatorEngineEventType.END, (data) => {
      this.emit(SimulatorEventType.NODE_DRAG_END, data);
    });
    this.simulator.on(D3SimulatorEngineEventType.SETTINGS_UPDATE, (data) => {
      this.emit(SimulatorEventType.SETTINGS_UPDATE, data);
    });
  }

  setData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.setData({ nodes, edges });
  }

  addData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.addData({ nodes, edges });
  }

  updateData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.updateData({ nodes, edges });
  }

  clearData() {
    this.simulator.clearData();
  }

  simulate() {
    this.simulator.simulate();
  }

  activateSimulation() {
    this.simulator.activateSimulation();
  }

  startSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.startSimulation({ nodes, edges });
  }

  updateSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.updateSimulation({ nodes, edges });
  }

  stopSimulation() {
    this.simulator.stopSimulation();
  }

  startDragNode() {
    this.simulator.startDragNode();
  }

  dragNode(nodeId: number, position: IPosition) {
    this.simulator.dragNode({ id: nodeId, ...position });
  }

  endDragNode(nodeId: number) {
    this.simulator.endDragNode({ id: nodeId });
  }

  fixNodes(nodes: ISimulationNode[]) {
    this.simulator.fixNodes(nodes);
  }

  releaseNodes(nodes?: ISimulationNode[] | undefined): void {
    this.simulator.releaseNodes(nodes);
  }

  setSettings(settings: ID3SimulatorEngineSettingsUpdate) {
    this.simulator.setSettings(settings);
  }

  terminate() {
    this.simulator.removeAllListeners();
    this.removeAllListeners();
    // Do nothing
  }
}
