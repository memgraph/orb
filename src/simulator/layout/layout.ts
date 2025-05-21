import { IEdgeBase } from '../../models/edge';
import { INode, INodeBase, INodePosition } from '../../models/node';
import { CircularLayout, ICircularLayoutOptions } from './layouts/circular';
import { GridLayout, IGridLayoutOptions } from './layouts/grid';
import { HierarchicalLayout, IHierarchicalLayoutOptions } from './layouts/hierarchical';

export type LayoutType = 'circular' | 'force' | 'grid' | 'hierarchical';

export type LayoutSettingsMap = {
  circular: ICircularLayoutOptions;
  force: Record<string, never>;
  grid: IGridLayoutOptions;
  hierarchical: IHierarchicalLayoutOptions;
};

export interface ILayoutSettings {
  type: LayoutType;
  options?: LayoutSettingsMap[LayoutType];
}

export interface ILayout<N extends INodeBase, E extends IEdgeBase> {
  getPositions(nodes: INode<N, E>[]): INodePosition[];
}

export class LayoutFactory {
  static create<N extends INodeBase, E extends IEdgeBase>(settings?: Partial<ILayoutSettings>): ILayout<N, E> | null {
    switch (settings?.type) {
      case 'circular':
        return new CircularLayout<N, E>(settings.options as ICircularLayoutOptions);
      case 'force':
        return null;
      case 'grid':
        return new GridLayout<N, E>(settings.options as IGridLayoutOptions);
      case 'hierarchical':
        return new HierarchicalLayout<N, E>(settings.options as IHierarchicalLayoutOptions);
      default:
        throw new Error('Incorrect layout type.');
    }
  }
}
