import { ISimulationNode, ISimulationEdge } from '../../shared';
import { ICircularLayoutOptions, DEFAULT_CIRCULAR_LAYOUT_OPTIONS } from '../shared';
import { StaticLayoutEngine } from './static-layout-engine';

export class CircularLayoutEngine extends StaticLayoutEngine {
  protected _config: Required<ICircularLayoutOptions>;

  constructor(options?: ICircularLayoutOptions) {
    super();
    this._config = { ...DEFAULT_CIRCULAR_LAYOUT_OPTIONS, ...options };
  }

  protected calculatePositions(
    nodes: ISimulationNode[],
    _edges: ISimulationEdge[],
    onProgress: (progress: number) => void,
  ) {
    const angleStep = (2 * Math.PI) / nodes.length;
    let lastProgress = -1;

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x = this._config.centerX + this._config.radius * Math.cos(angleStep * i);
      nodes[i].y = this._config.centerY + this._config.radius * Math.sin(angleStep * i);
      lastProgress = this._emitProgress(i + 1, nodes.length, lastProgress, onProgress);
    }
  }
}
