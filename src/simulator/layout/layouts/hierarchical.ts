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

export const DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS: Required<IHierarchicalLayoutOptions> = {
  nodeGap: 50,
  levelGap: 50,
  treeGap: 100,
  orientation: 'vertical',
  reversed: false,
};

export class HierarchicalLayout<N extends INodeBase, E extends IEdgeBase> implements ILayout<N, E> {
  private _config: Required<IHierarchicalLayoutOptions>;

  constructor(options?: IHierarchicalLayoutOptions) {
    this._config = { ...DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS, ...options };
  }

  getPositions(nodes: INode<N, E>[]): INodePosition[] {
    const components = this.getConnectedComponents(nodes);
    const positions: INodePosition[] = new Array(nodes.length);
    let maxX = 0;
    let maxHeight = 0;
    let counter = 0;

    for (let i = 0; i < components.length; i++) {
      const levels: Map<number, INode<N, E>[]> = this.assignLevels(components[i]);
      const maxLevelSize = Math.max(...Array.from(levels.values()).map((levelNodes) => levelNodes.length));

      if (levels.size * this._config.levelGap > maxHeight) {
        maxHeight = levels.size * this._config.levelGap;
      }

      let offsetX = i === 0 ? 0 : this._config.treeGap + maxX;

      if (i > 0) {
        offsetX += ((maxLevelSize - 1) * this._config.nodeGap) / 2;
      }

      for (let j = 0; j < levels.size; j++) {
        const y = j * this._config.levelGap;
        const level = levels.get(j);
        if (!level) {
          continue;
        }

        const width = level.length * this._config.nodeGap;

        for (let k = 0; k < level.length; k++) {
          const node = level[k];
          const x = width / 2 - k * this._config.nodeGap + offsetX;
          if (x > maxX) {
            maxX = x;
          }

          positions[counter++] = {
            id: node.getId(),
            x: this._config.orientation === 'horizontal' ? y : x,
            y: this._config.orientation === 'horizontal' ? x : y,
          };
        }
      }
    }

    if (this._config.reversed === true) {
      positions.forEach((position) => {
        if (this._config.orientation === 'horizontal' && position.x !== undefined) {
          position.x = maxX - position.x;
        }
        if (this._config.orientation === 'vertical' && position.y !== undefined) {
          position.y = maxHeight - position.y;
        }
      });
    }

    return positions;
  }

  getConnectedComponents = (nodes: INode<N, E>[]): INode<N, E>[][] => {
    const visited = new Set<INode<N, E>>();
    const components: INode<N, E>[][] = [];

    for (let i = 0; i < nodes.length; i++) {
      if (visited.has(nodes[i])) {
        continue;
      }

      const component: INode<N, E>[] = [];
      const queue: INode<N, E>[] = [nodes[i]];
      visited.add(nodes[i]);

      while (queue.length > 0) {
        const current = queue.pop();

        if (current) {
          component.push(current);
          const neighbors = current.getAdjacentNodes();
          for (let j = 0; j < neighbors.length; j++) {
            if (visited.has(neighbors[j])) {
              continue;
            }

            visited.add(neighbors[j]);
            queue.push(neighbors[j]);
          }
        }
      }

      components.push(component);
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

      const neighbors = node.getAdjacentNodes();

      for (let i = 0; i < neighbors.length; i++) {
        queue.push([neighbors[i], level + 1]);
      }
    }

    return levels;
  };

  getExternalInEdges = (node: INode<N, E>): IEdge<N, E>[] => {
    return node.getInEdges().filter((edge) => edge.startNode.id !== edge.endNode.id);
  };
}
