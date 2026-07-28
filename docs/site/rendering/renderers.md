# Canvas vs WebGL

Orb draws with one of two renderers, chosen through `render.type` when you create the view.

```typescript
const orb = new OrbView(container, {
  render: { type: 'canvas' }, // 'canvas' (default) | 'webgl'
});
```

## Which one

- **Canvas** (default) - the 2D canvas renderer. Crisp and simple; the right choice for
  small and medium graphs.
- **WebGL** - GPU-accelerated drawing that stays interactive with tens of thousands of
  nodes. Use it for large graphs, usually together with the [GPU layout](/layouts/gpu).

Both share the same styling, events, and interaction - the difference is how many elements
they can draw before the frame rate drops.

## Switching renderer at runtime

The renderer type is chosen when the view is constructed, but you can switch it on a live
view without recreating anything. Use the dedicated `setRenderer` method:

```typescript
orb.setRenderer('webgl'); // 'canvas' | 'webgl'
```

Passing a new `render.type` to `setSettings` does the same thing:

```typescript
orb.setSettings({ render: { type: 'webgl' } });
```

Either call destroys the old renderer, creates the new one, and preserves the current
pan/zoom transform before re-rendering, so the graph stays in place. Switching to the same
type it is already using is a no-op.

## Background color

By default the canvas is transparent (`backgroundColor: null`), so the page shows through.
Set a color to fill it (this also becomes the default background for [SVG
export](/rendering/svg-export)):

```typescript
const orb = new OrbView(container, { render: { backgroundColor: '#ffffff' } });
```

## Map view

The [Map view](/views/map) defaults to the Canvas renderer, since the graph is drawn over
Leaflet map tiles. You can pass `render.type: 'webgl'`, but Canvas is the standard, tested
choice there.

See [Performance](/rendering/performance) for the settings that matter most on large graphs.
