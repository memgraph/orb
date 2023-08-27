import { D3DragEvent, drag } from 'd3-drag';
import { easeLinear } from 'd3-ease';
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-ignore: Transition needs to be imported in order to be available to d3
import transition from 'd3-transition';
/* eslint-enable @typescript-eslint/no-unused-vars */
import { D3ZoomEvent, zoom, ZoomBehavior, ZoomTransform } from 'd3-zoom';
import { select } from 'd3-selection';
import { IPosition, isEqualPosition } from '../common';
import { ISimulator, SimulatorFactory } from '../simulator';
import { Graph, IGraph } from '../models/graph';
import { INode, INodeBase, isNode } from '../models/node';
import { IEdgeBase, isEdge } from '../models/edge';
import { IOrbView } from './shared';
import { DefaultEventStrategy, IEventStrategy, IEventStrategySettings } from '../models/strategy';
import { ID3SimulatorEngineSettings } from '../simulator/engine/d3-simulator-engine';
import { copyObject } from '../utils/object.utils';
import { OrbEmitter, OrbEventType } from '../events';
import {
  IRenderer,
  RenderEventType,
  IRendererSettingsInit,
  IRendererSettings,
  PanDirectionType,
} from '../renderer/shared';
import { RendererFactory } from '../renderer/factory';
import { setupContainer } from '../utils/html.utils';
import { SimulatorEventType } from '../simulator/shared';
import { getDefaultGraphStyle } from '../models/style';
import { isBoolean } from '../utils/type.utils';

export interface IGraphInteractionSettings {
  isDragEnabled: boolean;
  isZoomEnabled: boolean;
  keyboard: {
    isEnabled: boolean;
    zoomInFactor: number;
    zoomOutFactor: number;
    panFactor: number;
    transitionMs: number;
  };
}

const DEFAULT_ZOOM_IN_FACTOR = 1.2;
const DEFAULT_ZOOM_OUT_FACTOR = 0.8;
const DEFAULT_PAN_FACTOR = 25;
const DEFAULT_TRANSITION_MS = 200;

export interface IOrbViewSettings<N extends INodeBase, E extends IEdgeBase> {
  getPosition?(node: INode<N, E>): IPosition | undefined;
  simulation: Partial<ID3SimulatorEngineSettings>;
  render: Partial<IRendererSettings>;
  strategy: Partial<IEventStrategySettings>;
  interaction: Partial<IGraphInteractionSettings>;
  zoomFitTransitionMs: number;
  isOutOfBoundsDragEnabled: boolean;
  areCoordinatesRounded: boolean;
  isSimulationAnimated: boolean;
  areCollapsedContainerDimensionsAllowed: boolean;
}

export interface IApplyTransitionOptions {
  transitionMs: number;
  callback: () => void;
}

export type IOrbViewSettingsInit<N extends INodeBase, E extends IEdgeBase> = Omit<
  Partial<IOrbViewSettings<N, E>>,
  'render'
> & { render?: Partial<IRendererSettingsInit> };

export class OrbView<N extends INodeBase, E extends IEdgeBase> implements IOrbView<N, E, IOrbViewSettings<N, E>> {
  private _container: HTMLElement;
  private _graph: IGraph<N, E>;
  private _events: OrbEmitter<N, E>;
  private _strategy: IEventStrategy<N, E>;
  private _settings: IOrbViewSettings<N, E>;
  private _canvas: HTMLCanvasElement;

  private readonly _renderer: IRenderer<N, E>;
  private readonly _simulator: ISimulator;

  private _isSimulating = false;
  private _onSimulationEnd: (() => void) | undefined;
  private _simulationStartedAt = Date.now();
  private _d3Zoom: ZoomBehavior<HTMLCanvasElement, any>;
  private _dragStartPosition: IPosition | undefined;

  constructor(container: HTMLElement, settings?: Partial<IOrbViewSettingsInit<N, E>>) {
    this._container = container;
    this._graph = new Graph<N, E>(undefined, {
      onLoadedImages: () => {
        // Not to call render() before user's .render()
        if (this._renderer.isInitiallyRendered) {
          this.render();
        }
      },
    });
    this._graph.setDefaultStyle(getDefaultGraphStyle());
    this._events = new OrbEmitter<N, E>();

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
      strategy: {
        isDefaultHoverEnabled: true,
        isDefaultSelectEnabled: true,
        ...settings?.strategy,
      },
      interaction: {
        isDragEnabled: true,
        isZoomEnabled: true,
        ...settings?.interaction,
        keyboard: {
          isEnabled: false,
          zoomInFactor: DEFAULT_ZOOM_IN_FACTOR,
          zoomOutFactor: DEFAULT_ZOOM_OUT_FACTOR,
          panFactor: DEFAULT_PAN_FACTOR,
          transitionMs: 100,
          ...settings?.interaction?.keyboard,
        },
      },
    };

    this._strategy = new DefaultEventStrategy<N, E>({
      isDefaultSelectEnabled: this._settings.strategy.isDefaultSelectEnabled ?? false,
      isDefaultHoverEnabled: this._settings.strategy.isDefaultHoverEnabled ?? false,
    });

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
      .on('mousemove', this.mouseMoved)
      .on('contextmenu', this.mouseRightClicked)
      .on('dblclick.zoom', this.mouseDoubleClicked);

    document.addEventListener('keydown', this._handleKeyDown);

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

  get data(): IGraph<N, E> {
    return this._graph;
  }

  get events(): OrbEmitter<N, E> {
    return this._events;
  }

  getSettings(): IOrbViewSettings<N, E> {
    return copyObject(this._settings);
  }

  setSettings(settings: Partial<IOrbViewSettings<N, E>>) {
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

    if (settings.strategy) {
      if (isBoolean(settings.strategy.isDefaultHoverEnabled)) {
        this._settings.strategy.isDefaultHoverEnabled = settings.strategy.isDefaultHoverEnabled;
        this._strategy.isHoverEnabled = this._settings.strategy.isDefaultHoverEnabled;
      }

      if (isBoolean(settings.strategy.isDefaultSelectEnabled)) {
        this._settings.strategy.isDefaultSelectEnabled = settings.strategy.isDefaultSelectEnabled;
        this._strategy.isSelectEnabled = this._settings.strategy.isDefaultSelectEnabled;
      }
    }

    // Check if interaction settings are provided
    if (settings.interaction) {
      // Check if isDragEnabled is a boolean value
      if (isBoolean(settings.interaction.isDragEnabled)) {
        // Update the internal isDragEnabled setting based on the provided value
        this._settings.interaction.isDragEnabled = settings.interaction.isDragEnabled;
      }

      // Check if isZoomEnabled is a boolean value
      if (isBoolean(settings.interaction.isZoomEnabled)) {
        // Update the internal isZoomEnabled setting based on the provided value
        this._settings.interaction.isZoomEnabled = settings.interaction.isZoomEnabled;
      }

      if (settings.interaction.keyboard) {
        this._settings.interaction.keyboard = {
          ...this._settings.interaction.keyboard,
          ...settings.interaction.keyboard,
        };
      }
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
    const transitionMs = this._settings.zoomFitTransitionMs;

    this._applyTransformation(fitZoomTransform, { transitionMs, callback: onRendered });
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
    // If drag is disabled then return
    if (!this._settings.interaction.isDragEnabled) {
      return;
    }

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
    // If drag is disabled then return
    if (!this._settings.interaction.isDragEnabled) {
      return;
    }

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
    // If drag is disabled then return
    if (!this._settings.interaction.isDragEnabled) {
      return;
    }

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
    // If zoom is disabled then return
    if (!this._settings.interaction.isZoomEnabled) {
      return;
    }
    this._renderer.transform = event.transform;
    setTimeout(() => {
      this._renderer.render(this._graph);
      this._events.emit(OrbEventType.TRANSFORM, { transform: event.transform });
    }, 1);
  };

  _handleKeyDown = (event: KeyboardEvent) => {
    if (!this._settings.interaction.keyboard?.isEnabled) {
      return;
    }

    const { zoomOutFactor, zoomInFactor, panFactor, transitionMs } = this._settings.interaction.keyboard;

    switch (event.key) {
      case '-': {
        this._zoomOut(zoomOutFactor);
        break;
      }
      case '+': {
        this._zoomIn(zoomInFactor);
        break;
      }
      case 'ArrowLeft': {
        const dragLeftTransform = this._renderer.getPanTransform(PanDirectionType.LEFT, panFactor);
        this._applyTransformation(dragLeftTransform, { transitionMs: transitionMs });
        break;
      }
      case 'ArrowRight': {
        const dragRightTransform = this._renderer.getPanTransform(PanDirectionType.RIGHT, panFactor);
        this._applyTransformation(dragRightTransform, { transitionMs: transitionMs });
        break;
      }
      case 'ArrowUp': {
        const dragUpTransform = this._renderer.getPanTransform(PanDirectionType.UP, panFactor);
        this._applyTransformation(dragUpTransform, { transitionMs: transitionMs });
        break;
      }
      case 'ArrowDown': {
        const dragDownTransform = this._renderer.getPanTransform(PanDirectionType.DOWN, panFactor);
        this._applyTransformation(dragDownTransform, { transitionMs: transitionMs });
        break;
      }
      default:
        break;
    }
  };

  _zoomOut = (zoomOutFactor: number) => {
    const transform = this._renderer.getZoomTransform(zoomOutFactor);
    this._d3Zoom.scaleTo(select(this._canvas), transform.k);
  };

  _zoomIn = (zoomInFactor: number) => {
    const transform = this._renderer.getZoomTransform(zoomInFactor);
    this._d3Zoom.scaleTo(select(this._canvas), transform.k);
  };

  _applyTransformation = (transform: ZoomTransform, options?: Partial<IApplyTransitionOptions>) => {
    const transitionMs = options?.transitionMs ?? DEFAULT_TRANSITION_MS;

    select(this._canvas)
      .transition()
      .duration(transitionMs)
      .ease(easeLinear)
      .call(this._d3Zoom.transform, transform)
      .call(() => {
        this._renderer.render(this._graph);
        options?.callback?.();
      });
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
  };

  mouseClicked = (event: PointerEvent) => {
    const mousePoint = this.getCanvasMousePosition(event);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

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
  };

  mouseRightClicked = (event: PointerEvent) => {
    const mousePoint = this.getCanvasMousePosition(event);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    const response = this._strategy.onMouseRightClick(this._graph, simulationPoint);
    const subject = response.changedSubject;

    if (subject) {
      if (isNode(subject)) {
        this._events.emit(OrbEventType.NODE_RIGHT_CLICK, {
          node: subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint,
        });
      }
      if (isEdge(subject)) {
        this._events.emit(OrbEventType.EDGE_RIGHT_CLICK, {
          edge: subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint,
        });
      }
    }

    this._events.emit(OrbEventType.MOUSE_RIGHT_CLICK, {
      subject,
      event,
      localPoint: simulationPoint,
      globalPoint: mousePoint,
    });

    if (response.isStateChanged || response.changedSubject) {
      this._renderer.render(this._graph);
    }
  };

  mouseDoubleClicked = (event: PointerEvent) => {
    const mousePoint = this.getCanvasMousePosition(event);
    const simulationPoint = this._renderer.getSimulationPosition(mousePoint);

    const response = this._strategy.onMouseDoubleClick(this._graph, simulationPoint);
    const subject = response.changedSubject;

    if (subject) {
      if (isNode(subject)) {
        this._events.emit(OrbEventType.NODE_DOUBLE_CLICK, {
          node: subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint,
        });
      }
      if (isEdge(subject)) {
        this._events.emit(OrbEventType.EDGE_DOUBLE_CLICK, {
          edge: subject,
          event,
          localPoint: simulationPoint,
          globalPoint: mousePoint,
        });
      }
    }

    this._events.emit(OrbEventType.MOUSE_DOUBLE_CLICK, {
      subject,
      event,
      localPoint: simulationPoint,
      globalPoint: mousePoint,
    });

    if (response.isStateChanged || response.changedSubject) {
      this._renderer.render(this._graph);
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
