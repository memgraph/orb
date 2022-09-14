import { INodeBase } from '../../../models/node';
import { IEdge, EdgeCurved, EdgeLoopback, EdgeStraight, IEdgeBase } from '../../../models/edge';
import { IPosition } from '../../../common';
import { drawLabel, Label, LabelTextBaseline } from '../label';
import { drawCurvedLine, getCurvedArrowShape } from './types/edge-curved';
import { drawLoopbackLine, getLoopbackArrowShape } from './types/edge-loopback';
import { drawStraightLine, getStraightArrowShape } from './types/edge-straight';
import { IEdgeArrow } from './shared';

const DEFAULT_IS_SHADOW_DRAW_ENABLED = true;
const DEFAULT_IS_LABEL_DRAW_ENABLED = true;

export interface IEdgeDrawOptions {
  isShadowEnabled: boolean;
  isLabelEnabled: boolean;
}

export const drawEdge = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: IEdge<N, E>,
  options?: Partial<IEdgeDrawOptions>,
) => {
  if (!edge.getWidth()) {
    return;
  }

  const isShadowEnabled = options?.isShadowEnabled ?? DEFAULT_IS_SHADOW_DRAW_ENABLED;
  const isLabelEnabled = options?.isLabelEnabled ?? DEFAULT_IS_LABEL_DRAW_ENABLED;
  const hasShadow = edge.hasShadow();

  setupCanvas(context, edge);
  if (isShadowEnabled && hasShadow) {
    setupShadow(context, edge);
  }
  drawArrow(context, edge);
  drawLine(context, edge);
  if (isShadowEnabled && hasShadow) {
    clearShadow(context, edge);
  }

  if (isLabelEnabled) {
    drawEdgeLabel(context, edge);
  }
};

const drawEdgeLabel = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: IEdge<N, E>,
) => {
  const edgeLabel = edge.getLabel();
  if (!edgeLabel) {
    return;
  }

  const label = new Label(edgeLabel, {
    position: edge.getCenter(),
    textBaseline: LabelTextBaseline.MIDDLE,
    properties: {
      fontBackgroundColor: edge.style.fontBackgroundColor,
      fontColor: edge.style.fontColor,
      fontFamily: edge.style.fontFamily,
      fontSize: edge.style.fontSize,
    },
  });
  drawLabel(context, label);
};

const drawLine = <N extends INodeBase, E extends IEdgeBase>(context: CanvasRenderingContext2D, edge: IEdge<N, E>) => {
  if (edge instanceof EdgeStraight) {
    return drawStraightLine(context, edge);
  }
  if (edge instanceof EdgeCurved) {
    return drawCurvedLine(context, edge);
  }
  if (edge instanceof EdgeLoopback) {
    return drawLoopbackLine(context, edge);
  }

  throw new Error('Failed to draw unsupported edge type');
};

const drawArrow = <N extends INodeBase, E extends IEdgeBase>(context: CanvasRenderingContext2D, edge: IEdge<N, E>) => {
  if (edge.style.arrowSize === 0) {
    return;
  }

  const arrowShape = getArrowShape(edge);

  // Normalized points of closed path, in the order that they should be drawn.
  // (0, 0) is the attachment point, and the point around which should be rotated
  const keyPoints: IPosition[] = [
    { x: 0, y: 0 },
    { x: -1, y: 0.4 },
    // { x: -0.9, y: 0 },
    { x: -1, y: -0.4 },
  ];

  const points = transformArrowPoints(keyPoints, arrowShape);

  context.beginPath();
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (i === 0) {
      context.moveTo(point.x, point.y);
      continue;
    }
    context.lineTo(point.x, point.y);
  }
  context.closePath();
  context.fill();
};

const getArrowShape = <N extends INodeBase, E extends IEdgeBase>(edge: IEdge<N, E>): IEdgeArrow => {
  if (edge instanceof EdgeStraight) {
    return getStraightArrowShape(edge);
  }
  if (edge instanceof EdgeCurved) {
    return getCurvedArrowShape(edge);
  }
  if (edge instanceof EdgeLoopback) {
    return getLoopbackArrowShape(edge);
  }

  throw new Error('Failed to draw unsupported edge type');
};

const setupCanvas = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: IEdge<N, E>,
) => {
  const width = edge.getWidth();
  if (width > 0) {
    context.lineWidth = width;
  }

  const color = edge.getColor();
  // context.fillStyle is set for the sake of arrow colors
  if (color) {
    context.strokeStyle = color.toString();
    context.fillStyle = color.toString();
  }
};

const setupShadow = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: IEdge<N, E>,
) => {
  if (edge.style.shadowColor) {
    context.shadowColor = edge.style.shadowColor.toString();
  }
  if (edge.style.shadowSize) {
    context.shadowBlur = edge.style.shadowSize;
  }
  if (edge.style.shadowOffsetX) {
    context.shadowOffsetX = edge.style.shadowOffsetX;
  }
  if (edge.style.shadowOffsetY) {
    context.shadowOffsetY = edge.style.shadowOffsetY;
  }
};

const clearShadow = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: IEdge<N, E>,
) => {
  if (edge.style.shadowColor) {
    context.shadowColor = 'rgba(0,0,0,0)';
  }
  if (edge.style.shadowSize) {
    context.shadowBlur = 0;
  }
  if (edge.style.shadowOffsetX) {
    context.shadowOffsetX = 0;
  }
  if (edge.style.shadowOffsetY) {
    context.shadowOffsetY = 0;
  }
};

/**
 * Apply transformation on points for display.
 *
 * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/util/end-points.ts}
 *
 * The following is done:
 * - rotate by the specified angle
 * - multiply the (normalized) coordinates by the passed length
 * - offset by the target coordinates
 *
 * @param {IPosition[]} points Arrow points
 * @param {IEdgeArrow} arrow Angle and length of the arrow shape
 * @return {IPosition[]} Transformed arrow points
 */
const transformArrowPoints = (points: IPosition[], arrow: IEdgeArrow): IPosition[] => {
  const x = arrow.point.x;
  const y = arrow.point.y;
  const angle = arrow.angle;
  const length = arrow.length;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const xt = p.x * Math.cos(angle) - p.y * Math.sin(angle);
    const yt = p.x * Math.sin(angle) + p.y * Math.cos(angle);

    p.x = x + length * xt;
    p.y = y + length * yt;
  }

  return points;
};
