import { INodeBase, Node } from './node';
import { GraphObjectState } from './state';
import { Color } from './color';
import { IPosition } from '../common/position';
import { getDistanceToLine } from './distance';
import { ICircle } from '../common/circle';
import { ISimulationEdge } from '../simulator/interface';

const CURVED_CONTROL_POINT_OFFSET_MIN_SIZE = 4;
const CURVED_CONTROL_POINT_OFFSET_MULTIPLIER = 4;

export interface IEdgeBase {
  id: number;
  start: number;
  end: number;
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

// TODO @toni: Add startNode and endNode in the constructor, but then check how to do
// TODO @toni: disconnects and start/end node changes via join
export interface IEdgeData<E extends IEdgeBase> {
  data: E;
  // Offset is used to mark curved or straight lines
  // For straight lines, it is 0, for curved it is +N or -N
  offset?: number;
}

export enum EdgeType {
  STRAIGHT = 'straight',
  LOOPBACK = 'loopback',
  CURVED = 'curved',
}

export class Edge<N extends INodeBase, E extends IEdgeBase> {
  public readonly id: number;
  public data: E;
  public readonly offset: number;

  private _startNode?: Node<N, E>;
  private _endNode?: Node<N, E>;
  private _type: EdgeType = EdgeType.STRAIGHT;

  public properties: Partial<IEdgeProperties> = DEFAULT_EDGE_PROPERTIES;
  public state?: GraphObjectState;

  // @dlozic: I added this since it was missing when using the graph
  public position: ISimulationEdge | undefined;

  constructor(data: IEdgeData<E>) {
    this.id = data.data.id;
    this.data = data.data;
    this.offset = data.offset ?? 0;
    this._type = this.getEdgeType();
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

  get startNode(): Node<N, E> | undefined {
    return this._startNode;
  }

  get endNode(): Node<N, E> | undefined {
    return this._endNode;
  }

  connect(startNode: Node<N, E>, endNode: Node<N, E>) {
    this._startNode = startNode;
    this._endNode = endNode;

    if (this.startNode && this.endNode) {
      this.position = {
        id: this.id,
        source: this.startNode.id,
        target: this.endNode.id,
      };
    }

    this._startNode.addEdge(this);
    this._endNode.addEdge(this);
    this._type = this.getEdgeType();
  }

  disconnect() {
    this._startNode?.removeEdge(this);
    this._endNode?.removeEdge(this);

    this._startNode = undefined;
    this._endNode = undefined;
  }

  isSelected(): boolean {
    return this.state === GraphObjectState.SELECT;
  }

  isHovered(): boolean {
    return this.state === GraphObjectState.HOVER;
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
    if (this.isStraight()) {
      return this.getStraightCenter();
    }
    if (this.isCurved()) {
      return this.getCurvedCenter();
    }
    if (this.isLoopback()) {
      return this.getLoopbackCenter();
    }
    return this.getStraightCenter();
  }

  getDistance(point: IPosition): number {
    if (this.isStraight()) {
      return this.getStraightDistance(point);
    }
    if (this.isCurved()) {
      return this.getCurvedDistance(point);
    }
    if (this.isLoopback()) {
      return this.getLoopbackDistance(point);
    }
    return this.getStraightDistance(point);
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

  protected getEdgeType(): EdgeType {
    if (this.startNode && this.endNode && this.startNode.id === this.endNode.id) {
      return EdgeType.LOOPBACK;
    }
    return this.offset === 0 ? EdgeType.STRAIGHT : EdgeType.CURVED;
  }

  // TODO @toni: How to structure these into separate classes (straight) and use in canvas render
  private getStraightCenter(): IPosition {
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

  private getStraightDistance(point: IPosition): number {
    const startPoint = this.startNode?.getCenter();
    const endPoint = this.endNode?.getCenter();
    if (!startPoint || !endPoint) {
      return 0;
    }

    return getDistanceToLine(startPoint, endPoint, point);
  }

  // TODO @toni: How to structure these into separate classes (curved) and use in canvas render
  private getCurvedCenter(): IPosition {
    return this.getCurvedControlPoint(CURVED_CONTROL_POINT_OFFSET_MULTIPLIER / 2);
  }

  private getCurvedDistance(point: IPosition): number {
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

    // TODO @toni: Check for smooth quadratic curve (faster)
    // https://docs.microsoft.com/en-us/xamarin/xamarin-forms/user-interface/graphics/skiasharp/curves/path-data
    return {
      x: middleX + offset * (dy / length),
      y: middleY - offset * (dx / length),
    };
  }

  // TODO @toni: How to structure these into separate classes (loopback) and use in canvas render
  private getLoopbackCenter(): IPosition {
    const offset = Math.abs(this.offset ?? 1);
    const circle = this.getCircularData();
    return {
      x: circle.x + circle.radius,
      y: circle.y - offset * 5,
    };
  }

  private getLoopbackDistance(point: IPosition): number {
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
