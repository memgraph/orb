import { ZoomTransform } from 'd3-zoom';
import { IPosition } from '../common/position';
import { IRectangle } from '../common/rectangle';
import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';
import { IGraph } from '../models/graph';
import { Emitter } from '../utils/emitter.utils';

export enum RendererType {
  CANVAS = 'canvas',
  WEBGL = 'webgl',
}

export enum RenderEventType {
  RENDER_START = 'render-start',
  RENDER_END = 'render-end',
}

export interface IRendererSettings {
  type: RendererType;
  minZoom: number;
  maxZoom: number;
  fitZoomMargin: number;
  labelsIsEnabled: boolean;
  labelsOnEventIsEnabled: boolean;
  contextAlphaOnEvent: number;
  contextAlphaOnEventIsEnabled: boolean;
}

export interface IRenderer
  extends Emitter<{
    [RenderEventType.RENDER_START]: undefined;
    [RenderEventType.RENDER_END]: { durationMs: number };
  }> {
  // Width and height of the canvas. Used for clearing.
  width: number;
  height: number;
  settings: IRendererSettings;

  // Includes translation (pan) in the x and y direction
  // as well as scaling (level of zoom).
  transform: ZoomTransform;

  get isInitiallyRendered(): boolean;

  render<N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>): void;

  reset(): void;

  getFitZoomTransform<N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>): ZoomTransform;

  getSimulationPosition(canvasPoint: IPosition): IPosition;

  /**
   * Returns the visible rectangle view in the simulation coordinates.
   *
   * @return {IRectangle} Visible view in teh simulation coordinates
   */
  getSimulationViewRectangle(): IRectangle;

  translateOriginToCenter(): void;
}
