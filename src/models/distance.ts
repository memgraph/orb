import { IPosition } from '../common/position';

/**
 * Calculate the distance between a point (x3,y3) and a line segment from (x1,y1) to (x2,y2).
 * (x3,y3) is the point.
 *
 * http://stackoverflow.com/questions/849211/shortest-distancae-between-a-point-and-a-line-segment
 * @param {IPosition} startPoint Line start position
 * @param {IPosition} endPoint Line end position
 * @param {IPosition} point Target position
 * @return {number} Distance between the point and the line
 */
export const getDistanceToLine = (startPoint: IPosition, endPoint: IPosition, point: IPosition): number => {
  const px = endPoint.x - startPoint.x;
  const py = endPoint.y - startPoint.y;

  // TODO @toni: Check this code from vis better and add better naming
  const something = px * px + py * py;
  let u = ((point.x - startPoint.x) * px + (point.y - startPoint.y) * py) / something;

  if (u > 1) {
    u = 1;
  } else if (u < 0) {
    u = 0;
  }

  const x = startPoint.x + u * px;
  const y = startPoint.y + u * py;
  const dx = x - point.x;
  const dy = y - point.y;

  // Note: If the actual distance does not matter,
  // if you only want to compare what this function
  // returns to other results of this function, you
  // can just return the squared distance instead
  // (i.e. remove the sqrt) to gain a little performance
  return Math.sqrt(dx * dx + dy * dy);
};
