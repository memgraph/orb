import { CanvasRenderer } from './canvas/canvas-renderer';
import { IRenderer, IRendererSettings, RendererType } from './interface';
import { WebGLRenderer } from './webgl/webgl-renderer';

export class RendererFactory {
  static getRenderer(canvas: HTMLCanvasElement, settings?: Partial<IRendererSettings>): IRenderer {
    if (settings?.type === RendererType.WEBGL) {
      const context = canvas.getContext('webgl2') || new WebGL2RenderingContext();
      return new WebGLRenderer(context, settings);
    }

    if (settings?.type === RendererType.CANVAS) {
      // Get the 2d rendering context which is used by D3 in the Renderer.
      const context = canvas.getContext('2d') || new CanvasRenderingContext2D(); // TODO: how to handle functions that return null?
      return new CanvasRenderer(context, settings);
    }

    const context = canvas.getContext('2d') || new CanvasRenderingContext2D(); // TODO: how to handle functions that return null?
    return new CanvasRenderer(context, settings);
  }
}
