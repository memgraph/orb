import { IEdge, IEdgeBase } from '../../../models/edge';
import { INode, INodeBase, INodePosition } from '../../../models/node';
import { ILayout } from '../layout';

export type HierarchicalLayoutOrientation = 'horizontal' | 'vertical';

export interface IHierarchicalLayoutOptions {
  nodeGap?: number;
  levelGap?: number;
  treeGap?: number;
  orientation?: HierarchicalLayoutOrientation;
  reversed?: boolean;
}

export const DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS: IHierarchicalLayoutOptions = {
  nodeGap: 50,
  levelGap: 50,
  treeGap: 100,
  orientation: 'vertical',
  reversed: false,
};

export class HierarchicalLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _nodeGap: number;
  private _levelGap: number;
  private _treeGap: number;
  private _orientation: HierarchicalLayoutOrientation;
  private _reversed: boolean;

  constructor(options?: IHierarchicalLayoutOptions) {
    const _options = { ...DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS, ...options } as Required<IHierarchicalLayoutOptions>;

    this._nodeGap = _options.nodeGap;
    this._levelGap = _options.levelGap;
    this._treeGap = _options.treeGap;
    this._orientation = _options.orientation;
    this._reversed = _options.reversed;
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const components = this.getConnectedComponents(nodes);
    const positions: INodePosition[] = [];
    let maxX = 0;
    let maxHeight = 0;

    for (const [index, component] of components.entries()) {
      const levels: Map<number, INode<N, E>[]> = this.assignLevels(component);
      const maxLevelSize = Math.max(...Array.from(levels.values()).map((levelNodes) => levelNodes.length));

      if (levels.size * this._levelGap > maxHeight) {
        maxHeight = levels.size * this._levelGap;
      }

      let offsetX = this._treeGap + maxX;

      if (index > 0) {
        offsetX += ((maxLevelSize - 1) * this._nodeGap) / 2;
      }

      for (const [level, levelNodes] of levels) {
        const y = level * this._levelGap;
        const width = levelNodes.length * this._nodeGap;

        for (let i = 0; i < levelNodes.length; i++) {
          const node = levelNodes[i];
          const x = width / 2 - i * this._nodeGap + offsetX;
          if (x > maxX) {
            maxX = x;
          }

          positions.push({
            id: node.getId(),
            x: this._orientation === 'horizontal' ? y : x,
            y: this._orientation === 'horizontal' ? x : y,
          });
        }
      }
    }

    if (this._reversed === true) {
      positions.forEach((position) => {
        if (this._orientation === 'horizontal' && position.x !== undefined) {
          position.x = maxX - position.x;
        }
        if (this._orientation === 'vertical' && position.y !== undefined) {
          position.y = maxHeight - position.y;
        }
      });
    }

    return positions;
  }

  getConnectedComponents = (nodes: INode<N, E>[]): INode<N, E>[][] => {
    const visited = new Set<INode<N, E>>();
    const components: INode<N, E>[][] = [];

    for (const node of nodes) {
      if (!visited.has(node)) {
        const component: INode<N, E>[] = [];
        const queue: INode<N, E>[] = [node];
        visited.add(node);

        while (queue.length > 0) {
          const current = queue.pop();

          if (current) {
            component.push(current);
            for (const neighbor of current.getAdjacentNodes()) {
              if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
              }
            }
          }
        }

        components.push(component);
      }
    }

    return components;
  };

  assignLevels = (nodes: INode<N, E>[]): Map<number, INode<N, E>[]> => {
    const levels = new Map<number, INode<N, E>[]>();
    const visited = new Set<INode<N, E>>();

    let root = nodes.filter((node) => this.getExternalInEdges(node).length === 0)[0];

    if (!root) {
      root = nodes.sort((a, b) => this.getExternalInEdges(a).length - this.getExternalInEdges(b).length)[0];
    }

    const queue: [INode<N, E>, number][] = [[root, 0]];

    for (const [node, level] of queue) {
      if (visited.has(node)) {
        continue;
      }

      visited.add(node);
      if (levels.has(level)) {
        levels.get(level)?.push(node);
      } else {
        levels.set(level, [node]);
      }

      for (const child of node.getAdjacentNodes()) {
        queue.push([child, level + 1]);
      }
    }

    return levels;
  };

  getExternalInEdges = (node: INode<N, E>): IEdge<N, E>[] => {
    return node.getInEdges().filter((edge) => edge.startNode.id !== edge.endNode.id);
  };
}
