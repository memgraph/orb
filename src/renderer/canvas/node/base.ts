import { INodeBase, Node } from '../../../models/node';
import { IEdgeBase } from '../../../models/edge';
import { drawCircle } from './utils/shapes';
import { LabelCanvas, LabelTextBaseline } from '../label';

// The label will be `X` of the size below the Node
const DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE = 0.2;
const DEFAULT_IS_SHADOW_DRAW_ENABLED = true;
const DEFAULT_IS_LABEL_DRAW_ENABLED = true;

export interface INodeDrawOptions {
  isShadowEnabled: boolean;
  isLabelEnabled: boolean;
}

export class NodeCanvas<N extends INodeBase, E extends IEdgeBase> {
  public readonly node: Node<N, E>;
  public readonly label: LabelCanvas;

  constructor(node: Node<N, E>) {
    this.node = node;

    const center = this.node.getCenter();
    const distance = this.node.getBorderedRadius() * (1 + DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE);
    this.label = new LabelCanvas({
      position: { x: center.x, y: center.y + distance },
      settings: { textBaseline: LabelTextBaseline.TOP },
      properties: {
        fontBackgroundColor: node.properties.fontBackgroundColor,
        fontColor: node.properties.fontColor,
        fontFamily: node.properties.fontFamily,
        fontSize: node.properties.fontSize,
        label: node.properties.label,
      },
    });
  }

  get item(): Node<N, E> {
    return this.node;
  }

  draw(context: CanvasRenderingContext2D, options?: Partial<INodeDrawOptions>) {
    const isShadowEnabled = options?.isShadowEnabled ?? DEFAULT_IS_SHADOW_DRAW_ENABLED;
    const isLabelEnabled = options?.isLabelEnabled ?? DEFAULT_IS_LABEL_DRAW_ENABLED;
    const hasShadow = this.node.hasShadow();

    this.setupCanvas(context);
    if (isShadowEnabled && hasShadow) {
      this.setupShadow(context);
    }

    this.drawShape(context);
    context.fill();

    const image = this.node.getBackgroundImage();
    if (image) {
      this.drawImage(context, image);
    }

    if (isShadowEnabled && hasShadow) {
      this.clearShadow(context);
    }

    if (this.node.hasBorder()) {
      context.stroke();
    }

    if (isLabelEnabled && this.label.isDrawable()) {
      this.label.draw(context);
    }
  }

  protected drawShape(context: CanvasRenderingContext2D) {
    // Default shape is the circle
    const center = this.node.getCenter();
    const radius = this.node.getRadius();
    drawCircle(context, center.x, center.y, radius);
  }

  protected drawImage(context: CanvasRenderingContext2D, image: HTMLImageElement) {
    if (!image.width || !image.height) {
      return;
    }

    const center = this.node.getCenter();
    const radius = this.node.getRadius();

    const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
    const height = image.height * scale;
    const width = image.width * scale;

    context.save();
    context.clip();
    context.drawImage(image, center.x - width / 2, center.y - height / 2, width, height);
    context.restore();
  }

  protected setupCanvas(context: CanvasRenderingContext2D) {
    const hasBorder = this.node.hasBorder();

    if (hasBorder) {
      context.lineWidth = this.node.getBorderWidth();
      const borderColor = this.node.getBorderColor();
      if (borderColor) {
        context.strokeStyle = borderColor.toString();
      }
    }

    const color = this.node.getColor();
    if (color) {
      context.fillStyle = color.toString();
    }
  }

  protected setupShadow(context: CanvasRenderingContext2D) {
    if (this.node.properties.shadowColor) {
      context.shadowColor = this.node.properties.shadowColor.toString();
    }
    if (this.node.properties.shadowSize) {
      context.shadowBlur = this.node.properties.shadowSize;
    }
    if (this.node.properties.shadowOffsetX) {
      context.shadowOffsetX = this.node.properties.shadowOffsetX;
    }
    if (this.node.properties.shadowOffsetY) {
      context.shadowOffsetY = this.node.properties.shadowOffsetY;
    }
  }

  protected clearShadow(context: CanvasRenderingContext2D) {
    if (this.node.properties.shadowColor) {
      context.shadowColor = 'rgba(0,0,0,0)';
    }
    if (this.node.properties.shadowSize) {
      context.shadowBlur = 0;
    }
    if (this.node.properties.shadowOffsetX) {
      context.shadowOffsetX = 0;
    }
    if (this.node.properties.shadowOffsetY) {
      context.shadowOffsetY = 0;
    }
  }
}
