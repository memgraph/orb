import { INode, INodeBase } from '../../../../models/node';
import { EdgeCurved, IEdgeBase } from '../../../../models/edge';
import { IBorderPosition, IEdgeArrow } from '../shared';
import { IPosition } from '../../../../common';

export const drawCurvedLine = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: EdgeCurved<N, E>,
) => {
  const sourcePoint = edge.startNode.getCenter();
  const targetPoint = edge.endNode.getCenter();
  if (!sourcePoint || !targetPoint) {
    return;
  }

  const controlPoint = edge.getCurvedControlPoint();

  context.beginPath();
  context.moveTo(sourcePoint.x, sourcePoint.y);
  context.quadraticCurveTo(controlPoint.x, controlPoint.y, targetPoint.x, targetPoint.y);
  context.stroke();
};

/**
 * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/Edge.js}
 *
 * @param {EdgeCurved} edge Edge
 * @return {IEdgeArrow} Arrow shape
 */
export const getCurvedArrowShape = <N extends INodeBase, E extends IEdgeBase>(edge: EdgeCurved<N, E>): IEdgeArrow => {
  const scaleFactor = edge.style.arrowSize ?? 1;
  const lineWidth = edge.getWidth() ?? 1;
  const guideOffset = -0.1;
  // const source = this.data.source;
  const target = edge.endNode;

  const controlPoint = edge.getCurvedControlPoint();
  const arrowPoint = findBorderPoint(edge, target);
  const guidePos = getPointBrezier(edge, Math.max(0.0, Math.min(1.0, arrowPoint.t + guideOffset)), controlPoint);
  const angle = Math.atan2(arrowPoint.y - guidePos.y, arrowPoint.x - guidePos.x);

  const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

  const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
  const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
  const arrowCore = { x: xi, y: yi };

  return { point: arrowPoint, core: arrowCore, angle, length };
};

/**
 * Combined function of pointOnLine and pointOnBezier. This gives the coordinates of a
 * point on the line at a certain percentage of the way
 * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/util/bezier-edge-base.ts}
 *
 * @param {EdgeCurved} edge Edge
 * @param {number} percentage Percentage of the line to get position from
 * @param {IPosition} viaNode Brezier node on the curved line
 * @return {IPosition} Position on the line
 */
const getPointBrezier = <N extends INodeBase, E extends IEdgeBase>(
  edge: EdgeCurved<N, E>,
  percentage: number,
  viaNode: IPosition,
): IPosition => {
  const sourcePoint = edge.startNode.getCenter();
  const targetPoint = edge.endNode.getCenter();
  if (!sourcePoint || !targetPoint) {
    return { x: 0, y: 0 };
  }

  const t = percentage;
  const x = Math.pow(1 - t, 2) * sourcePoint.x + 2 * t * (1 - t) * viaNode.x + Math.pow(t, 2) * targetPoint.x;
  const y = Math.pow(1 - t, 2) * sourcePoint.y + 2 * t * (1 - t) * viaNode.y + Math.pow(t, 2) * targetPoint.y;

  return { x: x, y: y };
};

/**
 * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/util/bezier-edge-base.ts}
 *
 * @param {EdgeCurved} edge Edge
 * @param {INode} nearNode Node close to the edge
 * @return {IBorderPosition} Position on the border of the node
 */
const findBorderPoint = <N extends INodeBase, E extends IEdgeBase>(
  edge: EdgeCurved<N, E>,
  nearNode: INode<N, E>,
): IBorderPosition => {
  const maxIterations = 10;
  let iteration = 0;
  let low = 0;
  let high = 1;
  let pos: IBorderPosition = { x: 0, y: 0, t: 0 };
  // let angle;
  let distanceToBorder;
  let distanceToPoint;
  let difference;
  const threshold = 0.2;
  const viaNode = edge.getCurvedControlPoint();
  let node = edge.endNode;
  let from = false;
  if (nearNode.id === edge.startNode.id) {
    node = edge.startNode;
    from = true;
  }

  const nodePoints = node.getCenter();

  let middle;
  while (low <= high && iteration < maxIterations) {
    middle = (low + high) * 0.5;

    pos = { ...getPointBrezier(edge, middle, viaNode), t: 0 };
    // angle = Math.atan2(nodePoints.y - pos.y, nodePoints.x - pos.x);
    // distanceToBorder = node.getDistanceToBorder(angle);
    distanceToBorder = node.getDistanceToBorder();
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
};
