import { ISimulationNode, ISimulationEdge } from '../../../shared';
import { IGridLayoutOptions, DEFAULT_GRID_LAYOUT_OPTIONS, LayoutType } from '../../shared';
import { CHUNK_SIZE, StaticLayoutEngine } from './static-layout-engine';

export class GridLayoutEngine extends StaticLayoutEngine {
  protected _config: Required<IGridLayoutOptions>;

  readonly type: LayoutType = 'grid';

  constructor(options?: IGridLayoutOptions) {
    super();
    this._config = { ...DEFAULT_GRID_LAYOUT_OPTIONS, ...options };
  }

  protected calculatePositions(
    nodes: ISimulationNode[],
    _edges: ISimulationEdge[],
    onProgress: (progress: number) => void,
    isCancelled: () => boolean,
    onComplete: () => void,
  ) {
    const rows = Math.ceil(Math.sqrt(nodes.length));
    const cols = Math.ceil(nodes.length / rows);
    let lastProgress = -1;
    let i = 0;

    const runChunk = () => {
      if (isCancelled()) {
        onComplete();
        return;
      }

      const end = Math.min(i + CHUNK_SIZE, nodes.length);

      for (; i < end; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        nodes[i].x = col * this._config.colGap;
        nodes[i].y = row * this._config.rowGap;
      }

      if (i < nodes.length && !this._cancelSimulation) {
        console.log(i);
        lastProgress = this._emitProgress(i + 1, nodes.length, lastProgress, onProgress);
        this._scheduleNext(runChunk);
      } else {
        onComplete();
      }
    };

    runChunk();
  }
}
