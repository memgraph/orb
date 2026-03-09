import { zoomIdentity, ZoomTransform } from 'd3-zoom';
import { INode, INodeBase } from '../../models/node';
import { IEdge, IEdgeBase } from '../../models/edge';
import { IGraph } from '../../models/graph';
import { Color, IPosition, IRectangle } from '../../common';
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
import { createProgram } from '../../utils/program.utils';
import nodeVertexSource from './shaders/node/node.vert';
import nodeFragmentSource from './shaders/node/node.frag';
import edgeVertexSource from './shaders/edge/edge.vert';
import edgeFragmentSource from './shaders/edge/edge.frag';

type RGBAFloats = [number, number, number, number];

export class WebGLRenderer<N extends INodeBase, E extends IEdgeBase> extends Emitter<RE> implements IRenderer<N, E> {
  private readonly _container: HTMLElement;
  private readonly _canvas: HTMLCanvasElement;

  // Contains the HTML5 Canvas element which is used for drawing nodes and edges.
  private readonly _gl: WebGL2RenderingContext;

  private _width: number;
  private _height: number;
  private _settings: IRendererSettings;
  transform: ZoomTransform;

  private _isOriginCentered = false;
  private _isInitiallyRendered = false;

  private _nodeProgram: WebGLProgram | null = null;
  private _edgeProgram: WebGLProgram | null = null;

  private _nodeVao: WebGLVertexArrayObject | null = null;
  private _edgeVao: WebGLVertexArrayObject | null = null;

  private _nodeInstanceBuffer: WebGLBuffer | null = null;
  private _edgeInstanceBuffer: WebGLBuffer | null = null;

  private _isColorCacheDirty = true;
  private _nodeColorCache = new Map<number, RGBAFloats>();
  private _nodeBorderColorCache = new Map<number, RGBAFloats>();
  private _nodeShadowColorCache = new Map<number, RGBAFloats>();

  private _edgeColorCache = new Map<number, RGBAFloats>();
  private _edgeShadowColorCache = new Map<number, RGBAFloats>();

  private _lastNodeCount = 0;
  private _lastEdgeCount = 0;

  constructor(container: HTMLElement, settings?: Partial<IRendererSettings>) {
    super();
    setupContainer(container, settings?.areCollapsedContainerDimensionsAllowed);
    this._container = container;
    this._canvas = appendCanvas(container);
    const gl = this._canvas.getContext('webgl2', { antialias: true });

    if (!gl) {
      throw new OrbError('Failed to create WebGL context.');
    }

    this._gl = gl;
    this._width = DEFAULT_RENDERER_WIDTH;
    this._height = DEFAULT_RENDERER_HEIGHT;
    this.transform = zoomIdentity;
    this._settings = {
      ...DEFAULT_RENDERER_SETTINGS,
      ...settings,
    };

    this._initShaders();
    this._initNodeBuffers();
    this._initEdgeBuffers();
  }

  private _initShaders(): void {
    this._nodeProgram = createProgram(this._gl, nodeVertexSource, nodeFragmentSource);
    this._edgeProgram = createProgram(this._gl, edgeVertexSource, edgeFragmentSource);
  }

  private _initNodeBuffers(): void {
    if (!this._nodeProgram) {
      throw new OrbError('Node program not initialized.');
    }

    const gl = this._gl;

    this._nodeVao = gl.createVertexArray();
    gl.bindVertexArray(this._nodeVao);

    const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this._nodeProgram, 'aQuadPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this._nodeInstanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._nodeInstanceBuffer);

    const INSTANCE_STRIDE = 19 * Float32Array.BYTES_PER_ELEMENT;

    const centerLoc = gl.getAttribLocation(this._nodeProgram, 'aCenter');
    gl.enableVertexAttribArray(centerLoc);
    gl.vertexAttribPointer(centerLoc, 2, gl.FLOAT, false, INSTANCE_STRIDE, 0);
    gl.vertexAttribDivisor(centerLoc, 1);

    const radiusLoc = gl.getAttribLocation(this._nodeProgram, 'aRadius');
    gl.enableVertexAttribArray(radiusLoc);
    gl.vertexAttribPointer(radiusLoc, 1, gl.FLOAT, false, INSTANCE_STRIDE, 2 * 4);
    gl.vertexAttribDivisor(radiusLoc, 1);

    const colorLoc = gl.getAttribLocation(this._nodeProgram, 'aColor');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, INSTANCE_STRIDE, 3 * 4);
    gl.vertexAttribDivisor(colorLoc, 1);

    const borderColorLoc = gl.getAttribLocation(this._nodeProgram, 'aBorderColor');
    gl.enableVertexAttribArray(borderColorLoc);
    gl.vertexAttribPointer(borderColorLoc, 4, gl.FLOAT, false, INSTANCE_STRIDE, 7 * 4);
    gl.vertexAttribDivisor(borderColorLoc, 1);

    const borderWidthLoc = gl.getAttribLocation(this._nodeProgram, 'aBorderWidth');
    gl.enableVertexAttribArray(borderWidthLoc);
    gl.vertexAttribPointer(borderWidthLoc, 1, gl.FLOAT, false, INSTANCE_STRIDE, 11 * 4);
    gl.vertexAttribDivisor(borderWidthLoc, 1);

    const shadowColorLoc = gl.getAttribLocation(this._nodeProgram, 'aShadowColor');
    gl.enableVertexAttribArray(shadowColorLoc);
    gl.vertexAttribPointer(shadowColorLoc, 4, gl.FLOAT, false, INSTANCE_STRIDE, 12 * 4);
    gl.vertexAttribDivisor(shadowColorLoc, 1);

    const shadowSizeLoc = gl.getAttribLocation(this._nodeProgram, 'aShadowSize');
    gl.enableVertexAttribArray(shadowSizeLoc);
    gl.vertexAttribPointer(shadowSizeLoc, 1, gl.FLOAT, false, INSTANCE_STRIDE, 16 * 4);
    gl.vertexAttribDivisor(shadowSizeLoc, 1);

    const shadowOffsetXLoc = gl.getAttribLocation(this._nodeProgram, 'aShadowOffsetX');
    gl.enableVertexAttribArray(shadowOffsetXLoc);
    gl.vertexAttribPointer(shadowOffsetXLoc, 1, gl.FLOAT, false, INSTANCE_STRIDE, 17 * 4);
    gl.vertexAttribDivisor(shadowOffsetXLoc, 1);

    const shadowOffsetYLoc = gl.getAttribLocation(this._nodeProgram, 'aShadowOffsetY');
    gl.enableVertexAttribArray(shadowOffsetYLoc);
    gl.vertexAttribPointer(shadowOffsetYLoc, 1, gl.FLOAT, false, INSTANCE_STRIDE, 18 * 4);
    gl.vertexAttribDivisor(shadowOffsetYLoc, 1);

    gl.bindVertexArray(null);
  }

  private _initEdgeBuffers(): void {
    if (!this._edgeProgram) {
      throw new OrbError('Edge program not initialized.');
    }

    const gl = this._gl;

    this._edgeVao = gl.createVertexArray();
    gl.bindVertexArray(this._edgeVao);

    const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this._edgeProgram, 'aQuadPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this._edgeInstanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._edgeInstanceBuffer);

    const STRIDE = 16 * 4;

    const startLoc = gl.getAttribLocation(this._edgeProgram, 'aStart');
    gl.enableVertexAttribArray(startLoc);
    gl.vertexAttribPointer(startLoc, 2, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribDivisor(startLoc, 1);

    const endLoc = gl.getAttribLocation(this._edgeProgram, 'aEnd');
    gl.enableVertexAttribArray(endLoc);
    gl.vertexAttribPointer(endLoc, 2, gl.FLOAT, false, STRIDE, 2 * 4);
    gl.vertexAttribDivisor(endLoc, 1);

    const widthLoc = gl.getAttribLocation(this._edgeProgram, 'aWidth');
    gl.enableVertexAttribArray(widthLoc);
    gl.vertexAttribPointer(widthLoc, 1, gl.FLOAT, false, STRIDE, 4 * 4);
    gl.vertexAttribDivisor(widthLoc, 1);

    const colorLoc = gl.getAttribLocation(this._edgeProgram, 'aColor');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, STRIDE, 5 * 4);
    gl.vertexAttribDivisor(colorLoc, 1);

    const shadowColorLoc = gl.getAttribLocation(this._edgeProgram, 'aShadowColor');
    gl.enableVertexAttribArray(shadowColorLoc);
    gl.vertexAttribPointer(shadowColorLoc, 4, gl.FLOAT, false, STRIDE, 9 * 4);
    gl.vertexAttribDivisor(shadowColorLoc, 1);

    const shadowSizeLoc = gl.getAttribLocation(this._edgeProgram, 'aShadowSize');
    gl.enableVertexAttribArray(shadowSizeLoc);
    gl.vertexAttribPointer(shadowSizeLoc, 1, gl.FLOAT, false, STRIDE, 13 * 4);
    gl.vertexAttribDivisor(shadowSizeLoc, 1);

    const shadowOffsetXLoc = gl.getAttribLocation(this._edgeProgram, 'aShadowOffsetX');
    gl.enableVertexAttribArray(shadowOffsetXLoc);
    gl.vertexAttribPointer(shadowOffsetXLoc, 1, gl.FLOAT, false, STRIDE, 14 * 4);
    gl.vertexAttribDivisor(shadowOffsetXLoc, 1);

    const shadowOffsetYLoc = gl.getAttribLocation(this._edgeProgram, 'aShadowOffsetY');
    gl.enableVertexAttribArray(shadowOffsetYLoc);
    gl.vertexAttribPointer(shadowOffsetYLoc, 1, gl.FLOAT, false, STRIDE, 15 * 4);
    gl.vertexAttribDivisor(shadowOffsetYLoc, 1);

    gl.bindVertexArray(null);
  }

  private _resolveColor(raw: Color | string | undefined): RGBAFloats {
    if (!raw) {
      return [1, 0, 0, 1];
    }

    if (raw instanceof Color) {
      return [raw.rgb.r / 255, raw.rgb.g / 255, raw.rgb.b / 255, 1.0];
    }

    const rgbaMatch = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
    if (rgbaMatch) {
      return [
        parseInt(rgbaMatch[1]) / 255,
        parseInt(rgbaMatch[2]) / 255,
        parseInt(rgbaMatch[3]) / 255,
        rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1.0,
      ];
    }

    const c = new Color(raw);
    return [c.rgb.r / 255, c.rgb.g / 255, c.rgb.b / 255, 1.0];
  }

  private _buildNodeColorCache(nodes: INode<N, E>[]): void {
    this._nodeColorCache.clear();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      this._nodeColorCache.set(node.id, this._resolveColor(node.getColor()));
    }
  }

  private _buildNodeBorderColorCache(nodes: INode<N, E>[]): void {
    this._nodeBorderColorCache.clear();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      this._nodeBorderColorCache.set(node.id, this._resolveColor(node.getBorderColor()));
    }
  }

  private _buildNodeShadowColorCache(nodes: INode<N, E>[]): void {
    this._nodeShadowColorCache.clear();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const raw = node.getStyle().shadowColor;
      this._nodeShadowColorCache.set(node.id, raw ? this._resolveColor(raw) : [0, 0, 0, 0]);
    }
  }

  private _buildEdgeColorCache(edges: IEdge<N, E>[]): void {
    this._edgeColorCache.clear();
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      this._edgeColorCache.set(edge.id, this._resolveColor(edge.getColor()));
    }
  }

  private _buildEdgeShadowColorCache(edges: IEdge<N, E>[]): void {
    this._edgeShadowColorCache.clear();
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const raw = edge.getStyle().shadowColor;
      this._edgeShadowColorCache.set(edge.id, raw ? this._resolveColor(raw) : [0, 0, 0, 0]);
    }
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
    return this._isInitiallyRendered;
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
    if (!this._nodeProgram || !this._edgeProgram) {
      throw new OrbError('Node or edge program not initialized.');
    }

    const gl = this._gl;

    const rect = this._container.getBoundingClientRect();
    this._canvas.width = rect.width;
    this._canvas.height = rect.height;
    this._width = rect.width;
    this._height = rect.height;

    gl.viewport(0, 0, this._width, this._height);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const edges = graph.getEdges();
    const FLOATS_PER_EDGE = 16;
    const edgeData = new Float32Array(edges.length * FLOATS_PER_EDGE);

    if (edges.length !== this._lastEdgeCount || this._isColorCacheDirty) {
      this._buildEdgeColorCache(edges);
      this._buildEdgeShadowColorCache(edges);
      this._isColorCacheDirty = false;
      this._lastEdgeCount = edges.length;
    }

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const start = edge.startNode.getCenter();
      const end = edge.endNode.getCenter();
      const shadowSize = edge.getStyle().shadowSize || 0;
      const shadowOffsetX = edge.getStyle().shadowOffsetX || 0;
      const shadowOffsetY = edge.getStyle().shadowOffsetY || 0;
      const shadowColor = this._edgeShadowColorCache.get(edge.id) || [0, 0, 0, 0];
      const off = i * FLOATS_PER_EDGE;

      let width;
      let rgba;

      if (edge.isHovered() || edge.isSelected()) {
        width = edge.getWidth();
        rgba = this._resolveColor(edge.getColor());
      } else {
        width = edge.getWidth();
        rgba = this._edgeColorCache.get(edge.id) || [0.6, 0.6, 0.6, 1];
      }

      edgeData[off] = start.x;
      edgeData[off + 1] = start.y;
      edgeData[off + 2] = end.x;
      edgeData[off + 3] = end.y;
      edgeData[off + 4] = width;
      edgeData[off + 5] = rgba[0];
      edgeData[off + 6] = rgba[1];
      edgeData[off + 7] = rgba[2];
      edgeData[off + 8] = rgba[3];
      edgeData[off + 9] = shadowColor[0];
      edgeData[off + 10] = shadowColor[1];
      edgeData[off + 11] = shadowColor[2];
      edgeData[off + 12] = shadowColor[3];
      edgeData[off + 13] = shadowSize;
      edgeData[off + 14] = shadowOffsetX;
      edgeData[off + 15] = shadowOffsetY;
    }

    gl.useProgram(this._edgeProgram);
    this._setViewUniforms(this._edgeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._edgeInstanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, edgeData, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(this._edgeVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, edges.length);
    gl.bindVertexArray(null);

    gl.useProgram(this._nodeProgram);
    this._setViewUniforms(this._nodeProgram);

    const nodes = graph.getNodes();
    const FLOATS_PER_NODE = 19;
    const instanceData = new Float32Array(nodes.length * FLOATS_PER_NODE);

    if (nodes.length !== this._lastNodeCount || this._isColorCacheDirty) {
      this._buildNodeColorCache(nodes);
      this._buildNodeBorderColorCache(nodes);
      this._buildNodeShadowColorCache(nodes);
      this._isColorCacheDirty = false;
      this._lastNodeCount = nodes.length;
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const center = node.getCenter();
      const radius = node.getRadius();
      const shadowSize = node.getStyle().shadowSize || 0;
      const shadowOffsetX = node.getStyle().shadowOffsetX || 0;
      const shadowOffsetY = node.getStyle().shadowOffsetY || 0;
      const shadowColor = this._nodeShadowColorCache.get(node.id) || [0, 0, 0, 0];
      const off = i * FLOATS_PER_NODE;

      let rgba: RGBAFloats;
      let borderColor: RGBAFloats;
      let borderWidth: number;

      if (node.isHovered() || node.isSelected()) {
        rgba = this._resolveColor(node.getColor());
        borderColor = this._resolveColor(node.getBorderColor());
        borderWidth = node.getBorderWidth();
      } else {
        rgba = this._nodeColorCache.get(node.id) || [1, 0, 0, 1];
        borderColor = this._nodeBorderColorCache.get(node.id) || [0, 0, 0, 0];
        borderWidth = node.getBorderWidth();
      }

      instanceData[off] = center.x;
      instanceData[off + 1] = center.y;
      instanceData[off + 2] = radius;
      instanceData[off + 3] = rgba[0];
      instanceData[off + 4] = rgba[1];
      instanceData[off + 5] = rgba[2];
      instanceData[off + 6] = rgba[3];
      instanceData[off + 7] = borderColor[0];
      instanceData[off + 8] = borderColor[1];
      instanceData[off + 9] = borderColor[2];
      instanceData[off + 10] = borderColor[3];
      instanceData[off + 11] = borderWidth;
      instanceData[off + 12] = shadowColor[0];
      instanceData[off + 13] = shadowColor[1];
      instanceData[off + 14] = shadowColor[2];
      instanceData[off + 15] = shadowColor[3];
      instanceData[off + 16] = shadowSize;
      instanceData[off + 17] = shadowOffsetX;
      instanceData[off + 18] = shadowOffsetY;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this._nodeInstanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

    gl.bindVertexArray(this._nodeVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nodes.length);
    gl.bindVertexArray(null);

    this._isInitiallyRendered = true;
  }

  reset(): void {
    this.transform = zoomIdentity;
    const gl = this._gl;
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  getFitZoomTransform(graph: IGraph<N, E>): ZoomTransform {
    const graphView = graph.getBoundingBox();
    const graphMiddleX = graphView.x + graphView.width / 2;
    const graphMiddleY = graphView.y + graphView.height / 2;

    const simulationView = this.getSimulationViewRectangle();

    const heightScale = simulationView.height / (graphView.height * (1 + this._settings.fitZoomMargin));
    const widthScale = simulationView.width / (graphView.width * (1 + this._settings.fitZoomMargin));
    const scale = Math.min(heightScale, widthScale);

    const previousZoom = this.transform.k;
    const newZoom = Math.max(Math.min(scale * previousZoom, this._settings.maxZoom), this._settings.minZoom);

    const newX = (simulationView.width / 2) * previousZoom * (1 - newZoom) - graphMiddleX * newZoom;
    const newY = (simulationView.height / 2) * previousZoom * (1 - newZoom) - graphMiddleY * newZoom;

    return zoomIdentity.translate(newX, newY).scale(newZoom);
  }

  getSimulationPosition(canvasPoint: IPosition): IPosition {
    const [x, y] = this.transform.invert([canvasPoint.x, canvasPoint.y]);
    return {
      x: x - this._width / 2,
      y: y - this._height / 2,
    };
  }

  getSimulationViewRectangle(): IRectangle {
    const topLeftPosition = this.getSimulationPosition({ x: 0, y: 0 });
    const bottomRightPosition = this.getSimulationPosition({ x: this._width, y: this._height });
    return {
      x: topLeftPosition.x,
      y: topLeftPosition.y,
      width: bottomRightPosition.x - topLeftPosition.x,
      height: bottomRightPosition.y - topLeftPosition.y,
    };
  }

  translateOriginToCenter(): void {
    this._isOriginCentered = true;
  }

  destroy(): void {
    this.removeAllListeners();
    this._canvas.outerHTML = '';
  }

  private _setViewUniforms(program: WebGLProgram): void {
    const gl = this._gl;
    const originX = this._isOriginCentered ? this._width / 2 : 0;
    const originY = this._isOriginCentered ? this._height / 2 : 0;

    gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), this._width, this._height);
    gl.uniform2f(gl.getUniformLocation(program, 'uTranslation'), this.transform.x, this.transform.y);
    gl.uniform1f(gl.getUniformLocation(program, 'uScale'), this.transform.k);
    gl.uniform2f(gl.getUniformLocation(program, 'uOriginOffset'), originX, originY);
  }
}
