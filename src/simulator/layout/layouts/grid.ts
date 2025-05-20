import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export interface IGridLayoutOptions {
  fit?: boolean;
  rows?: number;
  cols?: number;
  rowGap?: number;
  colGap?: number;
}

export const DEFAULT_GRID_LAYOUT_OPTIONS: IGridLayoutOptions = {
  fit: true,
  rows: 1,
  cols: 1,
  rowGap: 50,
  colGap: 50,
};

export class GridLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _fit: boolean;
  private _rows: number;
  private _cols: number;
  private _rowGap: number;
  private _colGap: number;

  constructor(options?: IGridLayoutOptions) {
    const _options = { ...DEFAULT_GRID_LAYOUT_OPTIONS, ...options } as Required<IGridLayoutOptions>;
    this._fit = _options.fit;
    this._rows = _options.rows;
    this._cols = _options.cols;
    this._rowGap = _options.rowGap;
    this._colGap = _options.colGap;
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const rows = this._fit ? Math.ceil(Math.sqrt(nodes.length)) : this._rows;
    const cols = this._fit ? Math.ceil(nodes.length / rows) : this._cols;

    const positions: INodePosition[] = [];
    nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = col * this._colGap;
      const y = row * this._rowGap;
      positions.push({ id: node.getId(), x, y });
    });

    return positions;
  }
}
