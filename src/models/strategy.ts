import { Node, INodeBase } from './node';
import { Edge, IEdgeBase } from './edge';
import { Graph } from './graph';
import { IPosition } from '../common/position';
import { GraphObjectState } from './state';

export interface IEventStrategyResponse<N extends INodeBase, E extends IEdgeBase> {
  isStateChanged: boolean;
  changedSubject?: Node<N, E> | Edge<N, E>;
}

export interface IEventStrategy<N extends INodeBase, E extends IEdgeBase> {
  onMouseClick: ((graph: Graph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>) | null;
  onMouseMove: ((graph: Graph<N, E>, point: IPosition) => IEventStrategyResponse<N, E>) | null;
}

export const getDefaultEventStrategy = <N extends INodeBase, E extends IEdgeBase>(): IEventStrategy<N, E> => {
  return {
    onMouseClick: (graph: Graph<N, E>, point: IPosition): IEventStrategyResponse<N, E> => {
      const node = graph.getNearestNode(point);
      if (node) {
        selectNode(graph, node);
        return {
          isStateChanged: true,
          changedSubject: node,
        };
      }

      const edge = graph.getNearestEdge(point);
      if (edge) {
        selectEdge(graph, edge);
        return {
          isStateChanged: true,
          changedSubject: edge,
        };
      }

      const { changedCount } = unselectAll(graph);
      return {
        isStateChanged: changedCount > 0,
      };
    },
    onMouseMove: (graph: Graph<N, E>, point: IPosition): IEventStrategyResponse<N, E> => {
      // From map view
      const node = graph.getNearestNode(point);
      if (node && !node.isSelected()) {
        hoverNode(graph, node);
        return {
          isStateChanged: true,
          changedSubject: node,
        };
      }

      if (!node) {
        const { changedCount } = unhoverAll(graph);
        return {
          isStateChanged: changedCount > 0,
        };
      }

      return { isStateChanged: false };
    },
  };
};

const selectNode = <N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>, node: Node<N, E>) => {
  unselectAll(graph);
  setNodeState(node, GraphObjectState.SELECTED, { isStateOverride: true });
};

const selectEdge = <N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>, edge: Edge<N, E>) => {
  unselectAll(graph);
  setEdgeState(edge, GraphObjectState.SELECTED, { isStateOverride: true });
};

const unselectAll = <N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>): { changedCount: number } => {
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

const hoverNode = <N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>, node: Node<N, E>) => {
  unhoverAll(graph);
  setNodeState(node, GraphObjectState.HOVERED);
};

// const hoverEdge = <N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>, edge: Edge<N, E>) => {
//   unhoverAll(graph);
//   setEdgeState(edge, GraphObjectState.HOVERED);
// };

const unhoverAll = <N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>): { changedCount: number } => {
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
  node: Node<N, E>,
  state: number,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(node, options)) {
    node.state = state;
  }

  node.getInEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.state = state;
    }
    if (edge.startNode && isStateChangeable(edge.startNode, options)) {
      edge.startNode.state = state;
    }
  });

  node.getOutEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.state = state;
    }
    if (edge.endNode && isStateChangeable(edge.endNode, options)) {
      edge.endNode.state = state;
    }
  });
};

const setEdgeState = <N extends INodeBase, E extends IEdgeBase>(
  edge: Edge<N, E>,
  state: number,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(edge, options)) {
    edge.state = state;
  }

  if (edge.startNode && isStateChangeable(edge.startNode, options)) {
    edge.startNode.state = state;
  }

  if (edge.endNode && isStateChangeable(edge.endNode, options)) {
    edge.endNode.state = state;
  }
};

const isStateChangeable = <N extends INodeBase, E extends IEdgeBase>(
  graphObject: Node<N, E> | Edge<N, E>,
  options?: ISetShapeStateOptions,
): boolean => {
  const isOverride = options?.isStateOverride;
  return isOverride || (!isOverride && !graphObject.state);
};
