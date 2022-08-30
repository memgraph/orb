import { ISimulationEdge, ISimulationNode, ISimulator, ISimulatorEvents } from '../shared';
import { IPosition } from '../../common';
import {
  D3SimulatorEngine,
  D3SimulatorEngineEventType,
  ID3SimulatorEngineSettingsUpdate,
} from '../engine/d3-simulator-engine';

export class MainThreadSimulator implements ISimulator {
  protected readonly simulator: D3SimulatorEngine;

  constructor(events: Partial<ISimulatorEvents>) {
    this.simulator = new D3SimulatorEngine();
    this.simulator.on(D3SimulatorEngineEventType.TICK, (data) => {
      events.onNodeDrag?.(data);
    });
    this.simulator.on(D3SimulatorEngineEventType.END, (data) => {
      events.onNodeDragEnd?.(data);
    });
    this.simulator.on(D3SimulatorEngineEventType.STABILIZATION_STARTED, () => {
      events.onStabilizationStart?.();
    });
    this.simulator.on(D3SimulatorEngineEventType.STABILIZATION_PROGRESS, (data) => {
      events.onStabilizationProgress?.(data);
    });
    this.simulator.on(D3SimulatorEngineEventType.STABILIZATION_ENDED, (data) => {
      events.onStabilizationEnd?.(data);
    });
    this.simulator.on(D3SimulatorEngineEventType.NODE_DRAGGED, (data) => {
      events.onNodeDrag?.(data);
    });
    this.simulator.on(D3SimulatorEngineEventType.SETTINGS_UPDATED, (data) => {
      events.onSettingsUpdate?.(data);
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
    // Do nothing
  }
}
