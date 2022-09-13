import { INode, INodeBase } from '../../../../models/node';
import { EdgeLoopback, IEdgeBase } from '../../../../models/edge';
import { IBorderPosition, IEdgeArrow } from '../shared';
import { ICircle, IPosition } from '../../../../common';

export const drawLoopbackLine = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: EdgeLoopback<N, E>,
) => {
  // Draw line from a node to the same node!
  const { x, y, radius } = edge.getCircularData();

  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI, false);
  context.closePath();
  context.stroke();
};

/**
 * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/Edge.js}
 *
 * @param {EdgeLoopback} edge Edge
 * @return {IEdgeArrow} Arrow shape
 */
export const getLoopbackArrowShape = <N extends INodeBase, E extends IEdgeBase>(
  edge: EdgeLoopback<N, E>,
): IEdgeArrow => {
  const scaleFactor = edge.style.arrowSize ?? 1;
  const lineWidth = edge.getWidth() ?? 1;
  const source = edge.startNode;
  // const target = this.data.target;

  const arrowPoint = findBorderPoint(edge, source);
  const angle = arrowPoint.t * -2 * Math.PI + 0.45 * Math.PI;

  const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

  const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
  const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
  const arrowCore = { x: xi, y: yi };

  return { point: arrowPoint, core: arrowCore, angle, length };
};

/**
 * Get a point on a circle
 * @param {ICircle} circle
 * @param {number} percentage - Value between 0 (line start) and 1 (line end)
 * @return {IPosition} Position on the circle
 * @private
 */
const pointOnCircle = (circle: ICircle, percentage: number): IPosition => {
  const angle = percentage * 2 * Math.PI;
  return {
    x: circle.x + circle.radius * Math.cos(angle),
    y: circle.y - circle.radius * Math.sin(angle),
  };
};

const findBorderPoint = <N extends INodeBase, E extends IEdgeBase>(
  edge: EdgeLoopback<N, E>,
  nearNode: INode<N, E>,
): IBorderPosition => {
  const circle = edge.getCircularData();
  const options = { low: 0.6, high: 1.0, direction: 1 };

  let low = options.low;
  let high = options.high;
  const direction = options.direction;

  const maxIterations = 10;
  let iteration = 0;
  let pos: IBorderPosition = { x: 0, y: 0, t: 0 };
  // let angle;
  let distanceToBorder;
  let distanceToPoint;
  let difference;
  const threshold = 0.05;
  let middle = (low + high) * 0.5;

  const nearNodePoint = nearNode.getCenter();

  while (low <= high && iteration < maxIterations) {
    middle = (low + high) * 0.5;

    pos = { ...pointOnCircle(circle, middle), t: 0 };
    // angle = Math.atan2(nearNodePoint.y - pos.y, nearNodePoint.x - pos.x);
    // distanceToBorder = nearNode.getDistanceToBorder(angle);
    distanceToBorder = nearNode.getDistanceToBorder();
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
};
