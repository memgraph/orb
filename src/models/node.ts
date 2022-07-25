import { Edge, IEdgeBase } from './edge';
import { IRectangle, isPointInRectangle } from '../common/rectangle';
import { Color } from './color';
import { IPosition } from '../common/position';
import { ImageHandler } from '../services/images';
import { GraphObjectState } from './state';

export interface INodeBase {
  id: number;
}

export interface INodePosition {
  id: number;
  x: number;
  y: number;
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

export interface INodeProperties {
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
}

export const DEFAULT_NODE_PROPERTIES: Partial<INodeProperties> = {
  size: 5,
  color: new Color('#000000'),
};

export interface INodeData<N extends INodeBase> {
  data: N;
}

export class Node<N extends INodeBase, E extends IEdgeBase> {
  public readonly id: number;
  public data: N;

  private readonly inEdgesById: { [id: number]: Edge<N, E> } = {};
  private readonly outEdgesById: { [id: number]: Edge<N, E> } = {};

  public position: INodePosition;
  public properties: Partial<INodeProperties> = DEFAULT_NODE_PROPERTIES;
  public state?: GraphObjectState;

  constructor(data: INodeData<N>) {
    this.id = data.data.id;
    this.data = data.data;
    this.position = { id: this.id, x: 0, y: 0 };
  }

  getCenter(): IPosition {
    return { x: this.position.x, y: this.position.y };
  }

  getRadius(): number {
    return this.properties.size ?? 0;
  }

  getBorderedRadius(): number {
    return this.getRadius() + this.getBorderWidth() / 2;
  }

  getLabel(): string | undefined {
    return this.properties.label;
  }

  getBoundingBox(): IRectangle {
    const center = this.getCenter();
    const radius = this.getBorderWidth();
    return {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    };
  }

  getInEdges(): Edge<N, E>[] {
    return Object.values(this.inEdgesById);
  }

  getOutEdges(): Edge<N, E>[] {
    return Object.values(this.outEdgesById);
  }

  getEdges(): Edge<N, E>[] {
    const edgeById: { [id: number]: Edge<N, E> } = {};

    const outEdges = this.getOutEdges();
    for (let i = 0; i < outEdges.length; i++) {
      const outEdge = outEdges[i];
      edgeById[outEdge.id] = outEdge;
    }

    const inEdges = this.getInEdges();
    for (let i = 0; i < inEdges.length; i++) {
      const inEdge = inEdges[i];
      edgeById[inEdge.id] = inEdge;
    }

    return Object.values(edgeById);
  }

  getAdjacentNodes(): Node<N, E>[] {
    const adjacentNodeById: { [id: number]: Node<N, E> } = {};

    const outEdges = this.getOutEdges();
    for (let i = 0; i < outEdges.length; i++) {
      const adjacentNode = outEdges[i].endNode;
      if (adjacentNode) {
        adjacentNodeById[adjacentNode.id] = adjacentNode;
      }
    }

    const inEdges = this.getInEdges();
    for (let i = 0; i < inEdges.length; i++) {
      const adjacentNode = inEdges[i].startNode;
      if (adjacentNode) {
        adjacentNodeById[adjacentNode.id] = adjacentNode;
      }
    }

    return Object.values(adjacentNodeById);
  }

  addEdge(edge: Edge<N, E>) {
    if (edge.start === this.id) {
      this.outEdgesById[edge.id] = edge;
    }
    if (edge.end === this.id) {
      this.inEdgesById[edge.id] = edge;
    }
  }

  removeEdge(edge: Edge<N, E>) {
    delete this.outEdgesById[edge.id];
    delete this.inEdgesById[edge.id];
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

  getDistanceToBorder(_angle: number): number {
    // TODO @toni: Add getDistanceToBorder for each node shape type because this covers only circles
    return this.getBorderedRadius();
  }

  includesPoint(point: IPosition): boolean {
    const isInBoundingBox = this.isPointInBoundingBox(point);
    if (!isInBoundingBox) {
      return false;
    }

    // For square type, we don't need to check the circle
    if (this.properties.shape === NodeShapeType.SQUARE) {
      return isInBoundingBox;
    }

    // TODO @toni: Add better checks for stars, triangles, hexagons, etc.
    const center = this.getCenter();
    const borderedRadius = this.getBorderedRadius();

    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.sqrt(dx * dx + dy * dy) <= borderedRadius;
  }

  hasShadow(): boolean {
    return (
      (this.properties.shadowSize ?? 0) > 0 ||
      (this.properties.shadowOffsetX ?? 0) > 0 ||
      (this.properties.shadowOffsetY ?? 0) > 0
    );
  }

  hasBorder(): boolean {
    const hasBorderWidth = (this.properties.borderWidth ?? 0) > 0;
    const hasBorderWidthSelected = (this.properties.borderWidthSelected ?? 0) > 0;
    return hasBorderWidth || (this.isSelected() && hasBorderWidthSelected);
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

  getBorderWidth(): number {
    let borderWidth = 0;
    if (this.properties.borderWidth && this.properties.borderWidth > 0) {
      borderWidth = this.properties.borderWidth;
    }
    if (this.isSelected() && this.properties.borderWidthSelected && this.properties.borderWidthSelected > 0) {
      borderWidth = this.properties.borderWidthSelected;
    }
    return borderWidth;
  }

  getBorderColor(): Color | string | undefined {
    if (!this.hasBorder()) {
      return undefined;
    }

    let borderColor: Color | string | undefined = undefined;

    if (this.properties.borderColor) {
      borderColor = this.properties.borderColor;
    }
    if (this.isHovered() && this.properties.borderColorHover) {
      borderColor = this.properties.borderColorHover;
    }
    if (this.isSelected() && this.properties.borderColorSelected) {
      borderColor = this.properties.borderColorSelected.toString();
    }

    return borderColor;
  }

  getBackgroundImage(): HTMLImageElement | undefined {
    if ((this.properties.size ?? 0) <= 0) {
      return;
    }

    let imageUrl;

    if (this.properties.imageUrl) {
      imageUrl = this.properties.imageUrl;
    }
    if (this.isSelected() && this.properties.imageUrlSelected) {
      imageUrl = this.properties.imageUrlSelected;
    }

    if (!imageUrl) {
      return;
    }

    return ImageHandler.getInstance().getImage(imageUrl);
  }

  protected isPointInBoundingBox(point: IPosition): boolean {
    return isPointInRectangle(this.getBoundingBox(), point);
  }
}
