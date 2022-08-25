import { zoomIdentity, ZoomTransform } from 'd3-zoom';
import { INodeBase, IEdgeBase, IGraph, IPosition, IRectangle } from '../../index';
import { Emitter } from '../../utils/emitter.utils';
import { IRenderer, IRendererSettings, RendererType, RenderEventType } from '../interface';

const DEFAULT_RENDERER_WIDTH = 640;
const DEFAULT_RENDERER_HEIGHT = 480;
const DEFAULT_RENDERER_FIT_ZOOM_MARGIN = 0.2;
const DEFAULT_RENDERER_MAX_ZOOM = 8;
const DEFAULT_RENDERER_MIN_ZOOM = 0.25;

const DEFAULT_RENDERER_SETTINGS: IRendererSettings = {
  type: RendererType.WEBGL,
  minZoom: DEFAULT_RENDERER_MIN_ZOOM,
  maxZoom: DEFAULT_RENDERER_MAX_ZOOM,
  fitZoomMargin: DEFAULT_RENDERER_FIT_ZOOM_MARGIN,
  labelsIsEnabled: true,
  labelsOnEventIsEnabled: true,
  contextAlphaOnEvent: 0.3,
  contextAlphaOnEventIsEnabled: true,
};

// STUB
export class WebGLRenderer
  extends Emitter<{
    [RenderEventType.RENDER_START]: undefined;
    [RenderEventType.RENDER_END]: { durationMs: number };
  }>
  implements IRenderer
{
  // Contains the HTML5 Canvas element which is used for drawing nodes and edges.
  private readonly _context: WebGL2RenderingContext;

  width: number;
  height: number;
  settings: IRendererSettings;
  transform: ZoomTransform;

  constructor(context: WebGL2RenderingContext, settings?: Partial<IRendererSettings>) {
    super();
    this._context = context;
    console.log('context', this._context);

    this.width = DEFAULT_RENDERER_WIDTH;
    this.height = DEFAULT_RENDERER_HEIGHT;
    this.transform = zoomIdentity;
    this.settings = {
      ...DEFAULT_RENDERER_SETTINGS,
      ...settings,
    };
  }

  get isInitiallyRendered(): boolean {
    throw new Error('Method not implemented.');
  }
  render<N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>): void {
    console.log('graph:', graph);
    throw new Error('Method not implemented.');
  }
  reset(): void {
    throw new Error('Method not implemented.');
  }
  getFitZoomTransform<N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>): ZoomTransform {
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
