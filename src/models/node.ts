import { IEdge, IEdgeBase } from './edge';
import { Color, IPosition, IRectangle, isPointInRectangle } from '../common';
import { ImageHandler } from '../services/images';
import { GraphObjectState, IGraphObjectStateOptions, IGraphObjectStateParameters } from './state';
import { IObserver, ISubject, Subject } from '../utils/observer.utils';
import { patchProperties } from '../utils/object.utils';
import { isFunction, isNumber, isPlainObject } from '../utils/type.utils';

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
  id: number;
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
  patchData(data: Partial<N>): void;
  patchData(callback: (node: INode<N, E>) => Partial<N>): void;
  setPosition(position: INodeCoordinates | INodeMapCoordinates | INodePosition, call: boolean): void;
  setPosition(
    callback: (node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates | INodePosition,
    call: boolean,
  ): void;
  setStyle(style: INodeStyle): void;
  setStyle(callback: (node: INode<N, E>) => INodeStyle): void;
  patchStyle(style: INodeStyle): void;
  patchStyle(callback: (node: INode<N, E>) => INodeStyle): void;
  setState(state: number): void;
  setState(state: IGraphObjectStateParameters): void;
  setState(callback: (node: INode<N, E>) => number): void;
  setState(callback: (node: INode<N, E>) => IGraphObjectStateParameters): void;
}

// TODO: Dirty solution: Find another way to listen for global images, maybe through
//  events that user can listen for: images-load-start, images-load-end
export interface INodeSettings {
  onLoadedImage: () => void;
  listeners: IObserver[];
}

export class NodeFactory {
  static create<N extends INodeBase, E extends IEdgeBase>(
    data: INodeData<N>,
    settings?: Partial<INodeSettings>,
  ): INode<N, E> {
    return new Node<N, E>(data, settings);
  }
}

export const isNode = <N extends INodeBase, E extends IEdgeBase>(obj: any): obj is INode<N, E> => {
  return obj instanceof Node;
};

export class Node<N extends INodeBase, E extends IEdgeBase> extends Subject implements INode<N, E> {
  public readonly id: number;
  protected _data: N;
  protected _position: INodePosition;
  protected _style: INodeStyle = {};
  protected _state = GraphObjectState.NONE;

  private readonly _inEdgesById: { [id: number]: IEdge<N, E> } = {};
  private readonly _outEdgesById: { [id: number]: IEdge<N, E> } = {};
  private readonly _onLoadedImage?: () => void;

  constructor(data: INodeData<N>, settings?: Partial<INodeSettings>) {
    super();
    this.id = data.data.id;
    this._data = data.data;
    this._position = { id: this.id };
    this._onLoadedImage = settings?.onLoadedImage;
    if (settings && settings.listeners) {
      this.listeners = settings.listeners;
    }
  }

  getId(): number {
    return this.id;
  }

  getData(): N {
    return structuredClone(this._data);
  }

  getPosition(): INodePosition {
    return structuredClone(this._position);
  }

  getStyle(): INodeStyle {
    return structuredClone(this._style);
  }

  getState(): number {
    return this._state;
  }

  clearPosition() {
    this._position.x = undefined;
    this._position.y = undefined;
    const data = this.getData();

    if ('lng' in this._data) {
      this.setData({ ...data, lng: undefined });
    }

    if ('lat' in this._data) {
      this.setData({ ...data, lat: undefined });
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
    if (edge.start === this.id) {
      this._outEdgesById[edge.getId()] = edge;
    }
    if (edge.end === this.id) {
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

  setData(data: N): void;
  setData(callback: (node: INode<N, E>) => N): void;
  setData(arg: N | ((node: INode<N, E>) => N)) {
    if (isFunction(arg)) {
      this._data = (arg as (node: INode<N, E>) => N)(this);
    } else {
      this._data = arg as N;
    }
    this.notifyListeners();
  }

  patchData(data: Partial<N>): void;
  patchData(callback: (node: INode<N, E>) => Partial<N>): void;
  patchData(arg: Partial<N> | ((node: INode<N, E>) => Partial<N>)) {
    let data: Partial<N>;

    if (isFunction(arg)) {
      data = (arg as (node: INode<N, E>) => Partial<N>)(this);
    } else {
      data = arg as Partial<N>;
    }

    patchProperties(this._data, data);

    this.notifyListeners();
  }

  setPosition(position: INodeCoordinates | INodeMapCoordinates | INodePosition, isInner?: boolean): void;
  setPosition(
    callback: (node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates | INodePosition,
    isInner?: boolean,
  ): void;
  setPosition(
    arg:
      | INodeCoordinates
      | INodeMapCoordinates
      | INodePosition
      | ((node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates | INodePosition),
    isInner?: boolean,
  ) {
    let position: INodeCoordinates | INodeMapCoordinates | INodePosition;
    if (isFunction(arg)) {
      position = (arg as (node: INode<N, E>) => INodeCoordinates | INodeMapCoordinates)(this);
    } else {
      position = arg;
    }

    if ('x' in position && 'y' in position) {
      this._position.x = position.x;
      this._position.y = position.y;
      if ('id' in position) {
        this._position.id = position.id;
      }
    }

    if ('lat' in position && 'lng' in position) {
      this._data = {
        ...this._data,
        lat: position.lat,
        lng: position.lng,
      };
    }

    if (!isInner) {
      this.notifyListeners({ id: this.id, ...position });
    }
  }

  setStyle(style: INodeStyle): void;
  setStyle(callback: (node: INode<N, E>) => INodeStyle): void;
  setStyle(arg: INodeStyle | ((node: INode<N, E>) => INodeStyle)): void {
    if (isFunction(arg)) {
      this._style = (arg as (node: INode<N, E>) => INodeStyle)(this);
    } else {
      this._style = arg as INodeStyle;
    }
    this.notifyListeners();
  }

  patchStyle(style: INodeStyle): void;
  patchStyle(callback: (node: INode<N, E>) => INodeStyle): void;
  patchStyle(arg: INodeStyle | ((node: INode<N, E>) => INodeStyle)) {
    let style: INodeStyle;

    if (isFunction(arg)) {
      style = (arg as (node: INode<N, E>) => INodeStyle)(this);
    } else {
      style = arg as INodeStyle;
    }

    patchProperties(this._style, style);

    this.notifyListeners();
  }

  setState(state: number): void;
  setState(state: IGraphObjectStateParameters): void;
  setState(callback: (node: INode<N, E>) => number): void;
  setState(callback: (node: INode<N, E>) => IGraphObjectStateParameters): void;
  setState(
    arg:
      | number
      | IGraphObjectStateParameters
      | ((node: INode<N, E>) => number)
      | ((node: INode<N, E>) => IGraphObjectStateParameters),
  ): void {
    let result: number | IGraphObjectStateParameters;

    if (isFunction(arg)) {
      result = (arg as (node: INode<N, E>) => number | IGraphObjectStateParameters)(this);
    } else {
      result = arg;
    }

    if (isNumber(result)) {
      this._state = result;
    } else if (isPlainObject(result) && result.options) {
      const options = result.options;

      this._state = this._handleState(result.state, options);

      this.notifyListeners({
        id: this.id,
        type: 'node',
        options: options,
      });

      return;
    }

    this.notifyListeners();
  }

  protected _isPointInBoundingBox(point: IPosition): boolean {
    return isPointInRectangle(this.getBoundingBox(), point);
  }

  private _handleState(state: number, options: IGraphObjectStateOptions): number {
    if (options.isToggle && this._state === state) {
      return GraphObjectState.NONE;
    } else {
      return state;
    }
  }
}
