// / <reference lib="webworker" />
import { LayoutEngineFactory } from '../../engine/factory';
import { ILayoutEngine, ILayoutSettings } from '../../engine/shared';
import { SimulatorEventType } from '../../shared';
import { IWorkerInputPayload, WorkerInputType } from './message/worker-input';
import { IWorkerOutputPayload, WorkerOutputType } from './message/worker-output';
import { dispatchLayoutInput } from './message/input-dispatch';

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

emitToMain({ type: WorkerOutputType.READY });

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
    dispatchLayoutInput(engine, data);
  }
});
