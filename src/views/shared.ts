import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';
import { IGraph } from '../models/graph';
import { OrbEmitter } from '../events';
import { IEventStrategy } from '../models/strategy';

export interface IOrbView<S> {
  isInitiallyRendered(): boolean;
  getSettings(): S;
  setSettings(settings: Partial<S>): void;
  render(onRendered?: () => void): void;
  recenter(onRendered?: () => void): void;
  destroy(): void;
}

export interface IOrbViewContext<N extends INodeBase, E extends IEdgeBase> {
  container: HTMLElement;
  graph: IGraph<N, E>;
  events: OrbEmitter<N, E>;
  strategy: IEventStrategy<N, E>;
}

export type IOrbViewFactory<N extends INodeBase, E extends IEdgeBase, S> = (
  context: IOrbViewContext<N, E>,
) => IOrbView<S>;
