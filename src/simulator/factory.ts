import { DeepPartial } from '../utils/type.utils';
import { ILayoutSettings } from './engine/shared';
import { ISimulator } from './shared';
import { MainThreadSimulator } from './types/main-thread-simulator';
import { WebWorkerSimulator } from './types/web-worker-simulator/web-worker-simulator';

// TODO(dlozic & Alex): CORS handling
export class SimulatorFactory {
  static getSimulator(settings?: DeepPartial<ILayoutSettings>): ISimulator {
    const layoutSettings: DeepPartial<ILayoutSettings> = { type: 'force', ...settings };
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
