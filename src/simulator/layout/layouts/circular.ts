import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export interface ICircularLayoutOptions {
  radius?: number;
  centerX?: number;
  centerY?: number;
}

export const DEFAULT_CIRCULAR_LAYOUT_OPTIONS: ICircularLayoutOptions = {
  radius: 100,
  centerX: 0,
  centerY: 0,
};

export class CircularLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _radius: number;
  private _centerX: number;
  private _centerY: number;

  constructor(options?: ICircularLayoutOptions) {
    const _options = { ...DEFAULT_CIRCULAR_LAYOUT_OPTIONS, ...options } as Required<ICircularLayoutOptions>;
    this._radius = _options.radius;
    this._centerX = _options.centerX;
    this._centerY = _options.centerY;
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const angleStep = (2 * Math.PI) / nodes.length;

    const positions = nodes.map((node, index) => {
      return {
        id: node.id,
        x: this._centerX + this._radius * Math.cos(angleStep * index),
        y: this._centerY + this._radius * Math.sin(angleStep * index),
      };
    });

    return positions;
  }
}
