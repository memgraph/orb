import { INodeShape } from '../node/interface';
import { IPosition } from '../../common/position';
import { IEdgeBase, INodeBase } from '../../models/graph.model';
import { IEdgeStyle } from '../../models/style/edge-style';

export interface IBorderPosition extends IPosition {
  t: number;
}

export interface IEdgeArrowShape {
  point: IBorderPosition;
  core: IPosition;
  angle: number;
  length: number;
}

export enum EdgeLineStyleType {
  STRAIGHT = 'straight',
  CURVED = 'smooth',
}

export enum EdgeShapeState {
  SELECT,
  HOVER,
}

export interface IEdgeShapeDrawOptions {
  isShadowEnabled: boolean;
  isLabelEnabled: boolean;
}

export interface IEdgeShape<N extends INodeBase, E extends IEdgeBase> {
  draw(context: CanvasRenderingContext2D, options?: Partial<IEdgeShapeDrawOptions>): void;
  getId(): number;
  getData(): E;
  getLabel(): string | undefined;
  getStyle(): IEdgeStyle | undefined;
  setStyle(style: IEdgeStyle): void;
  getWidth(): number;
  getCenterPosition(): IPosition;
  getSourceNodeShape(): INodeShape<N, E>;
  getTargetNodeShape(): INodeShape<N, E>;
  setState(state: EdgeShapeState): void;
  clearState(): void;
  isSelected(): boolean;
  isHovered(): boolean;
  hasState(): boolean;
  getDistance(point: IPosition): number;
}
