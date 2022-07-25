import { D3DragEvent, drag } from 'd3-drag';
import { D3ZoomEvent, zoom, ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import { IPosition, isEqualPosition } from '../common/position';

import { Renderer } from '../renderer/canvas/renderer';
import { ISimulator, SimulatorFactory } from '../simulator/index';
import { Graph, IGraphData } from '../models/graph';

const DISABLE_OUT_OF_BOUNDS_DRAG = true;
const ROUND_COORDINATES = true;
const ZOOM_SCALE_MAX = 8;
const ZOOM_SCALE_MIN = 0.25;
// const ZOOM_FIT_TRANSITION_MS = 200;
// const THROTTLE_TIME = 10;

interface DefaultViewNode {
  id: number;
  labels: string[];
  properties: Record<string, any>;
}

interface DefaultViewEdge {
  id: number;
  start: number;
  end: number;
  label: string;
  properties: Record<string, any>;
}

export interface IGraphResult {
  graph: Graph<DefaultViewNode, DefaultViewEdge>;
  isUpdated?: boolean;
}

export class DefaultView {
  private graphData: IGraphData<DefaultViewNode, DefaultViewEdge> = {
    nodes: [
      { id: 0, labels: ['Node A'], properties: { test: 1 } },
      { id: 1, labels: ['Node B'], properties: { test: 2 } },
      { id: 2, labels: ['Node C'], properties: { test: 3 } },
    ],
    edges: [
      { id: 3, start: 0, end: 0, label: 'Edge Q', properties: { test: 3 } },
      { id: 3, start: 0, end: 1, label: 'Edge W', properties: { test: 3 } },
      { id: 4, start: 0, end: 2, label: 'Edge E', properties: { test: 3 } },
      { id: 5, start: 1, end: 1, label: 'Edge R', properties: { test: 3 } },
      { id: 5, start: 1, end: 2, label: 'Edge T', properties: { test: 3 } },
      { id: 6, start: 2, end: 2, label: 'Edge Y', properties: { test: 3 } },
    ],
  };

  private graph = new Graph(this.graphData);

  private _canvas: HTMLCanvasElement;
  private _context: CanvasRenderingContext2D | null;

  private _renderer: Renderer;
  private simulator: ISimulator;

  private isInitiallyZoomed = false;
  private isPhysicsEnabled = false;

  private d3Zoom: ZoomBehavior<HTMLCanvasElement, any>;

  private dragStartPosition: IPosition | undefined;

  private graphResult: IGraphResult | undefined;

  constructor(private container: HTMLElement) {
    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'absolute';
    this.container.appendChild(this._canvas);

    // Get the 2d rendering context which is used by D3 in the Renderer.
    this._context = this._canvas.getContext('2d') || new CanvasRenderingContext2D(); // TODO: how to handle functions that return null?

    // Resize the canvas based on the dimensions of it's parent container <div>.
    const resizeObs = new ResizeObserver(this.onContainerResize);
    resizeObs.observe(this.container);

    this._renderer = new Renderer(this._context);
    this._renderer.translateOriginToCenter();

    this.d3Zoom = zoom<HTMLCanvasElement, any>().scaleExtent([ZOOM_SCALE_MIN, ZOOM_SCALE_MAX]).on('zoom', this.zoomed);

    select<HTMLCanvasElement, any>(this._canvas)
      .call(
        drag<HTMLCanvasElement, any>()
          .container(this._canvas)
          .subject(this.dragSubject)
          .on('start', this.dragStarted)
          .on('drag', this.dragged)
          .on('end', this.dragEnded),
      )
      .call(this.d3Zoom)
      .on('click', this.mouseClicked)
      .on('mousemove', this.mouseMoved);

    this.simulator = SimulatorFactory.getSimulator({
      onStabilizationStart: () => {
        // this.isUpdatingGraph_.next(true);
        // this.isLabelRendered_.next(false);
        // this.stabilizationProgress_.next(0);
      },
      onStabilizationProgress: (data) => {
        console.log('stabilization progress', data);
        const nodes = data.nodes
          .filter((node) => node.x && node.y)
          .map((node) => ({
            id: node.id,
            x: node.x || 0,
            y: node.y || 0,
          }));
        this.graph.setNodePositions(nodes);

        console.log('renderer', this._renderer);
        setTimeout(() => {
          // this._canvas.getContext('2d')?.fillRect(0, 0, 400, 400);
          this._renderer.render(this.graph);
        }, 0);

        // Only for physics stabilization events which block the user interaction.
        // (temporarily disabling drag)
        /*
        this.stabilizationProgress_.next(data.progress);
        */

        // Tick marks the physics simulation steps.
        // So only render each step if the flag is enabled.
        /*
        if (this.showStabilization) {
          this.renderThrottle_.next();
        }
        */
      },
      onStabilizationEnd: (data) => {
        console.log('stabilization end', data);
        const nodes = data.nodes
          .filter((node) => node.x && node.y)
          .map((node) => ({
            id: node.id,
            x: node.x || 0,
            y: node.y || 0,
          }));
        this.graph.setNodePositions(nodes);

        // this.isLabelRendered_.next(true);

        if (!this.isInitiallyZoomed && this.graph && !!this.graphResult && !this.graphResult.isUpdated) {
          const fitZoomTransform = this._renderer.getFitZoomTransform(this.graph, {
            minZoom: ZOOM_SCALE_MIN,
            maxZoom: ZOOM_SCALE_MAX,
          });
          console.log('fitZoomTransform', fitZoomTransform);
          this.isInitiallyZoomed = true;

          /*
          select(this._canvas)
            .transition()
            .duration(ZOOM_FIT_TRANSITION_MS)
            .ease(d3.easeLinear)
            .call(this.d3Zoom.transform, fitZoomTransform)
            .call(() => {
              // this.renderImmediate_.next()
            });
            */
        } else {
          // this.renderImmediate_.next();
        }

        // Reset progress.
        // this.isUpdatingGraph_.next(false);
        // this.stabilizationProgress_.next(null);
      },
      onNodeDrag: (data) => {
        // Node dragging does not trigger a user blocking percentage loader.
        console.log('node drag', data);
        const nodes = data.nodes
          .filter((node) => node.x && node.y)
          .map((node) => ({
            id: node.id,
            x: node.x || 0,
            y: node.y || 0,
          }));
        this.graph.setNodePositions(nodes);

        // (old)
        // this.graph?.setNodePositions(data.nodes);
        // this.renderThrottle_.next();
      },
      onSettingsUpdate: (_) => {
        if (this.graph && !this.isPhysicsEnabled) {
          this.simulator.startSimulation(this.graph.getNodePositions(), this.graph.getEdgePositions());
        }
      },
    });
    this.startSimulation(this.graphData);
  }

  dragSubject = (event: D3DragEvent<any, any, DefaultViewNode>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
    const simulationPoint = this._renderer?.getSimulationPosition(mousePoint);
    console.log('dragSubject', this.graph?.getNearestNode(simulationPoint));

    return this.graph?.getNearestNode(simulationPoint);
  };

  dragStarted = (event: D3DragEvent<any, any, DefaultViewNode>) => {
    // Used to detect a click event in favor of a drag event.
    // A click is when the drag start and end coordinates are identical.
    this.dragStartPosition = this.getCanvasMousePosition(event.sourceEvent);
  };

  dragged = (event: D3DragEvent<any, any, DefaultViewNode>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
    const simulationPoint = this._renderer?.getSimulationPosition(mousePoint);

    // A drag event de-selects the node, while a click event selects it.
    if (!isEqualPosition(this.dragStartPosition, mousePoint)) {
      // this.selectedShape_.next(null);
      // this.selectedShapePosition_.next(null);
      this.dragStartPosition = undefined;
    }

    this.simulator.dragNode(event.subject.id, simulationPoint);
  };

  dragEnded = (event: D3DragEvent<any, any, DefaultViewNode>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);

    if (!isEqualPosition(this.dragStartPosition, mousePoint)) {
      this.simulator.endDragNode(event.subject.id);
    }
  };

  zoomed = (event: D3ZoomEvent<any, any>) => {
    // this.transform_.next(event.transform);
    this._renderer.transform = event.transform;
    setTimeout(() => {
      this._renderer.render(this.graph);
    }, 1);
    // this.renderThrottle_.next();
    // this.selectedShape_.next(null);
  };

  getCanvasMousePosition(event: MouseEvent): IPosition {
    const rect = this._canvas.getBoundingClientRect();
    let x = event.clientX ?? event.pageX ?? event.x;
    let y = event.clientY ?? event.pageY ?? event.y;

    // Cursor x and y positions relative to the top left corner of the canvas element.
    x = x - rect.left;
    y = y - rect.top;

    // Improve performance by rounding the canvas coordinates to avoid aliasing.
    if (ROUND_COORDINATES) {
      x = Math.floor(x);
      y = Math.floor(y);
    }

    // Disable dragging nodes outside of the canvas borders.
    if (DISABLE_OUT_OF_BOUNDS_DRAG) {
      x = Math.max(0, Math.min(this._renderer.width, x));
      y = Math.max(0, Math.min(this._renderer.height, y));
    }

    return { x, y };
  }

  // mouseMoved = (event: MouseEvent) => {
  mouseMoved = () => {
    // const mousePoint = this.getCanvasMousePosition(event);
    // this.hoverMousePosition_.next(mousePoint);
  };

  mouseClicked = (event: PointerEvent) => {
    const mousePoint = this.getCanvasMousePosition(event);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    console.log('mouse click', this.graph);
    if (!this.graph) {
      return;
    }

    const node = this.graph.getNearestNode(simulationPoint);
    if (node) {
      this.graph?.selectNode(node);
      // this.renderImmediate_.next();
      // this.selectedShape_.next(node);
      // this.selectedShapePosition_.next(mousePoint);
      return;
    }

    // If node is not selected, check the edge! (just for render)
    const edge = this.graph.getNearestEdge(simulationPoint);
    if (edge) {
      this.graph?.selectEdge(edge);
      // this.renderImmediate_.next();
      // this.selectedShape_.next(edge);
      // this.selectedShapePosition_.next(mousePoint);
      return;
    }

    const { changedCount } = this.graph.unselectAll();
    if (changedCount > 0) {
      // this.renderThrottle_.next();
      // this.selectedShape_.next(null);
      // this.selectedShapePosition_.next(null);
    }
  };

  onContainerResize = () => {
    const containerSize = this.container.getBoundingClientRect();
    this._canvas.width = containerSize.width;
    this._canvas.height = containerSize.height;
    console.log('setting width height', this._canvas.width, this._canvas.height);
  };

  setGraphResult(graphResult: IGraphResult) {
    this.graphResult = graphResult;
  }

  startSimulation(graph: IGraphData<DefaultViewNode, DefaultViewEdge>) {
    this.graph = new Graph(graph);
    this.isInitiallyZoomed = false;
    this._renderer.reset();
    this.simulator.startSimulation(this.graph.getNodePositions(), this.graph.getEdgePositions());
  }
}
