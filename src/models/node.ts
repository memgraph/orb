import { IEdge, IEdgeBase } from './edge';
import { Color, IPosition, IRectangle, isPointInRectangle } from '../common';
import { ImageHandler } from '../services/images';
import { GraphObjectState } from './state';
import { IObserver, ISubject } from './observer';

/**
 * Node baseline object with required fields
 * that user needs to define for a node.
 */
export interface INodeBase {
  id: any;
}

/**
 * Node position for the graph simulations. Node position
 * is determined by x and y coordinates.
 */
export interface INodePosition {
  id: any;
  x?: number;
  y?: number;
}

export interface INodeCoordinates {
  x: number;
  y: number;
}

export interface INodeMapCoordinates {
  lat: number;
  lng: number;
}

export enum NodeShapeType {
  CIRCLE = 'circle',
  DOT = 'dot',
  SQUARE = 'square',
  DIAMOND = 'diamond',
  TRIANGLE = 'triangle',
  TRIANGLE_DOWN = 'triangleDown',
  STAR = 'star',
  HEXAGON = 'hexagon',
}

/**
 * Node style properties used to style the node (color, width, label, etc.).
 */
export type INodeStyle = Partial<{
  borderColor: Color | string;
  borderColorHover: Color | string;
  borderColorSelected: Color | string;
  borderWidth: number;
  borderWidthSelected: number;
  color: Color | string;
  colorHover: Color | string;
  colorSelected: Color | string;
  fontBackgroundColor: Color | string;
  fontColor: Color | string;
  fontFamily: string;
  fontSize: number;
  imageUrl: string;
  imageUrlSelected: string;
  label: string;
  shadowColor: Color | string;
  shadowSize: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shape: NodeShapeType;
  size: number;
  mass: number;
  zIndex: number;
}>;

export interface INodeData<N extends INodeBase> {
  data: N;
}

export interface INode<N extends INodeBase, E extends IEdgeBase> extends ISubject {
  getId(): number;
  getData(): N;
  getPosition(): INodePosition;
  getStyle(): INodeStyle;
  getState(): number;
  clearPosition(): void;
  getCenter(): IPosition;
  getRadius(): number;
  getBorderedRadius(): number;
  getBoundingBox(): IRectangle;
  getInEdges(): IEdge<N, E>[];
  getOutEdges(): IEdge<N, E>[];
  getEdges(): IEdge<N, E>[];
  getAdjacentNodes(): INode<N, E>[];
  hasStyle(): boolean;
  addEdge(edge: IEdge<N, E>): void;
  removeEdge(edge: IEdge<N, E>): void;
  isSelected(): boolean;
  isHovered(): boolean;
  clearState(): void;
  getDistanceToBorder(): number;
  includesPoint(point: IPosition): boolean;
  hasShadow(): boolean;
  hasBorder(): boolean;
  getLabel(): string | undefined;
  getColor(): Color | string | undefined;
  getBorderWidth(): number;
  getBorderColor(): Color | string | undefined;
  getBackgroundImage(): HTMLImageElement | undefined;
  setData(data: N): void;
  setData(callback: (node: INode<N, E>) => N): void;
  setPosition(position: INodeCoordinates | INodeMapCoordinates | INodePosition): void;
  setPosition(callback: (node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates | INodePosition): void;
  setStyle(style: INodeStyle): void;
  setStyle(callback: (node: INode<N, E>) => INodeStyle): void;
  setState(state: number): void;
  setState(callback: (node: INode<N, E>) => number): void;
}

// TODO: Dirty solution: Find another way to listen for global images, maybe through
//  events that user can listen for: images-load-start, images-load-end
export interface INodeSettings {
  onLoadedImage: () => void;
}

export class NodeFactory {
  static create<N extends INodeBase, E extends IEdgeBase>(
    data: INodeData<N>,
    settings?: Partial<INodeSettings>,
    listener?: IObserver,
  ): INode<N, E> {
    return new Node<N, E>(data, settings, listener);
  }
}

export const isNode = <N extends INodeBase, E extends IEdgeBase>(obj: any): obj is INode<N, E> => {
  return obj instanceof Node;
};

export class Node<N extends INodeBase, E extends IEdgeBase> implements INode<N, E> {
  protected readonly _id: number;
  protected _data: N;
  protected _position: INodePosition;
  protected _style: INodeStyle = {};
  protected _state = GraphObjectState.NONE;

  private readonly _listeners: IObserver[] = [];
  private readonly _inEdgesById: { [id: number]: IEdge<N, E> } = {};
  private readonly _outEdgesById: { [id: number]: IEdge<N, E> } = {};
  private readonly _onLoadedImage?: () => void;

  constructor(data: INodeData<N>, settings?: Partial<INodeSettings>, listener?: IObserver) {
    this._id = data.data.id;
    this._data = data.data;
    this._position = { id: this._id };
    this._onLoadedImage = settings?.onLoadedImage;
    if (listener) {
      this._listeners.push(listener);
    }
  }

  getId(): number {
    return this._id;
  }

  getData(): N {
    return this._data;
  }

  getPosition(): INodePosition {
    return this._position;
  }

  getStyle(): INodeStyle {
    return this._style;
  }

  getState(): number {
    return this._state;
  }

  clearPosition() {
    this._position.x = undefined;
    this._position.y = undefined;

    if ('lng' in this._data) {
      this.setData({ ...this.getData(), lng: undefined });
    }

    if ('lat' in this._data) {
      this.setData({ ...this.getData(), lat: undefined });
    }

    this.notifyListeners();
  }

  getCenter(): IPosition {
    // This should not be called in the render because nodes without position will be
    // filtered out
    if (this._position.x === undefined || this._position.y === undefined) {
      return { x: 0, y: 0 };
    }
    return { x: this._position.x, y: this._position.y };
  }

  getRadius(): number {
    return this._style.size ?? 0;
  }

  getBorderedRadius(): number {
    return this.getRadius() + this.getBorderWidth() / 2;
  }

  getBoundingBox(): IRectangle {
    const center = this.getCenter();
    const radius = this.getBorderedRadius();
    return {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    };
  }

  getInEdges(): IEdge<N, E>[] {
    return Object.values(this._inEdgesById);
  }

  getOutEdges(): IEdge<N, E>[] {
    return Object.values(this._outEdgesById);
  }

  getEdges(): IEdge<N, E>[] {
    const edgeById: { [id: number]: IEdge<N, E> } = {};

    const outEdges = this.getOutEdges();
    for (let i = 0; i < outEdges.length; i++) {
      const outEdge = outEdges[i];
      edgeById[outEdge.getId()] = outEdge;
    }

    const inEdges = this.getInEdges();
    for (let i = 0; i < inEdges.length; i++) {
      const inEdge = inEdges[i];
      edgeById[inEdge.getId()] = inEdge;
    }

    return Object.values(edgeById);
  }

  getAdjacentNodes(): INode<N, E>[] {
    const adjacentNodeById: { [id: number]: INode<N, E> } = {};

    const outEdges = this.getOutEdges();
    for (let i = 0; i < outEdges.length; i++) {
      const adjacentNode = outEdges[i].endNode;
      if (adjacentNode) {
        adjacentNodeById[adjacentNode.getId()] = adjacentNode;
      }
    }

    const inEdges = this.getInEdges();
    for (let i = 0; i < inEdges.length; i++) {
      const adjacentNode = inEdges[i].startNode;
      if (adjacentNode) {
        adjacentNodeById[adjacentNode.getId()] = adjacentNode;
      }
    }

    return Object.values(adjacentNodeById);
  }

  hasStyle(): boolean {
    return this._style && Object.keys(this._style).length > 0;
  }

  addEdge(edge: IEdge<N, E>) {
    if (edge.start === this._id) {
      this._outEdgesById[edge.getId()] = edge;
    }
    if (edge.end === this._id) {
      this._inEdgesById[edge.getId()] = edge;
    }
  }

  removeEdge(edge: IEdge<N, E>) {
    delete this._outEdgesById[edge.getId()];
    delete this._inEdgesById[edge.getId()];
  }

  isSelected(): boolean {
    return this._state === GraphObjectState.SELECTED;
  }

  isHovered(): boolean {
    return this._state === GraphObjectState.HOVERED;
  }

  clearState(): void {
    this.setState(GraphObjectState.NONE);

    this.notifyListeners();
  }

  getDistanceToBorder(): number {
    // TODO: Add "getDistanceToBorder(angle: number)" for each node shape type because this covers only circles
    return this.getBorderedRadius();
  }

  includesPoint(point: IPosition): boolean {
    const isInBoundingBox = this._isPointInBoundingBox(point);
    if (!isInBoundingBox) {
      return false;
    }

    // For square type, we don't need to check the circle
    if (this._style.shape === NodeShapeType.SQUARE) {
      return isInBoundingBox;
    }

    // TODO: Add better "includePoint" checks for stars, triangles, hexagons, etc.
    const center = this.getCenter();
    const borderedRadius = this.getBorderedRadius();

    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.sqrt(dx * dx + dy * dy) <= borderedRadius;
  }

  hasShadow(): boolean {
    return (
      (this._style.shadowSize ?? 0) > 0 || (this._style.shadowOffsetX ?? 0) > 0 || (this._style.shadowOffsetY ?? 0) > 0
    );
  }

  hasBorder(): boolean {
    const hasBorderWidth = (this._style.borderWidth ?? 0) > 0;
    const hasBorderWidthSelected = (this._style.borderWidthSelected ?? 0) > 0;
    return hasBorderWidth || (this.isSelected() && hasBorderWidthSelected);
  }

  getLabel(): string | undefined {
    return this._style.label;
  }

  getColor(): Color | string | undefined {
    let color: Color | string | undefined = undefined;

    if (this._style.color) {
      color = this._style.color;
    }
    if (this.isHovered() && this._style.colorHover) {
      color = this._style.colorHover;
    }
    if (this.isSelected() && this._style.colorSelected) {
      color = this._style.colorSelected;
    }

    return color;
  }

  getBorderWidth(): number {
    let borderWidth = 0;
    if (this._style.borderWidth && this._style.borderWidth > 0) {
      borderWidth = this._style.borderWidth;
    }
    if (this.isSelected() && this._style.borderWidthSelected && this._style.borderWidthSelected > 0) {
      borderWidth = this._style.borderWidthSelected;
    }
    return borderWidth;
  }

  getBorderColor(): Color | string | undefined {
    if (!this.hasBorder()) {
      return undefined;
    }

    let borderColor: Color | string | undefined = undefined;

    if (this._style.borderColor) {
      borderColor = this._style.borderColor;
    }
    if (this.isHovered() && this._style.borderColorHover) {
      borderColor = this._style.borderColorHover;
    }
    if (this.isSelected() && this._style.borderColorSelected) {
      borderColor = this._style.borderColorSelected.toString();
    }

    return borderColor;
  }

  getBackgroundImage(): HTMLImageElement | undefined {
    if ((this._style.size ?? 0) <= 0) {
      return;
    }

    let imageUrl;

    if (this._style.imageUrl) {
      imageUrl = this._style.imageUrl;
    }
    if (this.isSelected() && this._style.imageUrlSelected) {
      imageUrl = this._style.imageUrlSelected;
    }

    if (!imageUrl) {
      return;
    }

    const image = ImageHandler.getInstance().getImage(imageUrl);
    if (image) {
      return image;
    }

    return ImageHandler.getInstance().loadImage(imageUrl, (error) => {
      if (!error) {
        this._onLoadedImage?.();
      }
    });
  }

  addListener(observer: IObserver): void {
    this._listeners.push(observer);
  }

  removeListener(observer: IObserver): void {
    this._listeners.splice(this._listeners.indexOf(observer), 1);
  }

  notifyListeners(): void {
    this._listeners.forEach((listener) => {
      listener.update();
    });
  }

  setData(data: N): void;

  setData(callback: (node: INode<N, E>) => N): void;

  setData(arg: N | ((node: INode<N, E>) => N)) {
    if (typeof arg === 'function') {
      this._data = (arg as (node: INode<N, E>) => N)(this);
    } else {
      this._data = arg as N;
    }
    this.notifyListeners();
  }

  setPosition(position: INodeCoordinates | INodeMapCoordinates | INodePosition): void;

  setPosition(callback: (node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates | INodePosition): void;

  setPosition(
    arg:
      | INodeCoordinates
      | INodeMapCoordinates
      | INodePosition
      | ((node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates | INodePosition),
  ) {
    if ('id' in arg) {
      this._position = arg;
    }

    let position: INodeCoordinates | INodeMapCoordinates | INodePosition;
    if (typeof arg === 'function') {
      position = (arg as (node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates)(this);
    } else {
      position = arg;
    }

    if ('x' in position && 'y' in position) {
      this._position.x = position.x;
      this._position.y = position.y;
    }

    if ('lat' in position && 'lng' in position) {
      this._data = {
        ...this._data,
        lat: position.lat,
        lng: position.lng,
      };

      this.notifyListeners();
    }
  }

  setStyle(style: INodeStyle): void;

  setStyle(callback: (node: INode<N, E>) => INodeStyle): void;

  setStyle(arg: INodeStyle | ((node: INode<N, E>) => INodeStyle)): void {
    if (typeof arg === 'function') {
      this._style = (arg as (node: INode<N, E>) => INodeStyle)(this);
    } else {
      this._style = arg as INodeStyle;
    }
    this.notifyListeners();
  }

  setState(state: number): void;

  setState(callback: (node: INode<N, E>) => number): void;

  setState(arg: number | ((node: INode<N, E>) => number)): void {
    if (typeof arg === 'function') {
      this._state = (arg as (node: INode<N, E>) => number)(this);
    } else {
      this._state = arg as number;
    }
    this.notifyListeners();
  }

  protected _isPointInBoundingBox(point: IPosition): boolean {
    return isPointInRectangle(this.getBoundingBox(), point);
  }
}
