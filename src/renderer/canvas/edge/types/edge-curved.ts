import { Node, INodeBase } from '../../../../models/node';
import { IEdgeBase } from '../../../../models/edge';
import { EdgeCanvas, IBorderPosition, IEdgeArrow } from '../base';
import { IPosition } from '../../../../common/position';

export class EdgeCurvedCanvas<N extends INodeBase, E extends IEdgeBase> extends EdgeCanvas<N, E> {
  protected override drawLine(context: CanvasRenderingContext2D) {
    const sourcePoint = this.edge.startNode?.getCenter();
    const targetPoint = this.edge.endNode?.getCenter();
    if (!sourcePoint || !targetPoint) {
      return;
    }

    const controlPoint = this.edge.getCurvedControlPoint();

    context.beginPath();
    context.moveTo(sourcePoint.x, sourcePoint.y);
    context.quadraticCurveTo(controlPoint.x, controlPoint.y, targetPoint.x, targetPoint.y);
    context.stroke();
  }

  protected override getArrowShape(_context: CanvasRenderingContext2D): IEdgeArrow {
    const scaleFactor = this.edge.properties.arrowSize ?? 1;
    const lineWidth = this.edge.getWidth() ?? 1;
    const guideOffset = -0.1;
    // const source = this.data.source;
    const target = this.edge.endNode;

    const controlPoint = this.edge.getCurvedControlPoint();
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
    const sourcePoint = this.edge.startNode?.getCenter();
    const targetPoint = this.edge.endNode?.getCenter();
    if (!sourcePoint || !targetPoint) {
      return { x: 0, y: 0 };
    }

    const t = percentage;
    const x = Math.pow(1 - t, 2) * sourcePoint.x + 2 * t * (1 - t) * viaNode.x + Math.pow(t, 2) * targetPoint.x;
    const y = Math.pow(1 - t, 2) * sourcePoint.y + 2 * t * (1 - t) * viaNode.y + Math.pow(t, 2) * targetPoint.y;

    return { x: x, y: y };
  }

  protected override findBorderPoint(nearNode: Node<N, E>): IBorderPosition {
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
    const viaNode = this.edge.getCurvedControlPoint();
    let node = this.edge.endNode;
    let from = false;
    if (nearNode.id === this.edge.startNode.id) {
      node = this.edge.startNode;
      from = true;
    }

    const nodePoints = node.getCenter();

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
