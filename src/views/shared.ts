import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';
import { IGraph } from '../models/graph';
import { OrbEmitter } from '../events';
import { IGraphInteraction } from '../models/interaction';
import { ISVGExportOptions } from '../renderer/svg';

export interface IOrbView<N extends INodeBase, E extends IEdgeBase, S> {
  data: IGraph<N, E>;
  events: OrbEmitter<N, E>;
  interaction: IGraphInteraction;
  getSettings(): S;
  setSettings(settings: Partial<S>): void;
  render(onRendered?: () => void): void;
  recenter(onRendered?: () => void): void;
  getSVG(options?: ISVGExportOptions): string;
  destroy(): void;
}
