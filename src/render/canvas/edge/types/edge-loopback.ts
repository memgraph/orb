import { Node, INodeBase } from '../../../../models/node';
import { IEdgeBase } from '../../../../models/edge';
import { EdgeCanvas, IBorderPosition, IEdgeArrow } from '../base';
import { ICircle } from '../../../../common/circle';
import { IPosition } from '../../../../common/position';

export class EdgeLoopbackCanvas<N extends INodeBase, E extends IEdgeBase> extends EdgeCanvas<N, E> {
  protected override drawLine(context: CanvasRenderingContext2D) {
    // Draw line from a node to the same node!
    const { x, y, radius } = this.edge.getCircularData();

    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.closePath();
    context.stroke();
  }

  protected override getArrowShape(_context: CanvasRenderingContext2D): IEdgeArrow {
    const scaleFactor = this.edge.properties.arrowSize ?? 1;
    const lineWidth = this.edge.getWidth() ?? 1;
    const source = this.edge.startNode!;
    // const target = this.data.target;

    const arrowPoint = this.findBorderPoint(source);
    const angle = arrowPoint.t * -2 * Math.PI + 0.45 * Math.PI;

    const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

    const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
    const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
    const arrowCore = { x: xi, y: yi };

    return { point: arrowPoint, core: arrowCore, angle, length };
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

  protected override findBorderPoint(nearNode: Node<N, E>): IBorderPosition {
    const circle = this.edge.getCircularData();
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

    const nearNodePoint = nearNode.getCenter();

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
