import { INode, INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';
import { RectangleArea } from '../common';

export type IRectangleSelectionMode = 'replace' | 'add';

// Applied as inline styles on the overlay element, which also carries the
// `orb-selection-rectangle` class for CSS overrides.
export interface IRectangleSelectionStyle {
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius: number;
}

export interface IRectangleSelectionOptions {
  // Defaults to: ctrl/meta held -> 'replace', otherwise 'add'.
  resolveMode?: (event: MouseEvent) => IRectangleSelectionMode;
  style?: Partial<IRectangleSelectionStyle>;
}

export interface IRectangleSelectionSelectEvent<N extends INodeBase, E extends IEdgeBase> {
  nodes: INode<N, E>[];
  area: RectangleArea;
  mode: IRectangleSelectionMode;
}

export enum RectangleSelectionEventType {
  SELECT = 'select',
}

export type RectangleSelectionEvents<N extends INodeBase, E extends IEdgeBase> = {
  [RectangleSelectionEventType.SELECT]: IRectangleSelectionSelectEvent<N, E>;
};

export const DEFAULT_RECTANGLE_SELECTION_STYLE: IRectangleSelectionStyle = {
  fillColor: 'rgba(63, 127, 191, 0.12)',
  borderColor: 'rgba(63, 127, 191, 0.9)',
  borderWidth: 1,
  borderStyle: 'dashed',
  borderRadius: 2,
};

export const CLASS_NAME = 'orb-selection-rectangle';
