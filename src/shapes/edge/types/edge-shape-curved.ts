import { EdgeShape } from '../base';
import { IBorderPosition, IEdgeArrowShape } from '../interface';
import { IPosition } from '../../../common/position';
import { getDistanceToLine } from '../utils/distance';
import { INodeShape } from '../../node/interface';

const CURVED_CONTROL_POINT_OFFSET_MIN_SIZE = 4;
const CURVED_CONTROL_POINT_OFFSET_MULTIPLIER = 4;

export class EdgeShapeCurved extends EdgeShape {
  override getCenterPosition(): IPosition {
    return this.getControlPoint(CURVED_CONTROL_POINT_OFFSET_MULTIPLIER / 2);
  }

  protected getControlPoint(offsetMultiplier = CURVED_CONTROL_POINT_OFFSET_MULTIPLIER): IPosition {
    const sourcePoint = this.sourceNodeShape.getCenterPosition();
    const targetPoint = this.targetNodeShape.getCenterPosition();
    const sourceSize = this.sourceNodeShape.getRadius();
    const targetSize = this.targetNodeShape.getRadius();

    const middleX = (sourcePoint.x + targetPoint.x) / 2;
    const middleY = (sourcePoint.y + targetPoint.y) / 2;

    const dx = targetPoint.x - sourcePoint.x;
    const dy = targetPoint.y - sourcePoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    const offsetSize = Math.max(sourceSize, targetSize, CURVED_CONTROL_POINT_OFFSET_MIN_SIZE);
    const offset = (this.style?.roundness ?? 1) * offsetSize * offsetMultiplier;

    // TODO: Check for smooth quadratic curve
    // https://docs.microsoft.com/en-us/xamarin/xamarin-forms/user-interface/graphics/skiasharp/curves/path-data
    return {
      x: middleX + offset * (dy / length),
      y: middleY - offset * (dx / length),
    };
  }

  override getDistance(point: IPosition): number {
    const sourcePoint = this.sourceNodeShape.getCenterPosition();
    const targetPoint = this.targetNodeShape.getCenterPosition();
    const controlPoint = this.getControlPoint();

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

  protected override drawLine(context: CanvasRenderingContext2D) {
    const sourcePoint = this.sourceNodeShape.getCenterPosition();
    const targetPoint = this.targetNodeShape.getCenterPosition();
    const controlPoint = this.getControlPoint();

    context.beginPath();
    context.moveTo(sourcePoint.x, sourcePoint.y);
    context.quadraticCurveTo(controlPoint.x, controlPoint.y, targetPoint.x, targetPoint.y);
    context.stroke();
  }

  protected override getArrowShape(_context: CanvasRenderingContext2D): IEdgeArrowShape {
    const scaleFactor = this.style?.arrowSize ?? 1;
    const lineWidth = this.getWidth() ?? 1;
    const guideOffset = -0.1;
    // const source = this.data.source;
    const target = this.targetNodeShape;

    const controlPoint = this.getControlPoint();
    const arrowPoint = this.findBorderPoint(target);
    const guidePos = this.getPointBrezier(Math.max(0.0, Math.min(1.0, arrowPoint.t + guideOffset)), controlPoint);
    const angle = Math.atan2(arrowPoint.y - guidePos.y, arrowPoint.x - guidePos.x);

    const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };

    return { point: arrowPoint, core: arrowCore, angle, length };
  }

  /**
   * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a
   * point on the line at a certain percentage of the way
   *
   * @param {number} percentage Percentage of the line to get position from
   * @param {IPosition} viaNode Brezier node on the curved line
   * @return {IPosition} Position on the line
   */
  getPointBrezier(percentage: number, viaNode: IPosition): IPosition {
    const sourcePoint = this.sourceNodeShape.getCenterPosition();
    const targetPoint = this.targetNodeShape.getCenterPosition();

    const t = percentage;
    const x = Math.pow(1 - t, 2) * sourcePoint.x + 2 * t * (1 - t) * viaNode.x + Math.pow(t, 2) * targetPoint.x;
    const y = Math.pow(1 - t, 2) * sourcePoint.y + 2 * t * (1 - t) * viaNode.y + Math.pow(t, 2) * targetPoint.y;

    return { x: x, y: y };
  }

  protected override findBorderPoint(nearNode: INodeShape): IBorderPosition {
    const maxIterations = 10;
    let iteration = 0;
    let low = 0;
    let high = 1;
    let pos: IBorderPosition = { x: 0, y: 0, t: 0 };
    let angle;
    let distanceToBorder;
    let distanceToPoint;
    let difference;
    const threshold = 0.2;
    const viaNode = this.getControlPoint();
    let node = this.targetNodeShape;
    let from = false;
    if (nearNode.getId() === this.sourceNodeShape.getId()) {
      node = this.sourceNodeShape;
      from = true;
    }

    const nodePoints = node.getCenterPosition();

    let middle;
    while (low <= high && iteration < maxIterations) {
      middle = (low + high) * 0.5;

      pos = { ...this.getPointBrezier(middle, viaNode), t: 0 };
      angle = Math.atan2(nodePoints.y - pos.y, nodePoints.x - pos.x);
      distanceToBorder = node.getDistanceToBorder(angle);
      distanceToPoint = Math.sqrt(Math.pow(pos.x - nodePoints.x, 2) + Math.pow(pos.y - nodePoints.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break; // found
      }

      // distance to nodes is larger than distance to border --> t needs to be bigger if we're looking at the to node.
      if (difference < 0) {
        if (from === false) {
          low = middle;
        } else {
          high = middle;
        }
      } else {
        if (from === false) {
          high = middle;
        } else {
          low = middle;
        }
      }

      iteration++;
    }
    pos.t = middle ?? 0;

    return pos;
  }
}
