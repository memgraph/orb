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
}

export interface IOrbEventDuration {
  durationMs: number;
}

export interface IOrbEventProgress {
  progress: number;
}

export interface IOrbEventTransform {
  transform: {
    x: number;
    y: number;
    k: number;
  };
}

interface IOrbEventMousePosition {
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

export class OrbEmitter<N extends INodeBase, E extends IEdgeBase> extends Emitter<{
  [OrbEventType.RENDER_START]: undefined;
  [OrbEventType.RENDER_END]: IOrbEventDuration;
  [OrbEventType.SIMULATION_START]: undefined;
  [OrbEventType.SIMULATION_STEP]: IOrbEventProgress;
  [OrbEventType.SIMULATION_END]: IOrbEventDuration;
  [OrbEventType.NODE_CLICK]: IOrbEventMouseNodeEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.NODE_HOVER]: IOrbEventMouseNodeEvent<N, E> & IOrbEventMouseMoveEvent;
  [OrbEventType.EDGE_CLICK]: IOrbEventMouseEdgeEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.EDGE_HOVER]: IOrbEventMouseEdgeEvent<N, E> & IOrbEventMouseMoveEvent;
  [OrbEventType.MOUSE_CLICK]: IOrbEventMouseEvent<N, E> & IOrbEventMouseClickEvent;
  [OrbEventType.MOUSE_MOVE]: IOrbEventMouseEvent<N, E> & IOrbEventMouseMoveEvent;
  [OrbEventType.TRANSFORM]: IOrbEventTransform;
  [OrbEventType.NODE_DRAG_START]: IOrbEventMouseNodeEvent<N, E> & IOrbEventMouseMoveEvent;
  [OrbEventType.NODE_DRAG]: IOrbEventMouseNodeEvent<N, E> & IOrbEventMouseMoveEvent;
  [OrbEventType.NODE_DRAG_END]: IOrbEventMouseNodeEvent<N, E> & IOrbEventMouseMoveEvent;
}> {}
