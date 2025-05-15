import { IEdgeBase } from '../../models/edge';
import { INode, INodeBase, INodePosition } from '../../models/node';
import { CircularLayout } from './layouts/circular';
import { GridLayout } from './layouts/grid';
import { HierarchicalLayout } from './layouts/hierarchical';

export type LayoutType = 'hierarchical' | 'circular' | 'grid';

export interface ILayoutSettings {
  type: LayoutType;
}

export interface ILayout<N extends INodeBase, E extends IEdgeBase> {
  getPositions(nodes: INode<N, E>[]): INodePosition[];
}

// todo(Alex): add layout options
export class LayoutFactory {
  static create<N extends INodeBase, E extends IEdgeBase>(
    type: LayoutType,
    width: number,
    height: number,
  ): ILayout<N, E> | null {
    switch (type) {
      case 'hierarchical':
        return new HierarchicalLayout<N, E>(width, height);
      case 'circular':
        return new CircularLayout<N, E>(width, height);
      case 'grid':
        return new GridLayout<N, E>(width, height);
      default:
        return null;
    }
  }
}
