import { ISimulator, ISimulatorEvents } from './interface';
import { MainThreadSimulator } from './types/main-thread-simulator';
import { WebWorkerSimulator } from './types/web-worker-simulator/simulator';

export class SimulatorFactory {
  static getSimulator(events: Partial<ISimulatorEvents>): ISimulator {
    if (typeof Worker !== 'undefined') {
      // return new MainThreadSimulator(events);
      return new WebWorkerSimulator(events);
    }
    return new MainThreadSimulator(events);
  }
}
