import { Graph } from './models/graph';
import { INodeBase } from './models/node';
import { IEdgeBase } from './models/edge';

export class Orb<N extends INodeBase, E extends IEdgeBase> {
  private graph: Graph<N, E> = new Graph<N, E>();

  constructor() {
    // TODO @toni: Add top level orb settings as an input here, e.g. select/hover strategy
    // Do nothing
  }

  get data(): Graph<N, E> {
    return this.graph;
  }
}
