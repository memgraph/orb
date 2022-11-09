import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';
import { IGraph } from '../models/graph';
import { OrbEmitter } from '../events';

export interface IOrbView<N extends INodeBase, E extends IEdgeBase, S> {
  data: IGraph<N, E>;
  events: OrbEmitter<N, E>;
  getSettings(): S;
  setSettings(settings: Partial<S>): void;
  render(onRendered?: () => void): void;
  recenter(onRendered?: () => void): void;
  destroy(): void;
}
