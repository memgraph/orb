import { hoverEdge, hoverNode, selectEdge, selectNode, unhoverAll, unselectAll } from '../utils/graph.utils';
import { IEdgeBase } from './edge';
import { IGraph } from './graph';
import { INodeBase } from './node';

export interface IGraphInteraction {
  selectNodeById(id: any): boolean;
  selectEdgeById(id: any): boolean;
  unselectAll(): number;
  hoverNodeById(id: any): boolean;
  hoverEdgeById(id: any): boolean;
  unhoverAll(): number;
}

export class GraphInteraction<N extends INodeBase, E extends IEdgeBase> implements IGraphInteraction {
  private _graph: IGraph<N, E>;

  constructor(graph: IGraph<N, E>) {
    this._graph = graph;
  }

  selectNodeById(id: any): boolean {
    const node = this._graph.getNodeById(id);
    if (!node) {
      return false;
    }
    selectNode(node);
    return true;
  }

  selectEdgeById(id: any): boolean {
    const edge = this._graph.getEdgeById(id);
    if (!edge) {
      return false;
    }
    selectEdge(edge);
    return true;
  }

  unselectAll(): number {
    const { changedCount } = unselectAll(this._graph);
    return changedCount;
  }

  hoverNodeById(id: any): boolean {
    const node = this._graph.getNodeById(id);
    if (!node) {
      return false;
    }
    hoverNode(node);
    return true;
  }

  hoverEdgeById(id: any): boolean {
    const edge = this._graph.getEdgeById(id);
    if (!edge) {
      return false;
    }
    hoverEdge(edge);
    return true;
  }

  unhoverAll(): number {
    const { changedCount } = unhoverAll(this._graph);
    return changedCount;
  }
}
