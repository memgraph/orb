import { ISimulationNode, ISimulationEdge } from '../../../shared';
import { IHierarchicalLayoutOptions, DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS, LayoutType } from '../../shared';
import { StaticLayoutEngine } from './static-layout-engine';

export class HierarchicalLayoutEngine extends StaticLayoutEngine {
  protected _config: Required<IHierarchicalLayoutOptions>;

  readonly type: LayoutType = 'hierarchical';

  constructor(options?: IHierarchicalLayoutOptions) {
    super();
    this._config = { ...DEFAULT_HIERARCHICAL_LAYOUT_OPTIONS, ...options };
  }

  protected calculatePositions(
    nodes: ISimulationNode[],
    edges: ISimulationEdge[],
    onProgress: (progress: number) => void,
    isCancelled: () => boolean,
    onComplete: () => void,
  ) {
    const { adjacency, inDegree } = this._buildAdjacency(nodes, edges);
    const components = this._getConnectedComponents(nodes, adjacency);

    let maxX = 0;
    let maxHeight = 0;
    let counter = 0;
    let lastProgress = -1;
    let componentIndex = 0;

    const processComponent = () => {
      if (isCancelled() || componentIndex >= components.length) {
        if (!isCancelled() && this._config.reversed) {
          this._applyReversal(nodes, maxX, maxHeight);
        }
        onComplete();
        return;
      }

      const i = componentIndex;
      const levels = this._assignLevels(components[i], adjacency, inDegree);
      const maxLevelSize = Math.max(...Array.from(levels.values()).map((level) => level.length));

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
          const nodeId = level[k];
          const nodeIndex = this._nodeIndexByNodeId[nodeId];
          const x = width / 2 - k * this._config.nodeGap + offsetX;

          if (x > maxX) {
            maxX = x;
          }

          if (nodeIndex !== undefined) {
            nodes[nodeIndex].x = this._config.orientation === 'horizontal' ? y : x;
            nodes[nodeIndex].y = this._config.orientation === 'horizontal' ? x : y;
          }

          counter++;
        }
      }

      componentIndex++;

      if (componentIndex < components.length && !this._cancelSimulation) {
        lastProgress = this._emitProgress(counter, nodes.length, lastProgress, onProgress);
        this._scheduleNext(processComponent);
      } else {
        if (!isCancelled() && this._config.reversed) {
          this._applyReversal(nodes, maxX, maxHeight);
        }
        onComplete();
      }
    };

    processComponent();
  }

  private _applyReversal(nodes: ISimulationNode[], maxX: number, maxHeight: number) {
    for (let i = 0; i < nodes.length; i++) {
      if (this._config.orientation === 'horizontal' && nodes[i].x !== undefined) {
        nodes[i].x = maxX - (nodes[i].x ?? 0);
      }
      if (this._config.orientation === 'vertical' && nodes[i].y !== undefined) {
        nodes[i].y = maxHeight - (nodes[i].y ?? 0);
      }
    }
  }

  private _buildAdjacency(
    _nodes: ISimulationNode[],
    edges: ISimulationEdge[],
  ): { adjacency: Map<number, number[]>; inDegree: Map<number, number> } {
    const adjacency = new Map<number, number[]>();
    const inDegree = new Map<number, number>();

    for (let i = 0; i < edges.length; i++) {
      const sourceId = this._getEdgeEndpointId(edges[i].source);
      const targetId = this._getEdgeEndpointId(edges[i].target);

      if (sourceId === targetId) {
        continue;
      }

      if (!adjacency.has(sourceId)) {
        adjacency.set(sourceId, []);
      }
      if (!adjacency.has(targetId)) {
        adjacency.set(targetId, []);
      }

      adjacency.get(sourceId)?.push(targetId);
      adjacency.get(targetId)?.push(sourceId);

      inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1);
    }

    return { adjacency, inDegree };
  }

  private _getConnectedComponents(nodes: ISimulationNode[], adjacency: Map<number, number[]>): number[][] {
    const visited = new Set<number>();
    const components: number[][] = [];

    for (let i = 0; i < nodes.length; i++) {
      const nodeId = nodes[i].id;
      if (visited.has(nodeId)) {
        continue;
      }

      const component: number[] = [];
      const queue: number[] = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const current = queue.pop();
        if (current === undefined) {
          continue;
        }

        component.push(current);

        const neighbors = adjacency.get(current) ?? [];
        for (let j = 0; j < neighbors.length; j++) {
          if (!visited.has(neighbors[j])) {
            visited.add(neighbors[j]);
            queue.push(neighbors[j]);
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  private _assignLevels(
    componentNodeIds: number[],
    adjacency: Map<number, number[]>,
    inDegree: Map<number, number>,
  ): Map<number, number[]> {
    const levels = new Map<number, number[]>();
    const visited = new Set<number>();

    let root = componentNodeIds.find((id) => (inDegree.get(id) ?? 0) === 0);
    if (root === undefined) {
      root = componentNodeIds.reduce((minId, id) =>
        (inDegree.get(id) ?? 0) < (inDegree.get(minId) ?? 0) ? id : minId,
      );
    }

    const queue: [number, number][] = [[root, 0]];

    for (const [nodeId, level] of queue) {
      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);

      if (levels.has(level)) {
        levels.get(level)?.push(nodeId);
      } else {
        levels.set(level, [nodeId]);
      }

      const neighbors = adjacency.get(nodeId) ?? [];
      for (let i = 0; i < neighbors.length; i++) {
        queue.push([neighbors[i], level + 1]);
      }
    }

    return levels;
  }

  private _getEdgeEndpointId(endpoint: number | string | ISimulationNode): number {
    if (typeof endpoint === 'object') {
      return endpoint.id;
    }
    return endpoint as number;
  }
}
