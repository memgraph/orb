import { INodeBase, Node } from './node';
import { GraphObjectState } from './state';
import { Color } from './color';
import { IPosition } from '../common/position';
import { getDistanceToLine } from './distance';
import { ICircle } from '../common/circle';

const CURVED_CONTROL_POINT_OFFSET_MIN_SIZE = 4;
const CURVED_CONTROL_POINT_OFFSET_MULTIPLIER = 4;

export interface IEdgeBase {
  id: number;
  start: number;
  end: number;
}

export interface IEdgePosition {
  id: number;
  source: number;
  target: number;
}

export interface IEdgeProperties {
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
}

export const DEFAULT_EDGE_PROPERTIES: Partial<IEdgeProperties> = {
  color: new Color('#999999'),
  width: 0.3,
};

export interface IEdgeData<N extends INodeBase, E extends IEdgeBase> {
  data: E;
  // Offset is used to mark curved or straight lines
  // For straight lines, it is 0, for curved it is +N or -N
  offset?: number;
  // Edge doesn't exist without nodes
  startNode: Node<N, E>;
  endNode: Node<N, E>;
}

export enum EdgeType {
  STRAIGHT = 'straight',
  LOOPBACK = 'loopback',
  CURVED = 'curved',
}

export class EdgeFactory {
  static create<N extends INodeBase, E extends IEdgeBase>(
    data: IEdgeData<N, E>,
  ): Edge<N, E> | EdgeStraight<N, E> | EdgeCurved<N, E> | EdgeLoopback<N, E> {
    const type = getEdgeType(data);
    switch (type) {
      case EdgeType.STRAIGHT:
        return new EdgeStraight(data);
      case EdgeType.LOOPBACK:
        return new EdgeLoopback(data);
      case EdgeType.CURVED:
        return new EdgeCurved(data);
      default:
        return new EdgeStraight(data);
    }
  }
}

export class Edge<N extends INodeBase, E extends IEdgeBase> {
  public readonly id: number;
  public data: E;

  public readonly offset: number;
  public readonly startNode: Node<N, E>;
  public readonly endNode: Node<N, E>;

  private _type: EdgeType = EdgeType.STRAIGHT;

  public properties: Partial<IEdgeProperties> = DEFAULT_EDGE_PROPERTIES;
  public state?: number;
  public position: IEdgePosition;

  constructor(data: IEdgeData<N, E>) {
    this.id = data.data.id;
    this.data = data.data;
    this.offset = data.offset ?? 0;
    this.startNode = data.startNode;
    this.endNode = data.endNode;
    this._type = getEdgeType(data);

    this.position = { id: this.id, source: this.startNode.id, target: this.endNode.id };
    this.startNode.addEdge(this);
    this.endNode.addEdge(this);
  }

  get type(): EdgeType {
    return this._type;
  }

  get start(): number {
    return this.data.start;
  }

  get end(): number {
    return this.data.end;
  }

  copy(data?: Omit<IEdgeData<N, E>, 'data' | 'startNode' | 'endNode'>): Edge<N, E> {
    const newEdge = EdgeFactory.create<N, E>({
      data: this.data,
      offset: data?.offset !== undefined ? data.offset : this.offset,
      startNode: this.startNode,
      endNode: this.endNode,
    });
    newEdge.state = this.state;
    newEdge.properties = this.properties;

    return newEdge;
  }

  isSelected(): boolean {
    return this.state === GraphObjectState.SELECTED;
  }

  isHovered(): boolean {
    return this.state === GraphObjectState.HOVERED;
  }

  clearState(): void {
    this.state = undefined;
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
    const startPoint = this.startNode?.getCenter();
    const endPoint = this.endNode?.getCenter();
    if (!startPoint || !endPoint) {
      return 0;
    }

    return getDistanceToLine(startPoint, endPoint, point);
  }

  getLabel(): string | undefined {
    return this.properties.label;
  }

  hasShadow(): boolean {
    return (
      (this.properties.shadowSize ?? 0) > 0 ||
      (this.properties.shadowOffsetX ?? 0) > 0 ||
      (this.properties.shadowOffsetY ?? 0) > 0
    );
  }

  getWidth(): number {
    let width = 0;
    if (this.properties.width !== undefined) {
      width = this.properties.width;
    }
    if (this.isHovered() && this.properties.widthHover !== undefined) {
      width = this.properties.widthHover;
    }
    if (this.isSelected() && this.properties.widthSelected !== undefined) {
      width = this.properties.widthSelected;
    }
    return width;
  }

  getColor(): Color | string | undefined {
    let color: Color | string | undefined = undefined;

    if (this.properties.color) {
      color = this.properties.color;
    }
    if (this.isHovered() && this.properties.colorHover) {
      color = this.properties.colorHover;
    }
    if (this.isSelected() && this.properties.colorSelected) {
      color = this.properties.colorSelected;
    }

    return color;
  }
}

const getEdgeType = <N extends INodeBase, E extends IEdgeBase>(data: IEdgeData<N, E>): EdgeType => {
  if (data.startNode.id === data.endNode.id) {
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
   * Ref: https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/util/bezier-edge-base.ts
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
