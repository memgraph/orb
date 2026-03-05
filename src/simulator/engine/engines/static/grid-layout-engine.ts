import { ISimulationNode, ISimulationEdge } from '../../../shared';
import { IGridLayoutOptions, DEFAULT_GRID_LAYOUT_OPTIONS, LayoutType } from '../../shared';
import { CHUNK_SIZE, StaticLayoutEngine } from './static-layout-engine';

export class GridLayoutEngine extends StaticLayoutEngine {
  protected _config: IGridLayoutOptions;

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
    let step = 0;

    const runChunk = () => {
      if (isCancelled()) {
        onComplete();
        return;
      }

      const end = Math.min(step + CHUNK_SIZE, nodes.length);

      for (; step < end; step++) {
        const row = Math.floor(step / cols);
        const col = step % cols;
        nodes[step].x = col * this._config.colGap;
        nodes[step].y = row * this._config.rowGap;
      }

      if (step < nodes.length && !this._cancelSimulation) {
        console.log(step);
        lastProgress = this._emitProgress(step + 1, nodes.length, lastProgress, onProgress);
        this._scheduleNext(runChunk);
      } else {
        onComplete();
      }
    };

    runChunk();
  }
}
