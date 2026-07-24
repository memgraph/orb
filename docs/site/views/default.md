# Default view

`OrbView` is the standard view: a graph drawn on a canvas with force or static layout.

```typescript
import { OrbView } from '@memgraph/orb';

const orb = new OrbView(container, {
  /* settings */
});
```

## Settings

All settings are optional and grouped:

| Group | Purpose |
| --- | --- |
| `render` | Renderer type and drawing options - see [Canvas vs WebGL](/rendering/renderers) and [Performance](/rendering/performance). |
| `layout` | Layout type and options - see [Layouts](/layouts/overview). |
| `strategy` | Built-in selection and hover behavior - see [Selection & interaction](/concepts/interaction). |
| `interaction` | `isDragEnabled` (default `true`), `isZoomEnabled` (default `true`). |

Plus a few top-level settings:

| Setting | Default | Description |
| --- | --- | --- |
| `getPosition` | - | Callback to supply node coordinates (see below). |
| `zoomFitTransitionMs` | `200` | Duration of `recenter` / `zoomIn` / `zoomOut` animations. |
| `isOutOfBoundsDragEnabled` | `false` | Allow dragging nodes outside the visible area. |
| `areCoordinatesRounded` | `true` | Round node coordinates to whole pixels. |

Read the current settings with `orb.getSettings()`, and update them live with
`orb.setSettings({ ... })`. Even the renderer type can be switched at runtime - pass a new
`render.type` or call `orb.setRenderer('canvas' | 'webgl')` (see
[Canvas vs WebGL](/rendering/renderers)).

## Accessors

- `orb.data` - the graph data API ([Graph data](/concepts/data))
- `orb.events` - the event emitter ([Events](/concepts/events))
- `orb.interaction` - programmatic selection/hover ([Selection & interaction](/concepts/interaction))

## Methods

```typescript
orb.render(onRendered?);            // draw; callback runs after the layout settles
orb.recenter(options?, onRendered?); // fit the graph to the view
orb.zoomIn(onRendered?);
orb.zoomOut(onRendered?);
orb.getSVG(options?);               // export the current graph as SVG
orb.setSettings({ /* ... */ });
orb.getSettings();
orb.destroy();                      // tear down the view and free resources
```

`recenter` accepts `anchorX` / `anchorY` (`'start' | 'center' | 'end'`) to control how the
graph is aligned when it's fit:

```typescript
orb.recenter({ anchorX: 'start' });
```

::: tip
For force layouts, recenter once the layout settles rather than in `render`'s callback -
listen for the `SIMULATION_END` [event](/concepts/events). Static layouts can recenter
straight from `render(() => orb.recenter())`.
:::

## Fixed coordinates

Provide `getPosition` to place nodes yourself. Return `{ x, y }` per node (or `undefined` to
auto-layout it). To keep those coordinates fixed, also disable the force simulation so it
doesn't move them:

```typescript
const orb = new OrbView(container, {
  getPosition: (node) => node.getData().coords, // { x, y }
  layout: { type: 'force', options: { isSimulatingOnDataUpdate: false } },
});
```
