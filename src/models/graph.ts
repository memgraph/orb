import { Node, INodeBase, INodePosition, DEFAULT_NODE_PROPERTIES } from './node';
import { DEFAULT_EDGE_PROPERTIES, Edge, IEdgeBase } from './edge';
import { GraphObjectState } from './state';
import { IRectangle } from '../common/rectangle';
import { IPosition } from '../common/position';
import { IGraphStyle } from './style';
import { ImageHandler } from '../services/images';
import { ISimulationEdge } from '../simulator/interface';

export interface IGraphData<N extends INodeBase, E extends IEdgeBase> {
  nodes: N[];
  edges: E[];
}

type IEdgeFilter<N extends INodeBase, E extends IEdgeBase> = (edge: Edge<N, E>) => boolean;

type INodeFilter<N extends INodeBase, E extends IEdgeBase> = (node: Node<N, E>) => boolean;

export class Graph<N extends INodeBase, E extends IEdgeBase> {
  protected nodeById: { [id: number]: Node<N, E> } = {};
  protected edgeById: { [id: number]: Edge<N, E> } = {};

  private style?: Partial<IGraphStyle<N, E>>;

  constructor(data?: Partial<IGraphData<N, E>>) {
    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];
    this.setup({ nodes, edges });
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

  setEdgePositions(positions: ISimulationEdge[]) {
    for (let i = 0; i < positions.length; i++) {
      const edge = this.edgeById[positions[i].id];
      if (edge) {
        edge.position = positions[i];
      }
    }
  }

  getEdgePositions(): ISimulationEdge[] {
    const edges = this.getEdges();
    const positions: ISimulationEdge[] = new Array<ISimulationEdge>(edges.length);
    for (let i = 0; i < edges.length; i++) {
      const position = edges[i].position;
      if (position) {
        positions[i] = position;
      }
    }
    return positions;
  }

  setStyle(style: Partial<IGraphStyle<N, E>>) {
    this.style = style;
    const styleImageUrls: Set<string> = new Set<string>();

    const nodes = this.getNodes();
    for (let i = 0; i < nodes.length; i++) {
      const properties = style.getNodeStyle?.(nodes[i]);
      if (properties) {
        nodes[i].properties = properties;
        // TODO @toni: Add these checks for any property setup (maybe to the node itself) - check below
        if (properties.imageUrl) {
          styleImageUrls.add(properties.imageUrl);
        }
        if (properties.imageUrlSelected) {
          styleImageUrls.add(properties.imageUrlSelected);
        }
      }
    }

    const edges = this.getEdges();
    for (let i = 0; i < edges.length; i++) {
      const properties = style.getEdgeStyle?.(edges[i]);
      if (properties) {
        edges[i].properties = properties;
      }
    }

    if (styleImageUrls.size) {
      ImageHandler.getInstance().loadImages(Array.from(styleImageUrls), () => {
        // TODO @toni: Either call internal render or an event for the user to rerender
        // TODO @toni: Or orb can use the singleton of ImageHandler and listen for new images
      });
    }
  }

  setDefaultStyle() {
    this.style = undefined;

    const nodes = this.getNodes();
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].properties = DEFAULT_NODE_PROPERTIES;
    }

    const edges = this.getEdges();
    for (let i = 0; i < edges.length; i++) {
      edges[i].properties = DEFAULT_EDGE_PROPERTIES;
    }
  }

  // TODO @toni: Split this function into multiple functions (check .join)
  setup(data: Partial<IGraphData<N, E>>) {
    this.nodeById = {};
    this.edgeById = {};

    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];

    for (let i = 0; i < nodes.length; i++) {
      const node = new Node<N, E>({ data: nodes[i] });
      this.nodeById[node.id] = node;
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = new Edge<N, E>({ data: edges[i] });

      const startNode = this.getNodeById(edge.start);
      const endNode = this.getNodeById(edge.end);

      if (startNode && endNode) {
        edge.connect(startNode, endNode);
        this.edgeById[edge.id] = edge;
      }
    }

    this.applyEdgeOffsets();
    this.applyStyle();
  }

  // TODO @toni: Split this function into multiple functions (check .setup)
  join(data: Partial<IGraphData<N, E>>) {
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];

    for (let i = 0; i < nodes.length; i++) {
      const existingNode = this.getNodeById(nodes[i].id);
      if (existingNode) {
        existingNode.data = nodes[i];
        continue;
      }

      const node = new Node<N, E>({ data: nodes[i] });
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

      const edge = new Edge<N, E>({ data: edges[i] });
      const startNode = this.getNodeById(edge.start);
      const endNode = this.getNodeById(edge.end);

      if (startNode && endNode) {
        edge.connect(startNode, endNode);
        this.edgeById[edge.id] = edge;
      }
    }

    this.applyEdgeOffsets();
    this.applyStyle();
  }

  hide(data: Partial<{ nodeIds: number[]; edgeIds: number[] }>) {
    const nodeIds = data.nodeIds ?? [];
    const edgeIds = data.edgeIds ?? [];

    for (let i = 0; i < nodeIds.length; i++) {
      const node = this.getNodeById(nodeIds[i]);
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

    for (let i = 0; i < edgeIds.length; i++) {
      const edge = this.getEdgeById(edgeIds[i]);
      if (!edge) {
        continue;
      }

      edge.disconnect();
      delete this.edgeById[edge.id];
    }

    this.applyEdgeOffsets();
    this.applyStyle();
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

  // TODO @toni: Refactor this to the "SelectStrategy" class where this will be default
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

  // TODO @toni: Refactor this to the "HoverStrategy" class where this will be default
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

  protected applyEdgeOffsets() {
    const graphEdges = this.getEdges();
    const edgeOffsets = getEdgeOffsets<N, E>(graphEdges);
    for (let i = 0; i < edgeOffsets.length; i++) {
      const edge = graphEdges[i];
      const edgeOffset = edgeOffsets[i];

      // TODO @toni: This is super unoptimized and there should be a better way \
      // TODO @toni: to create edge types depending on the node-node connections (maybe new intermediate object)
      // TODO @toni: Also check ImageHandler private constructor to forbid usage of new Edge and or new Node
      const newEdge = new Edge<N, E>({
        data: edge.data,
        offset: edgeOffset,
      });
      newEdge.connect(edge.startNode!, edge.endNode!);
      newEdge.state = edge.state;
      newEdge.properties = edge.properties;

      this.edgeById[edge.id] = newEdge;
    }
  }

  protected applyStyle() {
    if (this.style?.getNodeStyle) {
      const newNodes = this.getNodes();
      for (let i = 0; i < newNodes.length; i++) {
        const properties = this.style.getNodeStyle(newNodes[i]);
        if (properties) {
          newNodes[i].properties = properties;
        }
      }
    }

    if (this.style?.getEdgeStyle) {
      const newEdges = this.getEdges();
      for (let i = 0; i < newEdges.length; i++) {
        const properties = this.style.getEdgeStyle(newEdges[i]);
        if (properties) {
          newEdges[i].properties = properties;
        }
      }
    }
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

// TODO @toni: Move this to a separate utility class
const getEdgeOffsets = <N extends INodeBase, E extends IEdgeBase>(edges: Edge<N, E>[]): number[] => {
  const edgeOffsets = new Array<number>(edges.length);
  const edgeOffsetsByUniqueKey = getEdgeOffsetsByUniqueKey(edges);

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    let offset = 0;

    const uniqueKey = getUniqueEdgeKey(edge);
    const edgeOffsetsByKey = edgeOffsetsByUniqueKey[uniqueKey];
    if (edgeOffsetsByKey && edgeOffsetsByKey.length) {
      // Pull the first offset
      offset = edgeOffsetsByKey.shift() ?? 0;

      const isEdgeReverseDirection = edge.end < edge.start;
      if (isEdgeReverseDirection) {
        offset = -1 * offset;
      }
    }

    edgeOffsets[i] = offset;
  }

  return edgeOffsets;
};

const getUniqueEdgeKey = <E extends IEdgeBase>(edge: E): string => {
  const sid = edge.start;
  const tid = edge.end;
  return sid < tid ? `${sid}-${tid}` : `${tid}-${sid}`;
};

const getEdgeOffsetsByUniqueKey = <N extends INodeBase, E extends IEdgeBase>(
  edges: Edge<N, E>[],
): Record<string, number[]> => {
  const edgeCountByUniqueKey: Record<string, number> = {};
  const loopbackUniqueKeys: Set<string> = new Set<string>();

  // Count the number of edges that are between the same nodes
  for (let i = 0; i < edges.length; i++) {
    // TODO @toni: This is expensive, so maybe we should have unique key in the edge
    const uniqueKey = getUniqueEdgeKey(edges[i]);
    if (edges[i].start === edges[i].end) {
      loopbackUniqueKeys.add(uniqueKey);
    }
    edgeCountByUniqueKey[uniqueKey] = (edgeCountByUniqueKey[uniqueKey] ?? 0) + 1;
  }

  const edgeOffsetsByUniqueKey: Record<string, number[]> = {};
  const uniqueKeys = Object.keys(edgeCountByUniqueKey);

  for (let i = 0; i < uniqueKeys.length; i++) {
    const uniqueKey = uniqueKeys[i];
    const edgeCount = edgeCountByUniqueKey[uniqueKey];

    // Loopback offsets should be 1, 2, 3, ...
    if (loopbackUniqueKeys.has(uniqueKey)) {
      edgeOffsetsByUniqueKey[uniqueKey] = Array.from({ length: edgeCount }, (_, i) => i + 1);
      continue;
    }

    if (edgeCount <= 1) {
      continue;
    }

    const edgeOffsets: number[] = [];

    // 0 means straight line. There will be a straight line between two nodes
    // when there are 1 edge, 3 edges, 5 edges, ...
    if (edgeCount % 2 !== 0) {
      edgeOffsets.push(0);
    }

    for (let i = 2; i <= edgeCount; i += 2) {
      edgeOffsets.push(i / 2);
      edgeOffsets.push((i / 2) * -1);
    }

    edgeOffsetsByUniqueKey[uniqueKey] = edgeOffsets;
  }

  return edgeOffsetsByUniqueKey;
};
