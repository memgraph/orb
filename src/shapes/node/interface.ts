import { IEdgeShape } from '../edge/interface';
import { IPosition } from '../../common/position';
import { IGraphNode } from '../../models/graph.model';
import { ISimulationNode } from '../../simulator/interface';

export enum NodeShapeState {
  SELECT,
  HOVER,
}

export interface INodeShapeDrawOptions {
  isShadowEnabled: boolean;
  isLabelEnabled: boolean;
}

export interface INodeStyle {
  borderColor?: string;
  borderColorHover?: string;
  borderColorSelected?: string;
  borderWidth?: number;
  borderWidthSelected?: number;
  color?: string;
  colorHover?: string;
  colorSelected?: string;
  fontBackgroundColor?: string;
  fontColor?: string;
  fontFamily?: string;
  fontSize?: number;
  imageUrl?: string;
  imageUrlSelected?: string;
  label?: string;
  shadowColor?: string;
  shadowSize?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shape?: string;
  size?: number;
  mass?: number;
}

export interface INodeShape {
  draw(context: CanvasRenderingContext2D, options?: Partial<INodeShapeDrawOptions>): void;
  getId(): number;
  getData(): IGraphNode;
  getStyle(): INodeStyle | undefined;
  getPosition(): ISimulationNode;
  getLabel(): string | undefined;
  setStyle(style: INodeStyle): void;
  setPosition(position: ISimulationNode): void;
  getCenterPosition(): IPosition;
  getRadius(): number;
  getBorderedRadius(): number;
  getEdgeShapes(): IEdgeShape[];
  getInEdgeShapes(): IEdgeShape[];
  getOutEdgeShapes(): IEdgeShape[];
  connectEdgeShape(edgeShape: IEdgeShape): void;
  getDistanceToBorder(angle: number): number;
  setState(state: NodeShapeState): void;
  clearState(): void;
  isSelected(): boolean;
  isHovered(): boolean;
  hasState(): boolean;
  includesPoint(point: IPosition): boolean;
}
