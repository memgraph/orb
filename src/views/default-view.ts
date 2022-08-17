import { D3DragEvent, drag } from 'd3-drag';
import { easeLinear } from 'd3-ease';
// @ts-ignore
import transition from 'd3-transition';
import { D3ZoomEvent, zoom, ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import { IPosition, isEqualPosition } from '../common/position';

import { IRendererSettings, Renderer } from '../renderer/canvas/renderer';
import { ISimulator, SimulatorFactory } from '../simulator/index';
import { Graph } from '../models/graph';
import { INodeBase, Node } from '../models/node';
import { Edge, IEdgeBase } from '../models/edge';
import { OrbEmitter, OrbEventType, IOrbView, IViewContext } from '../orb';
import { IEventStrategy } from '../models/strategy';
import { ID3SimulatorEngineSettingsUpdate } from '../simulator/engine/d3-simulator-engine';
import { copyObject } from '../utils/object.utils';

// TODO: Move to settings all these five
const DISABLE_OUT_OF_BOUNDS_DRAG = true;
const ROUND_COORDINATES = true;
const ZOOM_FIT_TRANSITION_MS = 200;

export interface IDefaultViewSettings<N extends INodeBase, E extends IEdgeBase> {
  getPosition?(node: Node<N, E>): IPosition | undefined;
  simulation: ID3SimulatorEngineSettingsUpdate;
  render: Partial<IRendererSettings>;
}

export class DefaultView<N extends INodeBase, E extends IEdgeBase> implements IOrbView {
  private _container: HTMLElement;
  private _graph: Graph<N, E>;
  private _events: OrbEmitter<N, E>;
  private _strategy: IEventStrategy<N, E>;
  private _settings: IDefaultViewSettings<N, E>;

  private _canvas: HTMLCanvasElement;
  private _context: CanvasRenderingContext2D | null;

  private _renderer: Renderer;
  private simulator: ISimulator;

  private _isSimulating = false;
  private _onSimulationEnd: (() => void) | undefined;

  private d3Zoom: ZoomBehavior<HTMLCanvasElement, any>;

  private dragStartPosition: IPosition | undefined;

  constructor(context: IViewContext<N, E>, settings?: Partial<IDefaultViewSettings<N, E>>) {
    this._container = context.container;
    this._graph = context.graph;
    this._events = context.events;
    this._strategy = context.strategy;

    this._settings = {
      getPosition: settings?.getPosition,
      simulation: {
        isPhysicsEnabled: false,
        ...settings?.simulation,
      },
      render: {
        ...settings?.render,
      },
    };

    this._container.textContent = '';
    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'absolute';
    this._container.appendChild(this._canvas);

    // Get the 2d rendering context which is used by D3 in the Renderer.
    this._context = this._canvas.getContext('2d') || new CanvasRenderingContext2D(); // TODO: how to handle functions that return null?

    // Resize the canvas based on the dimensions of it's parent container <div>.
    const resizeObs = new ResizeObserver(this.onContainerResize);
    resizeObs.observe(this._container);

    this._renderer = new Renderer(this._context, this._settings.render);
    this._renderer.translateOriginToCenter();
    this._settings.render = this._renderer.settings;

    this.d3Zoom = zoom<HTMLCanvasElement, any>()
      .scaleExtent([this._renderer.settings.minZoom, this._renderer.settings.maxZoom])
      .on('zoom', this.zoomed);

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
      },
      onStabilizationProgress: (data) => {
        this._graph.setNodePositions(data.nodes);
        this._events.emit(OrbEventType.SIMULATION_STEP, { progress: data.progress });
      },
      onStabilizationEnd: (data) => {
        this._graph.setNodePositions(data.nodes);
        this._renderer.render(this._graph);
        this._isSimulating = false;
        this._onSimulationEnd?.();
      },
      onNodeDrag: (data) => {
        // Node dragging does not trigger a user blocking percentage loader.
        this._graph.setNodePositions(data.nodes);
        this._renderer.render(this._graph);

        // (old)
        // this.graph?.setNodePositions(data.nodes);
        // this.renderThrottle_.next();
      },
      onSettingsUpdate: (data) => {
        this._settings.simulation = data.settings;
        // TODO: Send event to the user so user can handle this if needed
        // TODO: Do we need to call .render() here or user should take care of it
      },
    });

    this.simulator.setSettings(this._settings.simulation);
  }

  get settings(): IDefaultViewSettings<N, E> {
    return copyObject(this._settings);
  }

  render(onRendered?: () => void) {
    if (this._isSimulating) {
      this._renderer.render(this._graph);
      onRendered?.();
      return;
    }

    if (this._settings.getPosition) {
      const nodes = this._graph.getNodes();
      for (let i = 0; i < nodes.length; i++) {
        const position = this._settings.getPosition(nodes[i]);
        if (position) {
          nodes[i].position = { id: nodes[i].id, ...position };
        }
      }
    }

    this._isSimulating = true;
    this._onSimulationEnd = onRendered;
    this.startSimulation();
  }

  recenter(onRendered?: () => void) {
    const fitZoomTransform = this._renderer.getFitZoomTransform(this._graph);

    select(this._canvas)
      .transition()
      .duration(ZOOM_FIT_TRANSITION_MS)
      .ease(easeLinear)
      .call(this.d3Zoom.transform, fitZoomTransform)
      .call(() => {
        this._renderer.render(this._graph);
        onRendered?.();
      });
  }

  destroy() {
    this._container.textContent = '';
  }

  change(settings: Partial<IDefaultViewSettings<N, E>>) {
    if (settings.getPosition) {
      this._settings.getPosition = settings.getPosition;
    }

    if (settings.simulation) {
      this._settings.simulation = {
        ...this._settings.simulation,
        ...settings.simulation,
      };
      this.simulator.setSettings(this._settings.simulation);
    }

    if (settings.render) {
      this._renderer.settings = {
        ...this._renderer.settings,
        ...settings.render,
      };
      this._settings.render = this._renderer.settings;
    }
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
