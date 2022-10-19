import { CanvasRenderer } from './canvas/canvas-renderer';
import { IRenderer, IRendererSettings, RendererType } from './shared';
import { WebGLRenderer } from './webgl/webgl-renderer';
import { OrbError } from '../exceptions';
import { INodeBase } from '../models/node';
import { IEdgeBase } from '../models/edge';

export class RendererFactory {
  static getRenderer<N extends INodeBase, E extends IEdgeBase>(
    canvas: HTMLCanvasElement,
    type: RendererType = RendererType.CANVAS,
    settings?: Partial<IRendererSettings>,
  ): IRenderer<N, E> {
    if (type === RendererType.WEBGL) {
      const context = canvas.getContext('webgl2');
      if (!context) {
        throw new OrbError('Failed to create WebGL context.');
      }
      return new WebGLRenderer<N, E>(context, settings);
    }

    const context = canvas.getContext('2d');
    if (!context) {
      throw new OrbError('Failed to create Canvas context.');
    }
    return new CanvasRenderer<N, E>(context, settings);
  }
}
