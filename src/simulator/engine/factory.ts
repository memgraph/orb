import { ISimulatorEngine, SimulatorEngineType } from './shared';
import { D3SimulatorEngine } from './types/d3-simulator-engine';
import { GPUSimulatorEngine } from './types/gpu-simulator-engine';

export class SimulatorEngineFactory {
  static getEngine(type: SimulatorEngineType = SimulatorEngineType.D3): ISimulatorEngine {
    switch (type) {
      case SimulatorEngineType.GPU:
        return new GPUSimulatorEngine();
      case SimulatorEngineType.D3:
      default:
        return new D3SimulatorEngine();
    }
  }
}
