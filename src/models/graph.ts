import { INode, INodeBase, INodePosition, NodeFactory } from './node';
import { IEdge, EdgeFactory, IEdgeBase, IEdgePosition } from './edge';
import { IPosition, IRectangle } from '../common';
import { IGraphStyle } from './style';
import { ImageHandler } from '../services/images';
import { getEdgeOffsets } from './topology';

export interface IGraphData<N extends INodeBase, E extends IEdgeBase> {
  nodes: N[];
  edges: E[];
}

export type IEdgeFilter<N extends INodeBase, E extends IEdgeBase> = (edge: IEdge<N, E>) => boolean;

export type INodeFilter<N extends INodeBase, E extends IEdgeBase> = (node: INode<N, E>) => boolean;

export interface IGraph<N extends INodeBase, E extends IEdgeBase> {
  getNodes(filterBy?: INodeFilter<N, E>): INode<N, E>[];
  getEdges(filterBy?: IEdgeFilter<N, E>): IEdge<N, E>[];
  getNodeCount(): number;
  getEdgeCount(): number;
  getNodeById(id: any): INode<N, E> | undefined;
  getEdgeById(id: any): IEdge<N, E> | undefined;
  getNodePositions(): INodePosition[];
  setNodePositions(positions: INodePosition[]): void;
  getEdgePositions(): IEdgePosition[];
  setDefaultStyle(style: Partial<IGraphStyle<N, E>>): void;
  setup(data: Partial<IGraphData<N, E>>): void;
  clearPositions(): void;
  merge(data: Partial<IGraphData<N, E>>): void;
  remove(data: Partial<{ nodeIds: number[]; edgeIds: number[] }>): void;
  isEqual<T extends INodeBase, K extends IEdgeBase>(graph: Graph<T, K>): boolean;
  getBoundingBox(): IRectangle;
  getNearestNode(point: IPosition): INode<N, E> | undefined;
  getNearestEdge(point: IPosition, minDistance?: number): IEdge<N, E> | undefined;
}

// TODO: Move this to node events when image listening will be on node level
// TODO: Add global events user can listen for: images-load-start, images-load-end
export interface IGraphSettings {
  onLoadedImages: () => void;
}

export class Graph<N extends INodeBase, E extends IEdgeBase> implements IGraph<N, E> {
  private _nodeById: { [id: number]: INode<N, E> } = {};
  private _edgeById: { [id: number]: IEdge<N, E> } = {};
  private _defaultStyle?: Partial<IGraphStyle<N, E>>;
  private _onLoadedImages?: () => void;

  constructor(data?: Partial<IGraphData<N, E>>, settings?: Partial<IGraphSettings>) {
    this._onLoadedImages = settings?.onLoadedImages;
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
   * @param {any} id Node id
   * @return {Node | undefined} Node or undefined
   */
  getNodeById(id: any): INode<N, E> | undefined {
    return this._nodeById[id];
  }

  /**
   * Returns edge by edge id.
   *
   * @param {any} id Edge id
   * @return {IEdge | undefined} Edge or undefined
   */
  getEdgeById(id: any): IEdge<N, E> | undefined {
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
   * Sets default style to new nodes and edges. The applied style will be used
   * for all future nodes and edges added with `.merge` function.
   *
   * @param {IGraphStyle} style Style definition
   */
  setDefaultStyle(style: Partial<IGraphStyle<N, E>>) {
    this._defaultStyle = style;
    this._applyStyle();
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

  clearPositions() {
    const nodes = this.getNodes();
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].clearPosition();
    }
  }

  merge(data: Partial<IGraphData<N, E>>) {
    const nodes = data.nodes ?? [];
    const edges = data.edges ?? [];

    this._upsertNodes(nodes);
    this._upsertEdges(edges);

    this._applyEdgeOffsets();
    this._applyStyle();
  }

  remove(data: Partial<{ nodeIds: number[]; edgeIds: number[] }>) {
    const nodeIds = data.nodeIds ?? [];
    const edgeIds = data.edgeIds ?? [];

    this._removeNodes(nodeIds);
    this._removeEdges(edgeIds);

    this._applyEdgeOffsets();
    // this._applyStyle();
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
      const node = NodeFactory.create<N, E>({ data: nodes[i] }, { onLoadedImage: () => this._onLoadedImages?.() });
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

      const node = NodeFactory.create<N, E>({ data: nodes[i] }, { onLoadedImage: () => this._onLoadedImages?.() });
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
        edge.style = existingEdge.style;
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
    const styleImageUrls: Set<string> = new Set<string>();

    if (this._defaultStyle?.getNodeStyle) {
      const newNodes = this.getNodes();
      for (let i = 0; i < newNodes.length; i++) {
        if (newNodes[i].hasStyle()) {
          continue;
        }

        const style = this._defaultStyle.getNodeStyle(newNodes[i]);
        if (style) {
          newNodes[i].style = style;
          // TODO Add these checks to node property setup
          if (style.imageUrl) {
            styleImageUrls.add(style.imageUrl);
          }
          if (style.imageUrlSelected) {
            styleImageUrls.add(style.imageUrlSelected);
          }
        }
      }
    }

    if (this._defaultStyle?.getEdgeStyle) {
      const newEdges = this.getEdges();
      for (let i = 0; i < newEdges.length; i++) {
        if (newEdges[i].hasStyle()) {
          continue;
        }

        const style = this._defaultStyle.getEdgeStyle(newEdges[i]);
        if (style) {
          newEdges[i].style = style;
        }
      }
    }

    if (styleImageUrls.size) {
      ImageHandler.getInstance().loadImages(Array.from(styleImageUrls), () => {
        this._onLoadedImages?.();
      });
    }
  }
}
