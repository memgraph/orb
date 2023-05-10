import { ZoomTransform, zoomIdentity } from 'd3-zoom';
import { IPosition, IRectangle } from '../../common';
import { INode, INodeBase, isNode } from '../../models/node';
import { IEdge, IEdgeBase } from '../../models/edge';
import { IGraph } from '../../models/graph';
import { drawEdge, IEdgeDrawOptions } from './edge';
import { drawNode, INodeDrawOptions } from './node';
import { Emitter } from '../../utils/emitter.utils';
import {
  DEFAULT_RENDERER_HEIGHT,
  DEFAULT_RENDERER_SETTINGS,
  DEFAULT_RENDERER_WIDTH,
  IRenderer,
  IRendererSettings,
  RendererEvents as RE,
  RenderEventType,
} from '../shared';
import { throttle } from '../../utils/function.utils';
import { getThrottleMsFromFPS } from '../../utils/math.utils';
import { copyObject } from '../../utils/object.utils';

const DEBUG = false;
const DEBUG_RED = '#FF5733';
const DEBUG_GREEN = '#3CFF33';
const DEBUG_BLUE = '#3383FF';
const DEBUG_PINK = '#F333FF';

export class CanvasRenderer<N extends INodeBase, E extends IEdgeBase> extends Emitter<RE> implements IRenderer<N, E> {
  // Contains the HTML5 Canvas element which is used for drawing nodes and edges.
  private readonly _context: CanvasRenderingContext2D;

  // Width and height of the canvas. Used for clearing
  public width: number;
  public height: number;
  private _settings: IRendererSettings;

  // Includes translation (pan) in the x and y direction
  // as well as scaling (level of zoom).
  public transform: ZoomTransform;

  // Translates (0, 0) coordinates to (width/2, height/2).
  private _isOriginCentered = false;

  // False if renderer never rendered on canvas, otherwise true
  private _isInitiallyRendered = false;

  private _throttleRender: (graph: IGraph<N, E>) => void;

  constructor(context: CanvasRenderingContext2D, settings?: Partial<IRendererSettings>) {
    super();
    this._context = context;
    this.width = DEFAULT_RENDERER_WIDTH;
    this.height = DEFAULT_RENDERER_HEIGHT;
    this.transform = zoomIdentity;
    this._settings = {
      ...DEFAULT_RENDERER_SETTINGS,
      ...settings,
    };

    this._throttleRender = throttle((graph: IGraph<N, E>) => {
      this._render(graph);
    }, getThrottleMsFromFPS(this._settings.fps));
  }

  get isInitiallyRendered(): boolean {
    return this._isInitiallyRendered;
  }

  getSettings(): IRendererSettings {
    return copyObject(this._settings);
  }

  setSettings(settings: Partial<IRendererSettings>) {
    const isFpsChanged = settings.fps && settings.fps !== this._settings.fps;
    this._settings = {
      ...this._settings,
      ...settings,
    };

    if (isFpsChanged) {
      this._throttleRender = throttle((graph: IGraph<any, any>) => {
        this._render(graph);
      }, getThrottleMsFromFPS(this._settings.fps));
    }
  }

  render(graph: IGraph<N, E>) {
    this._throttleRender(graph);
  }

  private _render(graph: IGraph<N, E>) {
    if (!graph.getNodeCount()) {
      return;
    }

    this.emit(RenderEventType.RENDER_START, undefined);
    const renderStartedAt = Date.now();

    // Clear drawing.
    this._context.clearRect(0, 0, this.width, this.height);
    this._context.save();

    if (DEBUG) {
      this._context.lineWidth = 3;
      this._context.fillStyle = DEBUG_RED;
      this._context.fillRect(0, 0, this.width, this.height);
    }

    // Apply any scaling (zoom) or translation (pan) transformations.
    this._context.translate(this.transform.x, this.transform.y);
    if (DEBUG) {
      this._context.fillStyle = DEBUG_BLUE;
      this._context.fillRect(0, 0, this.width, this.height);
    }

    this._context.scale(this.transform.k, this.transform.k);
    if (DEBUG) {
      this._context.fillStyle = DEBUG_GREEN;
      this._context.fillRect(0, 0, this.width, this.height);
    }

    // Move coordinates (0, 0) to canvas center.
    // Used in D3 graph, Map graph doesn't need centering.
    // This is only for display purposes, the simulation coordinates are still
    // relative to (0, 0), so any source mouse event position needs to take this
    // offset into account. (Handled in getMousePos())
    if (this._isOriginCentered) {
      this._context.translate(this.width / 2, this.height / 2);
    }
    if (DEBUG) {
      this._context.fillStyle = DEBUG_PINK;
      this._context.fillRect(0, 0, this.width, this.height);
    }

    this.drawObjects(graph.getEdges());
    this.drawObjects(graph.getNodes());

    this._context.restore();
    this.emit(RenderEventType.RENDER_END, { durationMs: Date.now() - renderStartedAt });
    this._isInitiallyRendered = true;
  }

  private drawObjects(objects: (INode<N, E> | IEdge<N, E>)[]) {
    if (objects.length === 0) {
      return;
    }

    const selectedObjects: (INode<N, E> | IEdge<N, E>)[] = [];
    const hoveredObjects: (INode<N, E> | IEdge<N, E>)[] = [];

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.isSelected()) {
        selectedObjects.push(obj);
      }
      if (obj.isHovered()) {
        hoveredObjects.push(obj);
      }
    }
    const hasStateChangedShapes = selectedObjects.length || hoveredObjects.length;

    if (this._settings.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      this._context.globalAlpha = this._settings.contextAlphaOnEvent;
    }

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (!obj.isSelected() && !obj.isHovered()) {
        this.drawObject(obj, {
          isLabelEnabled: this._settings.labelsIsEnabled,
          isShadowEnabled: this._settings.shadowIsEnabled,
        });
      }
    }

    if (this._settings.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      this._context.globalAlpha = 1;
    }

    for (let i = 0; i < selectedObjects.length; i++) {
      this.drawObject(selectedObjects[i], {
        isLabelEnabled: this._settings.labelsOnEventIsEnabled,
        isShadowEnabled: this._settings.shadowOnEventIsEnabled,
      });
    }
    for (let i = 0; i < hoveredObjects.length; i++) {
      this.drawObject(hoveredObjects[i], {
        isLabelEnabled: this._settings.labelsOnEventIsEnabled,
        isShadowEnabled: this._settings.shadowOnEventIsEnabled,
      });
    }
  }

  private drawObject(obj: INode<N, E> | IEdge<N, E>, options?: Partial<INodeDrawOptions> | Partial<IEdgeDrawOptions>) {
    if (isNode(obj)) {
      drawNode(this._context, obj, options);
    } else {
      drawEdge(this._context, obj, options);
    }
  }

  reset() {
    this.transform = zoomIdentity;

    // Clear drawing.
    this._context.clearRect(0, 0, this.width, this.height);
    this._context.save();
  }

  getFitZoomTransform(graph: IGraph<N, E>): ZoomTransform {
    // Graph view is a bounding box of the graph nodes that takes into
    // account node positions (x, y) and node sizes (style: size + border width)
    const graphView = graph.getBoundingBox();
    const graphMiddleX = graphView.x + graphView.width / 2;
    const graphMiddleY = graphView.y + graphView.height / 2;

    // Simulation view is actually a renderer view (canvas) but in the coordinate system of
    // the simulator: node position (x, y). We want to fit a graph view into a simulation view.
    const simulationView = this.getSimulationViewRectangle();

    const heightScale = simulationView.height / (graphView.height * (1 + this._settings.fitZoomMargin));
    const widthScale = simulationView.width / (graphView.width * (1 + this._settings.fitZoomMargin));
    // The scale of the translation and the zoom needed to fit a graph view
    // into a simulation view (renderer canvas)
    const scale = Math.min(heightScale, widthScale);

    const previousZoom = this.transform.k;
    const newZoom = Math.max(Math.min(scale * previousZoom, this._settings.maxZoom), this._settings.minZoom);
    // Translation is done in the following way for both coordinates:
    // - M = expected movement to the middle of the view (simulation width or height / 2)
    // - Z(-1) = previous zoom level
    // - S = scale to fit the graph view into simulation view
    // - Z(0) = new zoom level / Z(0) := S * Z(-1)
    // - GM = current middle coordinate of the graph view
    // Formula:
    // X/Y := M * Z(-1) - M * Z(-1) * Z(0) - GM * Z(0)
    // X/Y := M * Z(-1) * (1 - Z(0)) - GM * Z(0)
    const newX = (simulationView.width / 2) * previousZoom * (1 - newZoom) - graphMiddleX * newZoom;
    const newY = (simulationView.height / 2) * previousZoom * (1 - newZoom) - graphMiddleY * newZoom;

    return zoomIdentity.translate(newX, newY).scale(newZoom);
  }

  getSimulationPosition(canvasPoint: IPosition): IPosition {
    // By default, the canvas is translated by (width/2, height/2) to center the graph.
    // The simulation is not, it's starting coordinates are at (0, 0).
    // So any mouse click (C) needs to subtract that translation to match the
    // simulation coordinates (O) when dragging and hovering nodes.
    const [x, y] = this.transform.invert([canvasPoint.x, canvasPoint.y]);
    return {
      x: x - this.width / 2,
      y: y - this.height / 2,
    };
  }

  /**
   * Returns the visible rectangle view in the simulation coordinates.
   *
   * @return {IRectangle} Visible view in teh simulation coordinates
   */
  getSimulationViewRectangle(): IRectangle {
    const topLeftPosition = this.getSimulationPosition({ x: 0, y: 0 });
    const bottomRightPosition = this.getSimulationPosition({ x: this.width, y: this.height });
    return {
      x: topLeftPosition.x,
      y: topLeftPosition.y,
      width: bottomRightPosition.x - topLeftPosition.x,
      height: bottomRightPosition.y - topLeftPosition.y,
    };
  }

  translateOriginToCenter() {
    this._isOriginCentered = true;
  }
}
