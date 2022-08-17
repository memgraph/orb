import { ZoomTransform, zoomIdentity } from 'd3-zoom';
import { IPosition } from '../../common/position';
import { IRectangle } from '../../common/rectangle';
import { INode, INodeBase, isNode } from '../../models/node';
import { IEdge, IEdgeBase } from '../../models/edge';
import { IGraph } from '../../models/graph';
import { drawEdge, IEdgeDrawOptions } from './edge/index';
import { drawNode, INodeDrawOptions } from './node';

const DEBUG = false;
const DEBUG_RED = '#FF5733';
const DEBUG_GREEN = '#3CFF33';
const DEBUG_BLUE = '#3383FF';
const DEBUG_PINK = '#F333FF';

const DEFAULT_RENDERER_WIDTH = 640;
const DEFAULT_RENDERER_HEIGHT = 480;
const DEFAULT_RENDERER_FIT_ZOOM_MARGIN = 0.2;

export interface RendererFitZoomOptions {
  minZoom: number;
  maxZoom: number;
}

export interface IGraphDrawOptions {
  labelsIsEnabled: boolean;
  labelsOnEventIsEnabled: boolean;
  contextAlphaOnEvent: number;
  contextAlphaOnEventIsEnabled: boolean;
}

const DEFAULT_DRAW_OPTIONS: IGraphDrawOptions = {
  labelsIsEnabled: true,
  labelsOnEventIsEnabled: true,
  contextAlphaOnEvent: 0.3,
  contextAlphaOnEventIsEnabled: true,
};

export class Renderer {
  // Contains the HTML5 Canvas element which is used for drawing nodes and edges.
  protected readonly context: CanvasRenderingContext2D;

  // Width and height of the canvas. Used for clearing
  public width: number;
  public height: number;

  // Includes translation (pan) in the x and y direction
  // as well as scaling (level of zoom).
  public transform: ZoomTransform;

  // Translates (0, 0) coordinates to (width/2, height/2).
  protected isOriginCentered = false;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
    this.width = DEFAULT_RENDERER_WIDTH;
    this.height = DEFAULT_RENDERER_HEIGHT;
    this.transform = zoomIdentity;
  }

  render<N extends INodeBase, E extends IEdgeBase>(graph: IGraph<N, E>, drawOptions?: Partial<IGraphDrawOptions>) {
    if (!graph.getNodeCount()) {
      return;
    }

    // Clear drawing.
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();

    if (DEBUG) {
      this.context.lineWidth = 3;
      this.context.fillStyle = DEBUG_RED;
      this.context.fillRect(0, 0, this.width, this.height);
    }

    // Apply any scaling (zoom) or translation (pan) transformations.
    this.context.translate(this.transform.x, this.transform.y);
    if (DEBUG) {
      this.context.fillStyle = DEBUG_BLUE;
      this.context.fillRect(0, 0, this.width, this.height);
    }

    this.context.scale(this.transform.k, this.transform.k);
    if (DEBUG) {
      this.context.fillStyle = DEBUG_GREEN;
      this.context.fillRect(0, 0, this.width, this.height);
    }

    // Move coordinates (0, 0) to canvas center.
    // Used in D3 graph, Map graph doesn't need centering.
    // This is only for display purposes, the simulation coordinates are still
    // relative to (0, 0), so any source mouse event position needs to take this
    // offset into account. (Handled in getMousePos())
    if (this.isOriginCentered) {
      this.context.translate(this.width / 2, this.height / 2);
    }
    if (DEBUG) {
      this.context.fillStyle = DEBUG_PINK;
      this.context.fillRect(0, 0, this.width, this.height);
    }

    this.drawObjects<N, E>(graph.getEdges(), drawOptions);
    this.drawObjects<N, E>(graph.getNodes(), drawOptions);

    this.context.restore();
  }

  private drawObjects<N extends INodeBase, E extends IEdgeBase>(
    objects: (INode<N, E> | IEdge<N, E>)[],
    options?: Partial<IGraphDrawOptions>,
  ) {
    if (objects.length === 0) {
      return;
    }

    const drawOptions = Object.assign(DEFAULT_DRAW_OPTIONS, options);
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

    if (drawOptions.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      this.context.globalAlpha = drawOptions.contextAlphaOnEvent;
    }

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (!obj.isSelected() && !obj.isHovered()) {
        this.drawObject(obj, { isLabelEnabled: drawOptions.labelsIsEnabled });
      }
    }

    if (drawOptions.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      this.context.globalAlpha = 1;
    }

    for (let i = 0; i < selectedObjects.length; i++) {
      this.drawObject(selectedObjects[i], { isLabelEnabled: drawOptions.labelsOnEventIsEnabled });
    }
    for (let i = 0; i < hoveredObjects.length; i++) {
      this.drawObject(hoveredObjects[i], { isLabelEnabled: drawOptions.labelsOnEventIsEnabled });
    }
  }

  private drawObject<N extends INodeBase, E extends IEdgeBase>(
    obj: INode<N, E> | IEdge<N, E>,
    options?: Partial<INodeDrawOptions> | Partial<IEdgeDrawOptions>,
  ) {
    if (isNode(obj)) {
      drawNode(this.context, obj, options);
    } else {
      drawEdge(this.context, obj, options);
    }
  }

  reset() {
    this.transform = zoomIdentity;

    // Clear drawing.
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
  }

  getFitZoomTransform<N extends INodeBase, E extends IEdgeBase>(
    graph: IGraph<N, E>,
    options: RendererFitZoomOptions,
  ): ZoomTransform {
    const graphView = graph.getBoundingBox();
    const simulationView = this.getSimulationViewRectangle();

    const heightScale = simulationView.height / (graphView.height * (1 + DEFAULT_RENDERER_FIT_ZOOM_MARGIN));
    const widthScale = simulationView.width / (graphView.width * (1 + DEFAULT_RENDERER_FIT_ZOOM_MARGIN));
    const scale = Math.min(heightScale, widthScale);

    // TODO @toni: Add explanation why this works ok
    const previousZoomLevel = this.transform.k;
    const newZoomLevel = Math.max(Math.min(scale * previousZoomLevel, options.maxZoom), options.minZoom);
    const newX = (simulationView.width / 2) * previousZoomLevel * (1 - newZoomLevel);
    const newY = (simulationView.height / 2) * previousZoomLevel * (1 - newZoomLevel);

    return zoomIdentity.translate(newX, newY).scale(newZoomLevel);
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
    this.isOriginCentered = true;
  }
}
