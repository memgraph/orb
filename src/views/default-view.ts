import { D3DragEvent, drag } from 'd3-drag';
import { easeLinear } from 'd3-ease';
import transition from 'd3-transition';
import { D3ZoomEvent, zoom, ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import { IPosition, isEqualPosition } from '../common/position';

import { Renderer } from '../renderer/canvas/renderer';
import { ISimulator, SimulatorFactory } from '../simulator/index';
import { Graph } from '../models/graph';
import { INodeBase, Node } from '../models/node';
import { Edge, IEdgeBase } from '../models/edge';
import { OrbEmitter, OrbEventType, IOrbView, IViewContext } from '../orb';
import { IEventStrategy } from '../models/strategy';
import { INodePosition } from '../../dist/models/node';

const DISABLE_OUT_OF_BOUNDS_DRAG = true;
const ROUND_COORDINATES = true;
const ZOOM_SCALE_MAX = 8;
const ZOOM_SCALE_MIN = 0.25;
const ZOOM_FIT_TRANSITION_MS = 200;
// const THROTTLE_TIME = 10;

export interface IDefaultViewSettings<N extends INodeBase, E extends IEdgeBase> {
  getPosition(node: Node<N, E>): IPosition;
  zoomLevel?: number;
}

export class DefaultView<N extends INodeBase, E extends IEdgeBase> implements IOrbView {
  private _container: HTMLElement;
  private _graph: Graph<N, E>;
  private _events: OrbEmitter<N, E>;
  private _strategy: IEventStrategy<N, E>;

  private _canvas: HTMLCanvasElement;
  private _context: CanvasRenderingContext2D | null;

  private _renderer: Renderer;
  private simulator: ISimulator;

  private isPhysicsEnabled = true;

  private d3Zoom: ZoomBehavior<HTMLCanvasElement, any>;

  private dragStartPosition: IPosition | undefined;

  private isRendering = false;

  constructor(context: IViewContext<N, E>, private settings?: IDefaultViewSettings<N, E>) {
    this._container = context.container;
    this._graph = context.graph;
    this._events = context.events;
    this._strategy = context.strategy;

    this._container.textContent = '';
    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'absolute';
    this._container.appendChild(this._canvas);

    // Get the 2d rendering context which is used by D3 in the Renderer.
    this._context = this._canvas.getContext('2d') || new CanvasRenderingContext2D(); // TODO: how to handle functions that return null?

    // Resize the canvas based on the dimensions of it's parent container <div>.
    const resizeObs = new ResizeObserver(this.onContainerResize);
    resizeObs.observe(this._container);

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
        this._events.emit(OrbEventType.SIMULATION_START, undefined);
        // this.isUpdatingGraph_.next(true);
        // this.isLabelRendered_.next(false);
        // this.stabilizationProgress_.next(0);
      },
      onStabilizationProgress: (data) => {
        this._graph.setNodePositions(data.nodes);
        this._events.emit(OrbEventType.SIMULATION_STEP, { progress: data.progress });

        this._renderer.render(this._graph);
        // TODO: Move to proper position
        this._events.emit(OrbEventType.RENDER_END, undefined);

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
        this._graph.setNodePositions(data.nodes);

        // this.isLabelRendered_.next(true);
        // Reset progress.
        // this.isUpdatingGraph_.next(false);
        // this.stabilizationProgress_.next(null);
      },
      onNodeDrag: (data) => {
        // Node dragging does not trigger a user blocking percentage loader.
        this._graph.setNodePositions(data.nodes);
        this._renderer.render(this._graph);

        // (old)
        // this.graph?.setNodePositions(data.nodes);
        // this.renderThrottle_.next();
      },
      onSettingsUpdate: (_) => {
        if (this._graph && !this.isPhysicsEnabled) {
          // this.simulator.startSimulation(this._graph.getNodePositions(), this._graph.getEdgePositions());
          this.render();
        }
      },
    });
  }

  render(onRendered?: () => void) {
    if (this.isRendering) {
      return;
    }
    this.isRendering = true;

    if (this.settings?.getPosition) {
      const nodePositions: INodePosition[] = [];
      const nodes = this._graph.getNodes();

      for (let i = 0; i < nodes.length; i++) {
        const position = this.settings?.getPosition(nodes[i]);
        if (!position) {
          continue;
        }
        // TODO: Is this neccessary?
        if (typeof position.x !== 'number' || typeof position.y !== 'number') {
          continue;
        }
        nodePositions.push({
          id: nodes[i].id,
          ...this.settings?.getPosition(nodes[i]),
        });
      }

      this._graph.setNodePositions(nodePositions);
    }

    this.startSimulation();

    this._renderer.render(this._graph);

    if (onRendered) {
      onRendered();
    }
    this.isRendering = false;
  }

  recenter() {
    const fitZoomTransform = this._renderer.getFitZoomTransform(this._graph, {
      minZoom: ZOOM_SCALE_MIN,
      maxZoom: ZOOM_SCALE_MAX,
    });

    select(this._canvas)
      .transition()
      .duration(ZOOM_FIT_TRANSITION_MS)
      .ease(easeLinear)
      .call(this.d3Zoom.transform, fitZoomTransform)
      .call(() => {
        this._renderer.render(this._graph);
        // this.renderImmediate_.next()
      });
  }

  destroy() {
    this._container.textContent = '';
  }

  dragSubject = (event: D3DragEvent<any, any, N>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
    const simulationPoint = this._renderer?.getSimulationPosition(mousePoint);

    return this._graph.getNearestNode(simulationPoint);
  };

  dragStarted = (event: D3DragEvent<any, any, N>) => {
    // Used to detect a click event in favor of a drag event.
    // A click is when the drag start and end coordinates are identical.
    this.dragStartPosition = this.getCanvasMousePosition(event.sourceEvent);
  };

  dragged = (event: D3DragEvent<any, any, N>) => {
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

  dragEnded = (event: D3DragEvent<any, any, N>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);

    if (!isEqualPosition(this.dragStartPosition, mousePoint)) {
      this.simulator.endDragNode(event.subject.id);
    }
  };

  zoomed = (event: D3ZoomEvent<any, any>) => {
    // this.transform_.next(event.transform);
    this._renderer.transform = event.transform;
    setTimeout(() => {
      this._renderer.render(this._graph);
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

  mouseMoved = (event: MouseEvent) => {
    const mousePoint = this.getCanvasMousePosition(event);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);
    // TODO: Add throttle
    // This was a subject before, now I've handled it right here.
    // this.hoverMousePosition_.next(mousePoint);

    if (this._strategy.onMouseMove) {
      const response = this._strategy.onMouseMove(this._graph, simulationPoint);
      const subject = response.changedSubject;

      if (subject) {
        if (subject instanceof Node) {
          this._events.emit(OrbEventType.NODE_HOVER, {
            node: subject,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
        if (subject instanceof Edge) {
          this._events.emit(OrbEventType.EDGE_HOVER, {
            edge: subject,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
      }

      this._events.emit(OrbEventType.MOUSE_MOVE, { subject, localPoint: simulationPoint, globalPoint: mousePoint });

      if (response.isStateChanged || response.changedSubject) {
        this._renderer.render(this._graph);
      }
    }
  };

  mouseClicked = (event: PointerEvent) => {
    const mousePoint = this.getCanvasMousePosition(event);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    if (this._strategy.onMouseClick) {
      const response = this._strategy.onMouseClick(this._graph, simulationPoint);
      const subject = response.changedSubject;

      if (subject) {
        if (subject instanceof Node) {
          this._events.emit(OrbEventType.NODE_CLICK, {
            node: subject,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
        if (subject instanceof Edge) {
          this._events.emit(OrbEventType.EDGE_CLICK, {
            edge: subject,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
      }

      this._events.emit(OrbEventType.MOUSE_CLICK, { subject, localPoint: simulationPoint, globalPoint: mousePoint });

      if (response.isStateChanged || response.changedSubject) {
        this._renderer.render(this._graph);
      }
    }
  };

  onContainerResize = () => {
    const containerSize = this._container.getBoundingClientRect();
    this._canvas.width = containerSize.width;
    this._canvas.height = containerSize.height;
    this._renderer.width = containerSize.width;
    this._renderer.height = containerSize.height;
    this._renderer.render(this._graph);
  };

  startSimulation() {
    // this._renderer.reset();
    const nodePositions = this._graph.getNodePositions();
    const edgePositions = this._graph.getEdgePositions();

    this.simulator.updateData(nodePositions, edgePositions);
    this.simulator.simulate();
  }

  fixNodes() {
    this.simulator.fixNodes();
  }

  releaseNodes() {
    this.simulator.releaseNodes();
  }
}
