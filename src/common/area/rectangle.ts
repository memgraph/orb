import { IPosition } from '../position';
import { getRectangleFromPoints, IRectangle, isPointInRectangle } from '../rectangle';
import { ISelectionArea } from './area';

/**
 * Rectangular {@link ISelectionArea} defined by an axis-aligned rectangle.
 */
export class RectangleArea implements ISelectionArea {
  private readonly _rectangle: IRectangle;

  constructor(rectangle: IRectangle) {
    this._rectangle = rectangle;
  }

  /**
   * Creates a rectangular area from two opposite corner points, given in any order.
   *
   * @param {IPosition} pointA First corner (x, y)
   * @param {IPosition} pointB Opposite corner (x, y)
   * @return {RectangleArea} Rectangular area spanning the two corners
   */
  static fromPoints(pointA: IPosition, pointB: IPosition): RectangleArea {
    return new RectangleArea(getRectangleFromPoints(pointA, pointB));
  }

  contains(point: IPosition): boolean {
    return isPointInRectangle(this._rectangle, point);
  }

  getBoundingBox(): IRectangle {
    return this._rectangle;
  }
}
