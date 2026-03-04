import { IPosition } from '../../../common';
import { Emitter } from '../../../utils/emitter.utils';
import { ISimulationNode, ISimulationEdge, ISimulationGraph, ISimulationIds, SimulatorEvents } from '../../shared';
import { ILayoutEngine, IEngineSettingsUpdate, LayoutType } from '../shared';

export abstract class BaseLayoutEngine extends Emitter<SimulatorEvents> implements ILayoutEngine {
  protected _nodes: ISimulationNode[] = [];
  protected _edges: ISimulationEdge[] = [];
  protected _nodeIndexByNodeId: Record<number, number> = {};
  protected _cancelSimulation = false;
  private _schedulerPort: MessagePort | null = null;

  abstract readonly type: LayoutType;

  abstract setupData(data: ISimulationGraph): void;
  abstract mergeData(data: ISimulationGraph): void;
  abstract updateData(data: ISimulationGraph): void;
  abstract deleteData(data: Partial<ISimulationIds>): void;
  abstract patchData(data: Partial<ISimulationGraph>): void;
  abstract clearData(): void;

  abstract activateSimulation(): void;
  abstract stopSimulation(): void;

  abstract startDragNode(): void;
  abstract dragNode(nodeId: number, position: IPosition): void;
  abstract endDragNode(nodeId: number): void;
  abstract fixNodes(nodes?: ISimulationNode[]): void;
  abstract releaseNodes(nodes?: ISimulationNode[]): void;

  abstract setSettings(settings: IEngineSettingsUpdate): void;

  terminate(): void {
    this._cancelSimulation = true;
    this._schedulerPort?.close();
    this._schedulerPort = null;
    this.removeAllListeners();
  }

  // TODO: Add comment
  protected _scheduleNext(callback: () => void): void {
    if (typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel();
      this._schedulerPort = channel.port2;
      channel.port1.onmessage = () => {
        this._schedulerPort = null;
        callback();
      };
      channel.port2.postMessage(null);
    } else {
      setTimeout(callback, 0);
    }
  }

  protected _rebuildNodeIndex(): void {
    this._nodeIndexByNodeId = {};
    for (let i = 0; i < this._nodes.length; i++) {
      this._nodeIndexByNodeId[this._nodes[i].id] = i;
    }
  }
}
