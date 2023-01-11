import { INode, INodeBase } from './models/node';
import { IEdge, IEdgeBase } from './models/edge';
import { Emitter } from './utils/emitter.utils';
import { IPosition } from './common';

export enum OrbEventType {
  // Renderer events for drawing on canvas
  RENDER_START = 'render-start',
  RENDER_END = 'render-end',
  // Simulation (D3) events for setting up node positions
  SIMULATION_START = 'simulation-start',
  SIMULATION_STEP = 'simulation-step',
  SIMULATION_END = 'simulation-end',
  // Mouse events: click, hover, move
  NODE_CLICK = 'node-click',
  NODE_HOVER = 'node-hover',
  EDGE_CLICK = 'edge-click',
  EDGE_HOVER = 'edge-hover',
  MOUSE_CLICK = 'mouse-click',
  MOUSE_MOVE = 'mouse-move',
  // Zoom or pan (translate) change
  TRANSFORM = 'transform',
  // Mouse node drag events
  NODE_DRAG_START = 'node-drag-start',
  NODE_DRAG = 'node-drag',
  NODE_DRAG_END = 'node-drag-end',
  NODE_RIGHT_CLICK = 'node-right-click',
  EDGE_RIGHT_CLICK = 'edge-right-click',
  MOUSE_RIGHT_CLICK = 'mouse-right-click',
  // Double click events
  NODE_DOUBLE_CLICK = 'node-double-click',
  EDGE_DOUBLE_CLICK = 'edge-double-click',
  MOUSE_DOUBLE_CLICK = 'mouse-double-click',
}

export interface IOrbEventDuration {
  durationMs: number;
}

export interface IOrbEventProgress {
  progress: number;
}

export interface IOrbEventMousePosition {
  localPoint: IPosition;
  globalPoint: IPosition;
}

export interface IOrbEventMouseClickEvent extends IOrbEventMousePosition {
  event: PointerEvent;
}

export interface IOrbEventMouseMoveEvent extends IOrbEventMousePosition {
  event: MouseEvent;
}

export interface IOrbEventMouseEvent<N extends INodeBase, E extends IEdgeBase> extends IOrbEventMousePosition {
  subject?: INode<N, E> | IEdge<N, E>;
}

export interface IOrbEventMouseNodeEvent<N extends INodeBase, E extends IEdgeBase> {
  node: INode<N, E>;
}

export interface IOrbEventMouseEdgeEvent<N extends INodeBase, E extends IEdgeBase> {
  edge: IEdge<N, E>;
}

export type IOrbEventRenderEnd = IOrbEventDuration;

export type IOrbEventSimulationStep = IOrbEventProgress;

export type IOrbEventSimulationEnd = IOrbEventDuration;

export type IOrbEventNodeClick<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseNodeEvent<N, E> &
  IOrbEventMouseClickEvent;

export type IOrbEventNodeHover<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseNodeEvent<N, E> &
  IOrbEventMouseMoveEvent;

export type IOrbEventEdgeClick<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseEdgeEvent<N, E> &
  IOrbEventMouseClickEvent;

export type IOrbEventEdgeHover<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseEdgeEvent<N, E> &
  IOrbEventMouseMoveEvent;

export type IOrbEventMouseClick<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseEvent<N, E> &
  IOrbEventMouseClickEvent;

export type IOrbEventMouseMove<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseEvent<N, E> &
  IOrbEventMouseMoveEvent;

export interface IOrbEventTransform {
  transform: {
    x: number;
    y: number;
    k: number;
  };
}

export type IOrbEventNodeDragStart<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseNodeEvent<N, E> &
  IOrbEventMouseMoveEvent;

export type IOrbEventNodeDrag<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseNodeEvent<N, E> &
  IOrbEventMouseMoveEvent;

export type IOrbEventNodeDragEnd<N extends INodeBase, E extends IEdgeBase> = IOrbEventMouseNodeEvent<N, E> &
  IOrbEventMouseMoveEvent;

export class OrbEmitter<N extends INodeBase, E extends IEdgeBase> extends Emitter<{
  [OrbEventType.RENDER_START]: undefined;
  [OrbEventType.RENDER_END]: IOrbEventRenderEnd;
  [OrbEventType.SIMULATION_START]: undefined;
  [OrbEventType.SIMULATION_STEP]: IOrbEventSimulationStep;
  [OrbEventType.SIMULATION_END]: IOrbEventSimulationEnd;
  [OrbEventType.NODE_CLICK]: IOrbEventNodeClick<N, E>;
  [OrbEventType.NODE_HOVER]: IOrbEventNodeHover<N, E>;
  [OrbEventType.EDGE_CLICK]: IOrbEventEdgeClick<N, E>;
  [OrbEventType.EDGE_HOVER]: IOrbEventEdgeHover<N, E>;
  [OrbEventType.MOUSE_CLICK]: IOrbEventMouseClick<N, E>;
  [OrbEventType.MOUSE_MOVE]: IOrbEventMouseMove<N, E>;
  [OrbEventType.TRANSFORM]: IOrbEventTransform;
  [OrbEventType.NODE_DRAG_START]: IOrbEventNodeDragStart<N, E>;
  [OrbEventType.NODE_DRAG]: IOrbEventNodeDrag<N, E>;
  [OrbEventType.NODE_DRAG_END]: IOrbEventNodeDragEnd<N, E>;
  [OrbEventType.NODE_RIGHT_CLICK]: IOrbEventMouseNodeEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.EDGE_RIGHT_CLICK]: IOrbEventMouseEdgeEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.MOUSE_RIGHT_CLICK]: IOrbEventMouseEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.NODE_DOUBLE_CLICK]: IOrbEventMouseNodeEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.EDGE_DOUBLE_CLICK]: IOrbEventMouseEdgeEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.MOUSE_DOUBLE_CLICK]: IOrbEventMouseEvent<N, E> & IOrbEventMouseClickEvent;
}> {}
