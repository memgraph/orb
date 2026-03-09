import { DeepPartial } from '../utils/type.utils';
import { IForceLayoutOptions, ILayoutSettings } from './engine/shared';
import { ISimulator } from './shared';
import { MainThreadSimulator } from './types/main-thread-simulator';
import { WebWorkerSimulator } from './types/web-worker-simulator/web-worker-simulator';

// TODO(dlozic & Alex): CORS handling
export class SimulatorFactory {
  static getSimulator(settings?: DeepPartial<ILayoutSettings>): ISimulator {
    const layoutSettings: DeepPartial<ILayoutSettings> = { type: 'force', ...settings };

    // GPU engine requires main thread (needs WebGL context, cannot run in Web Worker)
    const forceOptions = layoutSettings.options as Partial<IForceLayoutOptions> | undefined;
    if (layoutSettings.type === 'force' && forceOptions?.useGPU) {
      return new MainThreadSimulator(layoutSettings);
    }

    try {
      if (typeof Worker !== 'undefined') {
        return new WebWorkerSimulator(layoutSettings);
      }
      throw new Error('WebWorkers are unavailable in your environment.');
    } catch (err) {
      console.error(
        'Could not create simulator in a WebWorker context. All calculations will be done in the main thread.',
        err,
      );
      return new MainThreadSimulator(layoutSettings);
    }
  }
}
