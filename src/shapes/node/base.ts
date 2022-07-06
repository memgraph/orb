import { drawCircle } from './utils/shapes';
import { IPosition } from '../../common/position';
import { INodeShape, INodeShapeDrawOptions, INodeStyle, NodeShapeState } from './interface';
import { IEdgeShape } from '../edge/interface';
import { IRectangle, isPointInRectangle } from '../../common/rectangle';
import { IGraphNode } from '../../models/graph.model';
import { ISimulationNode } from '../../simulator/interface';
import { LabelShape, LabelShapeTextBaseline } from '../label';
import { ImageHandler } from '../../images';

// The label will be `X` of the size below the Node
const DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE = 0.2;
const DEFAULT_IS_SHADOW_DRAW_ENABLED = true;
const DEFAULT_IS_LABEL_DRAW_ENABLED = true;

export interface INodeShapeDefinition {
  data: IGraphNode;
  position: ISimulationNode;
  style?: INodeStyle;
}

export class NodeShape implements INodeShape {
  protected readonly data: IGraphNode;
  protected readonly label: LabelShape;
  // TODO: Change to get/set
  protected position: ISimulationNode = { id: 0, x: 0, y: 0 };
  protected style?: INodeStyle;

  protected hasShadow = false;
  // TODO: Change to get/set
  protected boundingBox: IRectangle = { x: 0, y: 0, width: 0, height: 0 };

  protected readonly inEdgeShapes: IEdgeShape[] = [];
  protected readonly outEdgeShapes: IEdgeShape[] = [];

  protected state?: NodeShapeState;

  constructor(definition: INodeShapeDefinition) {
    this.data = definition.data;
    this.label = new LabelShape({ data: { textBaseline: LabelShapeTextBaseline.TOP } });
    this.setPosition(definition.position);
    if (definition.style) {
      this.setStyle(definition.style);
    }
  }

  getId(): number {
    return this.data.id;
  }

  getData(): IGraphNode {
    return this.data;
  }

  getStyle(): INodeStyle | undefined {
    return this.style;
  }

  getPosition(): ISimulationNode {
    return this.position;
  }

  setStyle(style: INodeStyle) {
    this.style = style;
    this.hasShadow = hasNodeShadow(style);
    this.boundingBox = this.getBoundingBox();

    this.label.setStyle(this.style);
    this.label.setPosition(this.getLabelPosition());
  }

  setPosition(position: ISimulationNode) {
    this.position = position;
    this.boundingBox = this.getBoundingBox();
    this.label.setPosition(this.getLabelPosition());
  }

  getCenterPosition(): IPosition {
    return { x: this.position.x ?? 0, y: this.position.y ?? 0 };
  }

  getRadius(): number {
    return this.style?.size ?? 0;
  }

  getLabel(): string | undefined {
    return this.style?.label;
  }

  getBorderedRadius(): number {
    return this.getRadius() + this.getBorderWidth() / 2;
  }

  getEdgeShapes(): IEdgeShape[] {
    return [...this.inEdgeShapes, ...this.outEdgeShapes];
  }

  getInEdgeShapes(): IEdgeShape[] {
    return this.inEdgeShapes;
  }

  getOutEdgeShapes(): IEdgeShape[] {
    return this.outEdgeShapes;
  }

  getDistanceToBorder(_angle: number): number {
    // TODO: Add getDistanceToBorder for each node shape type because this covers only circles
    return this.getBorderedRadius();
  }

  connectEdgeShape(edgeShape: IEdgeShape) {
    if (edgeShape.getSourceNodeShape().getId() === this.getId()) {
      this.outEdgeShapes.push(edgeShape);
    }
    if (edgeShape.getTargetNodeShape().getId() === this.getId()) {
      this.inEdgeShapes.push(edgeShape);
    }
  }

  setState(state: NodeShapeState) {
    this.state = state;
  }

  clearState() {
    this.state = undefined;
  }

  draw(context: CanvasRenderingContext2D, options?: Partial<INodeShapeDrawOptions>) {
    const isShadowEnabled = options?.isShadowEnabled ?? DEFAULT_IS_SHADOW_DRAW_ENABLED;
    const isLabelEnabled = options?.isLabelEnabled ?? DEFAULT_IS_LABEL_DRAW_ENABLED;

    this.setupStyle(context);
    if (isShadowEnabled) {
      this.setupShadow(context);
    }

    this.drawShape(context);
    context.fill();

    const image = this.getBackgroundImage();
    if (image) {
      this.drawImage(context, image);
    }

    if (isShadowEnabled) {
      this.clearShadow(context);
    }

    if (this.hasBorder()) {
      context.stroke();
    }

    if (isLabelEnabled && this.label.isDrawable()) {
      this.label.draw(context);
    }
  }

  includesPoint(point: IPosition): boolean {
    if (!this.isPointInBoundingBox(point)) {
      return false;
    }

    const center = this.getCenterPosition();
    const borderedRadius = this.getBorderedRadius();

    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.sqrt(dx * dx + dy * dy) <= borderedRadius;
  }

  isSelected(): boolean {
    return this.state === NodeShapeState.SELECT;
  }

  isHovered(): boolean {
    return this.state === NodeShapeState.HOVER;
  }

  hasState(): boolean {
    return this.state !== undefined;
  }

  protected getLabelPosition(): IPosition {
    const center = this.getCenterPosition();
    const distance = this.getBorderedRadius() * (1 + DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE);
    return { x: center.x, y: center.y + distance };
  }

  protected isPointInBoundingBox(point: IPosition): boolean {
    return isPointInRectangle(this.boundingBox, point);
  }

  protected getBoundingBox(): IRectangle {
    const center = this.getCenterPosition();
    const radius = this.getBorderedRadius();
    return {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    };
  }

  protected drawShape(context: CanvasRenderingContext2D) {
    // Default shape is the circle
    const center = this.getCenterPosition();
    const radius = this.getRadius();
    drawCircle(context, center.x, center.y, radius);
  }

  protected drawImage(context: CanvasRenderingContext2D, image: HTMLImageElement) {
    if (!image.width || !image.height) {
      return;
    }

    const center = this.getCenterPosition();
    const radius = this.getRadius();

    const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
    const height = image.height * scale;
    const width = image.width * scale;

    context.save();
    context.clip();
    context.drawImage(image, center.x - width / 2, center.y - height / 2, width, height);
    context.restore();
  }

  protected hasBorder(): boolean {
    const hasBorderWidth = (this.style?.borderWidth ?? 0) > 0;
    const hasBorderWidthSelected = (this.style?.borderWidthSelected ?? 0) > 0;
    return hasBorderWidth || (this.isSelected() && hasBorderWidthSelected);
  }

  protected getBorderWidth(): number {
    let borderWidth = 0;
    if (this.style?.borderWidth && this.style.borderWidth > 0) {
      borderWidth = this.style?.borderWidth;
    }
    if (this.isSelected() && this.style?.borderWidthSelected && this.style.borderWidthSelected > 0) {
      borderWidth = this.style.borderWidthSelected;
    }
    return borderWidth;
  }

  protected getBackgroundImage(): HTMLImageElement | undefined {
    if ((this.style?.size ?? 0) <= 0) {
      return;
    }

    let imageUrl;

    if (this.style?.imageUrl) {
      imageUrl = this.style.imageUrl;
    }
    if (this.isSelected() && this.style?.imageUrlSelected) {
      imageUrl = this.style.imageUrlSelected;
    }

    if (!imageUrl) {
      return;
    }

    return ImageHandler.getInstance().getImage(imageUrl);
  }

  protected setupStyle(context: CanvasRenderingContext2D) {
    const hasBorder = this.hasBorder();

    if (hasBorder) {
      context.lineWidth = this.getBorderWidth();
    }

    if (hasBorder && this.style?.borderColor) {
      context.strokeStyle = this.style.borderColor;
    }
    if (hasBorder && this.isHovered() && this.style?.borderColorHover) {
      context.strokeStyle = this.style.borderColorHover;
    }
    if (hasBorder && this.isSelected() && this.style?.borderColorSelected) {
      context.strokeStyle = this.style.borderColorSelected;
    }

    if (this.style?.color) {
      context.fillStyle = this.style.color;
    }
    if (this.isHovered() && this.style?.colorHover) {
      context.fillStyle = this.style.colorHover;
    }
    if (this.isSelected() && this.style?.colorSelected) {
      context.fillStyle = this.style.colorSelected;
    }
  }

  protected setupShadow(context: CanvasRenderingContext2D) {
    if (!this.hasShadow) {
      return;
    }
    if (this.style?.shadowColor) {
      context.shadowColor = this.style.shadowColor;
    }
    if (this.style?.shadowSize) {
      context.shadowBlur = this.style.shadowSize;
    }
    if (this.style?.shadowOffsetX) {
      context.shadowOffsetX = this.style.shadowOffsetX;
    }
    if (this.style?.shadowOffsetY) {
      context.shadowOffsetY = this.style.shadowOffsetY;
    }
  }

  protected clearShadow(context: CanvasRenderingContext2D) {
    if (!this.hasShadow) {
      return;
    }
    if (this.style?.shadowColor) {
      context.shadowColor = 'rgba(0,0,0,0)';
    }
    if (this.style?.shadowSize) {
      context.shadowBlur = 0;
    }
    if (this.style?.shadowOffsetX) {
      context.shadowOffsetX = 0;
    }
    if (this.style?.shadowOffsetY) {
      context.shadowOffsetY = 0;
    }
  }
}

const hasNodeShadow = (style?: INodeStyle): boolean => {
  if (!style) {
    return false;
  }

  return (style.shadowSize ?? 0) > 0 || (style.shadowOffsetX ?? 0) > 0 || (style.shadowOffsetY ?? 0) > 0;
};
