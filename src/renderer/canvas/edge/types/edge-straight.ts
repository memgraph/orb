import { INodeBase, Node } from '../../../../models/node';
import { Edge, IEdgeBase } from '../../../../models/edge';
import { IBorderPosition, IEdgeArrow } from '../index';

export const drawStraightLine = <N extends INodeBase, E extends IEdgeBase>(
  context: CanvasRenderingContext2D,
  edge: Edge<N, E>,
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
 * Ref: https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/Edge.js
 *
 * @param {Edge} edge Edge
 * @return {IEdgeArrow} Arrow shape
 */
export const getStraightArrowShape = <N extends INodeBase, E extends IEdgeBase>(edge: Edge<N, E>): IEdgeArrow => {
  const scaleFactor = edge.properties.arrowSize ?? 1;
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
 * Ref: https://github.com/visjs/vis-network/blob/master/lib/network/modules/components/edges/straight-edge.ts
 *
 * @param {Edge} edge Edge
 * @param {Node} nearNode Node close to the edge
 * @return {IBorderPosition} Position on the border of the node
 */
const findBorderPoint = <N extends INodeBase, E extends IEdgeBase>(
  edge: Edge<N, E>,
  nearNode: Node<N, E>,
): IBorderPosition => {
  let endNode = edge.endNode;
  let startNode = edge.startNode;
  if (nearNode.id === edge.startNode.id) {
    endNode = edge.startNode;
    startNode = edge.endNode;
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
};
