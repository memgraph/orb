# Layouts overview

A layout decides where nodes sit. You pick one when you create a view through the `layout`
setting, and switch it any time. Try the four layouts here:

<OrbDemo src="/demos/layouts.html" :height="460" />

## Choosing a layout

`layout` takes a `type` and optional `options`:

```typescript
const orb = new OrbView(container, {
  layout: { type: 'force' }, // 'force' (default) | 'circular' | 'grid' | 'hierarchical'
});
```

- [**Force**](/layouts/force) - force-directed; the default. Nodes repel, edges pull, and
  the graph settles into an organic shape. Runs a live simulation.
- [**GPU force**](/layouts/gpu) - the force layout accelerated on the GPU, for large graphs.
- [**Circular**](/layouts/static) - nodes evenly spaced on a circle.
- [**Grid**](/layouts/static) - nodes on a regular grid.
- [**Hierarchical**](/layouts/static) - tree-like, in levels.

## Dynamic vs static

**Force** is *dynamic*: it runs a simulation that animates nodes into place and emits
`SIMULATION_START` / `SIMULATION_STEP` / `SIMULATION_END` [events](/concepts/events).
**Circular**, **grid**, and **hierarchical** are *static*: they compute final positions once,
with no simulation.

## Switching at runtime

Change the layout later with `setSettings`; the graph re-lays-out in place:

```typescript
orb.setSettings({ layout: { type: 'hierarchical', options: { orientation: 'horizontal' } } });
```

## Fixed coordinates

To place nodes yourself, provide `getPosition` on the view. It runs per node; return an
`{ x, y }` to position it (or `undefined` to leave it to the layout). To keep those
coordinates from being moved, disable the force simulation:

```typescript
const orb = new OrbView(container, {
  getPosition: (node) => node.getData().coords, // e.g. { x: 100, y: 40 }
  // Without this, the force layout treats getPosition as a starting point and moves nodes.
  layout: { type: 'force', options: { isSimulatingOnDataUpdate: false } },
});
```

::: warning Upgrading from older versions
Force parameters used to live in a top-level `simulation` setting. That block is gone -
force options now live under `layout.options` with `type: 'force'`. See
[Force layout](/layouts/force).
:::
