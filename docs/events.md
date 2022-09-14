Handling events in Orb
===

In the following section, you can find a list of all supported events that Orb emits along
with an example of each event type with its event data.

# Events

Below you can find all the event types (names) that Orb supports that you can
subscribe to:

```typescript
export enum OrbEventType {
  // Renderer events for drawing on canvas
  RENDER_START = 'render-start',
  RENDER_END = 'render-end',
  // Simulation (D3) events for setting up node positions
  SIMULATION_START = 'simulation-start',
  SIMULATION_STEP = 'simulation-step',
  SIMULATION_END = 'simulation-end',
  // Mouse events: click, hover, move
  NODE_CLICK = 'node-click',
  NODE_HOVER = 'node-hover',
  EDGE_CLICK = 'edge-click',
  EDGE_HOVER = 'edge-hover',
  MOUSE_CLICK = 'mouse-click',
  MOUSE_MOVE = 'mouse-move',
  // Zoom or pan (translate) change
  TRANSFORM = 'transform',
  // Mouse node drag events
  NODE_DRAG_START = 'node-drag-start',
  NODE_DRAG = 'node-drag',
  NODE_DRAG_END = 'node-drag-end',
}
```

Subscribe to the events via `orb.events` in one of the two ways:

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.RENDER_START, () => {
  console.log('Render started');  
});

// Or use enum value directly
orb.events.on('render-start', () => {
  console.log('Render started');
});
```

# Event examples

In the following sections, you can find event subscription examples and what kind of data
you can get from each event.

## Rendering events

### Event `OrbEventType.RENDER_START`

Event is emitted on each render call before the renderer starts drawing the graph on canvas.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.RENDER_START, () => {
  console.log('Render started');  
});
```

Event data for `OrbEventType.RENDER_START` is undefined. 

### Event `OrbEventType.RENDER_END`

Event is emitted on each render call after the renderer completes drawing the graph on canvas.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.RENDER_END, (event) => {
  console.log(`Render ended in ${event.durationMs} ms`);
});
```

Event data for `OrbEventType.RENDER_END` has the following properties:

```typescript
interface Event {
  durationMs: number;
}
```

## Simulation events

Simulation is a process where a view uses `d3` simulator to calculate node positions if positions
are not defined. The simulation could take some time to position all the nodes which is the reason
why there are three simulation events you can subscribe to: start, step (progress), and end.

### Event `OrbEventType.SIMULATION_START`

Event `OrbEventType.SIMULATION_START` is emitted once the simulator starts setting up node positions. 

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.SIMULATION_START, () => {
  console.log(`Simulation started`);
});
```

Event data for `OrbEventType.SIMULATION_START` is undefined.

### Event `OrbEventType.SIMULATION_STEP`

Event `OrbEventType.SIMULATION_STEP` is emitted on each simulation step. `d3` simulator runs
node positioning in iterations where each iteration is one simulation step.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.SIMULATION_STEP, (event) => {
  console.log(`Simulation progress: ${event.progress}`);
  // If you want to see each step of the simulation, add render here
  orb.view.render();
});
```

Event data for `OrbEventType.SIMULATION_STEP` has the following properties:

```typescript
interface Event {
  progress: number;
}
```

### Event `OrbEventType.SIMULATION_END`

Event `OrbEventType.SIMULATION_END` is emitted once the simulator ends with the final node positions.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.SIMULATION_END, (event) => {
  console.log(`Simulation ended in ${event.durationMs} ms`);
});
```

Event data for `OrbEventType.SIMULATION_END` has the following properties:

```typescript
interface Event {
  durationMs: number;
}
```

## Mouse events

### Event `OrbEventType.NODE_CLICK`

Event is emitted on mouse click that selects the node. The event `OrbEventType.MOUSE_CLICK` will also be
triggered.
 
```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.NODE_CLICK, (event) => {
  console.log(`Node clicked`, event.node);
});
```

Event data for `OrbEventType.NODE_CLICK` has the following properties:

```typescript
interface Event {
  node: INode;
  event: PointerEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas.

### Event `OrbEventType.NODE_HOVER`

Event is emitted on mouse move that hovers the node. The event `OrbEventType.MOUSE_MOVE` will also be
triggered.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.NODE_HOVER, (event) => {
  console.log(`Node hovered`, event.node);
});
```

Event data for `OrbEventType.NODE_HOVER` has the following properties:

```typescript
interface Event {
  node: INode;
  event: MouseEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas.

### Event `OrbEventType.EDGE_CLICK`

Event is emitted on mouse click that selects the edge. The event `OrbEventType.MOUSE_CLICK` will also be
triggered.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.EDGE_CLICK, (event) => {
  console.log(`Edge clicked`, event.edge);
});
```

Event data for `OrbEventType.EDGE_CLICK` has the following properties:

```typescript
interface Event {
  edge: IEdge;
  event: PointerEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas.

### Event `OrbEventType.EDGE_HOVER` _(not supported currently)_

Event is emitted on mouse move that hovers the edge. The event `OrbEventType.MOUSE_MOVE` will also be
triggered.

> Note: The following event is not supported because of the performance issue to calculate
> the distance to the closest edge to hover it.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.EDGE_HOVER, (event) => {
  console.log(`Edge hovered`, event.node);
});
```

Event data for `OrbEventType.EDGE_HOVER` has the following properties:

```typescript
interface Event {
  edge: IEdge;
  event: MouseEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas.

### Event `OrbEventType.MOUSE_CLICK`

The event is emitted on a mouse click within the canvas. If there is a graph object (node or
edge) at the mouse click position, `OrbEventType.NODE_CLICK` and `OrbEventType.EDGE_CLICK` events
will be triggered too. 

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.MOUSE_CLICK, (event) => {
  console.log(`Mouse clicked`, event);
});
```

Event data for `OrbEventType.MOUSE_CLICK` has the following properties:

```typescript
interface Event {
  subject?: INode | IEdge;
  event: PointerEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas. Property `subject` will be filled with either `INode`
or `IEdge` if the mouse click position is on top of the node or edge. The same objects are received in
the events `OrbEventType.NODE_CLICK` and `OrbEventType.EDGE_CLICK`.

If you need to check if `subject` is a `INode` or `IEdge` use type check functions from orb:

```typescript
import { isNode, isEdge, OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.MOUSE_CLICK, (event) => {
  if (event.subject && isNode(event.subject)) {
    console.log(`Mouse clicked on top of the node`, event.subject);  
  }
  if (event.subject && isEdge(event.subject)) {
    console.log(`Mouse clicked on top of the edge`, event.subject);
  }
});
```

### Event `OrbEventType.MOUSE_MOVE`

Event is emitted on any mouse movement within the canvas. If there is a graph object (node or
edge) at the mouse position, `OrbEventType.NODE_HOVER` and `OrbEventType.EDGE_HOVER` events will
be triggered too.

```typescript
orb.events.on(OrbEventType.MOUSE_MOVE, (event) => {
  console.log(`Mouse moved`, event);
});
```

Event data for `OrbEventType.MOUSE_MOVE` has the following properties:

```typescript
interface Event {
  subject?: INode | IEdge;
  event: MouseEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas. Property `subject` will be filled with either `INode`
or `IEdge` if the mouse position is on top of the node or edge. The same objects are received in the
events `OrbEventType.NODE_CLICK` and `OrbEventType.EDGE_CLICK`.

If you need to check if `subject` is a `INode` or `IEdge` use type check functions from orb:

```typescript
import { isNode, isEdge, OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.MOUSE_MOVE, (event) => {
  if (event.subject && isNode(event.subject)) {
    console.log(`Mouse moved over the node`, event.subject);  
  }
  if (event.subject && isEdge(event.subject)) {
    console.log(`Mouse moved over the edge`, event.subject);
  }
});
```

## Zoom and pan events

### Event `OrbEventType.TRANSFORM`

Event is emitted on any zoom or pan event.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.TRANSFORM, (event) => {
  console.log(`Zoom or pan event`, event);
});
```

Event data for `OrbEventType.TRANSFORM` has the following properties:

```typescript
interface Event {
  transform: { x: number; y: number, k: number };
}
```

Properties `x` and `y` are translation coordinates while `k` stands for zoom scale. If `DefaultView`
is used, `transform` data is actually same as `ZoomTransform` type from `d3` library.  

## Node dragging events

Node dragging events are events that are emitted on node dragging which starts with a mouse click and
hold, mouse movement, and ends with mouse click release. 

> Note: Node dragging events might not be enabled on some views, e.g. `MapView` which currently
> has a fixed position for each node by `latitude` and `longitude` values.

### Event `OrbEventType.NODE_DRAG_START`

The event is emitted when node drag starts. If a user just clicks on a node, four events will be
triggered: `OrbEventType.NODE_DRAG_START`, `OrbEventType.NODE_DRAG_END`, `OrbEventType.NODE_CLICK`,
and `OrbEventType.MOUSE_CLICK`. If you want to listen just for drag then combine `OrbEventType.NODE_DRAG`
with `OrbEventType.NODE_DRAG_(START|END)`.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.NODE_DRAG_START, (event) => {
  console.log(`Node drag started`, event);
});
```

Event data for `OrbEventType.NODE_DRAG_START` has the following properties:

```typescript
interface Event {
  node: INode;
  event: MouseEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas.

### Event `OrbEventType.NODE_DRAG`

Event is emitted on every mouse movement which is dragging a node with it. Event `OrbEventType.MOUSE_MOVE`
will also be triggered.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.NODE_DRAG, (event) => {
  console.log(`Node dragged`, event);
});
```

Event data for `OrbEventType.NODE_DRAG` has the following properties:

```typescript
interface Event {
  node: INode;
  event: MouseEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas.

### Event `OrbEventType.NODE_DRAG_END`

The event is emitted when node drag ends. If a user just clicks on a node, four events will
be triggered: `OrbEventType.NODE_DRAG_START`, `OrbEventType.NODE_DRAG_END`, `OrbEventType.NODE_CLICK`,
and `OrbEventType.MOUSE_CLICK`. If you want to listen just for drag then combine `OrbEventType.NODE_DRAG`
with `OrbEventType.NODE_DRAG_(START|END)`.

```typescript
import { OrbEventType } from '@memgraph/orb';

orb.events.on(OrbEventType.NODE_DRAG_END, (event) => {
  console.log(`Node drag ended`, event);
});
```

Event data for `OrbEventType.NODE_DRAG_END` has the following properties:

```typescript
interface Event {
  node: INode;
  event: MouseEvent;
  localPoint: { x: number; y: number };
  globalPoint: { x: number; y: number };
}
```

Property `localPoint` contains the coordinates in the system of node positions, while `globalPoint`
is the original mouse coordinate on the canvas.
