/**
 * 2D point with x, y coordinates.
 */
export interface IPosition {
  x: number;
  y: number;
}

/**
 * Checks if two x, y positions are equal.
 *
 * @param {IPosition} position1 Position
 * @param {IPosition} position2 Position
 * @return {boolean} True if positions are equal (x and y are equal), otherwise false
 */
export const isEqualPosition = (position1?: IPosition, position2?: IPosition): boolean => {
  return !!position1 && !!position2 && position1.x === position2.x && position1.y === position2.y;
};
