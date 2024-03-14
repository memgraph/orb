import { INodeBase, INode } from './node';
import { GraphObjectState, IGraphObjectStateOptions, IGraphObjectStateParameters } from './state';
import { Color, IPosition, ICircle, getDistanceToLine } from '../common';
import { isArrayOfNumbers, isFunction, isNumber, isPlainObject } from '../utils/type.utils';
import { IObserver, ISubject, Subject } from '../utils/observer.utils';
import { patchProperties } from '../utils/object.utils';

const CURVED_CONTROL_POINT_OFFSET_MIN_SIZE = 4;
const CURVED_CONTROL_POINT_OFFSET_MULTIPLIER = 4;
const DEFAULT_DASHED_LINE_PATTERN: number[] = [5, 5];
const DEFAULT_DOTTED_LINE_PATTERN: number[] = [1, 1];

/**
 * Edge baseline object with required fields
 * that user needs to define for an edge.
 */
export interface IEdgeBase {
  id: any;
  start: any;
  end: any;
}

/**
 * Edge position for the graph simulations. Edge position
 * is determined by source (start) and target (end) nodes.
 */
export interface IEdgePosition {
  id: any;
  source: any;
  target: any;
}

export enum EdgeLineStyleType {
  SOLID = 'solid',
  DASHED = 'dashed',
  DOTTED = 'dotted',
  CUSTOM = 'custom',
}

export type IEdgeLineStyle =
  | { type: EdgeLineStyleType.SOLID }
  | { type: EdgeLineStyleType.DASHED }
  | { type: EdgeLineStyleType.DOTTED }
  | { type: EdgeLineStyleType.CUSTOM; pattern: number[] };

/**
 * Edge style properties used to style the edge (color, width, label, etc.).
 */
export type IEdgeStyle = Partial<{
  arrowSize: number;
  color: Color | string;
  colorHover: Color | string;
  colorSelected: Color | string;
  fontBackgroundColor: Color | string;
  fontColor: Color | string;
  fontFamily: string;
  fontSize: number;
  label: string;
  shadowColor: Color | string;
  shadowSize: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  width: number;
  widthHover: number;
  widthSelected: number;
  zIndex: number;
  lineStyle: IEdgeLineStyle;
}>;

export interface IEdgeData<N extends INodeBase, E extends IEdgeBase> {
  data: E;
  // Offset is used to mark curved or straight lines
  // For straight lines, it is 0, for curved it is +N or -N
  offset?: number;
  // Edge doesn't exist without nodes
  startNode: INode<N, E>;
  endNode: INode<N, E>;
}

export enum EdgeType {
  STRAIGHT = 'straight',
  LOOPBACK = 'loopback',
  CURVED = 'curved',
}

export interface IEdge<N extends INodeBase, E extends IEdgeBase> extends ISubject {
  readonly id: any;
  readonly offset: number;
  readonly start: any;
  readonly startNode: INode<N, E>;
  readonly end: any;
  readonly endNode: INode<N, E>;
  readonly type: EdgeType;
  getId(): any;
  getData(): E;
  getPosition(): IEdgePosition;
  getStyle(): IEdgeStyle;
  getState(): number;
  getListeners(): IObserver[];
  hasStyle(): boolean;
  isSelected(): boolean;
  isHovered(): boolean;
  clearState(): void;
  isLoopback(): boolean;
  isStraight(): boolean;
  isCurved(): boolean;
  getCenter(): IPosition;
  getDistance(point: IPosition): number;
  getLabel(): string | undefined;
  hasShadow(): boolean;
  getWidth(): number;
  getColor(): Color | string | undefined;
  getLineDashPattern(): number[] | null;
  setData(data: E): void;
  setData(callback: (edge: IEdge<N, E>) => E): void;
  patchData(data: Partial<E>): void;
  patchData(callback: (edge: IEdge<N, E>) => Partial<E>): void;
  setStyle(style: IEdgeStyle): void;
  setStyle(callback: (edge: IEdge<N, E>) => IEdgeStyle): void;
  patchStyle(style: IEdgeStyle): void;
  patchStyle(callback: (edge: IEdge<N, E>) => IEdgeStyle): void;
  setState(state: number): void;
  setState(state: IGraphObjectStateParameters): void;
  setState(callback: (edge: IEdge<N, E>) => number): void;
  setState(callback: (edge: IEdge<N, E>) => IGraphObjectStateParameters): void;
}

export interface IEdgeSettings {
  listeners: IObserver[];
}

export class EdgeFactory {
  static create<N extends INodeBase, E extends IEdgeBase>(
    data: IEdgeData<N, E>,
    settings?: IEdgeSettings,
  ): IEdge<N, E> {
    const type = getEdgeType(data);
    switch (type) {
      case EdgeType.STRAIGHT:
        return new EdgeStraight(data, settings);
      case EdgeType.LOOPBACK:
        return new EdgeLoopback(data, settings);
      case EdgeType.CURVED:
        return new EdgeCurved(data, settings);
      default:
        return new EdgeStraight(data, settings);
    }
  }

  static copy<N extends INodeBase, E extends IEdgeBase>(
    edge: IEdge<N, E>,
    data?: Omit<IEdgeData<N, E>, 'data' | 'startNode' | 'endNode'>,
  ): IEdge<N, E> {
    const newEdge = EdgeFactory.create<N, E>({
      data: edge.getData(),
      offset: data?.offset !== undefined ? data.offset : edge.offset,
      startNode: edge.startNode,
      endNode: edge.endNode,
    });
    newEdge.setState(edge.getState());
    newEdge.setStyle(edge.getStyle());
    const listeners = edge.getListeners();

    for (let i = 0; i < listeners.length; i++) {
      newEdge.addListener(listeners[i]);
    }

    return newEdge;
  }
}

export const isEdge = <N extends INodeBase, E extends IEdgeBase>(obj: any): obj is IEdge<N, E> => {
  return obj instanceof EdgeStraight || obj instanceof EdgeCurved || obj instanceof EdgeLoopback;
};

abstract class Edge<N extends INodeBase, E extends IEdgeBase> extends Subject implements IEdge<N, E> {
  protected _data: E;

  public readonly id: number;
  public readonly offset: number;
  public readonly startNode: INode<N, E>;
  public readonly endNode: INode<N, E>;

  protected _style: IEdgeStyle = {};
  protected _state = GraphObjectState.NONE;
  protected _position: IEdgePosition;

  private _type: EdgeType = EdgeType.STRAIGHT;

  constructor(data: IEdgeData<N, E>, settings?: IEdgeSettings) {
    super();
    this.id = data.data.id;
    this._data = data.data;
    this.offset = data.offset ?? 0;
    this.startNode = data.startNode;
    this.endNode = data.endNode;
    this._type = getEdgeType(data);

    this._position = { id: this.id, source: this.startNode.getId(), target: this.endNode.getId() };
    this.startNode.addEdge(this);
    this.endNode.addEdge(this);

    if (settings && settings.listeners) {
      this.listeners = settings.listeners;
    }
  }

  getId(): number {
    return this.id;
  }

  getData(): E {
    return structuredClone(this._data);
  }

  getPosition(): IEdgePosition {
    return structuredClone(this._position);
  }

  getStyle(): IEdgeStyle {
    return structuredClone(this._style);
  }

  getState(): number {
    return this._state;
  }

  get type(): EdgeType {
    return this._type;
  }

  get start(): number {
    return this._data.start;
  }

  get end(): number {
    return this._data.end;
  }

  hasStyle(): boolean {
    return this._style && Object.keys(this._style).length > 0;
  }

  isSelected(): boolean {
    return this._state === GraphObjectState.SELECTED;
  }

  isHovered(): boolean {
    return this._state === GraphObjectState.HOVERED;
  }

  clearState(): void {
    this._state = GraphObjectState.NONE;
  }

  isLoopback(): boolean {
    return this._type === EdgeType.LOOPBACK;
  }

  isStraight(): boolean {
    return this._type === EdgeType.STRAIGHT;
  }

  isCurved(): boolean {
    return this._type === EdgeType.CURVED;
  }

  getCenter(): IPosition {
    const startPoint = this.startNode?.getCenter();
    const endPoint = this.endNode?.getCenter();
    if (!startPoint || !endPoint) {
      return { x: 0, y: 0 };
    }

    return {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };
  }

  getDistance(point: IPosition): number {
    const startPoint = this.startNode.getCenter();
    const endPoint = this.endNode.getCenter();
    if (!startPoint || !endPoint) {
      return 0;
    }

    return getDistanceToLine(startPoint, endPoint, point);
  }

  getLabel(): string | undefined {
    return this._style.label;
  }

  hasShadow(): boolean {
    return (
      (this._style.shadowSize ?? 0) > 0 || (this._style.shadowOffsetX ?? 0) > 0 || (this._style.shadowOffsetY ?? 0) > 0
    );
  }

  getWidth(): number {
    let width = 0;
    if (this._style.width !== undefined) {
      width = this._style.width;
    }
    if (this.isHovered() && this._style.widthHover !== undefined) {
      width = this._style.widthHover;
    }
    if (this.isSelected() && this._style.widthSelected !== undefined) {
      width = this._style.widthSelected;
    }
    return width;
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

  getLineDashPattern(): number[] | null {
    const lineStyle: IEdgeLineStyle | undefined = this._style.lineStyle;

    if (lineStyle === undefined || lineStyle.type === EdgeLineStyleType.SOLID) {
      return null;
    }

    switch (lineStyle.type) {
      case EdgeLineStyleType.DASHED:
        return DEFAULT_DASHED_LINE_PATTERN;
      case EdgeLineStyleType.DOTTED:
        return DEFAULT_DOTTED_LINE_PATTERN;
      case EdgeLineStyleType.CUSTOM:
        return isArrayOfNumbers(lineStyle.pattern) ? lineStyle.pattern : null;
      default:
        return null;
    }
  }

  setData(data: E): void;
  setData(callback: (edge: IEdge<N, E>) => E): void;
  setData(arg: E | ((edge: IEdge<N, E>) => E)) {
    if (isFunction(arg)) {
      this._data = (arg as (edge: IEdge<N, E>) => E)(this);
    } else {
      this._data = arg as E;
    }
    this.notifyListeners();
  }

  patchData(data: Partial<E>): void;
  patchData(callback: (edge: IEdge<N, E>) => Partial<E>): void;
  patchData(arg: Partial<E> | ((edge: IEdge<N, E>) => Partial<E>)) {
    let data: Partial<E>;

    if (isFunction(arg)) {
      data = (arg as (edge: IEdge<N, E>) => Partial<E>)(this);
    } else {
      data = arg as Partial<E>;
    }

    patchProperties(this._data, data);

    this.notifyListeners();
  }

  setStyle(style: IEdgeStyle): void;
  setStyle(callback: (edge: IEdge<N, E>) => IEdgeStyle): void;
  setStyle(arg: IEdgeStyle | ((edge: IEdge<N, E>) => IEdgeStyle)): void {
    if (isFunction(arg)) {
      this._style = (arg as (edge: IEdge<N, E>) => IEdgeStyle)(this);
    } else {
      this._style = arg as IEdgeStyle;
    }
    this.notifyListeners();
  }

  patchStyle(style: IEdgeStyle): void;
  patchStyle(callback: (edge: IEdge<N, E>) => IEdgeStyle): void;
  patchStyle(arg: IEdgeStyle | ((edge: IEdge<N, E>) => IEdgeStyle)) {
    let style: IEdgeStyle;

    if (isFunction(arg)) {
      style = (arg as (edge: IEdge<N, E>) => IEdgeStyle)(this);
    } else {
      style = arg as IEdgeStyle;
    }

    patchProperties(this._style, style);

    this.notifyListeners();
  }

  setState(state: number): void;
  setState(state: IGraphObjectStateParameters): void;
  setState(callback: (edge: IEdge<N, E>) => number): void;
  setState(callback: (edge: IEdge<N, E>) => IGraphObjectStateParameters): void;
  setState(
    arg:
      | number
      | IGraphObjectStateParameters
      | ((edge: IEdge<N, E>) => number)
      | ((edge: IEdge<N, E>) => IGraphObjectStateParameters),
  ): void {
    let result: number | IGraphObjectStateParameters;

    if (isFunction(arg)) {
      result = (arg as (edge: IEdge<N, E>) => number | IGraphObjectStateParameters)(this);
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
        type: 'edge',
        options: options,
      });

      return;
    }

    this.notifyListeners();
  }

  private _handleState(state: number, options: IGraphObjectStateOptions): number {
    if (options.isToggle && this._state === state) {
      return GraphObjectState.NONE;
    } else {
      return state;
    }
  }
}

const getEdgeType = <N extends INodeBase, E extends IEdgeBase>(data: IEdgeData<N, E>): EdgeType => {
  if (data.startNode.getId() === data.endNode.getId()) {
    return EdgeType.LOOPBACK;
  }
  return (data.offset ?? 0) === 0 ? EdgeType.STRAIGHT : EdgeType.CURVED;
};

export class EdgeStraight<N extends INodeBase, E extends IEdgeBase> extends Edge<N, E> {
  override getCenter(): IPosition {
    const startPoint = this.startNode?.getCenter();
    const endPoint = this.endNode?.getCenter();
    if (!startPoint || !endPoint) {
      return { x: 0, y: 0 };
    }

    return {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };
  }

  override getDistance(point: IPosition): number {
    const startPoint = this.startNode?.getCenter();
    const endPoint = this.endNode?.getCenter();
    if (!startPoint || !endPoint) {
      return 0;
    }

    return getDistanceToLine(startPoint, endPoint, point);
  }
}

export class EdgeCurved<N extends INodeBase, E extends IEdgeBase> extends Edge<N, E> {
  override getCenter(): IPosition {
    return this.getCurvedControlPoint(CURVED_CONTROL_POINT_OFFSET_MULTIPLIER / 2);
  }

  /**
   * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/util/bezier-edge-base.ts}
   *
   * @param {IPosition} point Point
   * @return {number} Distance to the point
   */
  override getDistance(point: IPosition): number {
    const sourcePoint = this.startNode?.getCenter();
    const targetPoint = this.endNode?.getCenter();
    if (!sourcePoint || !targetPoint) {
      return 0;
    }

    const controlPoint = this.getCurvedControlPoint();

    let minDistance = 1e9;
    let distance;
    let i;
    let t;
    let x;
    let y;
    let lastX = sourcePoint.x;
    let lastY = sourcePoint.y;
    for (i = 1; i < 10; i++) {
      t = 0.1 * i;
      x = Math.pow(1 - t, 2) * sourcePoint.x + 2 * t * (1 - t) * controlPoint.x + Math.pow(t, 2) * targetPoint.x;
      y = Math.pow(1 - t, 2) * sourcePoint.y + 2 * t * (1 - t) * controlPoint.y + Math.pow(t, 2) * targetPoint.y;
      if (i > 0) {
        distance = getDistanceToLine({ x: lastX, y: lastY }, { x, y }, point);
        minDistance = distance < minDistance ? distance : minDistance;
      }
      lastX = x;
      lastY = y;
    }

    return minDistance;
  }

  getCurvedControlPoint(offsetMultiplier = CURVED_CONTROL_POINT_OFFSET_MULTIPLIER): IPosition {
    if (!this.startNode || !this.endNode) {
      return { x: 0, y: 0 };
    }
    const sourcePoint = this.startNode.getCenter();
    const targetPoint = this.endNode.getCenter();
    const sourceSize = this.startNode.getRadius();
    const targetSize = this.endNode.getRadius();

    const middleX = (sourcePoint.x + targetPoint.x) / 2;
    const middleY = (sourcePoint.y + targetPoint.y) / 2;

    const dx = targetPoint.x - sourcePoint.x;
    const dy = targetPoint.y - sourcePoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    const offsetSize = Math.max(sourceSize, targetSize, CURVED_CONTROL_POINT_OFFSET_MIN_SIZE);
    const offset = (this.offset ?? 1) * offsetSize * offsetMultiplier;

    // TODO: Check for faster smooth quadratic curve
    // https://docs.microsoft.com/en-us/xamarin/xamarin-forms/user-interface/graphics/skiasharp/curves/path-data
    return {
      x: middleX + offset * (dy / length),
      y: middleY - offset * (dx / length),
    };
  }
}

export class EdgeLoopback<N extends INodeBase, E extends IEdgeBase> extends Edge<N, E> {
  override getCenter(): IPosition {
    const offset = Math.abs(this.offset ?? 1);
    const circle = this.getCircularData();
    return {
      x: circle.x + circle.radius,
      y: circle.y - offset * 5,
    };
  }

  override getDistance(point: IPosition): number {
    const circle = this.getCircularData();
    const dx = circle.x - point.x;
    const dy = circle.y - point.y;
    return Math.abs(Math.sqrt(dx * dx + dy * dy) - circle.radius);
  }

  getCircularData(): ICircle {
    if (!this.startNode) {
      return { x: 0, y: 0, radius: 0 };
    }

    const nodeCenter = this.startNode.getCenter();
    const nodeRadius = this.startNode.getBorderedRadius();

    const offset = Math.abs(this.offset ?? 1);
    const radius = nodeRadius * 1.5 * offset;
    const nodeSize = nodeRadius;

    const x = nodeCenter.x + radius;
    const y = nodeCenter.y - nodeSize * 0.5;

    return { x, y, radius };
  }
}
