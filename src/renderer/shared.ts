import { ZoomTransform } from 'd3-zoom';
import { Color, IPosition, IRectangle } from '../common';
import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';
import { IGraph } from '../models/graph';
import { IEmitter } from '../utils/emitter.utils';

export enum RendererType {
  CANVAS = 'canvas',
  WEBGL = 'webgl',
}

export enum RenderEventType {
  RESIZE = 'resize',
  RENDER_START = 'render-start',
  RENDER_END = 'render-end',
}

export interface IRendererSettings {
  devicePixelRatio: number | null;
  fps: number;
  minZoom: number;
  maxZoom: number;
  fitZoomMargin: number;
  labelsIsEnabled: boolean;
  labelsOnEventIsEnabled: boolean;
  shadowIsEnabled: boolean;
  shadowOnEventIsEnabled: boolean;
  contextAlphaOnEvent: number;
  contextAlphaOnEventIsEnabled: boolean;
  backgroundColor: Color | string | null;
  areCollapsedContainerDimensionsAllowed: boolean;
}

export interface IRendererSettingsInit extends IRendererSettings {
  type: RendererType;
}

export type RendererEvents = {
  [RenderEventType.RESIZE]: undefined;
  [RenderEventType.RENDER_START]: undefined;
  [RenderEventType.RENDER_END]: { durationMs: number };
};

export interface IRenderer<N extends INodeBase, E extends IEdgeBase> extends IEmitter<RendererEvents> {
  // Includes translation (pan) in the x and y direction
  // as well as scaling (level of zoom).
  transform: ZoomTransform;

  // Width and height of the canvas
  get width(): number;
  get height(): number;
  get container(): HTMLElement;
  get canvas(): HTMLCanvasElement;
  get isInitiallyRendered(): boolean;

  getSettings(): IRendererSettings;
  setSettings(settings: Partial<IRendererSettings>): void;

  render(graph: IGraph<N, E>): void;
  reset(): void;

  getFitZoomTransform(graph: IGraph<N, E>): ZoomTransform;
  getSimulationPosition(canvasPoint: IPosition): IPosition;

  /**
   * Returns the visible rectangle view in the simulation coordinates.
   *
   * @return {IRectangle} Visible view in the simulation coordinates
   */
  getSimulationViewRectangle(): IRectangle;

  translateOriginToCenter(): void;

  destroy(): void;
}

export const DEFAULT_RENDERER_SETTINGS: IRendererSettings = {
  devicePixelRatio: null,
  fps: 60,
  minZoom: 0.25,
  maxZoom: 8,
  fitZoomMargin: 0.2,
  labelsIsEnabled: true,
  labelsOnEventIsEnabled: true,
  shadowIsEnabled: true,
  shadowOnEventIsEnabled: true,
  contextAlphaOnEvent: 0.3,
  contextAlphaOnEventIsEnabled: true,
  backgroundColor: null,
  areCollapsedContainerDimensionsAllowed: false,
};

export const DEFAULT_RENDERER_WIDTH = 640;
export const DEFAULT_RENDERER_HEIGHT = 480;
