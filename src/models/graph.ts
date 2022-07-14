import { Node, INodeBase, INodePosition } from './node';
import { Edge, IEdgeBase } from './edge';
import { GraphObjectState } from './state';
import { IRectangle } from '../common/rectangle';
import { IPosition } from '../common/position';
import { IEdgeShape } from '../shapes/edge/interface';

export interface IGraphData<N extends INodeBase, E extends IEdgeBase> {
  nodes: N[];
  edges: E[];
}

type IEdgeFilter<N extends INodeBase, E extends IEdgeBase> = (edge: Edge<N, E>) => boolean;

type INodeFilter<N extends INodeBase, E extends IEdgeBase> = (node: Node<N, E>) => boolean;

export class Graph<N extends INodeBase, E extends IEdgeBase> {
  protected readonly nodeById: { [id: number]: Node<N, E> } = {};
  protected readonly edgeById: { [id: number]: Edge<N, E> } = {};

  constructor(data?: Partial<IGraphData<N, E>>) {
    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];

    for (let i = 0; i < nodes.length; i++) {
      const node = new Node<N, E>(nodes[i]);
      this.nodeById[node.id] = node;
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = new Edge<N, E>(edges[i]);

      const startNode = this.getNodeById(edge.start);
      const endNode = this.getNodeById(edge.end);

      if (startNode && endNode) {
        edge.connect(startNode, endNode);
        this.edgeById[edge.id] = edge;
      }
    }
  }

  /**
   * Returns a list of nodes.
   *
   * @param {INodeFilter} filterBy Filter function for nodes
   * @return {Node[]} List of nodes
   */
  getNodes(filterBy?: INodeFilter<N, E>): Node<N, E>[] {
    const nodes = Object.values(this.nodeById);
    if (!filterBy) {
      return nodes;
    }

    const filteredNodes: Node<N, E>[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (filterBy(nodes[i])) {
        filteredNodes.push(nodes[i]);
      }
    }
    return filteredNodes;
  }

  /**
   * Returns a list of edges.
   *
   * @param {IEdgeFilter} filterBy Filter function for edges
   * @return {Edge[]} List of edges
   */
  getEdges(filterBy?: IEdgeFilter<N, E>): Edge<N, E>[] {
    const edges = Object.values(this.edgeById);
    if (!filterBy) {
      return edges;
    }

    const filteredEdges: Edge<N, E>[] = [];
    for (let i = 0; i < edges.length; i++) {
      if (filterBy(edges[i])) {
        filteredEdges.push(edges[i]);
      }
    }
    return filteredEdges;
  }

  /**
   * Returns the total node count.
   *
   * @return {number} Total node count
   */
  getNodeCount(): number {
    return Object.keys(this.nodeById).length;
  }

  /**
   * Returns the total edge count.
   *
   * @return {number} Total edge count
   */
  getEdgeCount(): number {
    return Object.keys(this.edgeById).length;
  }

  /**
   * Returns node by node id.
   *
   * @param {number} id Node id
   * @return {Node | undefined} Node or undefined
   */
  getNodeById(id: number): Node<N, E> | undefined {
    return this.nodeById[id];
  }

  /**
   * Returns edge by edge id.
   *
   * @param {number} id Edge id
   * @return {Edge | undefined} Edge or undefined
   */
  getEdgeById(id: number): Edge<N, E> | undefined {
    return this.edgeById[id];
  }

  /**
   * Returns a list of current node positions.
   *
   * @return {INodePosition[]} List of node positions
   */
  getNodePositions(): INodePosition[] {
    const nodes = this.getNodes();
    const positions: INodePosition[] = new Array<INodePosition>(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      positions[i] = nodes[i].position;
    }
    return positions;
  }

  setNodePositions(positions: INodePosition[]) {
    for (let i = 0; i < positions.length; i++) {
      const node = this.nodeById[positions[i].id];
      if (node) {
        node.position = positions[i];
      }
    }
  }

  join(data: Partial<IGraphData<N, E>>) {
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];

    for (let i = 0; i < nodes.length; i++) {
      const existingNode = this.getNodeById(nodes[i].id);
      if (existingNode) {
        existingNode.data = nodes[i];
        continue;
      }

      // TODO: How to apply style to new nodes
      const node = new Node<N, E>(nodes[i]);
      this.nodeById[node.id] = node;
    }

    for (let i = 0; i < edges.length; i++) {
      const existingEdge = this.getEdgeById(edges[i].id);
      if (existingEdge) {
        const newEdge = edges[i];

        if (existingEdge.start !== newEdge.start || existingEdge.end !== newEdge.end) {
          existingEdge.disconnect();
          delete this.edgeById[existingEdge.id];

          const startNode = this.getNodeById(newEdge.start);
          const endNode = this.getNodeById(newEdge.end);

          if (startNode && endNode) {
            existingEdge.connect(startNode, endNode);
            this.edgeById[existingEdge.id] = existingEdge;
          }
        }

        existingEdge.data = newEdge;
        continue;
      }

      // TODO: How to apply style to new edges
      const edge = new Edge<N, E>(edges[i]);

      const startNode = this.getNodeById(edge.start);
      const endNode = this.getNodeById(edge.end);

      if (startNode && endNode) {
        edge.connect(startNode, endNode);
        this.edgeById[edge.id] = edge;
      }
    }
  }

  hide(data: Partial<IGraphData<N, E>>) {
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];

    for (let i = 0; i < nodes.length; i++) {
      const node = this.getNodeById(nodes[i].id);
      if (!node) {
        continue;
      }

      const edges = node.getEdges();
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        edge.disconnect();
        delete this.edgeById[edge.id];
      }

      delete this.nodeById[node.id];
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = this.getEdgeById(edges[i].id);
      if (!edge) {
        continue;
      }

      edge.disconnect();
      delete this.edgeById[edge.id];
    }
  }

  isEqual<T extends INodeBase, K extends IEdgeBase>(graph: Graph<T, K>): boolean {
    if (this.getNodeCount() !== graph.getNodeCount()) {
      return false;
    }

    if (this.getEdgeCount() !== graph.getEdgeCount()) {
      return false;
    }

    const nodes = this.getNodes();
    for (let i = 0; i < nodes.length; i++) {
      if (!graph.getNodeById(nodes[i].id)) {
        return false;
      }
    }

    const edges = this.getEdges();
    for (let i = 0; i < edges.length; i++) {
      if (!graph.getEdgeById(edges[i].id)) {
        return false;
      }
    }

    return true;
  }

  selectNode(node: Node<N, E>) {
    this.unselectAll();
    setNodeState(node, GraphObjectState.SELECT, { isStateOverride: true });
  }

  selectEdge(edge: Edge<N, E>) {
    this.unselectAll();
    setEdgeState(edge, GraphObjectState.SELECT, { isStateOverride: true });
  }

  unselectAll(): { changedCount: number } {
    const selectedNodes = this.getNodes((node) => node.isSelected());
    for (let i = 0; i < selectedNodes.length; i++) {
      selectedNodes[i].clearState();
    }

    const selectedEdges = this.getEdges((edge) => edge.isSelected());
    for (let i = 0; i < selectedEdges.length; i++) {
      selectedEdges[i].clearState();
    }

    return { changedCount: selectedNodes.length + selectedEdges.length };
  }

  hoverNode(node: Node<N, E>) {
    this.unhoverAll();
    setNodeState(node, GraphObjectState.HOVER);
  }

  hoverEdge(edge: Edge<N, E>) {
    this.unhoverAll();
    setEdgeState(edge, GraphObjectState.HOVER);
  }

  unhoverAll(): { changedCount: number } {
    const hoveredNodes = this.getNodes((node) => node.isHovered());
    for (let i = 0; i < hoveredNodes.length; i++) {
      hoveredNodes[i].clearState();
    }

    const hoveredEdges = this.getEdges((edge) => edge.isHovered());
    for (let i = 0; i < hoveredEdges.length; i++) {
      hoveredEdges[i].clearState();
    }

    return { changedCount: hoveredNodes.length + hoveredEdges.length };
  }

  getBoundingBox(): IRectangle {
    const nodes = this.getNodes();
    const minPoint: IPosition = { x: 0, y: 0 };
    const maxPoint: IPosition = { x: 0, y: 0 };

    for (let i = 0; i < nodes.length; i++) {
      const { x, y } = nodes[i].getCenter();

      if (x === undefined || y === undefined) {
        continue;
      }

      const size = nodes[i].getBorderedRadius();

      if (i === 0) {
        minPoint.x = x - size;
        maxPoint.x = x + size;
        minPoint.y = y - size;
        maxPoint.y = y + size;
        continue;
      }

      if (x + size > maxPoint.x) {
        maxPoint.x = x + size;
      }
      if (x - size < minPoint.x) {
        minPoint.x = x - size;
      }
      if (y + size > maxPoint.y) {
        maxPoint.y = y + size;
      }
      if (y - size < minPoint.y) {
        minPoint.y = y - size;
      }
    }

    return {
      x: minPoint.x,
      y: minPoint.y,
      width: Math.abs(maxPoint.x - minPoint.x),
      height: Math.abs(maxPoint.y - minPoint.y),
    };
  }

  getNearestNode(point: IPosition): Node<N, E> | undefined {
    // Reverse is needed to check from the top drawn to the bottom drawn node
    const nodes = this.getNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].includesPoint(point)) {
        return nodes[i];
      }
    }
  }

  getNearestEdge(point: IPosition, minDistance = 3): Edge<N, E> | undefined {
    let nearestEdge: Edge<N, E> | undefined;
    let nearestDistance = minDistance;

    const edges = this.getEdges();
    for (let i = 0; i < edges.length; i++) {
      const distance = edges[i].getDistance(point);
      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearestEdge = edges[i];
      }
    }
    return nearestEdge;
  }
}

interface ISetShapeStateOptions {
  isStateOverride: boolean;
}

const setNodeState = <N extends INodeBase, E extends IEdgeBase>(
  node: Node<N, E>,
  state: GraphObjectState,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(node, options)) {
    node.state = state;
  }

  node.getInEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.state = state;
    }
    if (edge.startNode && isStateChangeable(edge.startNode, options)) {
      edge.startNode.state = state;
    }
  });

  node.getOutEdges().forEach((edge) => {
    if (edge && isStateChangeable(edge, options)) {
      edge.state = state;
    }
    if (edge.endNode && isStateChangeable(edge.endNode, options)) {
      edge.endNode.state = state;
    }
  });
};

const setEdgeState = <N extends INodeBase, E extends IEdgeBase>(
  edge: Edge<N, E>,
  state: GraphObjectState,
  options?: ISetShapeStateOptions,
): void => {
  if (isStateChangeable(edge, options)) {
    edge.state = state;
  }

  if (edge.startNode && isStateChangeable(edge.startNode, options)) {
    edge.startNode.state = state;
  }

  if (edge.endNode && isStateChangeable(edge.endNode, options)) {
    edge.endNode.state = state;
  }
};

const isStateChangeable = <N extends INodeBase, E extends IEdgeBase>(
  graphObject: Node<N, E> | Edge<N, E>,
  options?: ISetShapeStateOptions,
): boolean => {
  const isOverride = options?.isStateOverride;
  return isOverride || (!isOverride && !graphObject.state);
};
