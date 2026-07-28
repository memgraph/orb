import {
  ILayoutEngine,
  ILayoutSettings,
  ICircularLayoutOptions,
  IGridLayoutOptions,
  IHierarchicalLayoutOptions,
  IForceLayoutOptions,
} from './shared';
import { ForceLayoutEngine } from './engines/dynamic/force-layout-engine';
import { GPUForceLayoutEngine } from './engines/dynamic/gpu-force-layout-engine';
import { CircularLayoutEngine } from './engines/static/circular-layout-engine';
import { GridLayoutEngine } from './engines/static/grid-layout-engine';
import { HierarchicalLayoutEngine } from './engines/static/hierarchical-layout-engine';
import { DeepPartial } from '../../utils/type.utils';

export class LayoutEngineFactory {
  static create(settings?: DeepPartial<ILayoutSettings>): ILayoutEngine {
    switch (settings?.type) {
      case 'circular':
        return new CircularLayoutEngine(settings.options as ICircularLayoutOptions);
      case 'grid':
        return new GridLayoutEngine(settings.options as IGridLayoutOptions);
      case 'hierarchical':
        return new HierarchicalLayoutEngine(settings.options as IHierarchicalLayoutOptions);
      case 'force':
      default: {
        const forceOptions = settings?.options as IForceLayoutOptions | undefined;
        if (forceOptions?.useGPU) {
          try {
            return new GPUForceLayoutEngine(forceOptions);
          } catch {
            console.warn('WebGL2 unavailable, falling back to CPU force layout engine.');
            return new ForceLayoutEngine(forceOptions);
          }
        }
        return new ForceLayoutEngine(forceOptions);
      }
    }
  }
}
