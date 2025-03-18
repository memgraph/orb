# Handling graph data in Orb

Graph data structure (nodes and edges) is the main part of Orb. Without the graph data
structure, there wouldn't be anything to render. Read the following guide to get to know
how to handle graph data in Orb.

> Note: Please do not use `node.addEdge` and `node.removeEdge` because the general graph data
> structure might go out of sync. Always use `orb.data.(setup|merge|remove)` to change the
> graph data structure.

## Setup nodes and edges

To set up `nodes` and `edges`, there are a few requirements that Orb expects:

- Node data object should be a JSON plain object with a defined unique `id`. The value of `id` can
  be `any`. All other properties are up to you (e.g. `text` and `myField` in the above example).
- Edge data object should be a JSON plain object with defined unique `id`, `start` (id of
  the source node), `end` (id of the target node). The value of `id` can be `any`. All other
  properties are up to you. (e.g. `connects` in the above example).

You can have your own `node` and `edge` types that satisfy those requirements:

```typescript
export interface MyNode {
  id: number;
  text: string;
  myField: number;
}

export interface MyEdge {
  id: number;
  start: number;
  end: number;
  connects: string;
}
```

To initialize graph data structure use `orb.data.setup` function that receives `nodes` and
`edges`. Here is a simple example of it:

```typescript
import { OrbView } from "@memgraph/orb";

const orb = new OrbView<MyNode, MyEdge>(container);

const nodes: MyNode[] = [
  { id: 0, text: "Node A", myField: 12 },
  { id: 1, text: "Node B", myField: 77 },
];

const edges: MyEdge[] = [
  { id: 0, start: 0, end: 1, connects: "A -> B" },
  { id: 1, start: 0, end: 0, connects: "A -> A" },
];

orb.data.setup({ nodes, edges });
```

Whenever `orb.data.setup` is called, any previous graph structure will be removed.

### Node

Node object (interface `INode`) is created on top of the node data that is provided via
`orb.data.setup` or `orb.data.merge` functions.

#### Node information

- `id` - Readonly unique `id` provided on init (same as `.getData().id`)
- `data` - User provided information on `orb.data.setup` or `orb.data.merge`
- `style` - Style properties like color, border, size (check more on [Styling guide](./styles.md)).
- `position` - Node `x` and `y` coordinate generated before first render
- `state` - Node state which can be selected (`GraphObjectState.SELECTED`), hovered
  (`GraphObjectState.HOVERED`), or none (`GraphObjectState.NONE` - default)

#### Node getters functions

- `getId()` - Alias for `.id`
- `getData()` - Returns the node data
- `getPosition()` - Returns the node position
- `getStyle()` - Returns the node style
- `getState()` - Returns the node state
- `getCenter()` - Alias for `.position`
- `getRadius()` - Alias for `.getStyle().size`
- `getBorderedRadius()` - Alias for `.getStyle().size + .getStyle().borderWidth`
- `getInEdges()` - Returns a list of inbound edges connected to the node
- `getOutEdges()` - Returns a list of outbound edges connected to the node
- `getEdges()` - Returns a list of all edges connected to the node, inbound and outbound
- `getAdjacentNodes()` - Returns a list of adjacent nodes
- `getLabel()` - Returns the node label
- `getColor()` - Returns the node color

#### Node setter/patch functions

All of the setter/patch functions for nodes are able to accept the raw data of the corresponding type or the callback that returns this data.

- `setData()` - Replaces the node data with the provided data
- `patchData()` - Replaces the node data entries with the provided ones
- `setPosition()` - Sets the node current position
- `setStyle()` - Sets the node current style
- `patchStyle()` - Replaces the node style entries with the provided ones
- `setState()` - Sets the node current state

`position`, `style` and `state` setters can accept optional `options` argument. It can be used to skip the rerender on data change which can be useful for performance while changing the data of many nodes.

Check the example to get to know node handling better:

```typescript
import { OrbView } from "@memgraph/orb";

const orb = new OrbView<MyNode, MyEdge>(container);

const nodes: MyNode[] = [
  { id: 0, text: "Node A", myField: 12 },
  { id: 1, text: "Node B", myField: 77 },
];

orb.data.setup({ nodes });

const node = orb.data.getNodeById(0);
console.log(node.getId()); // Output: 0
console.log(node.getData()); // Output: { id: 0, text: "Node A", myField: 12 }

// Set node color to red
node.patchStyle({ color: "#FF0000" });
console.log(node.getStyle()); // Output: { ...<default node style props>, color: '#FF0000' }
```

### Edge

Edge object (interface `IEdge`) is created on top of the edge data that is provided via
`orb.data.setup` or `orb.data.merge` functions.

#### Edge information

- `id` - Readonly unique `id` provided on init (same as `.getData().id`)
- `data` - User provided information on `orb.data.setup` or `orb.data.merge`
- `start` - Readonly `start` provided on init (same as `.getData().start`)
- `end` - Readonly `end` provided on init (same as `.getData().end`)
- `startNode` - Reference to the start node (`INode`) that edge connects
- `endNode` - Reference to the end node (`INode`) that edge connects
- `style` - Style properties like color, border, size (check more on [Styling guide](./styles.md)).
- `state` - Edge state which can be selected (`GraphObjectState.SELECTED`), hovered
  (`GraphObjectState.HOVERED`), or none (`GraphObjectState.NONE` - default)
- `type` - Edge line type which can be:
  - straight (`EdgeType.STRAIGHT`) - if there are 1x, 3x, 5x, ... edges connecting nodes A and B,
    one edge will be a straight line edge. If there are multiple edges, other edges will be curved
    not to overlap with each other
  - curved (`EdgeType.CURVED`) - if there is more than one edge connecting nodes A and B, some
    of those edges will be curved, so they do not overlap with each other
  - loopback (`EdgeType.LOOPBACK) - connects a node to itself

#### Edge getters function

- `getId()` - Alias for `.id`
- `getData()` - Getter for edge data
- `getPosition()` - Getter for edge position
- `getStyle()` - Getter for edge style
- `getState()` - Getter for edge state
- `getCenter()` - Gets the center edge position calculated by edge type and connected node positions
- `getWidth()` - Alias for `.style.width`
- `isLoopback()` - Checks if edge is a loopback type: connects a node to itself.
- `isStraight()` - Checks if edge is a straight line edge
- `isCurved()` - Checks if edge is a curved line edge.

#### Edge setters/patch functions

All of the setter/patch functions for edges are able to accept the raw data of the corresponding type or the callback that returns this data.

- `setData()` - Replaces the edge data with the provided data
- `patchData()` - Replaces the edge data entries with the provided ones
- `setStyle()` - Sets the edge current style
- `patchStyle()` - Replaces the edge style entries with the provided ones
- `setState()` - Sets the edge current state

`style` and `state` setters can accept optional `options` argument. It can be used to skip the rerender on data change which can be useful for performance while changing the data of many edges.

Check the example to get to know edge handling better:

```typescript
import { OrbView } from "@memgraph/orb";

const orb = new OrbView<MyNode, MyEdge>(container);

const nodes: MyNode[] = [
  { id: 0, text: "Node A", myField: 12 },
  { id: 1, text: "Node B", myField: 77 },
];

const edges: MyEdge[] = [
  { id: 0, start: 0, end: 1, connects: "A -> B" },
  { id: 1, start: 0, end: 0, connects: "A -> A" },
];

orb.data.setup({ nodes, edges });

const edge = orb.data.geEdgeById(0);
console.log(edge.getId()); // Output: 0
console.log(edge.getData()); // Output: { id: 0, start: 0, end: 1, connects: 'A -> B' }
console.log(edge.startNode.getData()); // Output: { id: 0, text: "Node A", myField: 12 }
console.log(edge.endNode.getData()); // Output: { id: 1, text: "Node B", myField: 77 }

// Set edge line color to red
edge.patchStyle({ color: "#FF0000" });
console.log(edge.getStyle()); // Output: { ...<default edge style props>, color: '#FF0000' }
```

## Merge nodes and edges

Merge `orb.data.merge` is a handy function to add new nodes and edges or even update the existing
ones. An update of a node or edge will happen if a node or edge with the same unique `id` already
exists in the graph structure. Check the example below:

```typescript
import { OrbView } from "@memgraph/orb";

const orb = new OrbView<MyNode, MyEdge>(container);

const nodes: MyNode[] = [
  { id: 0, text: "Node A", myField: 12 },
  { id: 1, text: "Node B", myField: 77 },
];

const edges: MyEdge[] = [
  { id: 0, start: 0, end: 1, connects: "A -> B" },
  { id: 1, start: 0, end: 0, connects: "A -> A" },
];

orb.data.setup({ nodes, edges });
console.log(orb.data.getNodeCount()); // Output: 3
console.log(orb.data.getNodeById(1)); // Output: { id: 1, text: "Node B", myField: 77 }

orb.data.merge({
  nodes: [
    // This will be a new node in the graph because node with id = 2 doesn't exist
    { id: 2, text: "Node C", myField: 82 },
    // This will update the node with id = 1 because it already exists. `node.data` will be updated.
    { id: 1, text: "Node D", myField: 82 },
  ],
  edges: [
    // This will update the edge with id = 1 because it already exists. `edge.data` will be updated,
    // but also, edge will disconnect from previous nodes and connect to the new ones (0 -> 2).
    { id: 1, start: 0, end: 2, connects: "A -> C" },
    // This will be a new edge in the graph because edge with id = 2 doesn't exist
    { id: 2, start: 2, end: 1, connects: "C -> B" },
    // This edge will be dismissed because node with id = 7 doesn't exist
    { id: 3, start: 2, end: 8, connects: "C -> ?" },
  ],
});
console.log(orb.data.getNodeCount()); // Output: 3
console.log(orb.data.getNodeById(1)); // Output: { id: 1, text: "Node D", myField: 82 }
```

## Remove nodes and edges

To remove nodes or edges from a graph, you just need the `id`. Removing a node will also
remove all inbound and outbound edges to that node. Removing an edge will just remove that edge.

```typescript
import { OrbView } from "@memgraph/orb";

const orb = new OrbView<MyNode, MyEdge>(container);

const nodes: MyNode[] = [
  { id: 0, text: "Node A" },
  { id: 1, text: "Node B" },
];

const edges: MyEdge[] = [
  { id: 0, start: 0, end: 1, text: "A -> B" },
  { id: 1, start: 0, end: 0, text: "A -> A" },
];

orb.data.setup({ nodes, edges });

// After the removal of node with id 0, both edges will be removed too because they are
// connected to the removed edge
orb.data.remove({ nodeIds: [0] });
```

You can remove just nodes, edges, or both:

```typescript
// Remove just one node
orb.data.remove({ nodeIds: [0] });

// Remove multiple nodes and one edge
orb.data.remove({ nodeIds: [0, 1, 2], edgeIds: [0] });

// Remove just edges
orb.data.remove({ edgeIds: [0, 1, 2] });
```

If you need to remove everything, you can do it with `remove` or even with `setup`:

```typescript
const nodeIds = orb.data.getNodes().map((node) => node.getId());
// No need to get edges because if we remove all the nodes, all the edges will be removed too
orb.data.remove({ nodeIds: nodeIds });

// Or use just setup with empty nodes and edges:
orb.data.setup({ nodes: [], edges: [] });
```

## Other functions

There are only three main functions to change the graph structure: `setup`, `merge`, and `remove`.
But couple more functions could be useful to you:

```typescript
// Returns the list of all nodes/edges in the graph
const nodes = orb.data.getNodes();
const edges = orb.data.getEdges();

// Returns the total number of nodes/edges in the graph
const nodeCount = orb.data.getNodeCount();
const edgeCount = orb.data.getEdgeCount();

// Returns specific node or edge by id. If node or edge doesn't exist, it will return undefined
const node = orb.data.getNodeById(0);
const edge = orb.data.getEdgeById(0);

// Get nearest node/edge to the position (x, y). Useful with events such as mouse click to
// check if node should be considered clicked or not
const nearestNode = orb.data.getNearestNode({ x: 0, y: 0 });
const nearestEdge = orb.data.getNearestEdge({ x: 0, y: 0 });
```
