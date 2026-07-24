# Graph data

The graph data structure - nodes and edges - is the core of Orb. You manage it through
`orb.data`, using three primitives: `setup`, `merge`, and `remove`.

<OrbDemo src="/demos/data.html" :height="460" />

::: tip
Always change the graph through `orb.data.*`. Do not call `node.addEdge` / `node.removeEdge`
directly - the internal structure can go out of sync.
:::

## Requirements

- A **node** is a plain object with a unique `id`. The `id` can be any value.
- An **edge** is a plain object with a unique `id`, a `start` (source node id), and an
  `end` (target node id).

Everything else on the object is yours. You can type your own node and edge shapes:

```typescript
interface MyNode {
  id: number;
  text: string;
  myField: number;
}

interface MyEdge {
  id: number;
  start: number;
  end: number;
  connects: string;
}

const orb = new OrbView<MyNode, MyEdge>(container);
```

## Setup

`orb.data.setup` initializes the graph. Calling it again replaces the entire structure.

```typescript
orb.data.setup({
  nodes: [
    { id: 0, text: 'Node A', myField: 12 },
    { id: 1, text: 'Node B', myField: 77 },
  ],
  edges: [{ id: 0, start: 0, end: 1, connects: 'A -> B' }],
});
```

## Nodes and edges

After `setup` or `merge`, each data object is wrapped in a node (`INode`) or edge (`IEdge`)
object exposing readable state and mutators.

### Node

Readable state: `id`, `data`, `style`, `position`, `state`. Common getters include
`getData()`, `getPosition()`, `getStyle()`, `getState()`, `getLabel()`, `getColor()`,
`getRadius()`, `getInEdges()`, `getOutEdges()`, `getEdges()`, and `getAdjacentNodes()`.

Mutators: `setData()`, `patchData()`, `setPosition()`, `setStyle()`, `patchStyle()`,
`setState()`. Each accepts either a value or a callback returning the value.

```typescript
const node = orb.data.getNodeById(0);
node.getId(); // 0
node.getData(); // { id: 0, text: 'Node A', myField: 12 }

node.patchStyle({ color: '#FB6E00' }); // merge style props
```

### Edge

Readable state: `id`, `data`, `start`, `end`, `startNode`, `endNode`, `style`, `state`,
`type`. The `type` is one of `EdgeType.STRAIGHT`, `EdgeType.CURVED`, or `EdgeType.LOOPBACK`
(a node connected to itself). Overlapping edges are handled automatically: when several edges
run between the same two nodes Orb fans them out into separated curves (0, +1, -1, +2, -2, ...),
and loopbacks get increasing radii. This is recomputed on every data change, so a single edge
between two nodes is always a straight line - the curvature is derived from the graph
topology, not set per edge.

```typescript
const edge = orb.data.getEdgeById(0);
edge.startNode.getData(); // the source node's data
edge.endNode.getData(); // the target node's data

edge.patchStyle({ color: '#FB6E00' });
```

Style mutators (`setStyle`, `patchStyle`) and `setState` accept an options argument to skip
the re-render on change - useful when updating many objects at once for performance.

## Merge

`orb.data.merge` adds new nodes/edges and updates existing ones (matched by `id`).

```typescript
orb.data.merge({
  nodes: [
    { id: 2, text: 'Node C', myField: 82 }, // new node
    { id: 1, text: 'Node D', myField: 82 }, // updates existing node 1
  ],
  edges: [
    { id: 1, start: 0, end: 2, connects: 'A -> C' }, // reconnects edge 1
    { id: 2, start: 2, end: 1, connects: 'C -> B' }, // new edge
    { id: 3, start: 2, end: 8, connects: 'C -> ?' }, // dropped: node 8 doesn't exist
  ],
});
```

An edge that references a non-existent node is dropped.

## Remove

Removing a node also removes its connected edges. Removing an edge removes only that edge.

```typescript
orb.data.remove({ nodeIds: [0] }); // node + its edges
orb.data.remove({ nodeIds: [0, 1, 2], edgeIds: [0] });
orb.data.remove({ edgeIds: [0, 1, 2] });
```

To clear everything, use the dedicated helpers:

```typescript
orb.data.removeAll(); // nodes + edges
orb.data.removeAllNodes();
orb.data.removeAllEdges();
```

## Querying the graph

```typescript
// Collections (optionally filtered)
orb.data.getNodes();
orb.data.getEdges();
orb.data.getNodes((node) => node.getData().myField > 50);

// Counts
orb.data.getNodeCount();
orb.data.getEdgeCount();

// Lookup by id (undefined if missing)
orb.data.getNodeById(0);
orb.data.getEdgeById(0);

// Current selection / hover state
orb.data.getSelectedNodes();
orb.data.getSelectedEdges();
orb.data.getHoveredNodes();
orb.data.getHoveredEdges();

// Geometry
orb.data.getBoundingBox(); // { x, y, width, height } of the whole graph
orb.data.getNearestNode({ x: 0, y: 0 }); // handy inside mouse events
orb.data.getNearestEdge({ x: 0, y: 0 });

// Positions
orb.data.getNodePositions();
orb.data.setNodePositions(positions);
```

## Next steps

- [Styling](/concepts/styling) - control how nodes and edges look
- [Selection & interaction](/concepts/interaction) - select and highlight programmatically
- [Layouts](/layouts/overview) - position nodes with force-directed or static layouts
