# Selection & interaction

Orb ships with built-in interaction: clicking selects, hovering highlights, dragging moves
nodes, and scrolling zooms. You can tune this behavior with settings, or drive selection
and hover yourself through the programmatic API.

<OrbDemo src="/demos/interaction.html" :height="460" />

## Built-in behavior

Selection and hover are governed by the `strategy` settings on a view:

```typescript
const orb = new OrbView(container, {
  strategy: {
    isDefaultSelectEnabled: true, // click to select (default: true)
    isDefaultHoverEnabled: true, // hover to highlight (default: true)
    isDefaultMultiSelectEnabled: false, // Shift-click to select many (default: false)
    isDefaultSelectCascadeEnabled: true, // selecting a node also selects its edges (default: true)
  },
});
```

- **Select** - clicking a node or edge selects it and puts it in the `SELECTED` state.
- **Cascade** - with cascade on, selecting a node also selects its connected edges (and
  adjacent nodes), so a whole neighborhood highlights together.
- **Multiselect** - off by default. When enabled, **Shift-click** appends to the selection
  (and toggles an already-selected object); a plain click still selects just one.
- **Hover** - moving over a node or edge puts it in the `HOVERED` state.

Panning, zooming, and dragging live under `interaction` instead:

```typescript
const orb = new OrbView(container, {
  interaction: {
    isDragEnabled: true, // drag nodes (default: true)
    isZoomEnabled: true, // scroll to zoom, drag background to pan (default: true)
    backgroundDrag: {
      isEnabled: false, // emit background-drag events on a modifier + drag (default: false)
      modifier: 'shift', // 'shift' | 'ctrl' | 'alt' | 'meta' | null (default: 'shift')
    },
  },
});
```

- **Background drag** - off by default. When enabled, dragging the empty background with the
  modifier held emits neutral `BACKGROUND_DRAG_*` [events](/concepts/events) instead of
  panning; a plain drag still pans. It's the gesture [rectangle selection](#rectangle-selection)
  is built on, and is equally usable for custom box-zoom or lasso.

To disable Orb's built-in selection entirely and handle it yourself, turn off the strategy
flags and drive state from [events](/concepts/events).

## Object state

Every node and edge is in one of three states, from `GraphObjectState`:

```typescript
import { GraphObjectState } from '@memgraph/orb';

GraphObjectState.NONE; // 0
GraphObjectState.SELECTED; // 1
GraphObjectState.HOVERED; // 2
```

Style properties suffixed `Selected` / `Hover` (e.g. `colorSelected`, `borderColorHover`)
apply automatically in those states - see [Styling](/concepts/styling).

Read the current selection and hover from `orb.data`:

```typescript
orb.data.getSelectedNodes();
orb.data.getSelectedEdges();
orb.data.getHoveredNodes();
orb.data.getHoveredEdges();
```

## Programmatic selection

`orb.interaction` selects and hovers by id - useful for syncing the graph with an external
list, search box, or your app state. Selection methods return whether the object existed;
`unselectAll` / `unhoverAll` return how many objects changed.

```typescript
// Select / unselect
orb.interaction.selectNodeById(1);
orb.interaction.selectEdgeById(10);
orb.interaction.unselectNodeById(1);
orb.interaction.unselectEdgeById(10);
orb.interaction.unselectAll();

// Select many at once (non-cascading by default), returns the matched count
orb.interaction.selectNodesByIds([1, 2, 3]);
orb.interaction.unselectNodesByIds([1, 2, 3]);
orb.interaction.selectEdgesByIds([10, 11]);
orb.interaction.unselectEdgesByIds([10, 11]);

// Hover
orb.interaction.hoverNodeById(1);
orb.interaction.hoverEdgeById(10);
orb.interaction.unhoverAll();
```

Selection accepts `ISelectionOptions` with a single flag, `cascade` (default `true`) -
matching the `isDefaultSelectCascadeEnabled` behavior above. Pass `cascade: false` to
select just the one object without its neighborhood:

```typescript
orb.interaction.selectNodeById(1, { cascade: false });
```

### Example: select from a search box

```typescript
searchInput.addEventListener('change', (e) => {
  const match = orb.data
    .getNodes()
    .find((n) => n.getLabel() === e.target.value);

  orb.interaction.unselectAll();
  if (match) orb.interaction.selectNodeById(match.getId());
});
```

## Rectangle selection

Selecting a whole region at once - drag a box, select the nodes inside - ships as an opt-in
module, `@memgraph/orb/interactions`, kept out of the core bundle so you only pay for it when
you use it.

<OrbDemo src="/demos/rectangle-selection.html" :height="460" />

It takes **two steps**: enable the background-drag gesture on the view, then attach a
`RectangleSelection` to it.

```typescript
import { OrbView } from '@memgraph/orb';
import { RectangleSelection } from '@memgraph/orb/interactions';

const orb = new OrbView(container, {
  interaction: { backgroundDrag: { isEnabled: true, modifier: 'shift' } },
});

const selection = new RectangleSelection(orb);
selection.on('select', ({ nodes, area, mode }) => {
  // nodes are now selected; mode is 'add' or 'replace'. Want edges too? You have the
  // nodes, so select whichever edges you like - e.g. those fully inside the box:
  const ids = new Set(nodes.map((n) => n.getId()));
  const edges = orb.data.getEdges((e) => ids.has(e.startNode?.getId()) && ids.has(e.endNode?.getId()));
  orb.interaction.selectEdgesByIds(edges.map((e) => e.getId()));
  orb.render();
});
```

By default, **Shift-drag** over the empty background draws the box and adds the nodes to
the selection (mirroring Shift-click); holding **Ctrl/Cmd** as well replaces it instead.
Dragging a node still moves it, and a plain drag still pans. Call `selection.destroy()` to
detach it.

::: warning Requires background drag
`RectangleSelection` only listens - it does not enable the gesture. If
`interaction.backgroundDrag.isEnabled` is not set on the view, attaching it does nothing and
Shift-drag is a no-op.
:::

`RectangleSelection` accepts `IRectangleSelectionOptions`:

| Option | Type | Default |
| --- | --- | --- |
| `resolveMode` | `(event: MouseEvent) => 'add' \| 'replace'` | ctrl/meta → `replace`, else `add` |
| `style` | `Partial<IRectangleSelectionStyle>` | dashed blue overlay |

The overlay element carries the `orb-selection-rectangle` class, so you can also style it
from CSS.

The module is built entirely on public API, so the same primitives are available if you want
a different gesture (lasso, custom modifiers):

```typescript
import { RectangleArea } from '@memgraph/orb';

const area = new RectangleArea({ x, y, width, height });
const nodes = orb.data.getNodesInArea(area); // nodes whose center is inside
orb.interaction.selectNodesByIds(nodes.map((n) => n.getId()));
```

## Dimming the rest of the graph

On selection or hover, Orb dims everything else so the focus stands out. That transparency
is a render setting (`contextAlphaOnEvent`, `contextAlphaOnEventIsEnabled`) covered in
[Performance](/rendering/performance).

## Next steps

- [Events](/concepts/events) - build custom interaction on top of raw pointer events
- [Styling](/concepts/styling) - style the selected and hovered states
