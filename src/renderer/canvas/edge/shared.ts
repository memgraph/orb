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
