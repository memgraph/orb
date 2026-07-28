# Getting started

Orb renders interactive graphs in the browser. This page gets a graph on screen;
the rest of the guide covers data, styling, events, layouts, and rendering in depth.

## Install

### With npm

```bash
npm install @memgraph/orb
```

```typescript
import { OrbView } from '@memgraph/orb';

const container = document.getElementById('graph');

const nodes = [
  { id: 1, label: 'Orb' },
  { id: 2, label: 'Graph' },
  { id: 3, label: 'Canvas' },
];
const edges = [
  { id: 1, start: 1, end: 2, label: 'DRAWS' },
  { id: 2, start: 2, end: 3, label: 'ON' },
];

const orb = new OrbView(container);

// Load the graph data.
orb.data.setup({ nodes, edges });

// Render, then fit the view to the graph.
orb.render(() => {
  orb.recenter();
});
```

### With a direct link

Reference the browser bundle directly and use the global `Orb` namespace.

```html
<script src="https://unpkg.com/@memgraph/orb/dist/browser/orb.min.js"></script>
<script>
  const orb = new Orb.OrbView(document.getElementById('graph'));
  orb.data.setup({ nodes, edges });
  orb.render(() => orb.recenter());
</script>
```

::: warning
When Orb is loaded from a direct link, graph simulation runs on the main thread
instead of a web worker, which affects performance on large graphs. Install with a
bundler to keep simulation off the main thread. See [Performance](/rendering/performance).
:::

## The container

Orb expands to fill its container, so the container must have a resolved width and
height. It will not be visible inside a collapsed parent.

```html
<div id="graph" style="width: 600px; height: 600px;"></div>
```

## Data requirements

Orb expects a minimal shape for nodes and edges; every other property is yours to keep.

- A **node** is a plain object with a unique `id`.
- An **edge** is a plain object with a unique `id`, a `start` (source node id), and an
  `end` (target node id).

```typescript
interface MyNode {
  id: number;
  label: string;
}

interface MyEdge {
  id: number;
  start: number;
  end: number;
}

const orb = new OrbView<MyNode, MyEdge>(container);
```

By default Orb does not know which field to render as a label - set the `label` style
property, or use a default-style callback. See [Styling](/concepts/styling).

## Next steps

- [Graph data](/concepts/data) - add, update, and remove nodes and edges
- [Styling](/concepts/styling) - colors, shapes, sizes, and labels
- [Events](/concepts/events) - react to clicks, hovers, drags, and simulation progress
- [Layouts](/layouts/overview) - force-directed, hierarchical, grid, and circular
- [Canvas vs WebGL](/rendering/renderers) - choose a renderer for your graph size
