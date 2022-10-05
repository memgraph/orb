import { ISimulator } from './shared';
import { MainThreadSimulator } from './types/main-thread-simulator';
import { WebWorkerSimulator } from './types/web-worker-simulator/simulator';

export class SimulatorFactory {
  static getSimulator(): ISimulator {
    try {
      if (typeof Worker !== 'undefined') {
        return new WebWorkerSimulator();
      }
      throw new Error('WebWorkers are unavailable in your environment.');
    } catch (err) {
      console.error(
        'Could not create simulator in a WebWorker context. All calculations will be done in the main thread.',
        err,
      );
      return new MainThreadSimulator();
    }
  }
}
