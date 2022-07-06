export interface IPosition {
  x: number;
  y: number;
}

export const isEqualPosition = (position1?: IPosition, position2?: IPosition): boolean => {
  return !!position1 && !!position2 && position1.x === position2.x && position1.y === position2.y;
};
