import { IEdgeBase } from '../../models/edge';
import { INode, INodeBase, INodePosition } from '../../models/node';
import { CircleLayout } from './layouts/circle';

export enum layouts {
  DEFAULT = 'default',
  CIRCLE = 'circle',
}

export interface ILayout<N extends INodeBase, E extends IEdgeBase> {
  getPositions(nodes: INode<N, E>[], width: number, height: number): INodePosition[];
}

export class Layout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private readonly _layout: ILayout<N, E> | null;

  private layoutByLayoutName: Record<string, ILayout<N, E> | null> = {
    [layouts.DEFAULT]: null,
    [layouts.CIRCLE]: new CircleLayout(),
  };

  constructor(layoutName: string) {
    this._layout = this.layoutByLayoutName[layoutName];
  }

  getPositions(nodes: INode<N, E>[], width: number, height: number): INodePosition[] {
    return this._layout === null ? [] : this._layout.getPositions(nodes, width, height);
  }
}
