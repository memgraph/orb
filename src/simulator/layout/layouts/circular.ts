import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export interface ICircularLayoutOptions {
  radius?: number;
  centerX?: number;
  centerY?: number;
}

export const DEFAULT_CIRCULAR_LAYOUT_OPTIONS: Required<ICircularLayoutOptions> = {
  radius: 100,
  centerX: 0,
  centerY: 0,
};

export class CircularLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _config: Required<ICircularLayoutOptions>;

  constructor(options?: ICircularLayoutOptions) {
    this._config = { ...DEFAULT_CIRCULAR_LAYOUT_OPTIONS, ...options };
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const angleStep = (2 * Math.PI) / nodes.length;

    const positions = nodes.map((node, index) => {
      return {
        id: node.id,
        x: this._config.centerX + this._config.radius * Math.cos(angleStep * index),
        y: this._config.centerY + this._config.radius * Math.sin(angleStep * index),
      };
    });

    return positions;
  }
}
