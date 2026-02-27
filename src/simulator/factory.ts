import { ISimulator } from './shared';
import { MainThreadSimulator } from './types/main-thread-simulator';
import { WebWorkerSimulator } from './types/web-worker-simulator/web-worker-simulator';
import { SimulatorEngineType } from './engine/shared';
import { SimulatorEngineFactory } from './engine/factory';

// TODO(dlozic & Alex): CORS handling
export class SimulatorFactory {
  static getSimulator(engineType?: SimulatorEngineType): ISimulator {
    // GPU engine requires main thread (needs WebGL context)
    if (engineType === SimulatorEngineType.GPU) {
      const engine = SimulatorEngineFactory.getEngine(SimulatorEngineType.GPU);
      return new MainThreadSimulator(engine);
    }

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
