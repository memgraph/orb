# Static layouts

Static layouts compute node positions once, with no simulation. Orb has three. Switch
between them (and force) here:

<OrbDemo src="/demos/layouts.html?type=circular" :height="460" />

## Circular

Nodes evenly spaced around a circle.

```typescript
orb.setSettings({ layout: { type: 'circular', options: { radius: 200 } } });
```

| Option | Default | Description |
| --- | --- | --- |
| `radius` | `100` | Circle radius. |
| `centerX` | `0` | Circle center x. |
| `centerY` | `0` | Circle center y. |

## Grid

Nodes on a regular grid, filled row by row.

```typescript
orb.setSettings({ layout: { type: 'grid', options: { rowGap: 60, colGap: 60 } } });
```

| Option | Default | Description |
| --- | --- | --- |
| `rowGap` | `50` | Vertical spacing between rows. |
| `colGap` | `50` | Horizontal spacing between columns. |

## Hierarchical

Tree-like, arranged in levels - good for graphs with a clear parent/child structure.

```typescript
orb.setSettings({
  layout: { type: 'hierarchical', options: { orientation: 'horizontal' } },
});
```

| Option | Default | Description |
| --- | --- | --- |
| `nodeGap` | `50` | Spacing between sibling nodes. |
| `levelGap` | `50` | Spacing between levels. |
| `treeGap` | `100` | Spacing between separate trees (disconnected components). |
| `orientation` | `'vertical'` | `'vertical'` (levels top-to-bottom) or `'horizontal'` (left-to-right). |
| `reversed` | `false` | Flip the level order. |

::: tip
All layouts also accept `anchorX` / `anchorY` (`'start' | 'center' | 'end'`) to control where
the result is anchored in the view.
:::
