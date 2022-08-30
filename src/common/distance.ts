import { IPosition } from './position';

/**
 * Calculate the distance between a point (x3,y3) and a line segment from (x1,y1) to (x2,y2).
 * @see {@link http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment}
 *
 * @param {IPosition} startLinePoint Line start position
 * @param {IPosition} endLinePoint Line end position
 * @param {IPosition} point Target position
 * @return {number} Distance between the point and the line
 */
export const getDistanceToLine = (startLinePoint: IPosition, endLinePoint: IPosition, point: IPosition): number => {
  const dx = endLinePoint.x - startLinePoint.x;
  const dy = endLinePoint.y - startLinePoint.y;

  // Percentage of the line segment from the line start that is closest to the target point
  let lineSegment = ((point.x - startLinePoint.x) * dx + (point.y - startLinePoint.y) * dy) / (dx * dx + dy * dy);
  if (lineSegment > 1) {
    lineSegment = 1;
  }
  if (lineSegment < 0) {
    lineSegment = 0;
  }

  // Point on the line closest to the target point and its distance
  const newLinePointX = startLinePoint.x + lineSegment * dx;
  const newLinePointY = startLinePoint.y + lineSegment * dy;
  const pdx = newLinePointX - point.x;
  const pdy = newLinePointY - point.y;

  return Math.sqrt(pdx * pdx + pdy * pdy);
};
