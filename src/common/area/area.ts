import { IPosition } from '../position';
import { IRectangle } from '../rectangle';

/**
 * A 2D region used to test which graph objects fall within a selection.
 *
 * Implementations describe an arbitrary shape (a rectangle today, e.g. a polygon
 * later) through a point-containment predicate. This keeps area-based queries
 * such as `IGraph.getNodesInArea` shape-agnostic.
 */
export interface ISelectionArea {
  /**
   * Checks if the point (x, y) is inside the area.
   *
   * @param {IPosition} point Point (x, y) in simulation coordinates
   * @return {boolean} True if the point is inside the area, otherwise false
   */
  contains(point: IPosition): boolean;

  /**
   * Returns the axis-aligned bounding box of the area.
   *
   * Used as a cheap pre-filter before the (possibly more expensive) contains check.
   *
   * @return {IRectangle} Bounding box of the area
   */
  getBoundingBox(): IRectangle;
}
