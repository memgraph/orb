import { Graph, IGraph } from './models/graph';
import { INode, INodeBase } from './models/node';
import { IEdge, IEdgeBase } from './models/edge';
import { DefaultView } from './views/default-view';
import { Emitter } from './utils/emitter.utils';
import { IPosition } from './common/position';
import { getDefaultEventStrategy, IEventStrategy } from './models/strategy';

export enum OrbEventType {
  // TODO: Add drag events, add settings change events
  RENDER_START = 'render-start',
  RENDER_END = 'render-end',
  SIMULATION_START = 'simulation-start',
  SIMULATION_STEP = 'simulation-step',
  SIMULATION_END = 'simulation-end',
  NODE_CLICK = 'node-click',
  NODE_HOVER = 'node-hover',
  EDGE_CLICK = 'edge-click',
  EDGE_HOVER = 'edge-hover',
  MOUSE_CLICK = 'mouse-click',
  MOUSE_MOVE = 'mouse-move',
  TRANSFORM = 'transform',
}

export class OrbEmitter<N extends INodeBase, E extends IEdgeBase> extends Emitter<{
  // TODO: Fill out objects
  [OrbEventType.RENDER_START]: undefined;
  [OrbEventType.RENDER_END]: undefined;
  [OrbEventType.SIMULATION_START]: undefined;
  [OrbEventType.SIMULATION_STEP]: { progress: number };
  [OrbEventType.SIMULATION_END]: undefined;
  [OrbEventType.NODE_CLICK]: { node: INode<N, E>; localPoint: IPosition; globalPoint: IPosition };
  [OrbEventType.NODE_HOVER]: { node: INode<N, E>; localPoint: IPosition; globalPoint: IPosition };
  [OrbEventType.EDGE_CLICK]: { edge: IEdge<N, E>; localPoint: IPosition; globalPoint: IPosition };
  [OrbEventType.EDGE_HOVER]: { edge: IEdge<N, E>; localPoint: IPosition; globalPoint: IPosition };
  [OrbEventType.MOUSE_CLICK]: { subject?: INode<N, E> | IEdge<N, E>; localPoint: IPosition; globalPoint: IPosition };
  [OrbEventType.MOUSE_MOVE]: { subject?: INode<N, E> | IEdge<N, E>; localPoint: IPosition; globalPoint: IPosition };
  [OrbEventType.TRANSFORM]: undefined;
}> {}

export interface IOrbView {
  // init(): void;
  render(callback?: () => void): void;
  recenter(): void;
  destroy(): void;
}

export interface IViewContext<N extends INodeBase, E extends IEdgeBase> {
  container: HTMLElement;
  graph: IGraph<N, E>;
  events: OrbEmitter<N, E>;
  strategy: IEventStrategy<N, E>;
}

export type IOrbViewFactory<N extends INodeBase, E extends IEdgeBase> = (context: IViewContext<N, E>) => IOrbView;

export interface IOrbSettings<N extends INodeBase, E extends IEdgeBase> {
  view: IOrbViewFactory<N, E>;
  strategy: IEventStrategy<N, E>;
}

export class Orb<N extends INodeBase, E extends IEdgeBase> {
  private _view: IOrbView;
  private readonly _events: OrbEmitter<N, E>;
  private readonly _graph: IGraph<N, E> = new Graph<N, E>();

  private readonly _context: IViewContext<N, E>;

  constructor(private container: HTMLElement, settings?: Partial<IOrbSettings<N, E>>) {
    this._events = new OrbEmitter<N, E>();
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

  get view(): IOrbView {
    return this._view;
  }

  get events(): OrbEmitter<N, E> {
    return this._events;
  }

  setView(factory: IOrbViewFactory<N, E>) {
    if (this._view) {
      this._view.destroy();
    }
    this._view = factory(this._context);
  }
}
