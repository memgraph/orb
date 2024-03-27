import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export class CircleLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  getPositions(nodes: INode<N, E>[], width: number, height: number): INodePosition[] {
    return nodes.map((node, index) => {
      return { id: node.id, x: width / 2, y: height - index * 10 };
    });
  }
}
