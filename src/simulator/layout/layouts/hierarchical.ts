import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export class HierarchicalLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  constructor(private width: number, private height: number) {
    this.width = width;
    this.height = height;
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    if (nodes.length === 0) {
      return [];
    }

    const outEdgesCounts = nodes.map((node) => (node.getInEdges().length > 0 ? 0 : node.getOutEdges().length));
    const indexOfRoot = outEdgesCounts.indexOf(Math.max(...outEdgesCounts));
    const rootNode = nodes[indexOfRoot];

    const depthMap = new Map<INode<N, E>, number>();
    const depthGroups = new Map<number, INode<N, E>[]>();
    const queue: INode<N, E>[] = [rootNode];

    depthMap.set(rootNode, 0);
    depthGroups.set(0, [rootNode]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }

      const depth = depthMap.get(current) || 0;
      const children = current
        .getOutEdges()
        .map((edge) => edge.endNode)
        .concat(current.getInEdges().map((edge) => edge.startNode));

      for (const child of children) {
        if (!depthMap.has(child)) {
          depthMap.set(child, depth + 1);
          if (!depthGroups.has(depth + 1)) {
            depthGroups.set(depth + 1, []);
          }
          depthGroups.get(depth + 1)?.push(child);
          queue.push(child);
        }
      }
    }

    const positions: INodePosition[] = [];
    for (const [depth, nodes] of depthGroups.entries()) {
      const y = (depth + 1) * (this.height / (depthGroups.size + 1));
      const xOffset = this.width / (nodes.length + 1);
      nodes.forEach((node, index) => {
        const x = (index + 1) * xOffset;
        positions.push({ id: node.getId(), x, y });
      });
    }
    return positions;
  }
}
