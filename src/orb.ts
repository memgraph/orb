import { Graph, IGraph } from './models/graph';
import { INodeBase } from './models/node';
import { IEdgeBase } from './models/edge';
import { DefaultView, IOrbViewFactory, IOrbView, IOrbViewContext } from './views';
import { getDefaultEventStrategy, IEventStrategy } from './models/strategy';
import { OrbEmitter } from './events';
import { getDefaultGraphStyle } from './models/style';

export interface IOrbSettings<N extends INodeBase, E extends IEdgeBase, S> {
  view: IOrbViewFactory<N, E, S>;
  strategy: IEventStrategy<N, E>;
}

// TODO: Change the Orb API to be a single view instance to support non-any <S>
// @see: https://stackoverflow.com/questions/73429628/how-to-setup-typescript-generics-in-class-constructors-and-functions
export class Orb<N extends INodeBase = any, E extends IEdgeBase = any, S = any> {
  private _view: IOrbView<any>;
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
    this._graph.setDefaultStyle(getDefaultGraphStyle());

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
      this._graph.clearPositions();
    }
  }
}
