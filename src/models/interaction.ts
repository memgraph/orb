import {
  hoverEdge,
  hoverNode,
  ISelectionOptions,
  selectEdge,
  selectEdges,
  selectNode,
  selectNodes,
  unhoverAll,
  unselectAll,
  unselectEdge,
  unselectEdges,
  unselectNode,
  unselectNodes,
} from '../utils/graph.utils';
import { IEdge, IEdgeBase } from './edge';
import { IGraph } from './graph';
import { INode, INodeBase } from './node';

export interface IGraphInteraction {
  selectNodeById(id: any, options?: ISelectionOptions): boolean;
  selectNodesByIds(ids: any[], options?: ISelectionOptions): number;
  selectEdgeById(id: any, options?: ISelectionOptions): boolean;
  selectEdgesByIds(ids: any[], options?: ISelectionOptions): number;
  unselectNodeById(id: any, options?: ISelectionOptions): boolean;
  unselectNodesByIds(ids: any[], options?: ISelectionOptions): number;
  unselectEdgeById(id: any, options?: ISelectionOptions): boolean;
  unselectEdgesByIds(ids: any[], options?: ISelectionOptions): number;
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

  selectNodeById(id: any, options?: ISelectionOptions): boolean {
    const node = this._graph.getNodeById(id);
    if (!node) {
      return false;
    }
    selectNode(node, options);
    return true;
  }

  // Defaults to non-cascading (unlike selectNodeById): only the listed nodes change state.
  selectNodesByIds(ids: any[], options?: ISelectionOptions): number {
    const nodes: INode<N, E>[] = [];
    for (let i = 0; i < ids.length; i++) {
      const node = this._graph.getNodeById(ids[i]);
      if (node) {
        nodes.push(node);
      }
    }
    const { changedCount } = selectNodes(nodes, { cascade: false, ...options });
    return changedCount;
  }

  selectEdgeById(id: any, options?: ISelectionOptions): boolean {
    const edge = this._graph.getEdgeById(id);
    if (!edge) {
      return false;
    }
    selectEdge(edge, options);
    return true;
  }

  // Defaults to non-cascading (unlike selectEdgeById): only the listed edges change state.
  selectEdgesByIds(ids: any[], options?: ISelectionOptions): number {
    const edges: IEdge<N, E>[] = [];
    for (let i = 0; i < ids.length; i++) {
      const edge = this._graph.getEdgeById(ids[i]);
      if (edge) {
        edges.push(edge);
      }
    }
    const { changedCount } = selectEdges(edges, { cascade: false, ...options });
    return changedCount;
  }

  unselectNodeById(id: any, options?: ISelectionOptions): boolean {
    const node = this._graph.getNodeById(id);
    if (!node) {
      return false;
    }
    unselectNode(node, options);
    return true;
  }

  unselectNodesByIds(ids: any[], options?: ISelectionOptions): number {
    const nodes: INode<N, E>[] = [];
    for (let i = 0; i < ids.length; i++) {
      const node = this._graph.getNodeById(ids[i]);
      if (node) {
        nodes.push(node);
      }
    }
    const { changedCount } = unselectNodes(nodes, { cascade: false, ...options });
    return changedCount;
  }

  unselectEdgeById(id: any, options?: ISelectionOptions): boolean {
    const edge = this._graph.getEdgeById(id);
    if (!edge) {
      return false;
    }
    unselectEdge(edge, options);
    return true;
  }

  unselectEdgesByIds(ids: any[], options?: ISelectionOptions): number {
    const edges: IEdge<N, E>[] = [];
    for (let i = 0; i < ids.length; i++) {
      const edge = this._graph.getEdgeById(ids[i]);
      if (edge) {
        edges.push(edge);
      }
    }
    const { changedCount } = unselectEdges(edges, { cascade: false, ...options });
    return changedCount;
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
