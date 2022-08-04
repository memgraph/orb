import * as L from 'leaflet';
import { Edge, IEdgeBase } from '../models/edge';
import { Node, INodeBase, INodePosition } from '../models/node';
import { Graph } from '../models/graph';
import { IOrbView, IViewContext, OrbEmitter, OrbEventType } from '../orb';
import { Renderer } from '../renderer/canvas/renderer';
import { IPosition } from '../common/position';
import { IEventStrategy } from '../models/strategy';

export interface ILeafletMapTile {
  instance: L.TileLayer;
  attribution: string;
}

const osmAttribution =
  '<a href="https://leafletjs.com/" target="_blank" >Leaflet</a> | ' +
  'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors';

const DEFAULT_MAP_TILE: ILeafletMapTile = {
  instance: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  attribution: osmAttribution,
};

const DEFAULT_ZOOM_LEVEL = 2;

export interface IMapViewSettings<N extends INodeBase, E extends IEdgeBase> {
  getGeoPosition(node: Node<N, E>): { lat: number; lng: number };
  zoomLevel?: number;
  tile?: ILeafletMapTile;
}

export class MapView<N extends INodeBase, E extends IEdgeBase> implements IOrbView {
  private _container: HTMLElement;
  private _graph: Graph<N, E>;
  private _events: OrbEmitter<N, E>;
  private _strategy: IEventStrategy<N, E>;

  private _settings: Required<IMapViewSettings<N, E>>;

  private _canvas: HTMLCanvasElement;
  private _map: HTMLDivElement;
  private _context: CanvasRenderingContext2D | null;

  private _renderer: Renderer;
  private _leaflet: L.Map;

  constructor(context: IViewContext<N, E>, settings: IMapViewSettings<N, E>) {
    this._container = context.container;
    this._graph = context.graph;
    this._events = context.events;
    this._strategy = context.strategy;

    this._settings = {
      zoomLevel: DEFAULT_ZOOM_LEVEL,
      tile: DEFAULT_MAP_TILE,
      ...settings,
    };

    // Check for more details here: https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
    this._container.textContent = '';
    this._canvas = this._initCanvas();
    this._map = this._initMap();

    // Get the 2d rendering context which is used by D3 in the Renderer.
    this._context = this._canvas.getContext('2d') || new CanvasRenderingContext2D(); // TODO: how to handle functions that return null?

    // Resize the canvas based on the dimensions of it's parent container <div>.
    const resizeObs = new ResizeObserver(() => this._handleResize());
    resizeObs.observe(this._container);

    this._renderer = new Renderer(this._context);
    this._leaflet = this._initLeaflet();
    // Setting up leaflet map tile
    this._handleTileChange();
  }

  render() {
    this._updateGraphPositions();
    this._renderer.render(this._graph);
  }

  recenter() {
    const view = this._graph.getBoundingBox();
    const topRightCoordinate = this._leaflet.layerPointToLatLng([view.x, view.y]);
    const bottomLeftCoordinate = this._leaflet.layerPointToLatLng([view.x + view.width, view.y + view.height]);
    this._leaflet.fitBounds(L.latLngBounds(topRightCoordinate, bottomLeftCoordinate));
  }

  destroy() {
    this._leaflet.off();
    this._leaflet.remove();
    this._container.textContent = '';
  }

  change(settings: Partial<IMapViewSettings<N, E>>) {
    if (settings.getGeoPosition) {
      this._settings.getGeoPosition = settings.getGeoPosition;
      this._updateGraphPositions();
    }

    if (typeof settings.zoomLevel === 'number') {
      this._settings.zoomLevel = settings.zoomLevel;
      this._leaflet.setZoom(settings.zoomLevel);
    }

    if (settings.tile) {
      this._settings.tile = settings.tile;
      this._handleTileChange();
    }
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
    const leaflet = L.map(this._map).setView([0, 0], this._settings.zoomLevel);

    leaflet.on('zoomstart', () => {
      this._renderer.reset();
    });

    leaflet.on('zoom', () => {
      this._updateGraphPositions();
      this._renderer.render(this._graph);
    });

    leaflet.on('mousemove', (event: any) => {
      const point: IPosition = { x: event.layerPoint.x, y: event.layerPoint.y };
      const containerPoint: IPosition = { x: event.containerPoint.x, y: event.containerPoint.y };
      // TODO: Add throttle
      if (this._strategy.onMouseMove) {
        const response = this._strategy.onMouseMove(this._graph, point);
        const subject = response.changedSubject;

        if (subject) {
          if (subject instanceof Node) {
            this._events.emit(OrbEventType.NODE_HOVER, {
              node: subject,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
          if (subject instanceof Edge) {
            this._events.emit(OrbEventType.EDGE_HOVER, {
              edge: subject,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
        }

        this._events.emit(OrbEventType.MOUSE_MOVE, { subject, localPoint: point, globalPoint: containerPoint });

        if (response.isStateChanged || response.changedSubject) {
          this._renderer.render(this._graph);
        }
      }
    });

    leaflet.on('click', (event: any) => {
      const point: IPosition = { x: event.layerPoint.x, y: event.layerPoint.y };
      const containerPoint: IPosition = { x: event.containerPoint.x, y: event.containerPoint.y };

      if (this._strategy.onMouseClick) {
        const response = this._strategy.onMouseClick(this._graph, point);
        const subject = response.changedSubject;

        if (subject) {
          if (subject instanceof Node) {
            this._events.emit(OrbEventType.NODE_CLICK, {
              node: subject,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
          if (subject instanceof Edge) {
            this._events.emit(OrbEventType.EDGE_CLICK, {
              edge: subject,
              localPoint: point,
              globalPoint: containerPoint,
            });
          }
        }

        this._events.emit(OrbEventType.MOUSE_CLICK, { subject, localPoint: point, globalPoint: containerPoint });

        if (response.isStateChanged || response.changedSubject) {
          this._renderer.render(this._graph);
        }
      }
    });

    leaflet.on('moveend', () => {
      leaflet.fire('drag');
    });

    leaflet.on('drag', (event) => {
      const leafletPos = event.target._mapPane._leaflet_pos;
      this._renderer.transform = { ...leafletPos, k: 1 };
      this._renderer.render(this._graph);
      // TODO: How to indicate this event for map drag - maybe just send map-drag event?
      // this.selectedShape.next(null);
      // this.selectedShapePosition.next(null);
    });

    return leaflet;
  }

  private _updateGraphPositions() {
    const nodePositions: INodePosition[] = [];
    const nodes = this._graph.getNodes();
    console.log('nodes', nodes);

    for (let i = 0; i < nodes.length; i++) {
      const coordinates = this._settings.getGeoPosition(nodes[i]);
      if (!coordinates) {
        continue;
      }
      if (typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
        continue;
      }

      const layerPoint = this._leaflet.latLngToLayerPoint([coordinates.lat, coordinates.lng]);
      nodePositions.push({ id: nodes[i].id, x: layerPoint.x, y: layerPoint.y });
    }

    this._graph.setNodePositions(nodePositions);
  }

  private _handleResize() {
    const containerSize = this._container.getBoundingClientRect();
    this._canvas.width = containerSize.width;
    this._canvas.height = containerSize.height;
    this._renderer.width = containerSize.width;
    this._renderer.height = containerSize.height;
    this._leaflet.invalidateSize(false);
    this._renderer.render(this._graph);
  }

  private _handleTileChange() {
    const newTile: ILeafletMapTile = this._settings.tile;

    this._leaflet.whenReady(() => {
      this._leaflet.attributionControl.setPrefix(newTile.attribution);
      this._leaflet.eachLayer((layer) => this._leaflet.removeLayer(layer));
      newTile.instance.addTo(this._leaflet);
    });
  }
}
