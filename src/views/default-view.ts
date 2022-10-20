import { D3DragEvent, drag } from 'd3-drag';
import { easeLinear } from 'd3-ease';
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore: Transition needs to be imported in order to be available to d3
import transition from 'd3-transition';
/* eslint-enable @typescript-eslint/no-unused-vars */
import { D3ZoomEvent, zoom, ZoomBehavior } from 'd3-zoom';
import { select } from 'd3-selection';
import { IPosition, isEqualPosition } from '../common';
import { ISimulator, SimulatorFactory } from '../simulator';
import { IGraph } from '../models/graph';
import { INode, INodeBase, isNode } from '../models/node';
import { IEdgeBase, isEdge } from '../models/edge';
import { IOrbView, IOrbViewContext } from './shared';
import { IEventStrategy } from '../models/strategy';
import { ID3SimulatorEngineSettingsUpdate } from '../simulator/engine/d3-simulator-engine';
import { copyObject } from '../utils/object.utils';
import { OrbEmitter, OrbEventType } from '../events';
import { IRenderer, RenderEventType, IRendererSettingsInit, IRendererSettings } from '../renderer/shared';
import { RendererFactory } from '../renderer/factory';
import { setupContainer } from '../utils/html.utils';
import { SimulatorEventType } from '../simulator/shared';

export interface IDefaultViewSettings<N extends INodeBase, E extends IEdgeBase> {
  getPosition?(node: INode<N, E>): IPosition | undefined;
  simulation: ID3SimulatorEngineSettingsUpdate;
  render: Partial<IRendererSettings>;
  zoomFitTransitionMs: number;
  isOutOfBoundsDragEnabled: boolean;
  areCoordinatesRounded: boolean;
  isSimulationAnimated: boolean;
  areCollapsedContainerDimensionsAllowed: boolean;
}

export type IDefaultViewSettingsInit<N extends INodeBase, E extends IEdgeBase> = Omit<
  Partial<IDefaultViewSettings<N, E>>,
  'render'
> & { render?: Partial<IRendererSettingsInit> };

export class DefaultView<N extends INodeBase, E extends IEdgeBase> implements IOrbView<IDefaultViewSettings<N, E>> {
  private _container: HTMLElement;
  private _graph: IGraph<N, E>;
  private _events: OrbEmitter<N, E>;
  private _strategy: IEventStrategy<N, E>;
  private _settings: IDefaultViewSettings<N, E>;
  private _canvas: HTMLCanvasElement;

  private readonly _renderer: IRenderer<N, E>;
  private readonly _simulator: ISimulator;

  private _isSimulating = false;
  private _onSimulationEnd: (() => void) | undefined;
  private _simulationStartedAt = Date.now();
  private _d3Zoom: ZoomBehavior<HTMLCanvasElement, any>;
  private _dragStartPosition: IPosition | undefined;

  constructor(context: IOrbViewContext<N, E>, settings?: Partial<IDefaultViewSettingsInit<N, E>>) {
    this._container = context.container;
    this._graph = context.graph;
    this._events = context.events;
    this._strategy = context.strategy;

    this._settings = {
      getPosition: settings?.getPosition,
      zoomFitTransitionMs: 200,
      isOutOfBoundsDragEnabled: false,
      areCoordinatesRounded: true,
      isSimulationAnimated: true,
      areCollapsedContainerDimensionsAllowed: false,
      ...settings,
      simulation: {
        isPhysicsEnabled: false,
        ...settings?.simulation,
      },
      render: {
        ...settings?.render,
      },
    };

    setupContainer(this._container, this._settings.areCollapsedContainerDimensionsAllowed);
    this._canvas = this._initCanvas();

    try {
      this._renderer = RendererFactory.getRenderer<N, E>(this._canvas, settings?.render?.type, this._settings.render);
    } catch (error: any) {
      this._container.textContent = error.message;
      throw error;
    }
    this._renderer.on(RenderEventType.RENDER_START, () => {
      this._events.emit(OrbEventType.RENDER_START, undefined);
    });
    this._renderer.on(RenderEventType.RENDER_END, (data) => {
      this._events.emit(OrbEventType.RENDER_END, data);
    });
    this._renderer.translateOriginToCenter();
    this._settings.render = this._renderer.getSettings();

    // Resize the canvas based on the dimensions of its parent container <div>.
    const resizeObs = new ResizeObserver(() => this._handleResize());
    resizeObs.observe(this._container);
    this._handleResize();

    this._d3Zoom = zoom<HTMLCanvasElement, any>()
      .scaleExtent([this._renderer.getSettings().minZoom, this._renderer.getSettings().maxZoom])
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
      .call(this._d3Zoom)
      .on('click', this.mouseClicked)
      .on('mousemove', this.mouseMoved);

    this._simulator = SimulatorFactory.getSimulator();
    this._simulator.on(SimulatorEventType.SIMULATION_START, () => {
      this._isSimulating = true;
      this._simulationStartedAt = Date.now();
      this._events.emit(OrbEventType.SIMULATION_START, undefined);
    });
    this._simulator.on(SimulatorEventType.SIMULATION_PROGRESS, (data) => {
      this._graph.setNodePositions(data.nodes);
      this._events.emit(OrbEventType.SIMULATION_STEP, { progress: data.progress });
      if (this._settings.isSimulationAnimated) {
        this._renderer.render(this._graph);
      }
    });
    this._simulator.on(SimulatorEventType.SIMULATION_END, (data) => {
      this._graph.setNodePositions(data.nodes);
      this._renderer.render(this._graph);
      this._isSimulating = false;
      this._onSimulationEnd?.();
      this._onSimulationEnd = undefined;
      this._events.emit(OrbEventType.SIMULATION_END, { durationMs: Date.now() - this._simulationStartedAt });
    });
    this._simulator.on(SimulatorEventType.NODE_DRAG, (data) => {
      this._graph.setNodePositions(data.nodes);
      this._renderer.render(this._graph);
    });
    this._simulator.on(SimulatorEventType.SETTINGS_UPDATE, (data) => {
      this._settings.simulation = data.settings;
    });

    this._simulator.setSettings(this._settings.simulation);
  }

  isInitiallyRendered(): boolean {
    return this._renderer.isInitiallyRendered;
  }

  getSettings(): IDefaultViewSettings<N, E> {
    return copyObject(this._settings);
  }

  setSettings(settings: Partial<IDefaultViewSettings<N, E>>) {
    if (settings.getPosition) {
      this._settings.getPosition = settings.getPosition;
    }

    if (settings.simulation) {
      this._settings.simulation = {
        ...this._settings.simulation,
        ...settings.simulation,
      };
      this._simulator.setSettings(this._settings.simulation);
    }

    if (settings.render) {
      this._renderer.setSettings(settings.render);
      this._settings.render = this._renderer.getSettings();
    }
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
    this._startSimulation();
  }

  recenter(onRendered?: () => void) {
    const fitZoomTransform = this._renderer.getFitZoomTransform(this._graph);

    select(this._canvas)
      .transition()
      .duration(this._settings.zoomFitTransitionMs)
      .ease(easeLinear)
      .call(this._d3Zoom.transform, fitZoomTransform)
      .call(() => {
        this._renderer.render(this._graph);
        onRendered?.();
      });
  }

  destroy() {
    this._renderer.removeAllListeners();
    this._simulator.terminate();
    this._canvas.outerHTML = '';
  }

  dragSubject = (event: D3DragEvent<any, MouseEvent, INode<N, E>>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
    const simulationPoint = this._renderer?.getSimulationPosition(mousePoint);
    return this._graph.getNearestNode(simulationPoint);
  };

  dragStarted = (event: D3DragEvent<any, any, INode<N, E>>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    this._events.emit(OrbEventType.NODE_DRAG_START, {
      node: event.subject,
      event: event.sourceEvent,
      localPoint: simulationPoint,
      globalPoint: mousePoint,
    });
    // Used to detect a click event in favor of a drag event.
    // A click is when the drag start and end coordinates are identical.
    this._dragStartPosition = mousePoint;
  };

  dragged = (event: D3DragEvent<any, any, INode<N, E>>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    // A drag event de-selects the node, while a click event selects it.
    if (!isEqualPosition(this._dragStartPosition, mousePoint)) {
      this._dragStartPosition = undefined;
    }

    this._simulator.dragNode(event.subject.id, simulationPoint);
    this._events.emit(OrbEventType.NODE_DRAG, {
      node: event.subject,
      event: event.sourceEvent,
      localPoint: simulationPoint,
      globalPoint: mousePoint,
    });
  };

  dragEnded = (event: D3DragEvent<any, any, INode<N, E>>) => {
    const mousePoint = this.getCanvasMousePosition(event.sourceEvent);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    if (!isEqualPosition(this._dragStartPosition, mousePoint)) {
      this._simulator.endDragNode(event.subject.id);
    }

    this._events.emit(OrbEventType.NODE_DRAG_END, {
      node: event.subject,
      event: event.sourceEvent,
      localPoint: simulationPoint,
      globalPoint: mousePoint,
    });
  };

  zoomed = (event: D3ZoomEvent<any, any>) => {
    this._renderer.transform = event.transform;
    setTimeout(() => {
      this._renderer.render(this._graph);
      this._events.emit(OrbEventType.TRANSFORM, { transform: event.transform });
    }, 1);
  };

  getCanvasMousePosition(event: MouseEvent): IPosition {
    const rect = this._canvas.getBoundingClientRect();
    let x = event.clientX ?? event.pageX ?? event.x;
    let y = event.clientY ?? event.pageY ?? event.y;

    // Cursor x and y positions relative to the top left corner of the canvas element.
    x = x - rect.left;
    y = y - rect.top;

    // Improve performance by rounding the canvas coordinates to avoid aliasing.
    if (this._settings.areCoordinatesRounded) {
      x = Math.floor(x);
      y = Math.floor(y);
    }

    // Disable dragging nodes outside of the canvas borders.
    if (!this._settings.isOutOfBoundsDragEnabled) {
      x = Math.max(0, Math.min(this._renderer.width, x));
      y = Math.max(0, Math.min(this._renderer.height, y));
    }

    return { x, y };
  }

  mouseMoved = (event: MouseEvent) => {
    const mousePoint = this.getCanvasMousePosition(event);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    if (this._strategy.onMouseMove) {
      const response = this._strategy.onMouseMove(this._graph, simulationPoint);
      const subject = response.changedSubject;

      if (subject && response.isStateChanged) {
        if (isNode(subject)) {
          this._events.emit(OrbEventType.NODE_HOVER, {
            node: subject,
            event,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
        if (isEdge(subject)) {
          this._events.emit(OrbEventType.EDGE_HOVER, {
            edge: subject,
            event,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
      }

      this._events.emit(OrbEventType.MOUSE_MOVE, {
        subject,
        event,
        localPoint: simulationPoint,
        globalPoint: mousePoint,
      });

      if (response.isStateChanged) {
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
        if (isNode(subject)) {
          this._events.emit(OrbEventType.NODE_CLICK, {
            node: subject,
            event,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
        if (isEdge(subject)) {
          this._events.emit(OrbEventType.EDGE_CLICK, {
            edge: subject,
            event,
            localPoint: simulationPoint,
            globalPoint: mousePoint,
          });
        }
      }

      this._events.emit(OrbEventType.MOUSE_CLICK, {
        subject,
        event,
        localPoint: simulationPoint,
        globalPoint: mousePoint,
      });

      if (response.isStateChanged || response.changedSubject) {
        this._renderer.render(this._graph);
      }
    }
  };

  private _initCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';

    this._container.appendChild(canvas);
    return canvas;
  }

  private _handleResize() {
    const containerSize = this._container.getBoundingClientRect();
    this._canvas.width = containerSize.width;
    this._canvas.height = containerSize.height;
    this._renderer.width = containerSize.width;
    this._renderer.height = containerSize.height;
    if (this._renderer.isInitiallyRendered) {
      this._renderer.render(this._graph);
    }
  }

  private _startSimulation() {
    const nodePositions = this._graph.getNodePositions();
    const edgePositions = this._graph.getEdgePositions();

    this._simulator.updateData(nodePositions, edgePositions);
    this._simulator.simulate();
  }

  // TODO: Do we keep these
  fixNodes() {
    this._simulator.fixNodes();
  }

  // TODO: Do we keep these
  releaseNodes() {
    this._simulator.releaseNodes();
  }
}
