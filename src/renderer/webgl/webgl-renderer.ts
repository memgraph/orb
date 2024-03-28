import { zoomIdentity, ZoomTransform } from 'd3-zoom';
import { INodeBase } from '../../models/node';
import { IEdgeBase } from '../../models/edge';
import { IGraph } from '../../models/graph';
import { IPosition, IRectangle } from '../../common';
import { Emitter } from '../../utils/emitter.utils';
import {
  DEFAULT_RENDERER_HEIGHT,
  DEFAULT_RENDERER_SETTINGS,
  DEFAULT_RENDERER_WIDTH,
  IRenderer,
  RendererEvents as RE,
  IRendererSettings,
} from '../shared';
import { copyObject } from '../../utils/object.utils';
import { appendCanvas, setupContainer } from '../../utils/html.utils';
import { OrbError } from '../../exceptions';

export class WebGLRenderer<N extends INodeBase, E extends IEdgeBase> extends Emitter<RE> implements IRenderer<N, E> {
  private readonly _container: HTMLElement;
  private readonly _canvas: HTMLCanvasElement;

  // Contains the HTML5 Canvas element which is used for drawing nodes and edges.
  private readonly _context: WebGL2RenderingContext;

  private _width: number;
  private _height: number;
  private _settings: IRendererSettings;
  transform: ZoomTransform;

  constructor(container: HTMLElement, settings?: Partial<IRendererSettings>) {
    super();
    setupContainer(container, settings?.areCollapsedContainerDimensionsAllowed);
    this._container = container;
    this._canvas = appendCanvas(container);
    const context = this._canvas.getContext('webgl2');

    if (!context) {
      throw new OrbError('Failed to create WebGL context.');
    }

    this._context = context;
    this._width = DEFAULT_RENDERER_WIDTH;
    this._height = DEFAULT_RENDERER_HEIGHT;
    this.transform = zoomIdentity;
    this._settings = {
      ...DEFAULT_RENDERER_SETTINGS,
      ...settings,
    };

    console.log('context', this._context);
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get container(): HTMLElement {
    return this._container;
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  get isInitiallyRendered(): boolean {
    throw new Error('Method not implemented.');
  }

  getSettings(): IRendererSettings {
    return copyObject(this._settings);
  }

  setSettings(settings: Partial<IRendererSettings>): void {
    this._settings = {
      ...this._settings,
      ...settings,
    };
  }

  render(graph: IGraph<N, E>): void {
    console.log('graph:', graph);
    throw new Error('Method not implemented.');
  }

  reset(): void {
    throw new Error('Method not implemented.');
  }

  getFitZoomTransform(graph: IGraph<N, E>): ZoomTransform {
    console.log('graph:', graph);
    throw new Error('Method not implemented.');
  }

  getSimulationPosition(canvasPoint: IPosition): IPosition {
    console.log('canvasPoint:', canvasPoint);
    throw new Error('Method not implemented.');
  }

  getSimulationViewRectangle(): IRectangle {
    throw new Error('Method not implemented.');
  }

  translateOriginToCenter(): void {
    throw new Error('Method not implemented.');
  }

  destroy(): void {
    this.removeAllListeners();
    this._canvas.outerHTML = '';
  }
}
