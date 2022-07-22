import { ISimulator, ISimulatorEvents } from './interface';
import { MainThreadSimulator } from './types/main-thread-simulator';

export class SimulatorFactory {
  static getSimulator(events: Partial<ISimulatorEvents>): ISimulator {
    if (typeof Worker !== 'undefined') {
      return new MainThreadSimulator(events);
    }
    return new MainThreadSimulator(events);
  }
}
