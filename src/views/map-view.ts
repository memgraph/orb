import * as L from 'leaflet';
import { IEdgeBase } from '../models/edge';
import { INodeBase, INodePosition } from '../models/node';
import { Graph } from '../models/graph';
import { IOrbView, IViewContext, OrbEmitter, OrbEventType } from '../orb';
import { Renderer } from '../renderer/canvas/renderer';
import { IPosition } from '../common/position';

export interface ILeafletMapTile {
  name: string;
  slug: string;
  instance: L.TileLayer;
  attribution: string;
}

const osmAttribution =
  '<a href="https://leafletjs.com/" target="_blank" >Leaflet</a> | ' +
  'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors';

const DEFAULT_MAP_TILE: ILeafletMapTile = {
  name: 'Detailed',
  slug: 'map-type-detailed',
  instance: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  attribution: osmAttribution,
};

export class MapView<N extends INodeBase, E extends IEdgeBase> implements IOrbView<N, E> {
  private _container: HTMLElement;
  private _graph: Graph<N, E>;
  private _events: OrbEmitter<N, E>;

  private _canvas: HTMLCanvasElement;
  private _map: HTMLDivElement;
  private _context: CanvasRenderingContext2D | null;

  private _renderer: Renderer;
  private _leaflet: L.Map;

  constructor(context: IViewContext<N, E>) {
    this._container = context.container;
    this._graph = context.graph;
    this._events = context.events;

    this._canvas = document.createElement('canvas');
    this._canvas.style.position = 'absolute';
    this._canvas.style.zIndex = '2';
    this._canvas.style.pointerEvents = 'none';
    this._container.appendChild(this._canvas);

    this._map = document.createElement('div');
    this._map.style.position = 'absolute';
    // this._map.style.width = '100%';
    // this._map.style.height = '100%';
    this._map.style.zIndex = '1';
    // this._map.style.maxWidth = 'none';
    // this._map.style.maxHeight = '100vh';
    // this._map.style.minWidth = '0';
    // this._map.style.cursor = 'default';
    this._container.appendChild(this._map);

    // Get the 2d rendering context which is used by D3 in the Renderer.
    this._context = this._canvas.getContext('2d') || new CanvasRenderingContext2D(); // TODO: how to handle functions that return null?

    // Resize the canvas based on the dimensions of it's parent container <div>.
    const resizeObs = new ResizeObserver(this.onContainerResize);
    resizeObs.observe(this._container);

    this._renderer = new Renderer(this._context);

    this._leaflet = L.map(this._map).setView([0, 0], 2);
    this._leaflet.on('zoomstart', () => {
      this._renderer.reset();
    });

    this._leaflet.on('zoom', () => {
      this.updateGraphPositions();
      this._renderer.render(this._graph);
    });

    this._leaflet.on('mousemove', (event: any) => {
      const point: IPosition = { x: event.layerPoint.x, y: event.layerPoint.y };
      // TODO: Add throttle
      const node = this._graph.getNearestNode(point);
      if (!node) {
        const { changedCount } = this._graph.unhoverAll();
        if (changedCount) {
          this._renderer.render(this._graph);
        }
      }

      if (node && !node.isSelected()) {
        this._graph.hoverNode(node);
        this._events.emit(OrbEventType.NODE_HOVER, { node });
        this._renderer.render(this._graph);
      }
    });

    this._leaflet.on('click', (event: any) => {
      const point: IPosition = { x: event.layerPoint.x, y: event.layerPoint.y };
      // const containerPoint: IPosition = { x: event.containerPoint.x, y: event.containerPoint.y };

      const node = this._graph.getNearestNode(point);
      if (node) {
        this._graph.selectNode(node);
        this._events.emit(OrbEventType.NODE_CLICK, { node });
        this._renderer.render(this._graph);
        // this.selectedShape.next(node);
        // this.selectedShapePosition.next(containerPoint);
        return;
      }

      const edge = this._graph.getNearestEdge(point);
      if (edge) {
        this._graph.selectEdge(edge);
        this._events.emit(OrbEventType.EDGE_CLICK, { edge });
        this._renderer.render(this._graph);
        // this.selectedShape.next(edge);
        // this.selectedShapePosition.next(containerPoint);
        return;
      }

      // No node has been selected
      this._graph.unselectAll();
      this._renderer.render(this._graph);
      // this.selectedShape.next(null);
      // this.selectedShapePosition.next(null);
    });

    this._leaflet.on('moveend', () => {
      this._leaflet.fire('drag');
    });

    this._leaflet.on('drag', (event) => {
      const leafletPos = event.target._mapPane._leaflet_pos;
      this._renderer.transform = { ...leafletPos, k: 1 };
      this._renderer.render(this._graph);
      // this.selectedShape.next(null);
      // this.selectedShapePosition.next(null);
    });

    // Setting up leaflet map tile
    this._leaflet.whenReady(() => {
      this._leaflet.attributionControl.setPrefix(DEFAULT_MAP_TILE.attribution);
      this._leaflet.eachLayer((layer) => this._leaflet.removeLayer(layer));
      DEFAULT_MAP_TILE.instance.addTo(this._leaflet);
    });
  }

  render() {
    this.updateGraphPositions();
    this._renderer.render(this._graph);
  }

  onContainerResize = () => {
    const containerSize = this._container.getBoundingClientRect();
    this._canvas.width = containerSize.width;
    this._canvas.height = containerSize.height;
    this._renderer.width = containerSize.width;
    this._renderer.height = containerSize.height;
    this._leaflet.invalidateSize(false);
    this._renderer.render(this._graph);
  };

  // TODO: Rename this to recenter
  fitZoomTransform() {
    const view = this._graph.getBoundingBox();
    const topRightCoordinate = this._leaflet.layerPointToLatLng([view.x, view.y]);
    const bottomLeftCoordinate = this._leaflet.layerPointToLatLng([view.x + view.width, view.y + view.height]);
    this._leaflet.fitBounds(L.latLngBounds(topRightCoordinate, bottomLeftCoordinate));
  }

  updateGraphPositions() {
    const nodePositions: INodePosition[] = [];
    const nodes = this._graph.getNodes();

    for (let i = 0; i < nodes.length; i++) {
      // TODO: Have a callback function to get lat and lng
      const coordinates = {
        // @ts-ignore
        lat: nodes[i].data.lat,
        // @ts-ignore
        lng: nodes[i].data.lng,
      };

      if (!coordinates) {
        continue;
      }

      const layerPoint = this._leaflet.latLngToLayerPoint([coordinates.lat, coordinates.lng]);
      nodePositions.push({ id: nodes[i].id, x: layerPoint.x, y: layerPoint.y });
    }

    this._graph.setNodePositions(nodePositions);
  }
}
