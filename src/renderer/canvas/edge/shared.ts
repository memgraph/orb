import { IPosition } from '../../../common';

export interface IBorderPosition extends IPosition {
  t: number;
}

export interface IEdgeArrow {
  point: IBorderPosition;
  core: IPosition;
  angle: number;
  length: number;
}

export const DEFAULT_SOLID_LINE_PATTERN: number[] = [];
export const DEFAULT_DASHED_LINE_PATTERN: number[] = [5, 5];
export const DEFAULT_DOTTED_LINE_PATTERN: number[] = [1, 1];