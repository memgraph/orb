import { Edge, IEdgeBase, IEdgeProperties } from './edge';
import { Node, INodeBase, INodeProperties } from './node';

export type IEdgeStyle = Partial<IEdgeProperties>;

export type INodeStyle = Partial<INodeProperties>;

export interface IGraphStyle<N extends INodeBase, E extends IEdgeBase> {
  getNodeStyle(node: Node<N, E>): INodeStyle | undefined;
  getEdgeStyle(edge: Edge<N, E>): IEdgeStyle | undefined;
}
