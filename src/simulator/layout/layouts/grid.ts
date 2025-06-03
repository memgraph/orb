import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export interface IGridLayoutOptions {
  rowGap?: number;
  colGap?: number;
}

export const DEFAULT_GRID_LAYOUT_OPTIONS: Required<IGridLayoutOptions> = {
  rowGap: 50,
  colGap: 50,
};

export class GridLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _config: Required<IGridLayoutOptions>;

  constructor(options?: IGridLayoutOptions) {
    this._config = { ...DEFAULT_GRID_LAYOUT_OPTIONS, ...options };
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const rows = Math.ceil(Math.sqrt(nodes.length));
    const cols = Math.ceil(nodes.length / rows);

    const positions: INodePosition[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = col * this._config.colGap;
      const y = row * this._config.rowGap;
      positions.push({ id: nodes[i].getId(), x, y });
    }

    return positions;
  }
}
