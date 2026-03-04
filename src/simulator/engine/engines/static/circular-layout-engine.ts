import { ISimulationNode, ISimulationEdge } from '../../../shared';
import { ICircularLayoutOptions, DEFAULT_CIRCULAR_LAYOUT_OPTIONS, LayoutType } from '../../shared';
import { CHUNK_SIZE, StaticLayoutEngine } from './static-layout-engine';

export class CircularLayoutEngine extends StaticLayoutEngine {
  protected _config: Required<ICircularLayoutOptions>;

  readonly type: LayoutType = 'circular';

  constructor(options?: ICircularLayoutOptions) {
    super();
    this._config = { ...DEFAULT_CIRCULAR_LAYOUT_OPTIONS, ...options };
  }

  protected calculatePositions(
    nodes: ISimulationNode[],
    _edges: ISimulationEdge[],
    onProgress: (progress: number) => void,
    isCancelled: () => boolean,
    onComplete: () => void,
  ) {
    const angleStep = (2 * Math.PI) / nodes.length;
    let lastProgress = -1;
    let i = 0;

    const runChunk = () => {
      if (isCancelled()) {
        onComplete();
        return;
      }

      const end = Math.min(i + CHUNK_SIZE, nodes.length);

      for (; i < end; i++) {
        nodes[i].x = this._config.centerX + this._config.radius * Math.cos(angleStep * i);
        nodes[i].y = this._config.centerY + this._config.radius * Math.sin(angleStep * i);
      }

      if (i < nodes.length && !this._cancelSimulation) {
        lastProgress = this._emitProgress(i + 1, nodes.length, lastProgress, onProgress);
        this._scheduleNext(runChunk);
      } else {
        onComplete();
      }
    };

    runChunk();
  }
}
