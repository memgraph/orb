import { INodeBase, INode } from '../../../../models/node';
import { EdgeStraight, IEdgeBase } from '../../../../models/edge';
import { IBorderPosition, IEdgeArrow } from '../shared';

export const drawStraightLine = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: EdgeStraight<N, E>,
) => {
  // Default line is the straight line
  const sourcePoint = edge.startNode.getCenter();
  const targetPoint = edge.endNode.getCenter();
  // TODO @toni: make getCenter to return undefined?!
  if (!sourcePoint || !targetPoint) {
    return;
  }

  context.beginPath();
  context.moveTo(sourcePoint.x, sourcePoint.y);
  context.lineTo(targetPoint.x, targetPoint.y);
  context.stroke();
};

/**
 * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/Edge.js}
 *
 * @param {EdgeStraight} edge Edge
 * @return {IEdgeArrow} Arrow shape
 */
export const getStraightArrowShape = <N extends INodeBase, E extends IEdgeBase>(
  edge: EdgeStraight<N, E>,
): IEdgeArrow => {
  const scaleFactor = edge.style.arrowSize ?? 1;
  const lineWidth = edge.getWidth() ?? 1;
  const sourcePoint = edge.startNode.getCenter();
  const targetPoint = edge.endNode.getCenter();

  const angle = Math.atan2(targetPoint.y - sourcePoint.y, targetPoint.x - sourcePoint.x);
  const arrowPoint = findBorderPoint(edge, edge.endNode);

  const length = 1.5 * scaleFactor + 3 * lineWidth; // 3* lineWidth is the width of the edge.

  const xi = arrowPoint.x - length * 0.9 * Math.cos(angle);
  const yi = arrowPoint.y - length * 0.9 * Math.sin(angle);
  const arrowCore = { x: xi, y: yi };

  return { point: arrowPoint, core: arrowCore, angle, length };
};

/**
 * @see {@link https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/straight-edge.ts}
 *
 * @param {EdgeStraight} edge Edge
 * @param {INode} nearNode Node close to the edge
 * @return {IBorderPosition} Position on the border of the node
 */
const findBorderPoint = <N extends INodeBase, E extends IEdgeBase>(
  edge: EdgeStraight<N, E>,
  nearNode: INode<N, E>,
): IBorderPosition => {
  let endNode = edge.endNode;
  let startNode = edge.startNode;
  if (nearNode.id === edge.startNode.id) {
    endNode = edge.startNode;
    startNode = edge.endNode;
  }

  const endNodePoints = endNode.getCenter();
  const startNodePoints = startNode.getCenter();

  // const angle = Math.atan2(endNodePoints.y - startNodePoints.y, endNodePoints.x - startNodePoints.x);
  const dx = endNodePoints.x - startNodePoints.x;
  const dy = endNodePoints.y - startNodePoints.y;
  const edgeSegmentLength = Math.sqrt(dx * dx + dy * dy);
  // const toBorderDist = nearNode.getDistanceToBorder(angle);
  const toBorderDist = nearNode.getDistanceToBorder();
  const toBorderPoint = (edgeSegmentLength - toBorderDist) / edgeSegmentLength;

  return {
    x: (1 - toBorderPoint) * startNodePoints.x + toBorderPoint * endNodePoints.x,
    y: (1 - toBorderPoint) * startNodePoints.y + toBorderPoint * endNodePoints.y,
    t: 0,
  };
};
