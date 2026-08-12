import { IPosition } from '../../../common';
import {
  ISimulator,
  ISimulationNode,
  ISimulationEdge,
  SimulatorEventType,
  SimulatorEvents,
  ISimulationGraph,
  ISimulationIds,
  relaySimulatorEvents,
} from '../../shared';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';
import { dispatchLayoutInput } from './message/input-dispatch';
import { Emitter } from '../../../utils/emitter.utils';
import { ILayoutSettings } from '../../engine/shared';
import { DeepPartial } from '../../../utils/type.utils';
import { MainThreadSimulator } from '../main-thread-simulator';
import workerSource from './simulator.worker.inline';

const WORKER_READY_TIMEOUT_MS = 3000;

export class WebWorkerSimulator extends Emitter<SimulatorEvents> implements ISimulator {
  protected _worker?: Worker;
  private _blobUrl?: string;
  private _settings: DeepPartial<ILayoutSettings>;
  private _isSimulationRunning = false;

  private _fallback: ISimulator | null = null;
  private _ready = false;
  private _pending: IWorkerInputPayload[] = [];
  private _readyTimer?: ReturnType<typeof setTimeout>;
  private _hasWarned = false;

  constructor(settings: DeepPartial<ILayoutSettings>) {
    super();
    this._settings = settings;

    let worker: Worker;
    try {
      this._blobUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
      worker = new Worker(this._blobUrl);
    } catch (error) {
      this._activateFallback(error);
      return;
    }

    this._worker = worker;
    worker.onerror = (event) => {
      // Only recover from failures before the worker has started. Once it has posted
      // READY, the graph state lives in the worker and was never snapshotted, so swapping
      // in a fresh main-thread simulator would blank the graph. A post-startup error is
      // also rarely recoverable (the fallback runs the same engine), so keep the last
      // layout and stop simulating instead.
      if (this._ready) {
        this._warnWorkerError(event);
        return;
      }
      this._activateFallback(event);
    };
    worker.onmessage = this._handleWorkerMessage;

    this._readyTimer = setTimeout(() => {
      if (!this._ready && !this._fallback) {
        this._activateFallback(new Error('Web Worker readiness handshake timed out.'));
      }
    }, WORKER_READY_TIMEOUT_MS);

    this.emitToWorker({ type: WorkerInputType.SetSettings, data: settings });
  }

  private _handleWorkerMessage = ({ data }: MessageEvent<IWorkerOutputPayload>) => {
    switch (data.type) {
      case WorkerOutputType.READY: {
        this._markReady();
        break;
      }
      case WorkerOutputType.SIMULATION_START: {
        this.emit(SimulatorEventType.SIMULATION_START, undefined);
        this._isSimulationRunning = true;
        break;
      }
      case WorkerOutputType.SIMULATION_PROGRESS: {
        this.emit(SimulatorEventType.SIMULATION_PROGRESS, data.data);
        break;
      }
      case WorkerOutputType.SIMULATION_END: {
        this.emit(SimulatorEventType.SIMULATION_END, data.data);
        this._isSimulationRunning = false;
        break;
      }
      case WorkerOutputType.SIMULATION_STEP: {
        this.emit(SimulatorEventType.SIMULATION_STEP, data.data);
        break;
      }
      case WorkerOutputType.NODE_DRAG: {
        this.emit(SimulatorEventType.NODE_DRAG, data.data);
        break;
      }
      case WorkerOutputType.NODE_DRAG_END: {
        this.emit(SimulatorEventType.NODE_DRAG_END, data.data);
        break;
      }
      case WorkerOutputType.SETTINGS_UPDATE: {
        this.emit(SimulatorEventType.SETTINGS_UPDATE, data.data);
        break;
      }
    }
  };

  /**
   * Creates a new graph with the specified data. Any existing data gets discarded.
   * This action creates a new simulation object but keeps the existing simulation settings.
   *
   * @param {ISimulationGraph} data New graph (nodes and edges).
   */
  setupData(data: ISimulationGraph) {
    this.emitToWorker({ type: WorkerInputType.SetupData, data });
  }

  /**
   * Inserts or updates data to an existing graph. (Also known as upsert)
   *
   * @param {ISimulationGraph} data Added graph data (nodes and edges).
   */
  mergeData(data: ISimulationGraph) {
    this.emitToWorker({ type: WorkerInputType.MergeData, data });
  }

  updateData(data: ISimulationGraph) {
    this.emitToWorker({ type: WorkerInputType.UpdateData, data });
  }

  deleteData(data: ISimulationIds) {
    this.emitToWorker({ type: WorkerInputType.DeleteData, data });
  }

  patchData(data: Partial<ISimulationGraph>): void {
    this.emitToWorker({ type: WorkerInputType.PatchData, data });
  }

  clearData() {
    this.emitToWorker({ type: WorkerInputType.ClearData });
  }

  activateSimulation() {
    this.emitToWorker({ type: WorkerInputType.ActivateSimulation });
  }

  stopSimulation() {
    this.emitToWorker({ type: WorkerInputType.StopSimulation });
  }

  updateSimulation(nodes: ISimulationNode[], edges: ISimulationEdge[]) {
    this.emitToWorker({ type: WorkerInputType.UpdateSimulation, data: { nodes, edges } });
  }

  startDragNode() {
    this.emitToWorker({ type: WorkerInputType.StartDragNode });
  }

  dragNode(nodeId: number, position: IPosition) {
    this.emitToWorker({ type: WorkerInputType.DragNode, data: { id: nodeId, ...position } });
  }

  endDragNode(nodeId: number) {
    this.emitToWorker({ type: WorkerInputType.EndDragNode, data: { id: nodeId } });
  }

  fixNodes(nodes?: ISimulationNode[]) {
    this.emitToWorker({ type: WorkerInputType.FixNodes, data: { nodes } });
  }

  releaseNodes(nodes?: ISimulationNode[]): void {
    this.emitToWorker({ type: WorkerInputType.ReleaseNodes, data: { nodes } });
  }

  setSettings(settings: ILayoutSettings) {
    this.emitToWorker({
      type: WorkerInputType.SetSettings,
      data: settings,
    } satisfies IWorkerInputPayload);
  }

  isSimulationRunning(): boolean {
    return this._fallback ? this._fallback.isSimulationRunning() : this._isSimulationRunning;
  }

  terminate() {
    if (this._readyTimer !== undefined) {
      clearTimeout(this._readyTimer);
      this._readyTimer = undefined;
    }
    this._revokeBlobUrl();
    if (this._worker) {
      this._worker.onmessage = null;
      this._worker.onerror = null;
      this._worker.terminate();
      this._worker = undefined;
    }
    this._fallback?.terminate();
    this.removeAllListeners();
  }

  protected emitToWorker(message: IWorkerInputPayload) {
    if (this._fallback) {
      this._applyToFallback(this._fallback, message);
      return;
    }
    if (!this._ready) {
      this._pending.push(message);
    }
    this._worker?.postMessage(message);
  }

  private _markReady() {
    if (this._ready) {
      return;
    }
    this._ready = true;
    this._pending = [];
    if (this._readyTimer !== undefined) {
      clearTimeout(this._readyTimer);
      this._readyTimer = undefined;
    }
    this._revokeBlobUrl();
  }

  private _activateFallback(reason: unknown) {
    if (this._fallback) {
      return;
    }
    this._warnFallback(reason);

    if (this._readyTimer !== undefined) {
      clearTimeout(this._readyTimer);
      this._readyTimer = undefined;
    }
    if (this._worker) {
      this._worker.onmessage = null;
      this._worker.onerror = null;
      try {
        this._worker.terminate();
      } catch {
        /* empty */
      }
      this._worker = undefined;
    }
    this._revokeBlobUrl();

    const fallback = new MainThreadSimulator(this._settings);
    this._wireFallbackEvents(fallback);
    this._fallback = fallback;

    const pending = this._pending;
    this._pending = [];
    for (const message of pending) {
      this._applyToFallback(fallback, message);
    }
  }

  private _wireFallbackEvents(fallback: ISimulator) {
    relaySimulatorEvents(fallback, this, (isRunning) => {
      this._isSimulationRunning = isRunning;
    });
  }

  private _applyToFallback(fallback: ISimulator, message: IWorkerInputPayload) {
    if (message.type === WorkerInputType.SetSettings) {
      fallback.setSettings(message.data);
      return;
    }
    dispatchLayoutInput(fallback, message);
  }

  private _revokeBlobUrl() {
    if (this._blobUrl) {
      URL.revokeObjectURL(this._blobUrl);
      this._blobUrl = undefined;
    }
  }

  private _warnWorkerError(reason: unknown) {
    if (this._hasWarned) {
      return;
    }
    this._hasWarned = true;
    console.warn(
      'Orb: the layout Web Worker errored after it had started. The current layout is kept ' +
        'and no further updates will be simulated; reload the graph to recover.',
      reason,
    );
  }

  private _warnFallback(reason: unknown) {
    if (this._hasWarned) {
      return;
    }
    this._hasWarned = true;
    console.warn(
      'Orb: the layout Web Worker could not start; falling back to the main-thread simulator. ' +
        'Layout is still correct but runs on the main thread. Under a strict Content Security ' +
        'Policy, allow blob workers (e.g. `worker-src blob:` or `child-src blob:`) to re-enable ' +
        'off-main-thread layout.',
      reason,
    );
  }
}
