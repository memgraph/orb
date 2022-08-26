import { zoomIdentity, ZoomTransform } from 'd3-zoom';
import { INodeBase, IEdgeBase, IGraph, IPosition, IRectangle } from '../../index';
import { Emitter } from '../../utils/emitter.utils';
import { RendererEvents } from '../shared';
import {
  DEFAULT_RENDERER_HEIGHT,
  DEFAULT_RENDERER_SETTINGS,
  DEFAULT_RENDERER_WIDTH,
  IRenderer,
  IRendererSettings,
} from '../shared';

// STUB
export class WebGLRenderer extends Emitter<RendererEvents> implements IRenderer {
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
