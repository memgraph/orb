import { IEdge, IEdgeBase, IEdgeStyle } from './edge';
import { INode, INodeBase, INodeStyle } from './node';
import { Color } from '../common';

const LABEL_PROPERTY_NAMES = ['label', 'name'];

export const DEFAULT_NODE_STYLE: INodeStyle = {
  size: 5,
  color: new Color('#1d87c9'),
};

export const DEFAULT_EDGE_STYLE: IEdgeStyle = {
  color: new Color('#ababab'),
  width: 0.3,
};

export interface IGraphStyle<N extends INodeBase, E extends IEdgeBase> {
  getNodeStyle(node: INode<N, E>): INodeStyle | undefined;
  getEdgeStyle(edge: IEdge<N, E>): IEdgeStyle | undefined;
}

export const getDefaultGraphStyle = <N extends INodeBase, E extends IEdgeBase>(): IGraphStyle<N, E> => {
  return {
    getNodeStyle(node: INode<N, E>): INodeStyle {
      return { ...DEFAULT_NODE_STYLE, label: getPredefinedLabel(node) };
    },
    getEdgeStyle(edge: IEdge<N, E>): IEdgeStyle {
      return { ...DEFAULT_EDGE_STYLE, label: getPredefinedLabel(edge) };
    },
  };
};

const getPredefinedLabel = <N extends INodeBase, E extends IEdgeBase>(
  obj: INode<N, E> | IEdge<N, E>,
): string | undefined => {
  for (let i = 0; i < LABEL_PROPERTY_NAMES.length; i++) {
    const value = (obj.data as any)[LABEL_PROPERTY_NAMES[i]];
    if (value !== undefined && value !== null) {
      return `${value}`;
    }
  }
};
