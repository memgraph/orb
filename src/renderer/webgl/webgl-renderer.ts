import { zoomIdentity, ZoomTransform } from 'd3-zoom';
import { INode, INodeBase } from '../../models/node';
import { IEdge, IEdgeBase, EdgeCurved, EdgeLoopback } from '../../models/edge';
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
  RenderEventType,
} from '../shared';
import { copyObject } from '../../utils/object.utils';
import { appendCanvas, setupContainer } from '../../utils/html.utils';
import { OrbError } from '../../exceptions';
import { createProgram } from '../../utils/program.utils';
import { NodeShapeType } from '../../models/node';
import nodeVertexSource from './shaders/node/node.vert';
import nodeFragmentSource from './shaders/node/node.frag';
import edgeVertexSource from './shaders/edge/edge.vert';
import edgeFragmentSource from './shaders/edge/edge.frag';
import labelVertexSource from './shaders/label/label.vert';
import labelFragmentSource from './shaders/label/label.frag';
import { LabelCache } from './utils/label-cache';
import { ImageAtlas } from './utils/image-atlas';

const EDGE_TYPE_STRAIGHT = 0;
const EDGE_TYPE_CURVED = 1;
const EDGE_TYPE_LOOPBACK = 2;

// Shared default color tuples — same array reused across all cache misses.
// Without this, every miss in the render loop allocated a fresh 4-element array
// (~hundreds of thousands of allocations per frame at scale). Must not be mutated.
const TRANSPARENT_RGBA: [number, number, number, number] = [0, 0, 0, 0];
const EDGE_DEFAULT_RGBA: [number, number, number, number] = [0.6, 0.6, 0.6, 1];
const NODE_DEFAULT_RGBA: [number, number, number, number] = [1, 0, 0, 1];

const SHAPE_TYPE_MAP: Record<string, number> = {
  [NodeShapeType.CIRCLE]: 0,
  [NodeShapeType.DOT]: 1,
  [NodeShapeType.SQUARE]: 2,
  [NodeShapeType.DIAMOND]: 3,
  [NodeShapeType.TRIANGLE]: 4,
  [NodeShapeType.TRIANGLE_DOWN]: 5,
  [NodeShapeType.STAR]: 6,
  [NodeShapeType.HEXAGON]: 7,
};

const DEFAULT_FONT_SIZE = 4;
const DEFAULT_FONT_FAMILY = 'Roboto, sans-serif';
const DEFAULT_FONT_COLOR = '#000000';
const LABEL_LOD_MIN_SCREEN_PX = 6;
const IMAGE_LOD_MIN_SCREEN_PX = 4;
const EDGE_SIMPLE_LOD_ZOOM = 0.2;
const LABEL_DISTANCE_FROM_NODE = 0.2;
const FLOATS_PER_LABEL = 8;

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
  private _labelProgram: WebGLProgram | null = null;

  private _nodeVao: WebGLVertexArrayObject | null = null;
  private _edgeVao: WebGLVertexArrayObject | null = null;
  private _labelVao: WebGLVertexArrayObject | null = null;

  private _nodeInstanceBuffer: WebGLBuffer | null = null;
  private _edgeInstanceBuffer: WebGLBuffer | null = null;
  private _labelInstanceBuffer: WebGLBuffer | null = null;

  private _labelCache: LabelCache | null = null;
  private _imageAtlas: ImageAtlas | null = null;

  private _isColorCacheDirty = true;
  private _nodeColorCache = new Map<number, RGBAFloats>();
  private _nodeBorderColorCache = new Map<number, RGBAFloats>();
  private _nodeShadowColorCache = new Map<number, RGBAFloats>();

  private _edgeColorCache = new Map<number, RGBAFloats>();
  private _edgeShadowColorCache = new Map<number, RGBAFloats>();

  private _lastNodeCount = 0;
  private _lastEdgeCount = 0;

  private _edgeInstanceData: Float32Array | null = null;
  private _nodeInstanceData: Float32Array | null = null;
  private _buffersAreCurrent = false;
  private _bufferCacheStats = { hits: 0, misses: 0 };

  private _timerExt: any = null;
  private _timerEdgeQueries: WebGLQuery[] = [];
  private _timerNodeQueries: WebGLQuery[] = [];
  private _timerQueryIdx = 0;
  private _lastEdgeGpuMs: number | null = null;
  private _lastNodeGpuMs: number | null = null;

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
    this._initLabelBuffers();
    this._labelCache = new LabelCache(this._gl);
    this._imageAtlas = new ImageAtlas(this._gl);

    // GPU timer queries — async, polled lazily. Without this extension getGpuTimeStats
    // returns nulls but render() runs identically.
    this._timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (this._timerExt) {
      for (let i = 0; i < 4; i++) {
        const eq = gl.createQuery();
        const nq = gl.createQuery();
        if (eq) {
          this._timerEdgeQueries.push(eq);
        }
        if (nq) {
          this._timerNodeQueries.push(nq);
        }
      }
    }
  }

  private _pollTimerQuery(query: WebGLQuery): number | null {
    if (!this._timerExt) {
      return null;
    }
    const gl = this._gl;
    const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
    if (!available) {
      return null;
    }
    if (gl.getParameter(this._timerExt.GPU_DISJOINT_EXT)) {
      return null;
    }
    const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
    return ns / 1e6;
  }

  getGpuTimeStats(): { edgeMs: number | null; nodeMs: number | null; supported: boolean } {
    return {
      edgeMs: this._lastEdgeGpuMs,
      nodeMs: this._lastNodeGpuMs,
      supported: this._timerExt !== null,
    };
  }

  private _initShaders(): void {
    this._nodeProgram = createProgram(this._gl, nodeVertexSource, nodeFragmentSource);
    this._edgeProgram = createProgram(this._gl, edgeVertexSource, edgeFragmentSource);
    this._labelProgram = createProgram(this._gl, labelVertexSource, labelFragmentSource);
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

    const INSTANCE_STRIDE = 25 * Float32Array.BYTES_PER_ELEMENT;
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(this._nodeProgram!, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, INSTANCE_STRIDE, offset * 4);
      gl.vertexAttribDivisor(loc, 1);
    };

    attr('aCenter', 2, 0);
    attr('aRadius', 1, 2);
    attr('aColor', 4, 3);
    attr('aBorderColor', 4, 7);
    attr('aBorderWidth', 1, 11);
    attr('aShadowColor', 4, 12);
    attr('aShadowSize', 1, 16);
    attr('aShadowOffsetX', 1, 17);
    attr('aShadowOffsetY', 1, 18);
    attr('aShapeType', 1, 19);
    attr('aImageUV0', 2, 20);
    attr('aImageUV1', 2, 22);
    attr('aImageAspect', 1, 24);

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

    const STRIDE = 25 * 4;
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(this._edgeProgram!, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, offset * 4);
      gl.vertexAttribDivisor(loc, 1);
    };

    attr('aStart', 2, 0);
    attr('aEnd', 2, 2);
    attr('aControl', 2, 4);
    attr('aWidth', 1, 6);
    attr('aEdgeType', 1, 7);
    attr('aLoopbackRadius', 1, 8);
    attr('aArrowSize', 1, 9);
    attr('aArrowTip', 2, 10);
    attr('aArrowDir', 2, 12);
    attr('aColor', 4, 14);
    attr('aShadowColor', 4, 18);
    attr('aShadowSize', 1, 22);
    attr('aShadowOffsetX', 1, 23);
    attr('aShadowOffsetY', 1, 24);

    gl.bindVertexArray(null);
  }

  private _initLabelBuffers(): void {
    if (!this._labelProgram) {
      throw new OrbError('Label program not initialized.');
    }

    const gl = this._gl;

    this._labelVao = gl.createVertexArray();
    gl.bindVertexArray(this._labelVao);

    const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this._labelProgram, 'aQuadPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this._labelInstanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._labelInstanceBuffer);

    const STRIDE = FLOATS_PER_LABEL * 4;
    const attr = (name: string, size: number, offset: number) => {
      const loc = gl.getAttribLocation(this._labelProgram!, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE, offset * 4);
      gl.vertexAttribDivisor(loc, 1);
    };

    attr('aLabelCenter', 2, 0);
    attr('aLabelSize', 2, 2);
    attr('aLabelUV0', 2, 4);
    attr('aLabelUV1', 2, 6);

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

  invalidateBuffers(): void {
    this._buffersAreCurrent = false;
  }

  getRenderCacheStats(): { hits: number; misses: number } {
    return { ...this._bufferCacheStats };
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
    if (!this._nodeProgram || !this._edgeProgram || !this._labelProgram) {
      throw new OrbError('Shader programs not initialized.');
    }

    this.emit(RenderEventType.RENDER_START, undefined);
    const renderStartedAt = performance.now();

    const gl = this._gl;

    const rect = this._container.getBoundingClientRect();
    if (rect.width !== this._width || rect.height !== this._height) {
      this._canvas.width = rect.width;
      this._canvas.height = rect.height;
      this._width = rect.width;
      this._height = rect.height;
    }

    gl.viewport(0, 0, this._width, this._height);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const edges = graph.getEdges();
    const FLOATS_PER_EDGE = 25;
    const edgeBufferLen = edges.length * FLOATS_PER_EDGE;
    const edgeBufferSizeChanged = this._edgeInstanceData === null || this._edgeInstanceData.length !== edgeBufferLen;
    if (edgeBufferSizeChanged) {
      this._edgeInstanceData = new Float32Array(edgeBufferLen);
    }
    const edgeData = this._edgeInstanceData!;

    const canSkipRebuild = this._buffersAreCurrent && !edgeBufferSizeChanged;
    if (canSkipRebuild) {
      this._bufferCacheStats.hits++;
    } else {
      this._bufferCacheStats.misses++;
    }

    let nodeCxCache: Float64Array | null = null;
    let nodeCyCache: Float64Array | null = null;
    let nodeBorderCache: Float64Array | null = null;
    let nodeIdToIndex: Map<any, number> | null = null;
    if (!canSkipRebuild) {
      const allNodes = graph.getNodes();
      nodeCxCache = new Float64Array(allNodes.length);
      nodeCyCache = new Float64Array(allNodes.length);
      nodeBorderCache = new Float64Array(allNodes.length);
      nodeIdToIndex = new Map<any, number>();
      for (let i = 0; i < allNodes.length; i++) {
        const n = allNodes[i];
        const c = n.getCenter();
        nodeCxCache[i] = c.x;
        nodeCyCache[i] = c.y;
        nodeBorderCache[i] = n.getDistanceToBorder();
        nodeIdToIndex.set(n.id, i);
      }
    }

    if (!canSkipRebuild && (edges.length !== this._lastEdgeCount || this._isColorCacheDirty)) {
      this._buildEdgeColorCache(edges);
      this._buildEdgeShadowColorCache(edges);
      this._isColorCacheDirty = false;
      this._lastEdgeCount = edges.length;
    }

    if (!canSkipRebuild) {
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const startIdx = nodeIdToIndex!.get(edge.startNode.id);
        const endIdx = nodeIdToIndex!.get(edge.endNode.id);
        let startX: number;
        let startY: number;
        let endX: number;
        let endY: number;
        let endBorderDist: number;
        let startBorderDist: number;
        if (startIdx !== undefined) {
          startX = nodeCxCache![startIdx];
          startY = nodeCyCache![startIdx];
          startBorderDist = nodeBorderCache![startIdx];
        } else {
          const c = edge.startNode.getCenter();
          startX = c.x;
          startY = c.y;
          startBorderDist = edge.startNode.getDistanceToBorder();
        }
        if (endIdx !== undefined) {
          endX = nodeCxCache![endIdx];
          endY = nodeCyCache![endIdx];
          endBorderDist = nodeBorderCache![endIdx];
        } else {
          const c = edge.endNode.getCenter();
          endX = c.x;
          endY = c.y;
          endBorderDist = edge.endNode.getDistanceToBorder();
        }
        const edgeStyle = edge.getStyle();
        const shadowSize = edgeStyle.shadowSize || 0;
        const shadowOffsetX = edgeStyle.shadowOffsetX || 0;
        const shadowOffsetY = edgeStyle.shadowOffsetY || 0;
        const shadowColor = this._edgeShadowColorCache.get(edge.id) || TRANSPARENT_RGBA;
        const off = i * FLOATS_PER_EDGE;

        const width = edge.getWidth();
        const rgba =
          edge.isHovered() || edge.isSelected()
            ? this._resolveColor(edge.getColor())
            : this._edgeColorCache.get(edge.id) || EDGE_DEFAULT_RGBA;

        let edgeType = EDGE_TYPE_STRAIGHT;
        let controlX = 0;
        let controlY = 0;
        let loopbackRadius = 0;
        let arrowSize = 0;
        let arrowTipX = 0;
        let arrowTipY = 0;
        let arrowDirX = 0;
        let arrowDirY = 0;

        if (edge.isCurved()) {
          edgeType = EDGE_TYPE_CURVED;
          const cp = (edge as EdgeCurved<N, E>).getCurvedControlPoint();
          controlX = cp.x;
          controlY = cp.y;
        } else if (edge.isLoopback()) {
          edgeType = EDGE_TYPE_LOOPBACK;
          const circle = (edge as EdgeLoopback<N, E>).getCircularData();
          controlX = circle.x;
          controlY = circle.y;
          loopbackRadius = circle.radius;
        }

        const scaleFactor = edgeStyle.arrowSize ?? 1;
        if (scaleFactor > 0) {
          const lineWidth = width || 1;
          arrowSize = 1.5 * scaleFactor + 3 * lineWidth;

          if (edgeType === EDGE_TYPE_STRAIGHT) {
            const dx = endX - startX;
            const dy = endY - startY;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) {
              arrowDirX = dx / len;
              arrowDirY = dy / len;
              arrowTipX = endX - arrowDirX * endBorderDist;
              arrowTipY = endY - arrowDirY * endBorderDist;
            }
          } else if (edgeType === EDGE_TYPE_CURVED) {
            // End node's center is (endX, endY); border distance cached above.
            let bestT = 1.0;
            let low = 0.5;
            let high = 1.0;

            for (let iter = 0; iter < 8; iter++) {
              const mid = (low + high) * 0.5;
              const mt = 1 - mid;
              const px = mt * mt * startX + 2 * mid * mt * controlX + mid * mid * endX;
              const py = mt * mt * startY + 2 * mid * mt * controlY + mid * mid * endY;
              const d = Math.sqrt((px - endX) ** 2 + (py - endY) ** 2);
              if (Math.abs(d - endBorderDist) < 0.1) {
                bestT = mid;
                break;
              }
              if (d > endBorderDist) {
                low = mid;
              } else {
                high = mid;
              }
              bestT = mid;
            }

            const mt = 1 - bestT;
            arrowTipX = mt * mt * startX + 2 * bestT * mt * controlX + bestT * bestT * endX;
            arrowTipY = mt * mt * startY + 2 * bestT * mt * controlY + bestT * bestT * endY;
            const tx = 2 * mt * (controlX - startX) + 2 * bestT * (endX - controlX);
            const ty = 2 * mt * (controlY - startY) + 2 * bestT * (endY - controlY);
            const tLen = Math.sqrt(tx * tx + ty * ty);
            if (tLen > 0) {
              arrowDirX = tx / tLen;
              arrowDirY = ty / tLen;
            }
          } else {
            let bestT = 0.8;
            let low = 0.6;
            let high = 1.0;
            for (let iter = 0; iter < 8; iter++) {
              const mid = (low + high) * 0.5;
              const angle = mid * 2 * Math.PI;
              const px = controlX + loopbackRadius * Math.cos(angle);
              const py = controlY - loopbackRadius * Math.sin(angle);
              const d = Math.sqrt((px - startX) ** 2 + (py - startY) ** 2);
              if (Math.abs(d - startBorderDist) < 0.1) {
                bestT = mid;
                break;
              }
              if (d > startBorderDist) {
                high = mid;
              } else {
                low = mid;
              }
              bestT = mid;
            }
            const angle = bestT * 2 * Math.PI;
            arrowTipX = controlX + loopbackRadius * Math.cos(angle);
            arrowTipY = controlY - loopbackRadius * Math.sin(angle);
            const arrowAngle = bestT * -2 * Math.PI + 0.45 * Math.PI;
            arrowDirX = Math.cos(arrowAngle);
            arrowDirY = Math.sin(arrowAngle);
          }
        }

        edgeData[off] = startX;
        edgeData[off + 1] = startY;
        edgeData[off + 2] = endX;
        edgeData[off + 3] = endY;
        edgeData[off + 4] = controlX;
        edgeData[off + 5] = controlY;
        edgeData[off + 6] = width;
        edgeData[off + 7] = edgeType;
        edgeData[off + 8] = loopbackRadius;
        edgeData[off + 9] = arrowSize;
        edgeData[off + 10] = arrowTipX;
        edgeData[off + 11] = arrowTipY;
        edgeData[off + 12] = arrowDirX;
        edgeData[off + 13] = arrowDirY;
        edgeData[off + 14] = rgba[0];
        edgeData[off + 15] = rgba[1];
        edgeData[off + 16] = rgba[2];
        edgeData[off + 17] = rgba[3];
        edgeData[off + 18] = shadowColor[0];
        edgeData[off + 19] = shadowColor[1];
        edgeData[off + 20] = shadowColor[2];
        edgeData[off + 21] = shadowColor[3];
        edgeData[off + 22] = shadowSize;
        edgeData[off + 23] = shadowOffsetX;
        edgeData[off + 24] = shadowOffsetY;
      }
    }

    gl.useProgram(this._edgeProgram);
    this._setViewUniforms(this._edgeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._edgeInstanceBuffer);
    if (!canSkipRebuild) {
      gl.bufferData(gl.ARRAY_BUFFER, edgeData.byteLength, gl.STREAM_DRAW);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, edgeData);
    }

    const isSimpleEdgeMode = this.transform.k <= EDGE_SIMPLE_LOD_ZOOM;
    const uSimpleModeLoc = gl.getUniformLocation(this._edgeProgram, 'uSimpleMode');
    gl.uniform1i(uSimpleModeLoc, isSimpleEdgeMode ? 1 : 0);

    gl.bindVertexArray(this._edgeVao);

    if (this._timerExt && this._timerEdgeQueries.length > 0) {
      const slot = this._timerEdgeQueries[this._timerQueryIdx];
      const ms = this._pollTimerQuery(slot);
      if (ms !== null) {
        this._lastEdgeGpuMs = ms;
      }
      gl.beginQuery(this._timerExt.TIME_ELAPSED_EXT, slot);
    }

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, edges.length);

    if (this._timerExt && this._timerEdgeQueries.length > 0) {
      gl.endQuery(this._timerExt.TIME_ELAPSED_EXT);
    }
    gl.bindVertexArray(null);

    if (isSimpleEdgeMode) {
      gl.enable(gl.BLEND);
    }

    gl.useProgram(this._nodeProgram);
    this._setViewUniforms(this._nodeProgram);

    if (this._imageAtlas) {
      this._imageAtlas.uploadIfDirty();
      this._imageAtlas.bind(0);
      gl.uniform1i(gl.getUniformLocation(this._nodeProgram, 'uImageAtlas'), 0);
    }

    const nodes = graph.getNodes();
    const zoom = this.transform.k;
    const FLOATS_PER_NODE = 25;
    const nodeBufferLen = nodes.length * FLOATS_PER_NODE;
    const nodeBufferSizeChanged = this._nodeInstanceData === null || this._nodeInstanceData.length !== nodeBufferLen;
    if (nodeBufferSizeChanged) {
      this._nodeInstanceData = new Float32Array(nodeBufferLen);
    }
    const instanceData = this._nodeInstanceData!;
    const canSkipNodeRebuild = canSkipRebuild && !nodeBufferSizeChanged;

    if (!canSkipNodeRebuild && (nodes.length !== this._lastNodeCount || this._isColorCacheDirty)) {
      this._buildNodeColorCache(nodes);
      this._buildNodeBorderColorCache(nodes);
      this._buildNodeShadowColorCache(nodes);
      this._isColorCacheDirty = false;
      this._lastNodeCount = nodes.length;
    }

    if (!canSkipNodeRebuild) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const center = node.getCenter();
        const radius = node.getRadius();
        const nodeStyle = node.getStyle();
        const shadowSize = nodeStyle.shadowSize || 0;
        const shadowOffsetX = nodeStyle.shadowOffsetX || 0;
        const shadowOffsetY = nodeStyle.shadowOffsetY || 0;
        const shadowColor = this._nodeShadowColorCache.get(node.id) || TRANSPARENT_RGBA;
        const off = i * FLOATS_PER_NODE;

        let rgba: RGBAFloats;
        let borderColor: RGBAFloats;
        let borderWidth: number;

        if (node.isHovered() || node.isSelected()) {
          rgba = this._resolveColor(node.getColor());
          borderColor = this._resolveColor(node.getBorderColor());
          borderWidth = node.getBorderWidth();
        } else {
          rgba = this._nodeColorCache.get(node.id) || NODE_DEFAULT_RGBA;
          borderColor = this._nodeBorderColorCache.get(node.id) || TRANSPARENT_RGBA;
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
        instanceData[off + 19] = SHAPE_TYPE_MAP[nodeStyle.shape ?? NodeShapeType.CIRCLE] ?? 0;

        let imgU0 = 0;
        let imgV0 = 0;
        let imgU1 = 0;
        let imgV1 = 0;
        let imgAspect = 0;
        if (radius * zoom >= IMAGE_LOD_MIN_SCREEN_PX) {
          const imageUrl = node.isSelected() ? nodeStyle.imageUrlSelected || nodeStyle.imageUrl : nodeStyle.imageUrl;
          if (imageUrl && this._imageAtlas) {
            const entry = this._imageAtlas.getOrCreate(imageUrl);
            if (entry) {
              imgU0 = entry.u0;
              imgV0 = entry.v0;
              imgU1 = entry.u1;
              imgV1 = entry.v1;
              imgAspect = entry.aspect;
            }
          }
        }
        instanceData[off + 20] = imgU0;
        instanceData[off + 21] = imgV0;
        instanceData[off + 22] = imgU1;
        instanceData[off + 23] = imgV1;
        instanceData[off + 24] = imgAspect;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this._nodeInstanceBuffer);
    if (!canSkipNodeRebuild) {
      gl.bufferData(gl.ARRAY_BUFFER, instanceData.byteLength, gl.STREAM_DRAW);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData);
    }
    this._buffersAreCurrent = true;

    gl.bindVertexArray(this._nodeVao);

    if (this._timerExt && this._timerNodeQueries.length > 0) {
      const slot = this._timerNodeQueries[this._timerQueryIdx];
      const ms = this._pollTimerQuery(slot);
      if (ms !== null) {
        this._lastNodeGpuMs = ms;
      }
      gl.beginQuery(this._timerExt.TIME_ELAPSED_EXT, slot);
    }

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nodes.length);

    if (this._timerExt && this._timerNodeQueries.length > 0) {
      gl.endQuery(this._timerExt.TIME_ELAPSED_EXT);
      this._timerQueryIdx = (this._timerQueryIdx + 1) % this._timerNodeQueries.length;
    }
    gl.bindVertexArray(null);

    if (this._labelProgram && this._labelCache && this._settings.labelsIsEnabled) {
      const labelCache = this._labelCache;
      const rasterPx = labelCache.rasterFontPx;
      let labelCount = 0;

      const maxLabels = nodes.length + edges.length;
      const labelData = new Float32Array(maxLabels * FLOATS_PER_LABEL);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const text = node.getLabel();
        if (!text) {
          continue;
        }

        const style = node.getStyle();
        const fontSize = style.fontSize || DEFAULT_FONT_SIZE;
        if (fontSize * zoom < LABEL_LOD_MIN_SCREEN_PX) {
          continue;
        }

        const fontFamily = style.fontFamily || DEFAULT_FONT_FAMILY;
        const fontColor = (style.fontColor ?? DEFAULT_FONT_COLOR).toString();
        const bgColor = style.fontBackgroundColor ? style.fontBackgroundColor.toString() : null;

        const entry = labelCache.getOrCreate(text, fontSize, fontFamily, fontColor, bgColor);
        if (!entry) {
          continue;
        }

        const center = node.getCenter();
        const borderedRadius = node.getBorderedRadius();
        const worldW = (entry.pxWidth / rasterPx) * fontSize;
        const worldH = (entry.pxHeight / rasterPx) * fontSize;

        const off = labelCount * FLOATS_PER_LABEL;
        labelData[off] = center.x;
        labelData[off + 1] = center.y + borderedRadius * (1 + LABEL_DISTANCE_FROM_NODE) + worldH / 2;
        labelData[off + 2] = worldW / 2;
        labelData[off + 3] = worldH / 2;
        labelData[off + 4] = entry.u0;
        labelData[off + 5] = entry.v0;
        labelData[off + 6] = entry.u1;
        labelData[off + 7] = entry.v1;
        labelCount++;
      }

      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const text = edge.getLabel();
        if (!text) {
          continue;
        }

        const style = edge.getStyle();
        const fontSize = style.fontSize || DEFAULT_FONT_SIZE;
        if (fontSize * zoom < LABEL_LOD_MIN_SCREEN_PX) {
          continue;
        }

        const fontFamily = style.fontFamily || DEFAULT_FONT_FAMILY;
        const fontColor = (style.fontColor ?? DEFAULT_FONT_COLOR).toString();
        const bgColor = style.fontBackgroundColor ? style.fontBackgroundColor.toString() : null;

        const entry = labelCache.getOrCreate(text, fontSize, fontFamily, fontColor, bgColor);
        if (!entry) {
          continue;
        }

        const edgeCenter = edge.getCenter();
        const worldW = (entry.pxWidth / rasterPx) * fontSize;
        const worldH = (entry.pxHeight / rasterPx) * fontSize;

        const off = labelCount * FLOATS_PER_LABEL;
        labelData[off] = edgeCenter.x;
        labelData[off + 1] = edgeCenter.y;
        labelData[off + 2] = worldW / 2;
        labelData[off + 3] = worldH / 2;
        labelData[off + 4] = entry.u0;
        labelData[off + 5] = entry.v0;
        labelData[off + 6] = entry.u1;
        labelData[off + 7] = entry.v1;
        labelCount++;
      }

      if (labelCount > 0) {
        labelCache.uploadIfDirty();

        gl.useProgram(this._labelProgram);
        this._setViewUniforms(this._labelProgram);

        labelCache.bind(0);
        gl.uniform1i(gl.getUniformLocation(this._labelProgram, 'uAtlas'), 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._labelInstanceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, labelData.subarray(0, labelCount * FLOATS_PER_LABEL), gl.DYNAMIC_DRAW);

        gl.bindVertexArray(this._labelVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, labelCount);
        gl.bindVertexArray(null);
      }
    }

    this._isInitiallyRendered = true;
    this.emit(RenderEventType.RENDER_END, { durationMs: performance.now() - renderStartedAt });
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
