import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export class CircularLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  constructor(private width: number, private height: number) {
    this.width = width;
    this.height = height;
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const r = Math.min(this.width, this.height) / 2;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const angleStep = (2 * Math.PI) / nodes.length;

    return nodes.map((node) => {
      return {
        id: node.getId(),
        x: centerX + r * Math.cos(angleStep * node.getId()),
        y: centerY + r * Math.sin(angleStep * node.getId()),
      };
    });
  }
}
