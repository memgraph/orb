import {
  ILayoutEngine,
  ILayoutSettings,
  ICircularLayoutOptions,
  IGridLayoutOptions,
  IHierarchicalLayoutOptions,
} from './shared';
import { ForceLayoutEngine } from './engines/force-layout-engine';
import { CircularLayoutEngine } from './engines/circular-layout-engine';
import { GridLayoutEngine } from './engines/grid-layout-engine';
import { HierarchicalLayoutEngine } from './engines/hierarchical-layout-engine';

export class LayoutEngineFactory {
  static create(settings?: Partial<ILayoutSettings>): ILayoutEngine {
    switch (settings?.type) {
      case 'circular':
        return new CircularLayoutEngine(settings.options as ICircularLayoutOptions);
      case 'grid':
        return new GridLayoutEngine(settings.options as IGridLayoutOptions);
      case 'hierarchical':
        return new HierarchicalLayoutEngine(settings.options as IHierarchicalLayoutOptions);
      case 'force':
      default:
        return new ForceLayoutEngine();
    }
  }
}
