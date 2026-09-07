import { IEdge, IEdgeBase } from '../models/edge';
import { IGraph } from '../models/graph';
import { INode, INodeBase } from '../models/node';
import { GraphObjectState } from '../models/state';
import { IFitZoomTransformOptions } from '../renderer/shared';
import { ILayoutSettings } from '../simulator';
import { IHierarchicalLayoutOptions } from '../simulator/engine/shared';

export interface ISelectionOptions {
  cascade?: boolean;
}

export const selectNode = <N extends INodeBase, E extends IEdgeBase>(
  node: INode<N, E>,
  options?: ISelectionOptions,
) => {
  if (options?.cascade ?? true) {
    setNodeState(node, GraphObjectState.SELECTED, { isStateOverride: true });
  } else {
    node.setState(GraphObjectState.SELECTED, { isNotifySkipped: true });
  }
};

export const selectEdge = <N extends INodeBase, E extends IEdgeBase>(
  edge: IEdge<N, E>,
  options?: ISelectionOptions,
) => {
  if (options?.cascade ?? true) {
    setEdgeState(edge, GraphObjectState.SELECTED, { isStateOverride: true });
  } else {
    edge.setState(GraphObjectState.SELECTED, { isNotifySkipped: true });
  }
};

export const unselectNode = <N extends INodeBase, E extends IEdgeBase>(
  node: INode<N, E>,
  options?: ISelectionOptions,
) => {
  if (options?.cascade ?? true) {
    setNodeState(node, GraphObjectState.NONE, { isStateOverride: true });
  } else {
    node.clearState();
  }
};

export const unselectEdge = <N extends INodeBase, E extends IEdgeBase>(
  edge: IEdge<N, E>,
  options?: ISelectionOptions,
) => {
  if (options?.cascade ?? true) {
    setEdgeState(edge, GraphObjectState.NONE, { isStateOverride: true });
  } else {
    edge.clearState();
  }
};

export const selectOnlyNode = <N extends INodeBase, E extends IEdgeBase>(
  graph: IGraph<N, E>,
  node: INode<N, E>,
  options?: ISelectionOptions,
) => {
  unselectAll(graph);
  selectNode(node, options);
};

export const selectNodes = <N extends INodeBase, E extends IEdgeBase>(
  nodes: INode<N, E>[],
  options?: ISelectionOptions,
): { changedCount: number } => {
  let changedCount = 0;
  for (let i = 0; i < nodes.length; i++) {
    const previousState = nodes[i].getState();
    selectNode(nodes[i], options);
    if (nodes[i].getState() !== previousState) {
      changedCount += 1;
    }
  }
  return { changedCount };
};

export const unselectNodes = <N extends INodeBase, E extends IEdgeBase>(
  nodes: INode<N, E>[],
  options?: ISelectionOptions,
): { changedCount: number } => {
  let changedCount = 0;
  for (let i = 0; i < nodes.length; i++) {
    const previousState = nodes[i].getState();
    unselectNode(nodes[i], options);
    if (nodes[i].getState() !== previousState) {
      changedCount += 1;
    }
  }
  return { changedCount };
};

export const selectEdges = <N extends INodeBase, E extends IEdgeBase>(
  edges: IEdge<N, E>[],
  options?: ISelectionOptions,
): { changedCount: number } => {
  let changedCount = 0;
  for (let i = 0; i < edges.length; i++) {
    const previousState = edges[i].getState();
    selectEdge(edges[i], options);
    if (edges[i].getState() !== previousState) {
      changedCount += 1;
    }
  }
  return { changedCount };
};

export const unselectEdges = <N extends INodeBase, E extends IEdgeBase>(
  edges: IEdge<N, E>[],
  options?: ISelectionOptions,
): { changedCount: number } => {
  let changedCount = 0;
  for (let i = 0; i < edges.length; i++) {
    const previousState = edges[i].getState();
    unselectEdge(edges[i], options);
    if (edges[i].getState() !== previousState) {
      changedCount += 1;
    }
  }
  return { changedCount };
};

export const selectOnlyEdge = <N extends INodeBase, E extends IEdgeBase>(
  graph: IGraph<N, E>,
  edge: IEdge<N, E>,
  options?: ISelectionOptions,
) => {
  unselectAll(graph);
  selectEdge(edge, options);
};

export const toggleNodeSelection = <N extends INodeBase, E extends IEdgeBase>(node: INode<N, E>) => {
  if (node.isSelected()) {
    unselectNode(node, { cascade: false });
  } else {
    selectNode(node, { cascade: false });
  }
};

export const toggleEdgeSelection = <N extends INodeBase, E extends IEdgeBase>(edge: IEdge<N, E>) => {
  if (edge.isSelected()) {
    unselectEdge(edge, { cascade: false });
  } else {
    selectEdge(edge, { cascade: false });
  }
};

export const unselectAll = <N extends INodeBase, E extends IEdgeBase>(
  graph: IGraph<N, E>,
): { changedCount: number } => {
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

export const hoverNode = <N extends INodeBase, E extends IEdgeBase>(node: INode<N, E>) => {
  setNodeState(node, GraphObjectState.HOVERED);
};

export const hoverOnlyNode = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>, node: INode<N, E>) => {
  unhoverAll(graph);
  hoverNode(node);
};

export const hoverEdge = <N extends INodeBase, E extends IEdgeBase>(edge: IEdge<N, E>) => {
  setEdgeState(edge, GraphObjectState.HOVERED);
};

export const hoverOnlyEdge = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>, edge: IEdge<N, E>) => {
  unhoverAll(graph);
  hoverEdge(edge);
};

export const unhoverAll = <N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>): { changedCount: number } => {
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

export interface ISetShapeStateOptions {
  isStateOverride: boolean;
}

export const setNodeState = <N extends INodeBase, E extends IEdgeBase>(
  node: INode<N, E>,
  state: number,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(node, options)) {
    node.setState(state, { isNotifySkipped: true });
  }

  node.getInEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.setState(state, { isNotifySkipped: true });
    }
    if (edge.startNode && isStateChangeable(edge.startNode, options)) {
      edge.startNode.setState(state, { isNotifySkipped: true });
    }
  });

  node.getOutEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.setState(state, { isNotifySkipped: true });
    }
    if (edge.endNode && isStateChangeable(edge.endNode, options)) {
      edge.endNode.setState(state, { isNotifySkipped: true });
    }
  });
};

export const setEdgeState = <N extends INodeBase, E extends IEdgeBase>(
  edge: IEdge<N, E>,
  state: number,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(edge, options)) {
    edge.setState(state, { isNotifySkipped: true });
  }

  if (edge.startNode && isStateChangeable(edge.startNode, options)) {
    edge.startNode.setState(state, { isNotifySkipped: true });
  }

  if (edge.endNode && isStateChangeable(edge.endNode, options)) {
    edge.endNode.setState(state, { isNotifySkipped: true });
  }
};

export const isStateChangeable = <N extends INodeBase, E extends IEdgeBase>(
  graphObject: INode<N, E> | IEdge<N, E>,
  options?: ISetShapeStateOptions,
): boolean => {
  const isOverride = options?.isStateOverride;
  return isOverride || (!isOverride && !graphObject.getState());
};

export const getLayoutAnchors = (layout: ILayoutSettings): IFitZoomTransformOptions => {
  if (layout.type === 'hierarchical') {
    const opts = layout.options as IHierarchicalLayoutOptions;
    return {
      anchorX: opts.anchorX ?? (opts.orientation === 'horizontal' ? (opts.reversed ? 'end' : 'start') : 'center'),
      anchorY: opts.anchorY ?? (opts.orientation === 'vertical' ? (opts.reversed ? 'end' : 'start') : 'center'),
    };
  }
  return {
    anchorX: layout.options?.anchorX ?? 'center',
    anchorY: layout.options?.anchorY ?? 'center',
  };
};
