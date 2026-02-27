import { ISimulationNode, ISimulationEdge } from '../../shared';
import { IGridLayoutOptions, DEFAULT_GRID_LAYOUT_OPTIONS } from '../shared';
import { StaticLayoutEngine } from './static-layout-engine';

export class GridLayoutEngine extends StaticLayoutEngine {
  protected _config: Required<IGridLayoutOptions>;

  constructor(options?: IGridLayoutOptions) {
    super();
    this._config = { ...DEFAULT_GRID_LAYOUT_OPTIONS, ...options };
  }

  protected calculatePositions(
    nodes: ISimulationNode[],
    _edges: ISimulationEdge[],
    onProgress: (progress: number) => void,
  ) {
    const rows = Math.ceil(Math.sqrt(nodes.length));
    const cols = Math.ceil(nodes.length / rows);
    let lastProgress = -1;

    for (let i = 0; i < nodes.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      nodes[i].x = col * this._config.colGap;
      nodes[i].y = row * this._config.rowGap;
      lastProgress = this._emitProgress(i + 1, nodes.length, lastProgress, onProgress);
    }
  }
}
