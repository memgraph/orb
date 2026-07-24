# Map view

`OrbMapView` draws the graph over an interactive [Leaflet](https://leafletjs.com/) map. Use
it when your nodes have real-world coordinates.

<OrbDemo src="/demos/map.html" :height="460" />

```typescript
import { OrbMapView } from '@memgraph/orb';

const orb = new OrbMapView(container, {
  getGeoPosition: (node) => ({ lat: node.getData().lat, lng: node.getData().lng }),
});

orb.data.setup({ nodes, edges });
orb.render(() => orb.recenter());
```

Unlike `OrbView`, the settings argument is **required**: `getGeoPosition` has no default.

## `getGeoPosition`

Called per node; return `{ lat, lng }` to place it on the map, or `undefined` to leave it
out. This replaces the layout - positions come from the map projection, not a force
simulation.

## Map settings

Everything under `map` is optional:

| Setting | Default | Description |
| --- | --- | --- |
| `zoomLevel` | `2` | Initial Leaflet zoom level. |
| `tile` | OpenStreetMap | The tile layer, as `{ instance, attribution }`. |
| `nodeSizeMode` | `'geographic'` | `'geographic'` scales node sizes with map zoom; `'fixed'` keeps them a constant screen size. |

Custom tiles use a Leaflet `TileLayer`:

```typescript
import * as L from 'leaflet';

const orb = new OrbMapView(container, {
  getGeoPosition,
  map: {
    zoomLevel: 5,
    nodeSizeMode: 'fixed',
    tile: {
      instance: new L.TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
      attribution: '© OpenStreetMap contributors',
    },
  },
});
```

`render` and `strategy` settings work the same as on the [default view](/views/default).

## Accessors and methods

Alongside `data`, `events`, and `interaction`, the map view exposes the underlying Leaflet
map so you can add your own controls or layers:

```typescript
orb.leaflet; // the L.Map instance
```

Methods: `render`, `recenter`, `zoomIn`, `zoomOut`, `setSettings`, and `destroy`.

## Constraints

- **Canvas by default.** The map view uses the Canvas renderer unless you pass
  `render.type`. You can request the [WebGL renderer](/rendering/renderers), but Canvas is
  the standard, tested choice for drawing over map tiles.
- **No SVG export.** `getSVG()` throws on a map view - the background is external map tiles,
  which can't be embedded as vector graphics.
