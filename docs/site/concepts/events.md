# Events

Subscribe to graph events through `orb.events`, which is a typed emitter. Use
`OrbEventType` for the event names so payloads are typed.

<OrbDemo src="/demos/events.html" :height="460" />

```typescript
import { OrbView, OrbEventType } from '@memgraph/orb';

const orb = new OrbView(container);

orb.events.on(OrbEventType.NODE_CLICK, ({ node, localPoint, globalPoint }) => {
  console.log('clicked', node.getId(), 'at graph point', localPoint);
});

// Remove listeners when you're done.
orb.events.off(OrbEventType.NODE_CLICK, handler);
```

## Pointer position: `localPoint` vs `globalPoint`

Every pointer event carries the position in two coordinate systems:

- **`localPoint`** - graph (simulation) coordinates. Compare these against node positions,
  or pass to `orb.data.getNearestNode(localPoint)`.
- **`globalPoint`** - DOM pixel coordinates inside the container. Use these to position an
  HTML overlay such as a tooltip or context menu.

They also carry the raw DOM `event` (a `PointerEvent` for clicks, a `MouseEvent` for moves)
so you can read modifier keys, prevent default, etc.

## Event reference

### Lifecycle

| Event | Payload | Fires when |
| --- | --- | --- |
| `RENDER_START` | - | A render pass begins. |
| `RENDER_END` | `{ durationMs }` | A render pass completes. |
| `SIMULATION_START` | - | Layout simulation begins. |
| `SIMULATION_STEP` | `{ progress }` | Each simulation tick. `progress` is `0`-`1`. |
| `SIMULATION_END` | `{ durationMs }` | Simulation settles. |
| `TRANSFORM` | `{ transform: { x, y, k } }` | The view is panned or zoomed (`k` is scale). |

### Pointer

All pointer events include `localPoint`, `globalPoint`, and `event`. Node events add
`node`; edge events add `edge`; generic mouse events add an optional `subject` (the node or
edge under the cursor, if any).

| Event | Adds | Fires when |
| --- | --- | --- |
| `NODE_CLICK` | `node` | A node is clicked. |
| `EDGE_CLICK` | `edge` | An edge is clicked. |
| `MOUSE_CLICK` | `subject?` | The canvas is clicked (node/edge if hit). |
| `NODE_HOVER` | `node` | The cursor enters a node. |
| `EDGE_HOVER` | `edge` | The cursor enters an edge. |
| `MOUSE_MOVE` | `subject?` | The cursor moves over the canvas. |
| `NODE_RIGHT_CLICK` | `node` | A node is right-clicked. |
| `EDGE_RIGHT_CLICK` | `edge` | An edge is right-clicked. |
| `MOUSE_RIGHT_CLICK` | `subject?` | The canvas is right-clicked. |
| `NODE_DOUBLE_CLICK` | `node` | A node is double-clicked. |
| `EDGE_DOUBLE_CLICK` | `edge` | An edge is double-clicked. |
| `MOUSE_DOUBLE_CLICK` | `subject?` | The canvas is double-clicked. |

### Drag

Node drag emits a sequence of `node` + position events. Dragging is controlled by
`interaction.isDragEnabled` (on by default) - see [Default view](/views/default).

| Event | Payload | Fires when |
| --- | --- | --- |
| `NODE_DRAG_START` | `node`, position, `event` | A node drag begins. |
| `NODE_DRAG` | `node`, position, `event` | The node moves during a drag. |
| `NODE_DRAG_END` | `node`, position, `event` | The drag ends. |

Dragging the empty background emits a separate, subject-less sequence, off by default and
enabled with `interaction.backgroundDrag` - see [Selection & interaction](/concepts/interaction).

| Event | Payload | Fires when |
| --- | --- | --- |
| `BACKGROUND_DRAG_START` | position, `event` | A background drag begins (modifier held, no node hit). |
| `BACKGROUND_DRAG` | position, `event` | The cursor moves during a background drag. |
| `BACKGROUND_DRAG_END` | position, `event` | The background drag ends. |

## Examples

### A tooltip that follows the cursor

```typescript
orb.events.on(OrbEventType.NODE_HOVER, ({ node, globalPoint }) => {
  tooltip.style.left = `${globalPoint.x}px`;
  tooltip.style.top = `${globalPoint.y}px`;
  tooltip.textContent = node.getLabel();
  tooltip.hidden = false;
});

orb.events.on(OrbEventType.MOUSE_MOVE, ({ subject }) => {
  if (!subject) tooltip.hidden = true;
});
```

### A context menu on right-click

```typescript
orb.events.on(OrbEventType.NODE_RIGHT_CLICK, ({ node, globalPoint, event }) => {
  event.preventDefault();
  openContextMenu(node, globalPoint);
});
```

### A simulation progress bar

```typescript
orb.events.on(OrbEventType.SIMULATION_STEP, ({ progress }) => {
  progressBar.value = progress; // 0 → 1
});
orb.events.on(OrbEventType.SIMULATION_END, () => {
  progressBar.hidden = true;
});
```

## Next steps

- [Selection & interaction](/concepts/interaction) - Orb's built-in click/hover behavior
- [Styling](/concepts/styling) - change styles in response to events
