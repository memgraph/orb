import * as L from 'leaflet';
import { IEdgeBase, isEdge } from '../models/edge';
import { INode, INodeBase, isNode } from '../models/node';
import { IGraph } from '../models/graph';
import { IOrbView, IOrbViewContext } from './shared';
import { IPosition } from '../common';
import { IEventStrategy } from '../models/strategy';
import { copyObject } from '../utils/object.utils';
import { OrbEmitter, OrbEventType } from '../events';
import { IRenderer, RendererType, RenderEventType, IRendererSettingsInit, IRendererSettings } from '../renderer/shared';
import { RendererFactory } from '../renderer/factory';
import { setupContainer } from '../utils/html.utils';

export interface ILeafletMapTile {
  instance: L.TileLayer;
  attribution: string;
}

interface ILeafletEvent<T extends Event> {
  containerPoint: { x: number; y: number };
  latlng: { lat: number; lng: number };
  layerPoint: { x: number; y: number };
  originalEvent: T;
  sourceTarget: any;
  target: any;
  type: string;
}

const osmAttribution =
  '<a href="https://leafletjs.com/" target="_blank" >Leaflet</a> | ' +
  'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors';

const DEFAULT_MAP_TILE: ILeafletMapTile = {
  instance: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  attribution: osmAttribution,
};

const DEFAULT_ZOOM_LEVEL = 2;

export interface IMapSettings {
  zoomLevel: number;
  tile: ILeafletMapTile;
}

export interface IMapViewSettings<N extends INodeBase, E extends IEdgeBase> {
  getGeoPosition(node: INode<N, E>): { lat: number; lng: number } | undefined;
  map: IMapSettings;
  render: Partial<IRendererSettings>;
  areCollapsedContainerDimensionsAllowed: boolean;
}

export interface IMapViewSettingsInit<N extends INodeBase, E extends IEdgeBase> {
  getGeoPosition(node: INode<N, E>): { lat: number; lng: number } | undefined;
  map?: Partial<IMapSettings>;
  render?: Partial<IRendererSettingsInit>;
}

export type IMapViewSettingsUpdate<N extends INodeBase, E extends IEdgeBase> = Partial<IMapViewSettingsInit<N, E>>;

export class MapView<N extends INodeBase, E extends IEdgeBase> implements IOrbView<IMapViewSettings<N, E>> {
  private _container: HTMLElement;
  private _graph: IGraph<N, E>;
  private _events: OrbEmitter<N, E>;
  private _strategy: IEventStrategy<N, E>;

  private _settings: IMapViewSettings<N, E>;

  private _canvas: HTMLCanvasElement;
  private _map: HTMLDivElement;

  private readonly _renderer: IRenderer<N, E>;
  private readonly _leaflet: L.Map;

  constructor(context: IOrbViewContext<N, E>, settings: IMapViewSettingsInit<N, E>) {
    this._container = context.container;
    this._graph = context.graph;
    this._events = context.events;
    this._strategy = context.strategy;

    this._settings = {
      areCollapsedContainerDimensionsAllowed: false,
      ...settings,
      map: {
        zoomLevel: settings.map?.zoomLevel ?? DEFAULT_ZOOM_LEVEL,
        tile: settings.map?.tile ?? DEFAULT_MAP_TILE,
      },
      render: {
        type: RendererType.CANVAS,
        ...settings.render,
      },
    };

    setupContainer(this._container);
    this._canvas = this._initCanvas();
    this._map = this._initMap();

    try {
      this._renderer = RendererFactory.getRenderer<N, E>(this._canvas, settings?.render?.type, this._settings.render);
    } catch (error: any) {
      this._container.textContent = error.message;
      throw error;
    }
    this._renderer.on(RenderEventType.RENDER_END, (data) => {
      this._events.emit(OrbEventType.RENDER_END, data);
    });
    this._settings.render = this._renderer.getSettings();

    // Resize the canvas based on the dimensions of it's parent container <div>.
    const resizeObs = new ResizeObserver(() => this._handleResize());
    resizeObs.observe(this._container);
    this._handleResize();

    this._leaflet = this._initLeaflet();
    // Setting up leaflet map tile
    this._handleTileChange();
  }

  get leaflet(): L.Map {
    return this._leaflet;
  }

  isInitiallyRendered(): boolean {
    return this._renderer.isInitiallyRendered;
  }

  getSettings(): IMapViewSettings<N, E> {
    return copyObject(this._settings);
  }

  setSettings(settings: IMapViewSettingsUpdate<N, E>) {
    if (settings.getGeoPosition) {
      this._settings.getGeoPosition = settings.getGeoPosition;
      this._updateGraphPositions();
    }

    if (settings.map) {
      if (typeof settings.map.zoomLevel === 'number') {
        this._settings.map.zoomLevel = settings.map.zoomLevel;
        this._leaflet.setZoom(settings.map.zoomLevel);
      }

      if (settings.map.tile) {
        this._settings.map.tile = settings.map.tile;
        this._handleTileChange();
      }
    }

    if (settings.render) {
      this._renderer.setSettings(settings.render);
      this._settings.render = this._renderer.getSettings();
    }
  }

  render(onRendered?: () => void) {
    this._updateGraphPositions();
    this._renderer.render(this._graph);
    onRendered?.();
  }

  recenter(onRendered?: () => void) {
    const view = this._graph.getBoundingBox();
    const topRightCoordinate = this._leaflet.layerPointToLatLng([view.x, view.y]);
    const bottomLeftCoordinate = this._leaflet.layerPointToLatLng([view.x + view.width, view.y + view.height]);
    this._leaflet.fitBounds(L.latLngBounds(topRightCoordinate, bottomLeftCoordinate));
    onRendered?.();
  }

  destroy() {
    this._renderer.removeAllListeners();
    this._leaflet.off();
    this._leaflet.remove();
    this._leaflet.getContainer().outerHTML = '';
    this._canvas.outerHTML = '';
  }

  private _initCanvas() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.width = '100%';
    canvas.style.zIndex = '2';
    canvas.style.pointerEvents = 'none';

    this._container.appendChild(canvas);
    return canvas;
  }

  private _initMap() {
    const map = document.createElement('div');
    map.style.position = 'absolute';
    map.style.width = '100%';
    map.style.height = '100%';
    map.style.zIndex = '1';
    map.style.cursor = 'default';

    this._container.appendChild(map);
    return map;
  }

  private _initLeaflet() {
    const leaflet = L.map(this._map).setView([0, 0], this._settings.map.zoomLevel);

    leaflet.on('zoomstart', () => {
      this._renderer.reset();
    });

    leaflet.on('zoom', (event) => {
      this._updateGraphPositions();
      this._renderer.render(this._graph);
      const transform = { ...event.target._mapPane._leaflet_pos, k: event.target._zoom };
      this._events.emit(OrbEventType.TRANSFORM, { transform });
    });

    leaflet.on('mousemove', (event: ILeafletEvent<MouseEvent>) => {
      const point: IPosition = { x: event.layerPoint.x, y: event.layerPoint.y };
      const containerPoint: IPosition = { x: event.containerPoint.x, y: event.containerPoint.y };

      if (this._strategy.onMouseMove) {
        const response = this._strategy.onMouseMove(this._graph, point);
        const subject = response.changedSubject;

        if (subject && response.isStateChanged) {
          if (isNode(subject)) {
            this._events.emit(OrbEventType.NODE_HOVER, {
              node: subject,
              event: event.originalEvent,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
          if (isEdge(subject)) {
            this._events.emit(OrbEventType.EDGE_HOVER, {
              edge: subject,
              event: event.originalEvent,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
        }

        this._events.emit(OrbEventType.MOUSE_MOVE, {
          subject,
          event: event.originalEvent,
          localPoint: point,
          globalPoint: containerPoint,
        });

        if (response.isStateChanged) {
          this._renderer.render(this._graph);
        }
      }
    });

    // Leaflet doesn't have a valid type definition for click event
    // @ts-ignore
    leaflet.on('click', (event: ILeafletEvent<PointerEvent>) => {
      const point: IPosition = { x: event.layerPoint.x, y: event.layerPoint.y };
      const containerPoint: IPosition = { x: event.containerPoint.x, y: event.containerPoint.y };

      if (this._strategy.onMouseClick) {
        const response = this._strategy.onMouseClick(this._graph, point);
        const subject = response.changedSubject;

        if (subject) {
          if (isNode(subject)) {
            this._events.emit(OrbEventType.NODE_CLICK, {
              node: subject,
              event: event.originalEvent,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
          if (isEdge(subject)) {
            this._events.emit(OrbEventType.EDGE_CLICK, {
              edge: subject,
              event: event.originalEvent,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
        }

        this._events.emit(OrbEventType.MOUSE_CLICK, {
          subject,
          event: event.originalEvent,
          localPoint: point,
          globalPoint: containerPoint,
        });

        if (response.isStateChanged || response.changedSubject) {
          this._renderer.render(this._graph);
        }
      }
    });

    leaflet.on('moveend', (event) => {
      const leafletPos = event.target._mapPane._leaflet_pos;
      this._renderer.transform = { ...leafletPos, k: 1 };
      this._renderer.render(this._graph);
    });

    leaflet.on('drag', (event) => {
      const leafletPos = event.target._mapPane._leaflet_pos;
      this._renderer.transform = { ...leafletPos, k: 1 };
      this._renderer.render(this._graph);
      const transform = { ...leafletPos, k: event.target._zoom };
      this._events.emit(OrbEventType.TRANSFORM, { transform });
    });

    return leaflet;
  }

  private _updateGraphPositions() {
    const nodes = this._graph.getNodes();

    for (let i = 0; i < nodes.length; i++) {
      const coordinates = this._settings.getGeoPosition(nodes[i]);
      if (!coordinates) {
        continue;
      }
      if (typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
        continue;
      }

      const layerPoint = this._leaflet.latLngToLayerPoint([coordinates.lat, coordinates.lng]);
      nodes[i].position.x = layerPoint.x;
      nodes[i].position.y = layerPoint.y;
    }
  }

  private _handleResize() {
    const containerSize = this._container.getBoundingClientRect();
    this._canvas.width = containerSize.width;
    this._canvas.height = containerSize.height;
    this._renderer.width = containerSize.width;
    this._renderer.height = containerSize.height;
    if (this._renderer.isInitiallyRendered) {
      this._leaflet.invalidateSize(false);
      this._renderer.render(this._graph);
    }
  }

  private _handleTileChange() {
    const newTile: ILeafletMapTile = this._settings.map.tile;

    this._leaflet.whenReady(() => {
      this._leaflet.attributionControl.setPrefix(newTile.attribution);
      this._leaflet.eachLayer((layer) => this._leaflet.removeLayer(layer));
      newTile.instance.addTo(this._leaflet);
    });
  }
}
