import { INode, INodeBase } from './node';
import { IEdge, IEdgeBase } from './edge';
import { IGraph } from './graph';
import { IPosition } from '../common';
import { GraphObjectState } from './state';

export interface IEventStrategySettings {
  isDefaultSelectEnabled: boolean;
  isDefaultHoverEnabled: boolean;
}

export interface IEventStrategyResponse<N extends INodeBase, E extends IEdgeBase> {
  isStateChanged: boolean;
  changedSubject?: INode<N, E> | IEdge<N, E>;
}

export interface IEventStrategy<N extends INodeBase, E extends IEdgeBase> {
  isSelectEnabled: boolean;
  isHoverEnabled: boolean;
  onMouseClick: (graph: IGraph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>;
  onMouseMove: (graph: IGraph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>;
  onMouseRightClick: (graph: IGraph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>;
  onMouseDoubleClick: (graph: IGraph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>;
}

export class DefaultEventStrategy<N extends INodeBase, E extends IEdgeBase> implements IEventStrategy<N, E> {
  private _lastHoveredNode?: INode<N, E>;
  public isSelectEnabled: boolean;
  public isHoverEnabled: boolean;

  constructor(settings: IEventStrategySettings) {
    this.isSelectEnabled = settings.isDefaultSelectEnabled;
    this.isHoverEnabled = settings.isDefaultHoverEnabled;
  }

  onMouseClick(graph: IGraph<N, E>, point: IPosition): IEventStrategyResponse<N, E> {
    const node = graph.getNearestNode(point);
    if (node) {
      if (this.isSelectEnabled) {
        selectNode(graph, node);
      }

      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    const edge = graph.getNearestEdge(point);
    if (edge) {
      if (this.isSelectEnabled) {
        selectEdge(graph, edge);
      }

      return {
        isStateChanged: true,
        changedSubject: edge,
      };
    }

    if (!this.isSelectEnabled) {
      return { isStateChanged: false };
    }

    const { changedCount } = unselectAll(graph);
    return {
      isStateChanged: changedCount > 0,
    };
  }

  onMouseMove(graph: IGraph<N, E>, point: IPosition): IEventStrategyResponse<N, E> {
    const node = graph.getNearestNode(point);
    if (node && (!this.isSelectEnabled || (this.isSelectEnabled && !node.isSelected()))) {
      if (node === this._lastHoveredNode) {
        return {
          changedSubject: node,
          isStateChanged: false,
        };
      }

      if (this.isHoverEnabled) {
        hoverNode(graph, node);
      }

      this._lastHoveredNode = node;
      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    this._lastHoveredNode = undefined;
    if (!node && this.isHoverEnabled) {
      const { changedCount } = unhoverAll(graph);
      return {
        isStateChanged: changedCount > 0,
      };
    }

    return { isStateChanged: false };
  }

  onMouseRightClick(graph: IGraph<N, E>, point: IPosition): IEventStrategyResponse<N, E> {
    const node = graph.getNearestNode(point);
    if (node) {
      if (this.isSelectEnabled) {
        selectNode(graph, node);
      }

      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    const edge = graph.getNearestEdge(point);
    if (edge) {
      if (this.isSelectEnabled) {
        selectEdge(graph, edge);
      }

      return {
        isStateChanged: true,
        changedSubject: edge,
      };
    }

    if (!this.isSelectEnabled) {
      return { isStateChanged: false };
    }

    const { changedCount } = unselectAll(graph);
    return {
      isStateChanged: changedCount > 0,
    };
  }

  onMouseDoubleClick(graph: IGraph<N, E>, point: IPosition): IEventStrategyResponse<N, E> {
    const node = graph.getNearestNode(point);
    if (node) {
      if (this.isSelectEnabled) {
        selectNode(graph, node);
      }

      return {
        isStateChanged: true,
        changedSubject: node,
      };
    }

    const edge = graph.getNearestEdge(point);
    if (edge) {
      if (this.isSelectEnabled) {
        selectEdge(graph, edge);
      }

      return {
        isStateChanged: true,
        changedSubject: edge,
      };
    }

    if (!this.isSelectEnabled) {
      return { isStateChanged: false };
    }

    const { changedCount } = unselectAll(graph);
    return {
      isStateChanged: changedCount > 0,
    };
  }
}

const selectNode = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>, node: INode<N, E>) => {
  unselectAll(graph);
  setNodeState(node, GraphObjectState.SELECTED, { isStateOverride: true });
};

const selectEdge = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>, edge: IEdge<N, E>) => {
  unselectAll(graph);
  setEdgeState(edge, GraphObjectState.SELECTED, { isStateOverride: true });
};

const unselectAll = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>): { changedCount: number } => {
  const selectedNodes = graph.getNodes((node) => node.isSelected());
  for (let i = 0; i < selectedNodes.length; i++) {
    selectedNodes[i].clearState();
  }

  const selectedEdges = graph.getEdges((edge) => edge.isSelected());
  for (let i = 0; i < selectedEdges.length; i++) {
    selectedEdges[i].clearState();
  }

  return { changedCount: selectedNodes.length + selectedEdges.length };
};

const hoverNode = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>, node: INode<N, E>) => {
  unhoverAll(graph);
  setNodeState(node, GraphObjectState.HOVERED);
};

// const hoverEdge = <N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>, edge: Edge<N, E>) => {
//   unhoverAll(graph);
//   setEdgeState(edge, GraphObjectState.HOVERED);
// };

const unhoverAll = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>): { changedCount: number } => {
  const hoveredNodes = graph.getNodes((node) => node.isHovered());
  for (let i = 0; i < hoveredNodes.length; i++) {
    hoveredNodes[i].clearState();
  }

  const hoveredEdges = graph.getEdges((edge) => edge.isHovered());
  for (let i = 0; i < hoveredEdges.length; i++) {
    hoveredEdges[i].clearState();
  }

  return { changedCount: hoveredNodes.length + hoveredEdges.length };
};

interface ISetShapeStateOptions {
  isStateOverride: boolean;
}

const setNodeState = <N extends INodeBase, E extends IEdgeBase>(
  node: INode<N, E>,
  state: number,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(node, options)) {
    node.setState(state);
  }

  node.getInEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.setState(state);;
    }
    if (edge.startNode && isStateChangeable(edge.startNode, options)) {
      edge.startNode.setState(state);
    }
  });

  node.getOutEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.setState(state);;
    }
    if (edge.endNode && isStateChangeable(edge.endNode, options)) {
      edge.endNode.setState(state);
    }
  });
};

const setEdgeState = <N extends INodeBase, E extends IEdgeBase>(
  edge: IEdge<N, E>,
  state: number,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(edge, options)) {
    edge.setState(state);;
  }

  if (edge.startNode && isStateChangeable(edge.startNode, options)) {
    edge.startNode.setState(state);
  }

  if (edge.endNode && isStateChangeable(edge.endNode, options)) {
    edge.endNode.setState(state);
  }
};

const isStateChangeable = <N extends INodeBase, E extends IEdgeBase>(
  graphObject: INode<N, E> | IEdge<N, E>,
  options?: ISetShapeStateOptions,
): boolean => {
  const isOverride = options?.isStateOverride;
  return isOverride || (!isOverride && !graphObject.state);
};
