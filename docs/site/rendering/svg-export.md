# SVG export

Orb can serialize the current graph to a standalone SVG string - useful for downloads,
print, or handing a vector snapshot to another tool. Export is vector-based and independent
of the on-screen renderer.

## From a view

The simplest path is `orb.getSVG()`, which exports the view's current graph and picks up
the view's `render.backgroundColor`:

```typescript
const svg = orb.getSVG(); // string of <svg>…</svg>
```

::: warning
`getSVG()` is available on `OrbView` only. Calling it on `OrbMapView` throws - a map view's
background is external tiles, which can't be embedded as vector graphics.
:::

## From graph data

`graphToSVG` exports any graph directly, without going through a view:

```typescript
import { graphToSVG } from '@memgraph/orb';

const svg = graphToSVG(orb.data, {
  backgroundColor: '#ffffff',
  padding: 24,
});
```

## Options

`ISVGExportOptions`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `backgroundColor` | `Color \| string \| null` | `null` | Fill behind the graph. `null` leaves it transparent. |
| `padding` | `number` | `20` | Padding (px) around the graph's bounding box. |
| `isLabelEnabled` | `boolean` | `true` | Include node/edge labels. |
| `isShadowEnabled` | `boolean` | `true` | Include shadows. |
| `isImageEnabled` | `boolean` | `true` | Include node background images. |

Disabling labels, shadows, and images yields a smaller, flatter file:

```typescript
const svg = orb.getSVG({
  isLabelEnabled: false,
  isShadowEnabled: false,
  isImageEnabled: false,
});
```

## Downloading the result

`getSVG` returns a string, so triggering a download is a few lines:

```typescript
function downloadSVG(orb, filename = 'graph.svg') {
  const svg = orb.getSVG({ backgroundColor: '#ffffff' });
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
```

## Next steps

- [Canvas vs WebGL](/rendering/renderers) - the on-screen renderers
- [Styling](/concepts/styling) - styles carry through to the exported SVG
