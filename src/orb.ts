import { Graph, IGraph } from './models/graph';
import { INodeBase } from './models/node';
import { IEdgeBase } from './models/edge';
import { DefaultView } from './views/default-view';
import { getDefaultEventStrategy, IEventStrategy } from './models/strategy';
import { OrbEmitter } from './events';

// TODO: Fix any here
export interface IOrbView<S = any> {
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

export interface IOrbSettings<N extends INodeBase, E extends IEdgeBase, S> {
  view: IOrbViewFactory<N, E, S>;
  strategy: IEventStrategy<N, E>;
}

export class Orb<N extends INodeBase, E extends IEdgeBase, S> {
  private _view: IOrbView;
  private readonly _events: OrbEmitter<N, E>;
  private readonly _graph: IGraph<N, E>;

  private readonly _context: IOrbViewContext<N, E>;

  constructor(private container: HTMLElement, settings?: Partial<IOrbSettings<N, E, S>>) {
    this._events = new OrbEmitter<N, E>();
    this._graph = new Graph<N, E>(undefined, {
      onLoadedImages: () => {
        // Not to call render() before user's .render()
        if (this._view.isInitiallyRendered()) {
          this._view.render();
        }
      },
    });

    this._context = {
      container: this.container,
      graph: this._graph,
      events: this._events,
      strategy: settings?.strategy ?? getDefaultEventStrategy<N, E>(),
    };

    if (settings?.view) {
      this._view = settings.view(this._context);
    } else {
      this._view = new DefaultView<N, E>(this._context);
    }
  }

  get data(): IGraph<N, E> {
    return this._graph;
  }

  get view(): IOrbView<S> {
    return this._view;
  }

  get events(): OrbEmitter<N, E> {
    return this._events;
  }

  setView(factory: IOrbViewFactory<N, E, S>) {
    if (this._view) {
      this._view.destroy();
    }
    this._view = factory(this._context);

    // Reset the existing graph in case of switching between different view types.
    if (this._graph.getNodeCount() > 0) {
      this._graph.reset();
    }
  }
}
