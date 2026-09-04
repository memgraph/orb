import { IPosition } from './position';

/**
 * 2D rectangle with top left point (x, y), width and height.
 */
export interface IRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Checks if the point (x, y) is in the rectangle.
 *
 * @param {IRectangle} rectangle Rectangle
 * @param {IPosition} point Point (x, y)
 * @return {boolean} True if the point (x, y) is in the rectangle, otherwise false
 */
export const isPointInRectangle = (rectangle: IRectangle, point: IPosition): boolean => {
  const endX = rectangle.x + rectangle.width;
  const endY = rectangle.y + rectangle.height;
  return point.x >= rectangle.x && point.x <= endX && point.y >= rectangle.y && point.y <= endY;
};

/**
 * Builds a normalized rectangle spanning two opposite corner points, given in any order.
 *
 * @param {IPosition} pointA First corner (x, y)
 * @param {IPosition} pointB Opposite corner (x, y)
 * @return {IRectangle} Rectangle spanning the two corners
 */
export const getRectangleFromPoints = (pointA: IPosition, pointB: IPosition): IRectangle => ({
  x: Math.min(pointA.x, pointB.x),
  y: Math.min(pointA.y, pointB.y),
  width: Math.abs(pointA.x - pointB.x),
  height: Math.abs(pointA.y - pointB.y),
});
