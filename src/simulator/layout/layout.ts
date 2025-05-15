import { IEdgeBase } from '../../models/edge';
import { INode, INodeBase, INodePosition } from '../../models/node';
import { CircularLayout, ICircularLayoutOptions } from './layouts/circular';
import { GridLayout } from './layouts/grid';
import { HierarchicalLayout, IHierarchicalLayoutOptions } from './layouts/hierarchical';

export type LayoutType = 'hierarchical' | 'circular' | 'grid';

export type LayoutSettingsMap = {
  hierarchical: IHierarchicalLayoutOptions;
  circular: ICircularLayoutOptions;
  grid: Record<string, never>;
};

export interface ILayoutSettings {
  type: LayoutType;
  options?: LayoutSettingsMap[LayoutType];
}

export interface ILayout<N extends INodeBase, E extends IEdgeBase> {
  getPositions(nodes: INode<N, E>[]): INodePosition[];
}

export class LayoutFactory {
  static create<N extends INodeBase, E extends IEdgeBase>(
    width: number,
    height: number,
    settings?: Partial<ILayoutSettings>,
  ): ILayout<N, E> | null {
    switch (settings?.type) {
      case 'hierarchical':
        return new HierarchicalLayout<N, E>(width, height, settings.options as IHierarchicalLayoutOptions);
      case 'circular':
        return new CircularLayout<N, E>(width, height, settings.options as ICircularLayoutOptions);
      case 'grid':
        return new GridLayout<N, E>(width, height);
      default:
        return null;
    }
  }
}
