import { IEdge, IEdgeBase } from './edge';
import { Color, IPosition, IRectangle, isPointInRectangle } from '../common';
import { ImageHandler } from '../services/images';
import { GraphObjectState } from './state';

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
}>;

export interface INodeData<N extends INodeBase> {
  data: N;
}

export interface INode<N extends INodeBase, E extends IEdgeBase> {
  data: N;
  position: INodePosition;
  style: INodeStyle;
  state: number;
  readonly id: any;
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
  ): INode<N, E> {
    return new Node<N, E>(data, settings);
  }
}

export const isNode = <N extends INodeBase, E extends IEdgeBase>(obj: any): obj is INode<N, E> => {
  return obj instanceof Node;
};

export class Node<N extends INodeBase, E extends IEdgeBase> implements INode<N, E> {
  public readonly id: number;
  public data: N;
  public position: INodePosition;
  public style: INodeStyle = {};
  public state = GraphObjectState.NONE;

  private readonly _inEdgesById: { [id: number]: IEdge<N, E> } = {};
  private readonly _outEdgesById: { [id: number]: IEdge<N, E> } = {};
  private readonly _onLoadedImage?: () => void;

  constructor(data: INodeData<N>, settings?: Partial<INodeSettings>) {
    this.id = data.data.id;
    this.data = data.data;
    this.position = { id: this.id };
    this._onLoadedImage = settings?.onLoadedImage;
  }

  clearPosition() {
    this.position.x = undefined;
    this.position.y = undefined;
  }

  getCenter(): IPosition {
    // This should not be called in the render because nodes without position will be
    // filtered out
    if (this.position.x === undefined || this.position.y === undefined) {
      return { x: 0, y: 0 };
    }
    return { x: this.position.x, y: this.position.y };
  }

  getRadius(): number {
    return this.style.size ?? 0;
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
      edgeById[outEdge.id] = outEdge;
    }

    const inEdges = this.getInEdges();
    for (let i = 0; i < inEdges.length; i++) {
      const inEdge = inEdges[i];
      edgeById[inEdge.id] = inEdge;
    }

    return Object.values(edgeById);
  }

  getAdjacentNodes(): INode<N, E>[] {
    const adjacentNodeById: { [id: number]: INode<N, E> } = {};

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

  hasStyle(): boolean {
    return this.style && Object.keys(this.style).length > 0;
  }

  addEdge(edge: IEdge<N, E>) {
    if (edge.start === this.id) {
      this._outEdgesById[edge.id] = edge;
    }
    if (edge.end === this.id) {
      this._inEdgesById[edge.id] = edge;
    }
  }

  removeEdge(edge: IEdge<N, E>) {
    delete this._outEdgesById[edge.id];
    delete this._inEdgesById[edge.id];
  }

  isSelected(): boolean {
    return this.state === GraphObjectState.SELECTED;
  }

  isHovered(): boolean {
    return this.state === GraphObjectState.HOVERED;
  }

  clearState(): void {
    this.state = GraphObjectState.NONE;
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
    if (this.style.shape === NodeShapeType.SQUARE) {
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
      (this.style.shadowSize ?? 0) > 0 || (this.style.shadowOffsetX ?? 0) > 0 || (this.style.shadowOffsetY ?? 0) > 0
    );
  }

  hasBorder(): boolean {
    const hasBorderWidth = (this.style.borderWidth ?? 0) > 0;
    const hasBorderWidthSelected = (this.style.borderWidthSelected ?? 0) > 0;
    return hasBorderWidth || (this.isSelected() && hasBorderWidthSelected);
  }

  getLabel(): string | undefined {
    return this.style.label;
  }

  getColor(): Color | string | undefined {
    let color: Color | string | undefined = undefined;

    if (this.style.color) {
      color = this.style.color;
    }
    if (this.isHovered() && this.style.colorHover) {
      color = this.style.colorHover;
    }
    if (this.isSelected() && this.style.colorSelected) {
      color = this.style.colorSelected;
    }

    return color;
  }

  getBorderWidth(): number {
    let borderWidth = 0;
    if (this.style.borderWidth && this.style.borderWidth > 0) {
      borderWidth = this.style.borderWidth;
    }
    if (this.isSelected() && this.style.borderWidthSelected && this.style.borderWidthSelected > 0) {
      borderWidth = this.style.borderWidthSelected;
    }
    return borderWidth;
  }

  getBorderColor(): Color | string | undefined {
    if (!this.hasBorder()) {
      return undefined;
    }

    let borderColor: Color | string | undefined = undefined;

    if (this.style.borderColor) {
      borderColor = this.style.borderColor;
    }
    if (this.isHovered() && this.style.borderColorHover) {
      borderColor = this.style.borderColorHover;
    }
    if (this.isSelected() && this.style.borderColorSelected) {
      borderColor = this.style.borderColorSelected.toString();
    }

    return borderColor;
  }

  getBackgroundImage(): HTMLImageElement | undefined {
    if ((this.style.size ?? 0) <= 0) {
      return;
    }

    let imageUrl;

    if (this.style.imageUrl) {
      imageUrl = this.style.imageUrl;
    }
    if (this.isSelected() && this.style.imageUrlSelected) {
      imageUrl = this.style.imageUrlSelected;
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

  protected _isPointInBoundingBox(point: IPosition): boolean {
    return isPointInRectangle(this.getBoundingBox(), point);
  }
}
