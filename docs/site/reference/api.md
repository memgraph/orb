# API reference

Every setting, option, method, and export in one place. For explanations and examples,
follow the links to the guide pages.

## OrbView

```typescript
new OrbView<N, E>(container: HTMLElement, settings?: {
  render?: RenderSettings;
  layout?: { type: LayoutType; options?: LayoutOptions };
  strategy?: StrategySettings;
  interaction?: { isDragEnabled?: boolean; isZoomEnabled?: boolean };
  getPosition?: (node) => { x: number; y: number } | undefined;
  zoomFitTransitionMs?: number;
  isOutOfBoundsDragEnabled?: boolean;
  areCoordinatesRounded?: boolean;
});
```

| Top-level setting | Default | See |
| --- | --- | --- |
| `render` | see [Render settings](#render-settings) | [Renderers](/rendering/renderers) |
| `layout` | `{ type: 'force' }` | [Layouts](/layouts/overview) |
| `strategy` | see [Strategy](#strategy-settings) | [Interaction](/concepts/interaction) |
| `interaction.isDragEnabled` | `true` | [Interaction](/concepts/interaction) |
| `interaction.isZoomEnabled` | `true` | [Interaction](/concepts/interaction) |
| `getPosition` | - | [Fixed coordinates](/views/default#fixed-coordinates) |
| `zoomFitTransitionMs` | `200` | animation duration for `recenter`/`zoomIn`/`zoomOut` |
| `isOutOfBoundsDragEnabled` | `false` | allow dragging nodes off-screen |
| `areCoordinatesRounded` | `true` | floor pointer coords for hit-testing/dragging |

### Methods

```typescript
orb.render(onRendered?)               // draw; onRendered runs after the layout settles
orb.recenter(options?, onRendered?)   // fit to view; options: { anchorX?, anchorY? }
orb.zoomIn(onRendered?)
orb.zoomOut(onRendered?)
orb.getSVG(options?): string          // export SVG (see SVG export)
orb.setSettings(partialSettings)      // update settings live (incl. render.type)
orb.setRenderer(type)                 // switch renderer: 'canvas' | 'webgl'
orb.getSettings()
orb.destroy()
```

### Accessors

`orb.data` ([Graph data](/concepts/data)) · `orb.events` ([Events](/concepts/events)) ·
`orb.interaction` ([Interaction](/concepts/interaction)).

## Render settings

Passed as `render`. All options are live-updatable via `setSettings`; changing `type`
switches the renderer (or call `orb.setRenderer(type)` directly).

| Option | Type | Default |
| --- | --- | --- |
| `type` | `'canvas' \| 'webgl'` | `'canvas'` |
| `devicePixelRatio` | `number \| null` | `null` (follows screen) |
| `fps` | `number` | `60` |
| `minZoom` | `number` | `0.25` |
| `maxZoom` | `number` | `8` |
| `fitZoomMargin` | `number` | `0.2` |
| `labelsIsEnabled` | `boolean` | `true` |
| `labelsOnEventIsEnabled` | `boolean` | `true` |
| `shadowIsEnabled` | `boolean` | `true` |
| `shadowOnEventIsEnabled` | `boolean` | `true` |
| `contextAlphaOnEvent` | `number` | `0.3` |
| `contextAlphaOnEventIsEnabled` | `boolean` | `true` |
| `backgroundColor` | `Color \| string \| null` | `null` |

See [Canvas vs WebGL](/rendering/renderers) and [Performance](/rendering/performance).

## Layout options

`layout: { type, options }`. `type` is one of `'force' | 'circular' | 'grid' | 'hierarchical'`.

### Force (`type: 'force'`)

| Option | Default |
| --- | --- |
| `useGPU` | `false` |
| `isSimulatingOnDataUpdate` | `true` |
| `isSimulatingOnSettingsUpdate` | `true` |
| `isSimulatingOnUnstick` | `true` |
| `isPhysicsEnabled` | `false` |
| `alpha` | `{ alpha: 1, alphaMin: 0.05, alphaDecay: 0.028, alphaTarget: 0 }` |
| `links` | `{ distance: 50, strength: 1, iterations: 1 }` |
| `manyBody` | `{ strength: -100, theta: 0.9, distanceMin: 1, distanceMax: 5000 }` (also takes `edgeMidpointRepulsion?: boolean`, default off - see [Force layout](/layouts/force#edge-midpoint-repulsion)) |
| `collision` | `{ radius: 15, strength: 1, iterations: 1 }` |
| `centering` | `{ x: 0, y: 0, strength: 1 }` |
| `positioning` | `{ forceX: { x: 0, strength: 0.1 }, forceY: { y: 0, strength: 0.1 } }` |
| `anchorX` / `anchorY` | `'center'` |

See [Force layout](/layouts/force) and [GPU layout](/layouts/gpu).

### Circular (`type: 'circular'`)

| Option | Default |
| --- | --- |
| `radius` | `100` |
| `centerX` | `0` |
| `centerY` | `0` |

### Grid (`type: 'grid'`)

| Option | Default |
| --- | --- |
| `rowGap` | `50` |
| `colGap` | `50` |

### Hierarchical (`type: 'hierarchical'`)

| Option | Default |
| --- | --- |
| `nodeGap` | `50` |
| `levelGap` | `50` |
| `treeGap` | `100` |
| `orientation` | `'vertical'` (or `'horizontal'`) |
| `reversed` | `false` |

All layouts also accept `anchorX` / `anchorY` (`'start' | 'center' | 'end'`). See
[Static layouts](/layouts/static).

## Strategy settings

Passed as `strategy`; all live-updatable via `setSettings`.

| Option | Default |
| --- | --- |
| `isDefaultSelectEnabled` | `true` |
| `isDefaultHoverEnabled` | `true` |
| `isDefaultMultiSelectEnabled` | `false` |
| `isDefaultSelectCascadeEnabled` | `true` |

See [Selection & interaction](/concepts/interaction).

## OrbMapView

```typescript
new OrbMapView<N, E>(container, settings: {
  getGeoPosition: (node) => { lat: number; lng: number } | undefined; // required
  map?: { zoomLevel?: number; tile?: { instance; attribution }; nodeSizeMode?: 'geographic' | 'fixed' };
  render?: RenderSettings;
  strategy?: StrategySettings;
});
```

| Map setting | Default |
| --- | --- |
| `map.zoomLevel` | `2` |
| `map.tile` | OpenStreetMap |
| `map.nodeSizeMode` | `'geographic'` |

Methods: `render`, `recenter`, `zoomIn`, `zoomOut`, `setSettings`, `setRenderer`, `destroy`.
Accessors: `data`, `events`, `interaction`, and `leaflet` (the `L.Map`).

**Constraints:** defaults to the Canvas renderer (WebGL is accepted but Canvas is standard);
`getSVG()` throws on a map view. See [Map view](/views/map).

## Events

Subscribe with `orb.events.on(OrbEventType.X, handler)`. All pointer events carry
`localPoint` (graph coords), `globalPoint` (DOM px), and `event`.

| Event | Payload highlights |
| --- | --- |
| `RENDER_START` / `RENDER_END` | `{ durationMs }` on end |
| `SIMULATION_START` / `SIMULATION_STEP` / `SIMULATION_END` | `{ progress }` on step, `{ durationMs }` on end |
| `TRANSFORM` | `{ transform: { x, y, k } }` |
| `NODE_CLICK` / `NODE_HOVER` / `NODE_RIGHT_CLICK` / `NODE_DOUBLE_CLICK` | `+ node` |
| `EDGE_CLICK` / `EDGE_HOVER` / `EDGE_RIGHT_CLICK` / `EDGE_DOUBLE_CLICK` | `+ edge` |
| `MOUSE_CLICK` / `MOUSE_MOVE` / `MOUSE_RIGHT_CLICK` / `MOUSE_DOUBLE_CLICK` | `+ subject?` |
| `NODE_DRAG_START` / `NODE_DRAG` / `NODE_DRAG_END` | `+ node` |

See [Events](/concepts/events).

## Exports

Value exports (usable at runtime):

- `OrbView`, `OrbMapView` - the views
- `RendererType` (`CANVAS`, `WEBGL`)
- `NodeShapeType` (`circle`, `dot`, `square`, `diamond`, `triangle`, `triangleDown`, `star`, `hexagon`)
- `EdgeType` (`STRAIGHT`, `CURVED`, `LOOPBACK`)
- `EdgeLineStyleType` (`SOLID`, `DASHED`, `DOTTED`, `CUSTOM`)
- `GraphObjectState` (`NONE` = 0, `SELECTED` = 1, `HOVERED` = 2)
- `OrbEventType` - event-name enum
- `Color` - color utility ([Styling](/concepts/styling#the-color-utility))
- `graphToSVG` - export a graph to SVG ([SVG export](/rendering/svg-export))
- `getDefaultGraphStyle`, `isNode`, `isEdge`, `OrbError`

`LayoutType` and the style/settings interfaces are exported as TypeScript types.
