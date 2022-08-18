import { IEdge, IEdgeBase, IEdgeProperties } from './edge';
import { INode, INodeBase, INodeProperties } from './node';

export type IEdgeStyle = Partial<IEdgeProperties>;

export type INodeStyle = Partial<INodeProperties>;

export interface IGraphStyle<N extends INodeBase, E extends IEdgeBase> {
  getNodeStyle(node: INode<N, E>): INodeStyle | undefined;
  getEdgeStyle(edge: IEdge<N, E>): IEdgeStyle | undefined;
}
