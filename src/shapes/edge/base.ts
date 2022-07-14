import { INodeShape } from '../node/interface';
import { IPosition } from '../../common/position';
import { EdgeShapeState, IBorderPosition, IEdgeArrowShape, IEdgeShape, IEdgeShapeDrawOptions } from './interface';
import { getDistanceToLine } from '../../render/canvas/edge/utils/distance';
import { LabelShape, LabelShapeTextBaseline } from '../label';
import { IEdgeBase, INodeBase } from '../../models/graph.model';
import { IEdgeStyle } from '../../models/style/edge-style';

const DEFAULT_IS_SHADOW_DRAW_ENABLED = true;
const DEFAULT_IS_LABEL_DRAW_ENABLED = true;

export interface IEdgeShapeDefinition<N extends INodeBase, E extends IEdgeBase> {
  data: E;
  style?: IEdgeStyle;
  sourceNodeShape: INodeShape<N, E>;
  targetNodeShape: INodeShape<N, E>;
}

export class EdgeShape<N extends INodeBase, E extends IEdgeBase> implements IEdgeShape<N, E> {
  protected readonly data: E;
  protected readonly label: LabelShape;
  protected readonly sourceNodeShape: INodeShape<N, E>;
  protected readonly targetNodeShape: INodeShape<N, E>;
  protected style?: IEdgeStyle;

  protected hasShadow = false;

  protected state?: EdgeShapeState;

  constructor(definition: IEdgeShapeDefinition<N, E>) {
    this.data = definition.data;
    this.label = new LabelShape({ data: { textBaseline: LabelShapeTextBaseline.MIDDLE } });
    if (definition.style) {
      this.setStyle(definition.style);
    }
    this.hasShadow = hasEdgeShadow(definition.style);

    this.sourceNodeShape = definition.sourceNodeShape;
    this.targetNodeShape = definition.targetNodeShape;
    this.sourceNodeShape.connectEdgeShape(this);
    this.targetNodeShape.connectEdgeShape(this);
  }

  // getId(): number {
  //   return this.data.id;
  // }
  //
  // getData(): E {
  //   return this.data;
  // }

  getStyle(): IEdgeStyle | undefined {
    return this.style;
  }

  setStyle(style: IEdgeStyle) {
    this.style = style;
    this.hasShadow = hasEdgeShadow(style);
    this.label.setStyle(this.style);
  }

  // getWidth(): number {
  //   let width = 0;
  //   if (this.style?.width !== undefined) {
  //     width = this.style.width;
  //   }
  //   if (this.isHovered() && this.style?.widthHover !== undefined) {
  //     width = this.style.widthHover;
  //   }
  //   if (this.isSelected() && this.style?.widthSelected !== undefined) {
  //     width = this.style.widthSelected;
  //   }
  //   return width;
  // }
  //
  // getLabel(): string | undefined {
  //   return this.style?.label;
  // }
  //
  // getCenterPosition(): IPosition {
  //   const sourcePoint = this.sourceNodeShape.getCenterPosition();
  //   const targetPoint = this.targetNodeShape.getCenterPosition();
  //   return {
  //     x: (sourcePoint.x + targetPoint.x) / 2,
  //     y: (sourcePoint.y + targetPoint.y) / 2,
  //   };
  // }

  // getSourceNodeShape(): INodeShape<N, E> {
  //   return this.sourceNodeShape;
  // }
  //
  // getTargetNodeShape(): INodeShape<N, E> {
  //   return this.targetNodeShape;
  // }
  //
  // setState(state: EdgeShapeState) {
  //   this.state = state;
  // }
  //
  // clearState() {
  //   this.state = undefined;
  // }

  getDistance(point: IPosition): number {
    const startPoint = this.sourceNodeShape.getCenterPosition();
    const endPoint = this.targetNodeShape.getCenterPosition();
    return getDistanceToLine(startPoint, endPoint, point);
  }

  // draw(context: CanvasRenderingContext2D, options?: Partial<IEdgeShapeDrawOptions>) {
  //   if (!this.getWidth()) {
  //     return;
  //   }
  //
  //   if (!this.sourceNodeShape || !this.targetNodeShape) {
  //     return;
  //   }
  //
  //   const isShadowEnabled = options?.isShadowEnabled ?? DEFAULT_IS_SHADOW_DRAW_ENABLED;
  //   const isLabelEnabled = options?.isLabelEnabled ?? DEFAULT_IS_LABEL_DRAW_ENABLED;
  //
  //   this.setupStyle(context);
  //   if (isShadowEnabled) {
  //     this.setupShadow(context);
  //   }
  //   this.drawArrow(context);
  //   this.drawLine(context);
  //   if (isShadowEnabled) {
  //     this.clearShadow(context);
  //   }
  //
  //   if (isLabelEnabled && this.label.isDrawable()) {
  //     // Positions of the edge change depending on the positions of the nodes
  //     const center = this.getCenterPosition();
  //     this.label.setPosition(center);
  //     this.label.draw(context);
  //   }
  // }

  // isSelected(): boolean {
  //   return this.state === EdgeShapeState.SELECT;
  // }
  //
  // isHovered(): boolean {
  //   return this.state === EdgeShapeState.HOVER;
  // }
  //
  // hasState(): boolean {
  //   return this.state !== undefined;
  // }

  protected drawLine(context: CanvasRenderingContext2D) {
    // Default line is the straight line
    const sourcePoint = this.sourceNodeShape.getCenterPosition();
    const targetPoint = this.targetNodeShape.getCenterPosition();

    context.beginPath();
    context.moveTo(sourcePoint.x, sourcePoint.y);
    context.lineTo(targetPoint.x, targetPoint.y);
    context.stroke();
  }

  protected drawArrow(context: CanvasRenderingContext2D) {
    if (this.style?.arrowSize === 0) {
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

  protected getArrowShape(_context: CanvasRenderingContext2D): IEdgeArrowShape {
    const scaleFactor = this.style?.arrowSize ?? 1;
    const lineWidth = this.getWidth() ?? 1;
    const sourcePoint = this.sourceNodeShape.getCenterPosition();
    const targetPoint = this.targetNodeShape.getCenterPosition();

    const angle = Math.atan2(targetPoint.y - sourcePoint.y, targetPoint.x - sourcePoint.x);
    const arrowPoint = this.findBorderPoint(this.targetNodeShape);

    const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };

    return { point: arrowPoint, core: arrowCore, angle, length };
  }

  protected findBorderPoint(nearNode: INodeShape<N, E>): IBorderPosition {
    let endNode = this.targetNodeShape;
    let startNode = this.sourceNodeShape;
    if (nearNode.getId() === this.sourceNodeShape.getId()) {
      endNode = this.sourceNodeShape;
      startNode = this.targetNodeShape;
    }

    const endNodePoints = endNode.getCenterPosition();
    const startNodePoints = startNode.getCenterPosition();

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

  protected setupStyle(context: CanvasRenderingContext2D) {
    const width = this.getWidth();
    if (width > 0) {
      context.lineWidth = width;
    }

    // context.fillStyle is set for the sake of arrow colors
    if (this.style?.color) {
      context.strokeStyle = this.style.color.toString();
      context.fillStyle = this.style.color.toString();
    }
    if (this.isHovered() && this.style?.colorHover) {
      context.strokeStyle = this.style.colorHover.toString();
      context.fillStyle = this.style.colorHover.toString();
    }
    if (this.isSelected() && this.style?.colorSelected) {
      context.strokeStyle = this.style.colorSelected.toString();
      context.fillStyle = this.style.colorSelected.toString();
    }
  }

  protected setupShadow(context: CanvasRenderingContext2D) {
    if (!this.hasShadow) {
      return;
    }
    if (this.style?.shadowColor) {
      context.shadowColor = this.style.shadowColor.toString();
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

const hasEdgeShadow = (style?: IEdgeStyle): boolean => {
  if (!style) {
    return false;
  }

  return (style.shadowSize ?? 0) > 0 || (style.shadowOffsetX ?? 0) > 0 || (style.shadowOffsetY ?? 0) > 0;
};

/**
 * Apply transformation on points for display.
 *
 * The following is done:
 * - rotate by the specified angle
 * - multiply the (normalized) coordinates by the passed length
 * - offset by the target coordinates
 *
 * @param {IPosition[]} points Arrow points
 * @param {IEdgeArrowShape} arrowShape Angle and length of the arrow shape
 * @return {IPosition[]} Transformed arrow points
 */
const transformArrowPoints = (points: IPosition[], arrowShape: IEdgeArrowShape): IPosition[] => {
  const x = arrowShape.point.x;
  const y = arrowShape.point.y;
  const angle = arrowShape.angle;
  const length = arrowShape.length;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const xt = p.x * Math.cos(angle) - p.y * Math.sin(angle);
    const yt = p.x * Math.sin(angle) + p.y * Math.cos(angle);

    p.x = x + length * xt;
    p.y = y + length * yt;
  }

  return points;
};
