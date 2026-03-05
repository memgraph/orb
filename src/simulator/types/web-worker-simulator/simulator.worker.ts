// / <reference lib="webworker" />
import { LayoutEngineFactory } from '../../engine/factory';
import { ILayoutEngine, ILayoutSettings } from '../../engine/shared';
import { SimulatorEventType } from '../../shared';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';

let engine: ILayoutEngine | null = null;

const emitToMain = (message: IWorkerOutputPayload) => postMessage(message);

function wireEngineEvents(target: ILayoutEngine) {
  target.on(SimulatorEventType.SIMULATION_START, () => emitToMain({ type: WorkerOutputType.SIMULATION_START }));
  target.on(SimulatorEventType.SIMULATION_PROGRESS, (data) =>
    emitToMain({ type: WorkerOutputType.SIMULATION_PROGRESS, data }),
  );
  target.on(SimulatorEventType.SIMULATION_END, (data) => emitToMain({ type: WorkerOutputType.SIMULATION_END, data }));
  target.on(SimulatorEventType.SIMULATION_STEP, (data) => emitToMain({ type: WorkerOutputType.SIMULATION_STEP, data }));
  target.on(SimulatorEventType.NODE_DRAG, (data) => emitToMain({ type: WorkerOutputType.NODE_DRAG, data }));
  target.on(SimulatorEventType.SETTINGS_UPDATE, (data) => emitToMain({ type: WorkerOutputType.SETTINGS_UPDATE, data }));
}

type ExtractPayload<T extends WorkerInputType> = Extract<IWorkerInputPayload, { type: T }>;
type EngineHandler<T extends WorkerInputType> = (engine: ILayoutEngine, payload: ExtractPayload<T>) => void;

const handlers: { [T in WorkerInputType]?: EngineHandler<T> } = {
  [WorkerInputType.SetupData]: (e, { data }) => e.setupData(data),
  [WorkerInputType.MergeData]: (e, { data }) => e.mergeData(data),
  [WorkerInputType.UpdateData]: (e, { data }) => e.updateData(data),
  [WorkerInputType.DeleteData]: (e, { data }) => e.deleteData(data),
  [WorkerInputType.PatchData]: (e, { data }) => e.patchData(data),
  [WorkerInputType.ClearData]: (e) => e.clearData(),
  [WorkerInputType.ActivateSimulation]: (e) => e.activateSimulation(),
  [WorkerInputType.StopSimulation]: (e) => e.stopSimulation(),
  [WorkerInputType.StartDragNode]: (e) => e.startDragNode(),
  [WorkerInputType.DragNode]: (e, { data }) => e.dragNode(data.id, { x: data.x, y: data.y }),
  [WorkerInputType.EndDragNode]: (e, { data }) => e.endDragNode(data.id),
  [WorkerInputType.FixNodes]: (e, { data }) => e.fixNodes(data.nodes),
  [WorkerInputType.ReleaseNodes]: (e, { data }) => e.releaseNodes(data.nodes),
};

addEventListener('message', ({ data }: MessageEvent<IWorkerInputPayload>) => {
  if (data.type === WorkerInputType.SetSettings) {
    const settings = data.data as ILayoutSettings;
    if (settings.type === engine?.type && settings.options) {
      engine?.setSettings(settings.options);
      return;
    }

    engine?.removeAllListeners();
    engine?.terminate();
    engine = LayoutEngineFactory.create(settings);
    wireEngineEvents(engine);
    return;
  }

  if (engine) {
    const handler = handlers[data.type] as EngineHandler<typeof data.type> | undefined;
    handler?.(engine, data);
  }
});
