import { IPosition } from '../../../common/position';
import { Node, INodeBase } from '../../../models/node';
import { Edge, IEdgeBase } from '../../../models/edge';
import { LabelCanvas, LabelTextBaseline } from '../label';

const DEFAULT_IS_SHADOW_DRAW_ENABLED = true;
const DEFAULT_IS_LABEL_DRAW_ENABLED = true;

export interface IEdgeDrawOptions {
  isShadowEnabled: boolean;
  isLabelEnabled: boolean;
}

export interface IBorderPosition extends IPosition {
  t: number;
}

export interface IEdgeArrow {
  point: IBorderPosition;
  core: IPosition;
  angle: number;
  length: number;
}

export class EdgeCanvas<N extends INodeBase, E extends IEdgeBase> {
  public readonly edge: Edge<N, E>;
  public readonly label: LabelCanvas;

  constructor(edge: Edge<N, E>) {
    this.edge = edge;

    // Positions of the edge change depending on the positions of the nodes
    this.label = new LabelCanvas({
      position: this.edge.getCenter(),
      settings: { textBaseline: LabelTextBaseline.MIDDLE },
      properties: {
        fontBackgroundColor: edge.properties.fontBackgroundColor,
        fontColor: edge.properties.fontColor,
        fontFamily: edge.properties.fontFamily,
        fontSize: edge.properties.fontSize,
        label: edge.properties.label,
      },
    });
  }

  get item(): Edge<N, E> {
    return this.edge;
  }

  draw(context: CanvasRenderingContext2D, options?: Partial<IEdgeDrawOptions>) {
    if (!this.edge.getWidth()) {
      return;
    }

    if (!this.edge.startNode || !this.edge.endNode) {
      return;
    }

    const isShadowEnabled = options?.isShadowEnabled ?? DEFAULT_IS_SHADOW_DRAW_ENABLED;
    const isLabelEnabled = options?.isLabelEnabled ?? DEFAULT_IS_LABEL_DRAW_ENABLED;
    const hasShadow = this.edge.hasShadow();

    this.setupCanvas(context);
    if (isShadowEnabled && hasShadow) {
      this.setupShadow(context);
    }
    this.drawArrow(context);
    this.drawLine(context);
    if (isShadowEnabled && hasShadow) {
      this.clearShadow(context);
    }

    if (isLabelEnabled && this.label.isDrawable()) {
      this.label.draw(context);
    }
  }

  protected drawLine(context: CanvasRenderingContext2D) {
    // Default line is the straight line
    const sourcePoint = this.edge.startNode?.getCenter();
    const targetPoint = this.edge.endNode?.getCenter();
    if (!sourcePoint || !targetPoint) {
      return;
    }

    context.beginPath();
    context.moveTo(sourcePoint.x, sourcePoint.y);
    context.lineTo(targetPoint.x, targetPoint.y);
    context.stroke();
  }

  protected drawArrow(context: CanvasRenderingContext2D) {
    if (this.edge.properties.arrowSize === 0) {
      return;
    }

    const arrowShape = this.getArrowShape(context);

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
  }

  protected getArrowShape(_context: CanvasRenderingContext2D): IEdgeArrow {
    const scaleFactor = this.edge.properties.arrowSize ?? 1;
    const lineWidth = this.edge.getWidth() ?? 1;
    const sourcePoint = this.edge.startNode.getCenter();
    const targetPoint = this.edge.endNode.getCenter();

    const angle = Math.atan2(targetPoint.y - sourcePoint.y, targetPoint.x - sourcePoint.x);
    const arrowPoint = this.findBorderPoint(this.edge.endNode);

    const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };

    return { point: arrowPoint, core: arrowCore, angle, length };
  }

  protected findBorderPoint(nearNode: Node<N, E>): IBorderPosition {
    let endNode = this.edge.endNode;
    let startNode = this.edge.startNode;
    if (nearNode.id === this.edge.startNode.id) {
      endNode = this.edge.startNode;
      startNode = this.edge.endNode;
    }

    const endNodePoints = endNode.getCenter();
    const startNodePoints = startNode.getCenter();

    const angle = Math.atan2(endNodePoints.y - startNodePoints.y, endNodePoints.x - startNodePoints.x);
    const dx = endNodePoints.x - startNodePoints.x;
    const dy = endNodePoints.y - startNodePoints.y;
    const edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
    const toBorderDist = nearNode.getDistanceToBorder(angle);
    const toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

    return {
      x: (1 - toBorderPoint) * startNodePoints.x + toBorderPoint * endNodePoints.x,
      y: (1 - toBorderPoint) * startNodePoints.y + toBorderPoint * endNodePoints.y,
      t: 0,
    };
  }

  protected setupCanvas(context: CanvasRenderingContext2D) {
    const width = this.edge.getWidth();
    if (width > 0) {
      context.lineWidth = width;
    }

    const color = this.edge.getColor();
    // context.fillStyle is set for the sake of arrow colors
    if (color) {
      context.strokeStyle = color.toString();
      context.fillStyle = color.toString();
    }
  }

  protected setupShadow(context: CanvasRenderingContext2D) {
    if (this.edge.properties.shadowColor) {
      context.shadowColor = this.edge.properties.shadowColor.toString();
    }
    if (this.edge.properties.shadowSize) {
      context.shadowBlur = this.edge.properties.shadowSize;
    }
    if (this.edge.properties.shadowOffsetX) {
      context.shadowOffsetX = this.edge.properties.shadowOffsetX;
    }
    if (this.edge.properties.shadowOffsetY) {
      context.shadowOffsetY = this.edge.properties.shadowOffsetY;
    }
  }

  protected clearShadow(context: CanvasRenderingContext2D) {
    if (this.edge.properties.shadowColor) {
      context.shadowColor = 'rgba(0,0,0,0)';
    }
    if (this.edge.properties.shadowSize) {
      context.shadowBlur = 0;
    }
    if (this.edge.properties.shadowOffsetX) {
      context.shadowOffsetX = 0;
    }
    if (this.edge.properties.shadowOffsetY) {
      context.shadowOffsetY = 0;
    }
  }
}

/**
 * Apply transformation on points for display.
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
