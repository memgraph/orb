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

export class WebGLRenderer<N extends INodeBase, E extends IEdgeBase> extends Emitter<RE> implements IRenderer<N, E> {
  // Contains the HTML5 Canvas element which is used for drawing nodes and edges.
  private readonly _context: WebGL2RenderingContext;

  width: number;
  height: number;
  private _settings: IRendererSettings;
  transform: ZoomTransform;

  constructor(context: WebGL2RenderingContext, settings?: Partial<IRendererSettings>) {
    super();
    this._context = context;
    console.log('context', this._context);

    this.width = DEFAULT_RENDERER_WIDTH;
    this.height = DEFAULT_RENDERER_HEIGHT;
    this.transform = zoomIdentity;
    this._settings = {
      ...DEFAULT_RENDERER_SETTINGS,
      ...settings,
    };
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
}
