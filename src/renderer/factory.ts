import { CanvasRenderer } from './canvas/canvas-renderer';
import { IRenderer, IRendererSettings, RendererType } from './shared';
import { WebGLRenderer } from './webgl/webgl-renderer';
import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';

export class RendererFactory {
  static getRenderer<N extends INodeBase, E extends IEdgeBase>(
    container: HTMLElement,
    type: RendererType = RendererType.CANVAS,
    settings?: Partial<IRendererSettings>,
  ): IRenderer<N, E> {
    if (type === RendererType.WEBGL) {
      return new WebGLRenderer<N, E>(container, settings);
    }
    return new CanvasRenderer<N, E>(container, settings);
  }
}
