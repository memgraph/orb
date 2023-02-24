# Orb views: Map view

By default, Orb offers a `OrbMapView` which is a graph view with a map as a background. Map rendering is
done with a library [leaflet](https://leafletjs.com/). To render maps, make sure to add the
following CSS to your project:

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.8.0/dist/leaflet.css"
/>
```

Here is a simple example of `OrbMapView` usage:

![](./assets/view-map-example.png)

```typescript
import { OrbMapView } from "@memgraph/orb";

const container = document.getElementById("<your-div-id>");

const nodes: MyNode[] = [
  { id: "miami", label: "Miami", lat: 25.789106, lng: -80.226529 },
  { id: "sanjuan", label: "San Juan", lat: 18.4663188, lng: -66.1057427 },
  { id: "hamilton", label: "Hamilton", lat: 32.294887, lng: -64.78138 },
];
const edges: MyEdge[] = [
  { id: 0, start: "miami", end: "sanjuan" },
  { id: 1, start: "sanjuan", end: "hamilton" },
  { id: 2, start: "hamilton", end: "miami" },
];

const orb = new OrbMapView<MyNode, MyEdge>(container, {
  getGeoPosition: (node) => ({ lat: node.data.lat, lng: node.data.lng }),
});

// Assign a default style
orb.data.setDefaultStyle({
  getNodeStyle(node) {
    return {
      borderColor: "#FFFFFF",
      borderWidth: 1,
      color: "#DD2222",
      fontSize: 10,
      label: node.data.label,
      size: 10,
    };
  },
  getEdgeStyle() {
    return {
      arrowSize: 0,
      color: "#DD2222",
      width: 3,
    };
  },
});

// Initialize nodes and edges
orb.data.setup({ nodes, edges });

// Render and recenter the view
orb.render(() => {
  orb.recenter();
});
```

## Initialization

On `OrbMapView` initialization, you must provide an implementation for `getGeoPosition` which is used
to get `latitude` and `longitude` for each node. Here is the example of settings (required and optional)
initialized on the new `OrbMapView`:

```typescript
import * as L from "leaflet";
import { OrbMapView } from "@memgraph/orb";

const mapAttribution =
  '<a href="https://leafletjs.com/" target="_blank" >Leaflet</a> | ' +
  'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors';

const orb = new OrbMapView<MyNode, MyEdge>(container, {
  getGeoPosition: (node) => ({
    lat: node.data.latitude,
    lng: node.data.longitude,
  }),
  map: {
    zoomLevel: 5,
    tile: {
      instance: new L.TileLayer(
              "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ),
      attribution: mapAttribution,
    },
  },
  render: {
    labelsIsEnabled: true,
    labelsOnEventIsEnabled: true,
    shadowIsEnabled: true,
    shadowOnEventIsEnabled: true,
    contextAlphaOnEvent: 0.3,
    contextAlphaOnEventIsEnabled: true,
  },
  areCollapsedContainerDimensionsAllowed: false,
});
```

You can set settings on view initialization or afterward with `orb.setSettings`. Below
you can see the list of all settings' parameters:

```typescript
import * as L from "leaflet";

interface IOrbMapViewSettings {
  // For map node positions
  getGeoPosition(node: INode): { lat: number; lng: number } | undefined;
  // For canvas rendering and events
  render: {
    devicePixelRatio: number | null;
    fps: number;
    minZoom: number;
    maxZoom: number;
    fitZoomMargin: number;
    labelsIsEnabled: boolean;
    labelsOnEventIsEnabled: boolean;
    shadowIsEnabled: boolean;
    shadowOnEventIsEnabled: boolean;
    contextAlphaOnEvent: number;
    contextAlphaOnEventIsEnabled: boolean;
    backgroundColor: Color | string | null;
  };
  // For select and hover look-and-feel
  strategy: {
    isDefaultSelectEnabled: boolean;
    isDefaultHoverEnabled: boolean;
  };
  // Other map view parameters
  map: {
    zoomLevel: number;
    tile: L.TileLayer;
  };
  areCollapsedContainerDimensionsAllowed: boolean;
}
```

The default settings that `OrbMapView` uses is:

```typescript
const defaultSettings = {
  render: {
    devicePixelRatio: window.devicePixelRatio,
    fps: 60,
    minZoom: 0.25,
    maxZoom: 8,
    fitZoomMargin: 0.2,
    labelsIsEnabled: true,
    labelsOnEventIsEnabled: true,
    shadowIsEnabled: true,
    shadowOnEventIsEnabled: true,
    contextAlphaOnEvent: 0.3,
    contextAlphaOnEventIsEnabled: true,
    backgroundColor: null,
  },
  strategy: {
    isDefaultSelectEnabled: true,
    isDefaultHoverEnabled: true,
  },
  map: {
    zoomLevel: 2, // Default map zoom level
    tile: new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"), // OpenStreetMaps
  },
};
```

You can read more about each property down below and on [Styles guide](./styles.md).

### Property `getGeoPosition`

Property `getGeoPosition` is the only required one. It is a callback function that has a node (`INode`)
as an input, and it needs to return the object `{ lat: number; lng: number; }` or `undefined`. If
`undefined` is returned those nodes won't be rendered on the map.

### Property `map`

Optional property `map` has two properties that you can set which are:

- `zoomLevel` - initial map zoom level. The zoom level is forwarded to `leaflet`.
- `tile` - map tile layout where you need to provide an instance (`leaflet.TileLayer`) and attribution.
  The default tile is the OpenStreetMaps.

### Property `render`

Optional property `render` has several rendering options that you can tweak. Read more about them
on [Styling guide](./styles.md).

#### Property `render.devicePixelRatio`

`devicePixelRatio` is useful when dealing with the difference between rendering on a standard
display versus a HiDPI or Retina display, which uses more screen pixels to draw the same
objects, resulting in a sharper image. ([Reference: MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)).
Orb will listen for `devicePixelRatio` changes and handles them by default. You can override the
value with a settings property `render.devicePixelRatio`. Once a custom value is provided, Orb will
stop listening for `devicePixelRatio` changes.
If you want to return automatic `devicePixelRatio` handling, just set `render.devicePixelRatio`
to `null`.

#### Property `render.areCollapsedContainerDimensionsAllowed`

Enables setting the dimensions of the Orb container element to zero.
If the container element of Orb has collapsed dimensions (`width: 0;` or `height: 0;`),
Orb will expand the container by setting the values to `100%`.
If that doesn't work (the parent of the container also has collapsed dimensions),
Orb will set an arbitrary fixed dimension to the container.
Disabled by default (`false`).

### Property `strategy`

The optional property `strategy` has two properties that you can enable/disable:

* `isDefaultSelectEnabled` - when `true`, the default selection strategy is used on mouse click:
  * If there is a node at the mouse click point, the node, its edges, and adjacent nodes will change
    its state to `GraphObjectState.SELECTED`. Style properties that end with `...Selected` will be
    applied to all the selected objects (e.g. `borderColorSelected`).
  * If there is an edge at the mouse click point, the edge and its starting and ending nodes will change
    its state to `GraphObjectState.SELECTED`.
* `isDefaultHoverEnabled` - when `true`, the default hover strategy is used on mouse move:
  * If there is a node at the mouse pointer, the node, its edges, and adjacent nodes will change its state to
    `GraphObjectState.HOVERED`. Style properties that end with `...Hovered` will be applied to all the
    hovered objects (e.g. `borderColorHovered`).

With property `strategy` you can disable the above behavior and implement your select/hover strategy on
top of events `OrbEventType.MOUSE_CLICK` and `OrbEventType.MOUSE_MOVE`, e.g:

```typescript
import { isNode, OrbEventType, GraphObjectState } from '@memgraph/orb';

// Disable default select and hover strategy
orb.setSettings({
  strategy: {
    isDefaultSelectEnabled: false,
    isDefaultHoverEnabled: false,
  },
});

// Create custom select strategy which selects just clicked node
orb.events.on(OrbEventType.MOUSE_CLICK, (event) => {
  // Clicked on blank canvas
  if (!event.subject) {
    // Deselect the previously selected nodes and render if there are changes
    const selectedNodes = orb.data.getNodes((node) => node.isSelected());
    if (selectedNodes) {
      selectedNodes.forEach((node) => node.clearState());
      orb.render();
    }
  }

  // Clicked on unselected node
  if (event.subject && isNode(event.subject) && !event.subject.isSelected()) {
    // Deselect the previously selected nodes
    orb.data.getNodes((node) => node.isSelected()).forEach((node) => node.clearState());
    // Select the new node
    event.subject.state = GraphObjectState.SELECTED;
    orb.render();
  }
});
```

## Settings

The above settings of `OrbMapView` can be defined on view initialization, but also anytime after the
initialization with a view function `setSettings`:

```typescript
// If you want to see all the current view settings
const settings = orb.getSettings();

// Change the way how geo coordinates are defined on nodes
orb.setSettings({
  getGeoPosition: (node) => ({ lat: node.data.lat, lng: node.data.lng }),
});

// Change the zoom level and disable shadows
orb.setSettings({
  map: {
    zoomLevel: 7,
  },
  render: {
    shadowIsEnabled: false,
    shadowOnEventIsEnabled: false,
  },
});
```

## Rendering

Just like other Orb views, use `render` to render the view and `recenter` to fit the view to
the rendered graph.

```typescript
orb.render(() => {
  orb.recenter();
});
```

## Map reference `leaflet`

If you need a reference to the internal map reference from `leaflet` library, just use the
following example:

```typescript
import { OrbMapView } from "@memgraph/orb";

// It will only work on OrbMapView
const leaflet = (orb.view as OrbMapView).leaflet;
```
