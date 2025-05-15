import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export interface ICircularLayoutOptions {
  radius?: number;
}

export class CircularLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _width: number;
  private _height: number;
  private _radius: number;

  constructor(width: number, height: number, options?: ICircularLayoutOptions) {
    this._width = width;
    this._height = height;
    this._radius = options?.radius || Math.min(width, height) / 2;
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const centerX = this._width / 2;
    const centerY = this._height / 2;
    const angleStep = (2 * Math.PI) / nodes.length;

    return nodes.map((node) => {
      return {
        id: node.getId(),
        x: centerX + this._radius * Math.cos(angleStep * node.getId()),
        y: centerY + this._radius * Math.sin(angleStep * node.getId()),
      };
    });
  }
}
