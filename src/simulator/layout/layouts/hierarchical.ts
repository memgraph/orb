import { IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export type HierarchicalLayoutOrientation = 'horizontal' | 'vertical';

export interface IHierarchicalLayoutOptions {
  orientation?: HierarchicalLayoutOrientation;
  reversed?: boolean;
}

export class HierarchicalLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _width: number;
  private _height: number;
  private _orientation: HierarchicalLayoutOrientation;
  private _reversed: boolean;

  constructor(width: number, height: number, options?: IHierarchicalLayoutOptions) {
    this._width = width;
    this._height = height;
    this._orientation = options?.orientation || 'vertical';
    this._reversed = options?.reversed || false;
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
      let y = (depth + 1) * ((this._orientation === 'vertical' ? this._height : this._width) / (depthGroups.size + 1));
      const xOffset = (this._orientation === 'vertical' ? this._width : this._height) / (nodes.length + 1);

      if (this._reversed) {
        y = (this._orientation === 'vertical' ? this._height : this._width) - y;
      }

      nodes.forEach((node, index) => {
        const x = (index + 1) * xOffset;
        if (this._orientation === 'horizontal') {
          positions.push({ id: node.getId(), x: y, y: x });
        } else {
          positions.push({ id: node.getId(), x, y });
        }
      });
    }
    return positions;
  }
}
