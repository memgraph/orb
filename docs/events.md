Handling events in Orb
===

In the following section you can find a list of all supported events that Orb emits along
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
import { OrbEventType } from 'orb';

orb.events.on(OrbEventType.RENDER_START, () => {
  console.log('Render started');  
});

// Or use enum value directly
orb.events.on('render-start', () => {
  console.log('Render started');
});
```

# Event examples

In the following sections you can find event subscription examples and what kind of data
you can get from each event.

## Rendering events

### Event `render-start`

Event is emitted on each render call before renderer starts drawing graph on canvas.

```typescript
import { OrbEventType } from 'orb';

orb.events.on(OrbEventType.RENDER_START, () => {
  console.log('Render started');  
});
```

Event data for `RENDER_START` is undefined. 

### Event `render-end`

Event is emitted on each render call after renderer completes drawing graph on canvas.

```typescript
orb.events.on(OrbEventType.RENDER_END, (event) => {
  console.log(`Render ended in ${event.durationMs} ms`);
});
```

Event data for `RENDER_END` has the following properties:

```typescript
interface Event {
  durationMs: number;
}
```

## Simulation events

Simulation is a process where a view uses `d3` simulator to calculate node positions if positions
are not defined. The simulation could take some time to position all the nodes which is the reason
why there are three simulation events you can subscribe to: start, step (progress), end.

### Event `simulation-start`

Event `SIMULATION_START` is emitted once simulator starts with setting up node positions. 

```typescript
orb.events.on(OrbEventType.SIMULATION_START, () => {
  console.log(`Simulation started`);
});
```

Event data for `SIMULATION_START` is undefined.

### Event `simulation-step`

Event `SIMULATION_STEP` is emitted on each simulation step. `d3` simulator runs node positioning
in iterations where each iteration is one simulation step.

```typescript
orb.events.on(OrbEventType.SIMULATION_STEP, (event) => {
  console.log(`Simulation progress: ${event.progress}`);
  // If you want to see each step of the simulation, add render here
  orb.view.render();
});
```

Event data for `SIMULATION_STEP` has the following properties:

```typescript
interface Event {
  progress: number;
}
```

### Event `simulation-end`

Event `SIMULATION_END` is emitted once simulator ends with final node positions.

```typescript
orb.events.on(OrbEventType.SIMULATION_END, (event) => {
  console.log(`Simulation ended in ${event.durationMs} ms`);
});
```

Event data for `SIMULATION_END` has the following properties:

```typescript
interface Event {
  durationMs: number;
}
```

## Mouse events

### Event `node-click`

Event is emitted on mouse click that selects the node. The event `MOUSE_CLICK` will also be
triggered.
 
```typescript
orb.events.on(OrbEventType.NODE_CLICK, (event) => {
  console.log(`Node clicked`, event.node);
});
```

Event data for `NODE_CLICK` has the following properties:

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

### Event `node-hover`

Event is emitted on mouse move that hovers the node. The event `MOUSE_MOVE` will also be
triggered.

```typescript
orb.events.on(OrbEventType.NODE_HOVER, (event) => {
  console.log(`Node hovered`, event.node);
});
```

Event data for `NODE_HOVER` has the following properties:

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

### Event `edge-click`

Event is emitted on mouse click that selects the edge. The event `MOUSE_CLICK` will also be
triggered.

```typescript
orb.events.on(OrbEventType.EDGE_CLICK, (event) => {
  console.log(`Edge clicked`, event.edge);
});
```

Event data for `EDGE_CLICK` has the following properties:

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

### Event `edge-hover` _(not supported currently)_

Event is emitted on mouse move that hovers the edge. The event `MOUSE_MOVE` will also be
triggered.

> Note: The following event is not supported because of the performance issue to calculate
> distance to the closest edge in order to hover it.

```typescript
orb.events.on(OrbEventType.EDGE_HOVER, (event) => {
  console.log(`Edge hovered`, event.node);
});
```

Event data for `EDGE_HOVER` has the following properties:

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

### Event `mouse-click`

Event is emitted on mouse click within the canvas. If there is graph object (node or edge) at
the mouse click position, `NODE_CLICK` and `EDGE_CLICK` events will be triggered too. 

```typescript
orb.events.on(OrbEventType.MOUSE_CLICK, (event) => {
  console.log(`Mouse clicked`, event);
});
```

Event data for `MOUSE_CLICK` has the following properties:

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
or `IEdge` if mouse click position is on top of the node or edge. Same objects are received in the
events `NODE_CLICK` and `EDGE_CLICK`.

If you need to check if `subject` is a `INode` or `IEdge` use type check functions from orb:

```typescript
import { isNode, isEdge } from 'orb';

orb.events.on(OrbEventType.MOUSE_CLICK, (event) => {
  if (event.subject && isNode(event.subject)) {
    console.log(`Mouse clicked on top of the node`, event.subject);  
  }
  if (event.subject && isEdge(event.subject)) {
    console.log(`Mouse clicked on top of the edge`, event.subject);
  }
});
```

### Event `mouse-move`

Event is emitted on any mouse movement within the canvas. If there is graph object (node or edge) at
the mouse position, `NODE_HOVER` and `EDGE_HOVER` events will be triggered too.

```typescript
orb.events.on(OrbEventType.MOUSE_MOVE, (event) => {
  console.log(`Mouse moved`, event);
});
```

Event data for `MOUSE_MOVE` has the following properties:

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
or `IEdge` if mouse position is on top of the node or edge. Same objects are received in the
events `NODE_CLICK` and `EDGE_CLICK`.

If you need to check if `subject` is a `INode` or `IEdge` use type check functions from orb:

```typescript
import { isNode, isEdge } from 'orb';

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

### Event `transform`

Event is emitted on any zoom or pan event.

```typescript
orb.events.on(OrbEventType.TRANSFORM, (event) => {
  console.log(`Zoom or pan event`, event);
});
```

Event data for `TRANSFORM` has the following properties:

```typescript
interface Event {
  transform: { x: number; y: number, k: number };
}
```

Properties `x` and `y` are translation coordinates while `k` stands for zoom scale. If `DefaultView`
is used `transform` data is actually same as `ZoomTransform` type from `d3` library.  

## Node dragging events

Node dragging events are events that are emitted on node dragging which starts with mouse click and
hold, mouse movement and ends with mouse click release. 

> Note: Node dragging events might not be enabled on some views, e.g. `MapView` which currently
> has a fixed position for each node by `latitude` and `longitude` values.

### Event `node-drag-start`

Event is emitted when node drag starts. If user just clicks on a node, four events will be triggered:
`NODE_DRAG_START`, `NODE_DRAG_END`, `NODE_CLICK` and `MOUSE_CLICK`. If you want to listen just for
drag then combine `NODE_DRAG` with `NODE_DRAG_(START|END)`.

```typescript
orb.events.on(OrbEventType.NODE_DRAG_START, (event) => {
  console.log(`Node drag started`, event);
});
```

Event data for `NODE_DRAG_START` has the following properties:

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

### Event `node-drag`

Event is emitted on every mouse movement which is dragging a node with it. Event `MOUSE_MOVE` will
also be triggered.

```typescript
orb.events.on(OrbEventType.NODE_DRAG, (event) => {
  console.log(`Node dragged`, event);
});
```

Event data for `NODE_DRAG` has the following properties:

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

### Event `node-drag-end`

Event is emitted when node drag ends. If user just clicks on a node, four events will be triggered:
`NODE_DRAG_START`, `NODE_DRAG_END`, `NODE_CLICK` and `MOUSE_CLICK`. If you want to listen just for
drag then combine `NODE_DRAG` with `NODE_DRAG_(START|END)`.

```typescript
orb.events.on(OrbEventType.NODE_DRAG_END, (event) => {
  console.log(`Node drag ended`, event);
});
```

Event data for `NODE_DRAG_END` has the following properties:

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
