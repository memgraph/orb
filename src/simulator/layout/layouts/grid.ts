import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export class GridLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  constructor(private width: number, private height: number) {
    this.width = width;
    this.height = height;
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const rows = Math.ceil(Math.sqrt(nodes.length));
    const cols = Math.ceil(nodes.length / rows);
    const cellWidth = this.width / cols;
    const cellHeight = this.height / rows;

    const positions: INodePosition[] = [];
    nodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = col * cellWidth + cellWidth / 2;
      const y = row * cellHeight + cellHeight / 2;
      positions.push({ id: node.getId(), x, y });
    });

    return positions;
  }
}
