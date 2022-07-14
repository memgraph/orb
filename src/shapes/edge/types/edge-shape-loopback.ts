import { EdgeShape } from '../base';
import { IBorderPosition, IEdgeArrowShape } from '../interface';
import { IPosition } from '../../../common/position';
import { ICircle } from '../../../common/circle';
import { INodeShape } from '../../node/interface';
import { IEdgeBase, INodeBase } from '../../../models/graph.model';

export class EdgeShapeLoopback<N extends INodeBase, E extends IEdgeBase> extends EdgeShape<N, E> {
  override getCenterPosition(): IPosition {
    const offset = Math.abs(this.style?.roundness ?? 1);
    const circle = this.getCircleData();
    return {
      x: circle.x + circle.radius,
      y: circle.y - offset * 5,
    };
  }

  protected override drawLine(context: CanvasRenderingContext2D) {
    // Draw line from a node to the same node!
    const { x, y, radius } = this.getCircleData();

    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.closePath();
    context.stroke();
  }

  protected override getArrowShape(_context: CanvasRenderingContext2D): IEdgeArrowShape {
    const scaleFactor = this.style?.arrowSize ?? 1;
    const lineWidth = this.getWidth() ?? 1;
    const source = this.sourceNodeShape;
    // const target = this.data.target;

    const arrowPoint = this.findBorderPoint(source);
    const angle = arrowPoint.t * -2 * Math.PI + 0.45 * Math.PI;

    const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };

    return { point: arrowPoint, core: arrowCore, angle, length };
  }

  override getDistance(point: IPosition): number {
    const circle = this.getCircleData();
    const dx = circle.x - point.x;
    const dy = circle.y - point.y;
    return Math.abs(Math.sqrt(dx * dx + dy * dy) - circle.radius);
  }

  getCircleData(): ICircle {
    const node = this.sourceNodeShape;
    const offset = Math.abs(this.style?.roundness ?? 1);
    const nodePoint = node.getCenterPosition();
    const radius = node.getBorderedRadius() * 1.5 * offset;
    const nodeSize = node.getBorderedRadius();

    const x = nodePoint.x + radius;
    const y = nodePoint.y - nodeSize * 0.5;

    return { x, y, radius };
  }

  /**
   * Get a point on a circle
   * @param {ICircle} circle
   * @param {number} percentage - Value between 0 (line start) and 1 (line end)
   * @return {IPosition} Position on the circle
   * @private
   */
  pointOnCircle(circle: ICircle, percentage: number): IPosition {
    const angle = percentage * 2 * Math.PI;
    return {
      x: circle.x + circle.radius * Math.cos(angle),
      y: circle.y - circle.radius * Math.sin(angle),
    };
  }

  protected override findBorderPoint(nearNode: INodeShape<N, E>): IBorderPosition {
    const circle = this.getCircleData();
    const options = { low: 0.6, high: 1.0, direction: 1 };

    let low = options.low;
    let high = options.high;
    const direction = options.direction;

    const maxIterations = 10;
    let iteration = 0;
    let pos: IBorderPosition = { x: 0, y: 0, t: 0 };
    let angle;
    let distanceToBorder;
    let distanceToPoint;
    let difference;
    const threshold = 0.05;
    let middle = (low + high) * 0.5;

    const nearNodePoint = nearNode.getCenterPosition();

    while (low <= high && iteration < maxIterations) {
      middle = (low + high) * 0.5;

      pos = { ...this.pointOnCircle(circle, middle), t: 0 };
      angle = Math.atan2(nearNodePoint.y - pos.y, nearNodePoint.x - pos.x);
      distanceToBorder = nearNode.getDistanceToBorder(angle);
      distanceToPoint = Math.sqrt(Math.pow(pos.x - nearNodePoint.x, 2) + Math.pow(pos.y - nearNodePoint.y, 2));
      difference = distanceToBorder - distanceToPoint;
      if (Math.abs(difference) < threshold) {
        break; // found
      }
      // distance to nodes is larger than distance to border --> t needs to be bigger if we're looking at the to node.
      if (difference > 0) {
        if (direction > 0) {
          low = middle;
        } else {
          high = middle;
        }
      } else {
        if (direction > 0) {
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
