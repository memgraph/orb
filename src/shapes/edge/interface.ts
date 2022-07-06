import { INodeShape } from '../node/interface';
import { IPosition } from '../../common/position';
import { IGraphEdge } from '../../models/graph.model';

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

export interface IEdgeStyle {
  arrowSize?: number;
  color?: string;
  colorHover?: string;
  colorSelected?: string;
  fontBackgroundColor?: string;
  fontColor?: string;
  fontFamily?: string;
  fontSize?: number;
  label?: string;
  shadowColor?: string;
  shadowSize?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  width?: number;
  widthHover?: number;
  widthSelected?: number;
  roundness?: number;
  type?: EdgeLineStyleType;
}

export interface IEdgeShape {
  draw(context: CanvasRenderingContext2D, options?: Partial<IEdgeShapeDrawOptions>): void;
  getId(): number;
  getData(): IGraphEdge;
  getLabel(): string | undefined;
  getStyle(): IEdgeStyle | undefined;
  setStyle(style: IEdgeStyle): void;
  getWidth(): number;
  getCenterPosition(): IPosition;
  getSourceNodeShape(): INodeShape;
  getTargetNodeShape(): INodeShape;
  setState(state: EdgeShapeState): void;
  clearState(): void;
  isSelected(): boolean;
  isHovered(): boolean;
  hasState(): boolean;
  getDistance(point: IPosition): number;
}
