import { INode, INodeBase, INodePosition, NodeFactory } from './node';
import { IEdge, EdgeFactory, IEdgeBase, IEdgePosition } from './edge';
import { IPosition, IRectangle } from '../common';
import { IGraphStyle } from './style';
import { ImageHandler } from '../services/images';
import { getEdgeOffsets } from './topology';
import { IEntityState, EntityState } from '../utils/entity.utils';
import { IObserver, IObserverDataPayload, ISubject, Subject } from '../utils/observer.utils';
import { patchProperties } from '../utils/object.utils';

export interface IGraphData<N extends INodeBase, E extends IEdgeBase> {
  nodes: N[];
  edges: E[];
}

export type IEdgeFilter<N extends INodeBase, E extends IEdgeBase> = (edge: IEdge<N, E>) => boolean;

export type INodeFilter<N extends INodeBase, E extends IEdgeBase> = (node: INode<N, E>) => boolean;

export interface IGraph<N extends INodeBase, E extends IEdgeBase> extends IObserver, ISubject {
  getNodes(filterBy?: INodeFilter<N, E>): INode<N, E>[];
  getEdges(filterBy?: IEdgeFilter<N, E>): IEdge<N, E>[];
  getNodeCount(): number;
  getEdgeCount(): number;
  getNodeById(id: any): INode<N, E> | undefined;
  getEdgeById(id: any): IEdge<N, E> | undefined;
  getNodePositions(filterBy?: INodeFilter<N, E>): INodePosition[];
  getSelectedNodes(): INode<N, E>[];
  getSelectedEdges(): IEdge<N, E>[];
  getHoveredNodes(): INode<N, E>[];
  getHoveredEdges(): IEdge<N, E>[];
  setNodePositions(positions: INodePosition[]): void;
  getEdgePositions(filterBy?: IEdgeFilter<N, E>): IEdgePosition[];
  setDefaultStyle(style: Partial<IGraphStyle<N, E>>): void;
  setup(data: Partial<IGraphData<N, E>>): void;
  clearPositions(): void;
  merge(data: Partial<IGraphData<N, E>>): void;
  remove(data: Partial<{ nodeIds: number[]; edgeIds: number[] }>): void;
  isEqual<T extends INodeBase, K extends IEdgeBase>(graph: Graph<T, K>): boolean;
  getBoundingBox(): IRectangle;
  getNearestNode(point: IPosition): INode<N, E> | undefined;
  getNearestEdge(point: IPosition, minDistance?: number): IEdge<N, E> | undefined;
  setSettings(settings: Partial<IGraphSettings<N, E>>): void;
}

export interface IGraphSettings<N extends INodeBase, E extends IEdgeBase> {
  // TODO(tlastre): Move this to node events when image listening will be on node level
  // TODO(tlastre): Add global events user can listen for: images-load-start, images-load-end
  onLoadedImages?: () => void;
  onSetupData?: (data: Partial<IGraphData<N, E>>) => void;
  onMergeData?: (data: Partial<IGraphData<N, E>>) => void;
  onRemoveData?: (data: Partial<{ nodeIds: number[]; edgeIds: number[] }>) => void;
  listeners?: IObserver[];
}

export class Graph<N extends INodeBase, E extends IEdgeBase> extends Subject implements IGraph<N, E> {
  private _nodes: IEntityState<any, INode<N, E>> = new EntityState<any, INode<N, E>>({
    getId: (node) => node.getId(),
    sortBy: (node1, node2) => (node1.getStyle().zIndex ?? 0) - (node2.getStyle().zIndex ?? 0),
  });
  private _edges: IEntityState<any, IEdge<N, E>> = new EntityState<any, IEdge<N, E>>({
    getId: (edge) => edge.getId(),
    sortBy: (edge1, edge2) => (edge1.getStyle().zIndex ?? 0) - (edge2.getStyle().zIndex ?? 0),
  });
  private _defaultStyle?: Partial<IGraphStyle<N, E>>;
  private _settings: IGraphSettings<N, E>;

  constructor(data?: Partial<IGraphData<N, E>>, settings?: Partial<IGraphSettings<N, E>>) {
    // TODO(dlozic): How to use object assign here? If I add add and export a default const here, it needs N, E.
    super();
    this._settings = settings || {};
    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];
    if (settings && settings.listeners) {
      this.listeners = settings.listeners;
    }
    this.setup({ nodes, edges });
  }

  setSettings(settings: Partial<IGraphSettings<N, E>>) {
    patchProperties(this._settings, settings);
    this.notifyListeners();
  }

  /**
   * Returns a list of nodes.
   *
   * @param {INodeFilter} filterBy Filter function for nodes
   * @return {INode[]} List of nodes
   */
  getNodes(filterBy?: INodeFilter<N, E>): INode<N, E>[] {
    return this._nodes.getAll({ filterBy });
  }

  /**
   * Returns a list of edges.
   *
   * @param {IEdgeFilter} filterBy Filter function for edges
   * @return {IEdge[]} List of edges
   */
  getEdges(filterBy?: IEdgeFilter<N, E>): IEdge<N, E>[] {
    return this._edges.getAll({ filterBy });
  }

  /**
   * Returns the total node count.
   *
   * @return {number} Total node count
   */
  getNodeCount(): number {
    return this._nodes.size;
  }

  /**
   * Returns the total edge count.
   *
   * @return {number} Total edge count
   */
  getEdgeCount(): number {
    return this._edges.size;
  }

  /**
   * Returns node by node id.
   *
   * @param {any} id Node id
   * @return {Node | undefined} Node or undefined
   */
  getNodeById(id: any): INode<N, E> | undefined {
    return this._nodes.getOne(id);
  }

  /**
   * Returns edge by edge id.
   *
   * @param {any} id Edge id
   * @return {IEdge | undefined} Edge or undefined
   */
  getEdgeById(id: any): IEdge<N, E> | undefined {
    return this._edges.getOne(id);
  }

  /**
   * Returns a list of selected nodes.
   *
   * @return {INode[]} List of selected nodes
   */
  getSelectedNodes(): INode<N, E>[] {
    return this.getNodes((node) => node.isSelected());
  }

  /**
   * Returns a list of selected edges.
   *
   * @return {IEdge[]} List of selected edges
   */
  getSelectedEdges(): IEdge<N, E>[] {
    return this.getEdges((edge) => edge.isSelected());
  }

  /**
   * Returns a list of hovered nodes.
   *
   * @return {INode[]} List of hovered nodes
   */
  getHoveredNodes(): INode<N, E>[] {
    return this.getNodes((node) => node.isHovered());
  }

  /**
   * Returns a list of hovered edges.
   *
   * @return {IEdge[]} List of hovered edges
   */
  getHoveredEdges(): IEdge<N, E>[] {
    return this.getEdges((edge) => edge.isHovered());
  }

  /**
   * Returns a list of current node positions (x, y).
   *
   * @param {INodeFilter} filterBy Filter function for nodes
   * @return {INodePosition[]} List of node positions
   */
  getNodePositions(filterBy?: INodeFilter<N, E>): INodePosition[] {
    const nodes = this.getNodes(filterBy);
    const positions: INodePosition[] = new Array<INodePosition>(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      positions[i] = nodes[i].getPosition();
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
      const node = this._nodes.getOne(positions[i].id);
      if (node) {
        node.setPosition(positions[i], true);
      }
    }
  }

  /**
   * Returns a list of current edge positions. Edge positions do not have
   * (x, y) but a link to the source and target node ids.
   *
   * @param {IEdgeFilter} filterBy Filter function for edges
   * @return {IEdgePosition[]} List of edge positions
   */
  getEdgePositions(filterBy?: IEdgeFilter<N, E>): IEdgePosition[] {
    const edges = this.getEdges(filterBy);
    const positions: IEdgePosition[] = new Array<IEdgePosition>(edges.length);
    for (let i = 0; i < edges.length; i++) {
      positions[i] = edges[i].getPosition();
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
    this._nodes.removeAll();
    this._edges.removeAll();

    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];

    this._insertNodes(nodes);
    this._insertEdges(edges);

    this._applyEdgeOffsets();
    this._applyStyle();

    this._settings?.onSetupData?.(data);
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

    this._settings?.onMergeData?.(data);
  }

  // TODO(dlozic): Add delete all mechanic.
  remove(data: Partial<{ nodeIds: number[]; edgeIds: number[] }>) {
    const nodeIds = data.nodeIds ?? [];
    const edgeIds = data.edgeIds ?? [];

    this._removeNodes(nodeIds);
    this._removeEdges(edgeIds);

    this._applyEdgeOffsets();
    this._applyStyle();

    this._settings?.onRemoveData?.(data);
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
      if (!graph.getNodeById(nodes[i].getId())) {
        return false;
      }
    }

    const edges = this.getEdges();
    for (let i = 0; i < edges.length; i++) {
      if (!graph.getEdgeById(edges[i].getId())) {
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

  update(data?: IObserverDataPayload): void {
    this.notifyListeners(data);
  }

  private _insertNodes(nodes: N[]) {
    const newNodes: INode<N, E>[] = new Array<INode<N, E>>(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      newNodes[i] = NodeFactory.create<N, E>(
        { data: nodes[i] },
        { onLoadedImage: () => this._settings?.onLoadedImages?.(), listeners: [this] },
      );
    }
    this._nodes.setMany(newNodes);
  }

  private _insertEdges(edges: E[]) {
    const newEdges: IEdge<N, E>[] = [];
    for (let i = 0; i < edges.length; i++) {
      const startNode = this.getNodeById(edges[i].start);
      const endNode = this.getNodeById(edges[i].end);

      if (startNode && endNode) {
        newEdges.push(
          EdgeFactory.create<N, E>(
            {
              data: edges[i],
              startNode,
              endNode,
            },
            {
              listeners: [this],
            },
          ),
        );
      }
    }
    this._edges.setMany(newEdges);
  }

  private _upsertNodes(nodes: N[]) {
    const newNodes: INode<N, E>[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const existingNode = this.getNodeById(nodes[i].id);
      if (existingNode) {
        existingNode.setData(nodes[i]);
        existingNode.setPosition(nodes[i], true);
        continue;
      }

      newNodes.push(
        NodeFactory.create<N, E>(
          { data: nodes[i] },
          { onLoadedImage: () => this._settings?.onLoadedImages?.(), listeners: [this] },
        ),
      );
    }
    this._nodes.setMany(newNodes);
  }

  private _upsertEdges(edges: E[]) {
    const newEdges: IEdge<N, E>[] = [];
    const removedEdgeIds: any[] = [];

    for (let i = 0; i < edges.length; i++) {
      const newEdgeData = edges[i];
      const existingEdge = this.getEdgeById(newEdgeData.id);

      // New edge
      if (!existingEdge) {
        const startNode = this.getNodeById(newEdgeData.start);
        const endNode = this.getNodeById(newEdgeData.end);

        if (startNode && endNode) {
          const edge = EdgeFactory.create<N, E>(
            {
              data: newEdgeData,
              startNode,
              endNode,
            },
            {
              listeners: [this],
            },
          );
          newEdges.push(edge);
        }
        continue;
      }

      // The connection of the edge stays the same, but the data has changed
      if (existingEdge.start === newEdgeData.start && existingEdge.end === newEdgeData.end) {
        existingEdge.setData(newEdgeData);
        continue;
      }

      // Edge connection (start or end node) has changed
      existingEdge.startNode.removeEdge(existingEdge);
      existingEdge.endNode.removeEdge(existingEdge);
      const startNode = this.getNodeById(newEdgeData.start);
      const endNode = this.getNodeById(newEdgeData.end);

      if (!startNode || !endNode) {
        removedEdgeIds.push(existingEdge.getId());
        continue;
      }

      const edge = EdgeFactory.create<N, E>(
        {
          data: newEdgeData,
          offset: existingEdge.offset,
          startNode,
          endNode,
        },
        {
          listeners: [this],
        },
      );
      edge.setState(existingEdge.getState());
      edge.setStyle(existingEdge.getStyle());
      newEdges.push(edge);
    }

    this._edges.setMany(newEdges);
    this._edges.removeMany(removedEdgeIds);
  }

  private _removeNodes(nodeIds: any[]) {
    const removedNodeIds: any[] = [];
    const removedEdgeIds: any[] = [];

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
        removedEdgeIds.push(edge.getId());
      }

      removedNodeIds.push(node.getId());
    }
    this._nodes.removeMany(removedNodeIds);
    this._edges.removeMany(removedEdgeIds);
  }

  private _removeEdges(edgeIds: any[]) {
    const removedEdgeIds: any[] = [];

    for (let i = 0; i < edgeIds.length; i++) {
      const edge = this.getEdgeById(edgeIds[i]);
      if (!edge) {
        continue;
      }

      edge.startNode.removeEdge(edge);
      edge.endNode.removeEdge(edge);
      removedEdgeIds.push(edge.getId());
    }
    this._edges.removeMany(removedEdgeIds);
  }

  private _applyEdgeOffsets() {
    const graphEdges = this.getEdges();
    const edgeOffsets = getEdgeOffsets<N, E>(graphEdges);
    const updatedEdges: IEdge<N, E>[] = new Array<IEdge<N, E>>(edgeOffsets.length);

    for (let i = 0; i < edgeOffsets.length; i++) {
      const edge = graphEdges[i];
      const edgeOffset = edgeOffsets[i];
      updatedEdges[i] = EdgeFactory.copy(edge, { offset: edgeOffset });
    }
    this._edges.setMany(updatedEdges);
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
          newNodes[i].setStyle(style);
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
          newEdges[i].setStyle(style);
        }
      }
    }

    if (styleImageUrls.size) {
      ImageHandler.getInstance().loadImages(Array.from(styleImageUrls), () => {
        this._settings?.onLoadedImages?.();
      });
    }

    // Sort because of the possibility that style properties changed
    this._nodes.sort();
    this._edges.sort();
  }
}
