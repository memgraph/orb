import { CanvasRenderer } from './canvas/canvas-renderer';
import { IRenderer, IRendererSettings, RendererType } from './shared';
import { WebGLRenderer } from './webgl/webgl-renderer';
import { OrbError } from '../exceptions';

export class RendererFactory {
  static getRenderer(
    canvas: HTMLCanvasElement,
    type: RendererType = RendererType.CANVAS,
    settings?: Partial<IRendererSettings>,
  ): IRenderer {
    if (type === RendererType.WEBGL) {
      const context = canvas.getContext('webgl2');
      if (!context) {
        throw new OrbError('Failed to create WebGL context.');
      }
      return new WebGLRenderer(context, settings);
    }

    const context = canvas.getContext('2d');
    if (!context) {
      throw new OrbError('Failed to create Canvas context.');
    }
    return new CanvasRenderer(context, settings);
  }
}
