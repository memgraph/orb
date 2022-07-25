import { ZoomTransform, zoomIdentity } from 'd3-zoom';
import { IPosition } from '../../common/position';
import { IRectangle } from '../../common/rectangle';
import { INodeBase } from '../../models/node';
import { IEdgeBase } from '../../models/edge';
import { Graph } from '../../models/graph';
import { NodeCanvas } from './node/base';
import { EdgeCanvas } from './edge/base';
import { EdgeCanvasFactory } from './edge/factory';
import { NodeCanvasFactory } from './node/factory';

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
    console.log('context', this.context);
  }

  render<N extends INodeBase, E extends IEdgeBase>(graph: Graph<N, E>, drawOptions?: Partial<IGraphDrawOptions>) {
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

    // TODO: Move to function
    const edges = graph.getEdges();
    const edgeObjects: EdgeCanvas<N, E>[] = new Array<EdgeCanvas<N, E>>(edges.length);
    for (let i = 0; i < edges.length; i++) {
      edgeObjects[i] = EdgeCanvasFactory.createEdgeCanvas<N, E>(edges[i]);
    }

    const nodes = graph.getNodes();
    const nodeObjects: NodeCanvas<N, E>[] = new Array<NodeCanvas<N, E>>(nodes.length);
    for (let i = 0; i < nodes.length; i++) {
      nodeObjects[i] = NodeCanvasFactory.createNodeCanvas<N, E>(nodes[i]);
    }

    this.drawObjects<N, E>(edgeObjects, drawOptions);
    this.drawObjects<N, E>(nodeObjects, drawOptions);
    console.log('rendered');

    this.context.restore();
  }

  private drawObjects<N extends INodeBase, E extends IEdgeBase>(
    objects: (NodeCanvas<N, E> | EdgeCanvas<N, E>)[],
    options?: Partial<IGraphDrawOptions>,
  ) {
    const drawOptions = Object.assign(DEFAULT_DRAW_OPTIONS, options);

    const selectedObjects: (NodeCanvas<N, E> | EdgeCanvas<N, E>)[] = [];
    const hoveredObjects: (NodeCanvas<N, E> | EdgeCanvas<N, E>)[] = [];

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.item.isSelected()) {
        selectedObjects.push(obj);
      }
      if (obj.item.isHovered()) {
        hoveredObjects.push(obj);
      }
    }
    const hasStateChangedShapes = selectedObjects.length || hoveredObjects.length;

    if (drawOptions.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      this.context.globalAlpha = drawOptions.contextAlphaOnEvent;
    }

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (!obj.item.isSelected() && !obj.item.isHovered()) {
        obj.draw(this.context, { isLabelEnabled: drawOptions.labelsIsEnabled });
      }
    }

    if (drawOptions.contextAlphaOnEventIsEnabled && hasStateChangedShapes) {
      this.context.globalAlpha = 1;
    }

    for (let i = 0; i < selectedObjects.length; i++) {
      selectedObjects[i].draw(this.context, { isLabelEnabled: drawOptions.labelsOnEventIsEnabled });
    }
    for (let i = 0; i < hoveredObjects.length; i++) {
      hoveredObjects[i].draw(this.context, { isLabelEnabled: drawOptions.labelsOnEventIsEnabled });
    }
  }

  reset() {
    this.transform = zoomIdentity;

    // Clear drawing.
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
  }

  getFitZoomTransform<N extends INodeBase, E extends IEdgeBase>(
    graph: Graph<N, E>,
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
