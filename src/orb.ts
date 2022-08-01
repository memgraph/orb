import { Graph } from './models/graph';
import { Node, INodeBase } from './models/node';
import { Edge, IEdgeBase } from './models/edge';
import { DefaultView } from './views/default-view';
import { Emitter } from './utils/emitter.utils';

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
  [OrbEventType.NODE_CLICK]: { node: Node<N, E> };
  [OrbEventType.NODE_HOVER]: { node: Node<N, E> };
  [OrbEventType.EDGE_CLICK]: { edge: Edge<N, E> };
  [OrbEventType.EDGE_HOVER]: { edge: Edge<N, E> };
  [OrbEventType.MOUSE_CLICK]: undefined;
  [OrbEventType.MOUSE_MOVE]: undefined;
  [OrbEventType.TRANSFORM]: undefined;
}> {}

// @ts-ignore
export interface IOrbView<N extends INodeBase, E extends IEdgeBase> {
  // init(): void;
  render(): void;
  // recenter(): void;
  // destroy(): void;
}

export interface IViewContext<N extends INodeBase, E extends IEdgeBase> {
  container: HTMLElement;
  graph: Graph<N, E>;
  events: OrbEmitter<N, E>;
}

export type IOrbViewFactory<N extends INodeBase, E extends IEdgeBase> = (context: IViewContext<N, E>) => IOrbView<N, E>;

export class Orb<N extends INodeBase, E extends IEdgeBase> {
  // TODO: Set to ViewInterface
  view: IOrbView<N, E>;
  readonly events: OrbEmitter<N, E>;
  private readonly graph: Graph<N, E> = new Graph<N, E>();

  constructor(private container: HTMLElement) {
    // TODO @toni: Add top level orb settings as an input here, e.g. select/hover strategy
    this.events = new OrbEmitter<N, E>();
    this.view = new DefaultView<N, E>({
      container: this.container,
      graph: this.graph,
      events: this.events,
    });
  }

  get data(): Graph<N, E> {
    return this.graph;
  }

  setView(factory: IOrbViewFactory<N, E>) {
    // if (this.view) {
    //   this.view.destroy();
    // }
    this.view = factory({
      container: this.container,
      graph: this.graph,
      events: this.events,
    });
  }
}
