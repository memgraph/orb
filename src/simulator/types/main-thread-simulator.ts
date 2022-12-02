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

  setupData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.setupData({ nodes, edges });
  }

  mergeData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.mergeData({ nodes, edges });
  }

  updateData(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.simulator.updateData({ nodes, edges });
  }

  // TODO(dlozic): Replace arguments with object to match IGraph.
  // Partial doesn't work well this way - have to add undefined manually.
  deleteData(nodeIds: number[] | undefined, edgeIds: number[] | undefined) {
    this.simulator.deleteData({ nodeIds, edgeIds });
  }

  clearData() {
    this.simulator.clearData();
  }

  simulate() {
    console.log('not implemented');
    // this.simulator.runSimulation();
  }

  activateSimulation() {
    this.simulator.activateSimulation();
  }

  startSimulation() {
    this.simulator.startSimulation();
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
    this.simulator.stickNodes(nodes);
  }

  releaseNodes(nodes?: ISimulationNode[] | undefined): void {
    this.simulator.unstickNodes(nodes);
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
