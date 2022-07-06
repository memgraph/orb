import { IPosition } from './position';

export interface IRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const isPointInRectangle = (rectangle: IRectangle, point: IPosition): boolean => {
  const endX = rectangle.x + rectangle.width;
  const endY = rectangle.y + rectangle.height;
  return point.x >= rectangle.x && point.x <= endX && point.y >= rectangle.y && point.y <= endY;
};
