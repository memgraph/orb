# Styling

Every node and edge has a `style` object controlling color, size, shape, borders,
shadows, and labels. You can style objects individually, or theme the whole graph at once
with a default-style callback.

<OrbDemo src="/demos/styled.html" :height="460" />

## Two ways to style

### Per object

```typescript
const node = orb.data.getNodeById(0);
node.patchStyle({ size: 10, color: '#FB6E00' }); // merge
node.setStyle({ size: 10 }); // replace
```

### Default style (recommended)

`setDefaultStyle` runs a callback for every node and edge - new ones included - so you
theme the graph in one place instead of touching each object.

```typescript
orb.data.setDefaultStyle({
  getNodeStyle(node) {
    return {
      size: 8,
      color: '#FB6E00',
      label: node.getData().label,
    };
  },
  getEdgeStyle(edge) {
    return {
      color: '#BAB8BB',
      width: 0.5,
      label: edge.getData().label,
    };
  },
});

orb.data.setup({ nodes, edges });
```

::: tip
Orb doesn't guess which field is the label. Set the `label` style property (usually via a
default-style callback) or nothing will render below the node.
:::

::: warning
`setDefaultStyle` only styles objects that don't already have a style, so calling it again
won't restyle the existing graph. To restyle live, set the style on each object and render:

```typescript
orb.data.getNodes().forEach((node) => node.setStyle(nextStyle, { isNotifySkipped: true }));
orb.render();
```
:::

## Node style properties

Defined by `INodeStyle`. Base defaults are `size: 5` and `color: '#1d87c9'`.

| Property | Type | Description |
| --- | --- | --- |
| `color` | `Color \| string` | Background color. |
| `colorHover`, `colorSelected` | `Color \| string` | Color on hover / selection (falls back to `color`). |
| `borderColor` | `Color \| string` | Border color. |
| `borderColorHover`, `borderColorSelected` | `Color \| string` | Border color on hover / selection. |
| `borderWidth`, `borderWidthSelected` | `number` | Border width (and its selected variant). |
| `size` | `number` | Radius. |
| `shape` | `NodeShapeType` | `circle`, `dot`, `square`, `diamond`, `triangle`, `triangleDown`, `star`, `hexagon`. |
| `label` | `string` | Text rendered below the node. |
| `fontSize`, `fontColor`, `fontFamily`, `fontBackgroundColor` | | Label typography. Set `fontSize: 0` to hide the label. |
| `imageUrl`, `imageUrlSelected` | `string` | Image background (overrides `color`). |
| `shadowColor`, `shadowSize`, `shadowOffsetX`, `shadowOffsetY` | | Drop shadow. |
| `zIndex` | `number` | Stacking order during render. |

## Edge style properties

Defined by `IEdgeStyle`. Base defaults are `color: '#ababab'` and `width: 0.3`.

| Property | Type | Description |
| --- | --- | --- |
| `color` | `Color \| string` | Line color. |
| `colorHover`, `colorSelected` | `Color \| string` | Line color on hover / selection. |
| `width`, `widthHover`, `widthSelected` | `number` | Line width and its event variants. |
| `arrowSize` | `number` | Arrowhead scale relative to `width`. `0` hides the arrow. |
| `label` | `string` | Text rendered at the middle of the edge. |
| `fontSize`, `fontColor`, `fontFamily`, `fontBackgroundColor` | | Label typography. |
| `lineStyle` | `IEdgeLineStyle` | Line dash pattern - see below. |
| `shadowColor`, `shadowSize`, `shadowOffsetX`, `shadowOffsetY` | | Line shadow. |
| `zIndex` | `number` | Stacking order during render. |

### Line style

`lineStyle` sets the dash pattern via `EdgeLineStyleType`:

```typescript
import { EdgeLineStyleType } from '@memgraph/orb';

edge.patchStyle({ lineStyle: { type: EdgeLineStyleType.DASHED } });
edge.patchStyle({ lineStyle: { type: EdgeLineStyleType.DOTTED } });

// A custom dash pattern (canvas dash array): 6px on, 3px off
edge.patchStyle({ lineStyle: { type: EdgeLineStyleType.CUSTOM, pattern: [6, 3] } });
```

Available types: `SOLID` (default), `DASHED`, `DOTTED`, and `CUSTOM` (requires `pattern`).

## The `Color` utility

Color properties accept a hex string or a `Color` instance, which adds helpers:

```typescript
import { Color } from '@memgraph/orb';

const base = new Color('#FB6E00');
base.getDarkerColor(); // darker tone (factor defaults to 0.3)
base.getLighterColor(); // lighter tone
base.getMixedColor(new Color('#ffffff'));
Color.getColorFromRGB({ r: 251, g: 110, b: 0 });
Color.getRandomColor();
```

A common pattern - derive hover/selected tones from a base color:

```typescript
const c = new Color('#FB6E00');
node.patchStyle({
  color: c,
  colorHover: c.getLighterColor(),
  colorSelected: c.getDarkerColor(),
});
```

## Global label and shadow toggles

Labels and shadows are the most expensive things to draw. For large graphs you can toggle
them globally through render settings rather than per object. See
[Performance](/rendering/performance).

## Next steps

- [Selection & interaction](/concepts/interaction) - hover and selection states
- [Events](/concepts/events) - restyle in response to clicks and hovers
