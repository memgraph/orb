# Performance

For most graphs the defaults are fine. When a graph gets large, these are the knobs that
matter, roughly in order of impact.

## Renderer and layout

Use the [WebGL renderer](/rendering/renderers) and the [GPU layout](/layouts/gpu) for large
graphs - they're the biggest wins. The CPU force layout also runs in a **web worker** by
default, keeping simulation off the main thread. (Loading Orb from a plain `<script>` tag
falls back to main-thread simulation - install with a bundler to keep the worker.)

## Render settings

Pass these under `render`:

| Setting | Default | Notes |
| --- | --- | --- |
| `labelsIsEnabled` | `true` | Labels are expensive to draw; disable for large graphs. |
| `labelsOnEventIsEnabled` | `true` | Show labels only on hover/select instead of always. |
| `shadowIsEnabled` | `true` | Shadows are expensive too; disable for large graphs. |
| `shadowOnEventIsEnabled` | `true` | Show shadows only on hover/select. |
| `fps` | `60` | Cap the frame rate to save CPU. |
| `devicePixelRatio` | `null` | `null` follows the screen; set a fixed value (e.g. `1`) to draw fewer pixels on HiDPI displays. |
| `minZoom` / `maxZoom` | `0.25` / `8` | Zoom bounds. Lower `minZoom` to fit very large graphs (see below). |
| `fitZoomMargin` | `0.2` | Padding used by `recenter` when fitting the graph. |

```typescript
const orb = new OrbView(container, {
  render: { type: 'webgl', labelsIsEnabled: false, shadowIsEnabled: false, minZoom: 0.001 },
  layout: { type: 'force', options: { useGPU: true } },
});
```

::: tip Fitting large graphs
`recenter` can't zoom out past `minZoom`. A big graph may need a lower value (e.g.
`minZoom: 0.001`) to fit fully in the viewport.
:::

## Selection dimming

On hover or selection, Orb dims everything else. Tune or disable it under `render`:

| Setting | Default | Notes |
| --- | --- | --- |
| `contextAlphaOnEvent` | `0.3` | Opacity of the dimmed (non-selected) objects. |
| `contextAlphaOnEventIsEnabled` | `true` | Set `false` to keep everything fully opaque. |

## Other

- `areCoordinatesRounded` (default `true`) floors the pointer's canvas coordinates when
  hit-testing and dragging, which avoids aliasing on interaction.
- When updating many objects at once, pass `{ isNotifySkipped: true }` to `setStyle` /
  `setPosition` and call `orb.render()` once at the end, instead of re-rendering per change.
