import { INodeBase, INode, NodeShapeType } from '../../models/node';
import { IEdgeBase } from '../../models/edge';
import { drawDiamond, drawHexagon, drawSquare, drawStar, drawTriangleDown, drawTriangleUp, drawCircle } from './shapes';
import { drawLabel, Label, LabelTextBaseline } from './label';
import { Color } from '../../common';

// The label will be `X` of the size below the Node
const DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE = 0.2;
const DEFAULT_IS_SHADOW_DRAW_ENABLED = true;
const DEFAULT_IS_LABEL_DRAW_ENABLED = true;

export interface INodeDrawOptions {
  isShadowEnabled: boolean;
  isLabelEnabled: boolean;
}

export const drawNode = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  node: INode<N, E>,
  options?: Partial<INodeDrawOptions>,
) => {
  const isShadowEnabled = options?.isShadowEnabled ?? DEFAULT_IS_SHADOW_DRAW_ENABLED;
  const isLabelEnabled = options?.isLabelEnabled ?? DEFAULT_IS_LABEL_DRAW_ENABLED;
  const hasShadow = node.hasShadow();

  setupCanvas(context, node);
  if (isShadowEnabled && hasShadow) {
    setupShadow(context, node);
  }

  drawShape(context, node);
  context.fill();

  const image = node.getBackgroundImage();
  if (image) {
    drawImage(context, node, image);
  }

  if (isShadowEnabled && hasShadow) {
    clearShadow(context, node);
  }

  if (node.hasBorder()) {
    context.stroke();
  }

  if (isLabelEnabled) {
    drawNodeLabel(context, node);
  }
};

const drawShape = <N extends INodeBase, E extends IEdgeBase>(context: CanvasRenderingContext2D, node: INode<N, E>) => {
  // Default shape is the circle
  const center = node.getCenter();
  const radius = node.getRadius();

  switch (node.getStyle().shape) {
    case NodeShapeType.SQUARE: {
      drawSquare(context, center.x, center.y, radius);
      break;
    }
    case NodeShapeType.DIAMOND: {
      drawDiamond(context, center.x, center.y, radius);
      break;
    }
    case NodeShapeType.TRIANGLE: {
      drawTriangleUp(context, center.x, center.y, radius);
      break;
    }
    case NodeShapeType.TRIANGLE_DOWN: {
      drawTriangleDown(context, center.x, center.y, radius);
      break;
    }
    case NodeShapeType.STAR: {
      drawStar(context, center.x, center.y, radius);
      break;
    }
    case NodeShapeType.HEXAGON: {
      drawHexagon(context, center.x, center.y, radius);
      break;
    }
    default: {
      drawCircle(context, center.x, center.y, radius);
      break;
    }
  }
};

const drawNodeLabel = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  node: INode<N, E>,
) => {
  const nodeLabel = node.getLabel();
  if (!nodeLabel) {
    return;
  }

  const center = node.getCenter();
  const distance = node.getBorderedRadius() * (1 + DEFAULT_LABEL_DISTANCE_SIZE_FROM_NODE);

  const label = new Label(nodeLabel, {
    position: { x: center.x, y: center.y + distance },
    textBaseline: LabelTextBaseline.TOP,
    properties: {
      fontBackgroundColor: node.getStyle().fontBackgroundColor,
      fontColor: node.getStyle().fontColor,
      fontFamily: node.getStyle().fontFamily,
      fontSize: node.getStyle().fontSize,
    },
  });
  drawLabel(context, label);
};

const drawImage = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  node: INode<N, E>,
  image: HTMLImageElement,
) => {
  if (!image.width || !image.height) {
    return;
  }

  const center = node.getCenter();
  const radius = node.getRadius();

  const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height);
  const height = image.height * scale;
  const width = image.width * scale;

  context.save();
  context.clip();
  context.drawImage(image, center.x - width / 2, center.y - height / 2, width, height);
  context.restore();
};

const setupCanvas = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  node: INode<N, E>,
) => {
  const hasBorder = node.hasBorder();

  if (hasBorder) {
    context.lineWidth = node.getBorderWidth();
    const borderColor = node.getBorderColor();
    if (borderColor) {
      context.strokeStyle = borderColor.toString();
    }
  }

  const color = node.getColor();
  if (color) {
    context.fillStyle = color.toString();
  }
};

const setupShadow = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  node: INode<N, E>,
) => {
  if (node.getStyle().shadowColor) {
    context.shadowColor = (node.getStyle().shadowColor as string | Color).toString();
  }
  if (node.getStyle().shadowSize) {
    context.shadowBlur = node.getStyle().shadowSize as number;
  }
  if (node.getStyle().shadowOffsetX) {
    context.shadowOffsetX = node.getStyle().shadowOffsetX as number;
  }
  if (node.getStyle().shadowOffsetY) {
    context.shadowOffsetY = node.getStyle().shadowOffsetY as number;
  }
};

const clearShadow = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  node: INode<N, E>,
) => {
  if (node.getStyle().shadowColor) {
    context.shadowColor = 'rgba(0,0,0,0)';
  }
  if (node.getStyle().shadowSize) {
    context.shadowBlur = 0;
  }
  if (node.getStyle().shadowOffsetX) {
    context.shadowOffsetX = 0;
  }
  if (node.getStyle().shadowOffsetY) {
    context.shadowOffsetY = 0;
  }
};
