import { INodeBase, Node } from './node';
import { GraphObjectState } from './state';
import { Color } from './color';
import { IPosition } from '../common/position';

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
  // Offset is used to mark curved or straight lines
  // For straight lines, it is 0, for curved it is +N or -N
  offset: number;
}

export class Edge<N extends INodeBase, E extends IEdgeBase> {
  public readonly id: number;
  public data: E;

  private _startNode?: Node<N, E>;
  private _endNode?: Node<N, E>;

  public properties: Partial<IEdgeProperties> = {};
  public state?: GraphObjectState;

  constructor(data: E) {
    this.id = data.id;
    this.data = data;
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

    this._startNode.addEdge(this);
    this._endNode.addEdge(this);
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
    return this.start === this.end;
  }

  isStraight(): boolean {
    return !this.isLoopback() && this.properties.offset === 0;
  }

  isCurved(): boolean {
    const offset = this.properties.offset;
    return !this.isLoopback() && typeof offset === 'number' && offset !== 0;
  }

  getCenter(): IPosition {
    if (!this.startNode || !this.endNode) {
      return { x: 0, y: 0 };
    }

    const startPoint = this.startNode.getCenter();
    const endPoint = this.endNode.getCenter();
    return {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2,
    };
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
