import { INode, INodeBase, INodePosition, DEFAULT_NODE_PROPERTIES, NodeFactory } from './node';
import { DEFAULT_EDGE_PROPERTIES, IEdge, EdgeFactory, IEdgeBase, IEdgePosition } from './edge';
import { IRectangle } from '../common/rectangle';
import { IPosition } from '../common/position';
import { IGraphStyle } from './style';
import { ImageHandler } from '../services/images';
import { getEdgeOffsets } from './topology';

export interface IGraphData<N extends INodeBase, E extends IEdgeBase> {
  nodes: N[];
  edges: E[];
}

type IEdgeFilter<N extends INodeBase, E extends IEdgeBase> = (edge: IEdge<N, E>) => boolean;

type INodeFilter<N extends INodeBase, E extends IEdgeBase> = (node: INode<N, E>) => boolean;

export interface IGraph<N extends INodeBase, E extends IEdgeBase> {
  getNodes(filterBy?: INodeFilter<N, E>): INode<N, E>[];
  getEdges(filterBy?: IEdgeFilter<N, E>): IEdge<N, E>[];
  getNodeCount(): number;
  getEdgeCount(): number;
  getNodeById(id: number): INode<N, E> | undefined;
  getEdgeById(id: number): IEdge<N, E> | undefined;
  getNodePositions(): INodePosition[];
  setNodePositions(positions: INodePosition[]): void;
  getEdgePositions(): IEdgePosition[];
  setStyle(style: Partial<IGraphStyle<N, E>>): void;
  setDefaultStyle(): void;
  setup(data: Partial<IGraphData<N, E>>): void;
  join(data: Partial<IGraphData<N, E>>): void;
  hide(data: Partial<{ nodeIds: number[]; edgeIds: number[] }>): void;
  isEqual<T extends INodeBase, K extends IEdgeBase>(graph: Graph<T, K>): boolean;
  getBoundingBox(): IRectangle;
  getNearestNode(point: IPosition): INode<N, E> | undefined;
  getNearestEdge(point: IPosition, minDistance?: number): IEdge<N, E> | undefined;
}

export class Graph<N extends INodeBase, E extends IEdgeBase> implements IGraph<N, E> {
  private _nodeById: { [id: number]: INode<N, E> } = {};
  private _edgeById: { [id: number]: IEdge<N, E> } = {};
  private _style?: Partial<IGraphStyle<N, E>>;

  constructor(data?: Partial<IGraphData<N, E>>) {
    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];
    this.setup({ nodes, edges });
  }

  /**
   * Returns a list of nodes.
   *
   * @param {INodeFilter} filterBy Filter function for nodes
   * @return {INode[]} List of nodes
   */
  getNodes(filterBy?: INodeFilter<N, E>): INode<N, E>[] {
    const nodes = Object.values(this._nodeById);
    if (!filterBy) {
      return nodes;
    }

    const filteredNodes: INode<N, E>[] = [];
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
   * @return {IEdge[]} List of edges
   */
  getEdges(filterBy?: IEdgeFilter<N, E>): IEdge<N, E>[] {
    const edges = Object.values(this._edgeById);
    if (!filterBy) {
      return edges;
    }

    const filteredEdges: IEdge<N, E>[] = [];
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
    return Object.keys(this._nodeById).length;
  }

  /**
   * Returns the total edge count.
   *
   * @return {number} Total edge count
   */
  getEdgeCount(): number {
    return Object.keys(this._edgeById).length;
  }

  /**
   * Returns node by node id.
   *
   * @param {number} id Node id
   * @return {Node | undefined} Node or undefined
   */
  getNodeById(id: number): INode<N, E> | undefined {
    return this._nodeById[id];
  }

  /**
   * Returns edge by edge id.
   *
   * @param {number} id Edge id
   * @return {IEdge | undefined} Edge or undefined
   */
  getEdgeById(id: number): IEdge<N, E> | undefined {
    return this._edgeById[id];
  }

  /**
   * Returns a list of current node positions (x, y).
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

  /**
   * Sets new node positions (x, y).
   *
   * @param {INodePosition} positions Node positions
   */
  setNodePositions(positions: INodePosition[]) {
    for (let i = 0; i < positions.length; i++) {
      const node = this._nodeById[positions[i].id];
      if (node) {
        node.position = positions[i];
      }
    }
  }

  /**
   * Returns a list of current edge positions. Edge positions do not have
   * (x, y) but a link to the source and target node ids.
   *
   * @return {IEdgePosition[]} List of edge positions
   */
  getEdgePositions(): IEdgePosition[] {
    const edges = this.getEdges();
    const positions: IEdgePosition[] = new Array<IEdgePosition>(edges.length);
    for (let i = 0; i < edges.length; i++) {
      positions[i] = edges[i].position;
    }
    return positions;
  }

  /**
   * Sets define style to nodes and edges. The applied style will be used
   * for all future nodes and edges added with `.join` function.
   *
   * @param {IGraphStyle} style Style definition
   */
  setStyle(style: Partial<IGraphStyle<N, E>>) {
    this._style = style;
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

  /**
   * Sets default style to nodes and edges.
   */
  setDefaultStyle() {
    this._style = undefined;

    const nodes = this.getNodes();
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].properties = DEFAULT_NODE_PROPERTIES;
    }

    const edges = this.getEdges();
    for (let i = 0; i < edges.length; i++) {
      edges[i].properties = DEFAULT_EDGE_PROPERTIES;
    }
  }

  setup(data: Partial<IGraphData<N, E>>) {
    this._nodeById = {};
    this._edgeById = {};

    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];

    this._insertNodes(nodes);
    this._insertEdges(edges);

    this._applyEdgeOffsets();
    this._applyStyle();
  }

  join(data: Partial<IGraphData<N, E>>) {
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];

    this._upsertNodes(nodes);
    this._upsertEdges(edges);

    this._applyEdgeOffsets();
    this._applyStyle();
  }

  hide(data: Partial<{ nodeIds: number[]; edgeIds: number[] }>) {
    const nodeIds = data.nodeIds ?? [];
    const edgeIds = data.edgeIds ?? [];

    this._removeNodes(nodeIds);
    this._removeEdges(edgeIds);

    this._applyEdgeOffsets();
    this._applyStyle();
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

  getNearestNode(point: IPosition): INode<N, E> | undefined {
    // Reverse is needed to check from the top drawn to the bottom drawn node
    const nodes = this.getNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].includesPoint(point)) {
        return nodes[i];
      }
    }
  }

  getNearestEdge(point: IPosition, minDistance = 3): IEdge<N, E> | undefined {
    let nearestEdge: IEdge<N, E> | undefined;
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

  private _insertNodes(nodes: N[]) {
    for (let i = 0; i < nodes.length; i++) {
      const node = NodeFactory.create<N, E>({ data: nodes[i] });
      this._nodeById[node.id] = node;
    }
  }

  private _insertEdges(edges: E[]) {
    for (let i = 0; i < edges.length; i++) {
      const startNode = this.getNodeById(edges[i].start);
      const endNode = this.getNodeById(edges[i].end);

      if (startNode && endNode) {
        const edge = EdgeFactory.create<N, E>({
          data: edges[i],
          startNode,
          endNode,
        });
        this._edgeById[edge.id] = edge;
      }
    }
  }

  private _upsertNodes(nodes: N[]) {
    for (let i = 0; i < nodes.length; i++) {
      const existingNode = this.getNodeById(nodes[i].id);
      if (existingNode) {
        existingNode.data = nodes[i];
        continue;
      }

      const node = NodeFactory.create<N, E>({ data: nodes[i] });
      this._nodeById[node.id] = node;
    }
  }

  private _upsertEdges(edges: E[]) {
    for (let i = 0; i < edges.length; i++) {
      const newEdgeData = edges[i];
      const existingEdge = this.getEdgeById(newEdgeData.id);

      // New edge
      if (!existingEdge) {
        const startNode = this.getNodeById(newEdgeData.start);
        const endNode = this.getNodeById(newEdgeData.end);

        if (startNode && endNode) {
          const edge = EdgeFactory.create<N, E>({
            data: newEdgeData,
            startNode,
            endNode,
          });
          this._edgeById[edge.id] = edge;
        }
        continue;
      }

      // The connection of the edge stays the same, but the data has changed
      if (existingEdge.start === newEdgeData.start && existingEdge.end === newEdgeData.end) {
        existingEdge.data = newEdgeData;
        continue;
      }

      // Edge connection (start or end node) has changed
      existingEdge.startNode.removeEdge(existingEdge);
      existingEdge.endNode.removeEdge(existingEdge);
      delete this._edgeById[existingEdge.id];

      const startNode = this.getNodeById(newEdgeData.start);
      const endNode = this.getNodeById(newEdgeData.end);

      if (startNode && endNode) {
        const edge = EdgeFactory.create<N, E>({
          data: newEdgeData,
          offset: existingEdge.offset,
          startNode,
          endNode,
        });
        edge.state = existingEdge.state;
        edge.properties = existingEdge.properties;
        this._edgeById[existingEdge.id] = edge;
      }
    }
  }

  private _removeNodes(nodeIds: number[]) {
    for (let i = 0; i < nodeIds.length; i++) {
      const node = this.getNodeById(nodeIds[i]);
      if (!node) {
        continue;
      }

      const edges = node.getEdges();
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        edge.startNode.removeEdge(edge);
        edge.endNode.removeEdge(edge);
        delete this._edgeById[edge.id];
      }

      delete this._nodeById[node.id];
    }
  }

  private _removeEdges(edgeIds: number[]) {
    for (let i = 0; i < edgeIds.length; i++) {
      const edge = this.getEdgeById(edgeIds[i]);
      if (!edge) {
        continue;
      }

      edge.startNode.removeEdge(edge);
      edge.endNode.removeEdge(edge);
      delete this._edgeById[edge.id];
    }
  }

  private _applyEdgeOffsets() {
    const graphEdges = this.getEdges();
    const edgeOffsets = getEdgeOffsets<N, E>(graphEdges);
    for (let i = 0; i < edgeOffsets.length; i++) {
      const edge = graphEdges[i];
      const edgeOffset = edgeOffsets[i];
      this._edgeById[edge.id] = EdgeFactory.copy(edge, { offset: edgeOffset });
    }
  }

  private _applyStyle() {
    if (this._style?.getNodeStyle) {
      const newNodes = this.getNodes();
      for (let i = 0; i < newNodes.length; i++) {
        const properties = this._style.getNodeStyle(newNodes[i]);
        if (properties) {
          newNodes[i].properties = properties;
        }
      }
    }

    if (this._style?.getEdgeStyle) {
      const newEdges = this.getEdges();
      for (let i = 0; i < newEdges.length; i++) {
        const properties = this._style.getEdgeStyle(newEdges[i]);
        if (properties) {
          newEdges[i].properties = properties;
        }
      }
    }
  }
}
