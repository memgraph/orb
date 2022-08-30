# Orb views: Default view

This is the default view that Orb uses to render a basic graph.

## Initialization

The `DefaultView` is assigned to every instance of Orb by default.
You don't need to provide any additional configuration to use it.

You can, however, explicitly provide it in the factory function as you would any other type of `IOrbView`.
This will be necessary if you want to assign fixed node coordinates, which you can read about further below.

```typescript
const orb = new Orb.Orb(container);
orb.setView((context) => new Orb.DefaultView(context));
```

There are two basic ways to use the `DefaultView` API based on the node positions:

- **Simulated node positions** - Orb internally calculates and assigns coordinates to your nodes.
- **Fixed coordinates** - You provide node coordinates through the `getPosition()` callback function.

### Simulated node positions

In this mode, the `DefaultView` arranges node positions by internally calculating their coordinates using the [D3.js](https://d3js.org/) library, or more specifically, [`d3-force`](https://github.com/d3/d3-force).
This method is applied by default - you don't need to initialize Orb with any additional configuration.

![](./assets/view-default-simulated.png)

```typescript
const nodes = [
  { id: 0, label: "Node A" },
  { id: 1, label: "Node B" },
  { id: 2, label: "Node C" },
];
const edges = [
  { id: 0, start: 0, end: 0, label: "Edge Q" },
  { id: 1, start: 0, end: 1, label: "Edge W" },
  { id: 2, start: 0, end: 2, label: "Edge E" },
  { id: 3, start: 1, end: 2, label: "Edge T" },
  { id: 4, start: 2, end: 2, label: "Edge Y" },
  { id: 5, start: 0, end: 1, label: "Edge V" },
];

const orb = new Orb.Orb(container);

// Initialize nodes and edges
orb.data.setup({ nodes, edges });

// Render and recenter the view
orb.view.render(() => {
  orb.view.recenter();
});
```

### Fixed node positions

If you want to assign specific coordinates to your graph, you can do this by providing the `getPosition()` callback function.
You can use this function to indicate which properties of your original nodes will be in the returned `IPosition` object (`{ x: number, y: number }` ) that allows Orb to position the nodes.

![](./assets/view-default-fixed.png)

```typescript
const container = document.getElementById("graph");

const nodes = [
  { id: 0, label: "Node A", posX: -100, posY: 0 },
  { id: 1, label: "Node B", posX: 100, posY: 0 },
  { id: 2, label: "Node C", posX: 0, posY: 100 },
];
const edges = [
  { id: 0, start: 0, end: 0, label: "Edge Q" },
  { id: 1, start: 0, end: 1, label: "Edge W" },
  { id: 2, start: 0, end: 2, label: "Edge E" },
  { id: 3, start: 1, end: 2, label: "Edge T" },
  { id: 4, start: 2, end: 2, label: "Edge Y" },
  { id: 5, start: 0, end: 1, label: "Edge V" },
];

const orb = new Orb.Orb(container);
orb.setView(
  (context) =>
    new Orb.DefaultView(context, {
      getPosition: (node) => ({ x: node.data.posX, y: node.data.posY }),
    })
);

// Initialize nodes and edges
orb.data.setup({ nodes, edges });

// Render and recenter the view
orb.view.render(() => {
  orb.view.recenter();
});
```

### Property `getPosition`

You can use this callback function to assign fixed coordinates to your nodes.

The function has a node input (`INode`) which represents the Orb node data structure.
You can access your original properties through `.data` property.
There you can find all properties of your nodes that you assigned in the `orb.data.setup()` function.

Here you can use your original properties to indicate which ones represent your node coordinates. (`node.data.posX`, `node.data.posY`)
All you have to do is return a `IPosition` that requires 2 basic properties: `x` and `y`. (`{ x: node.data.posX, y: node.data.posY }`)

### Property `render`

Optional property `render` has several rendering options that you can tweak. Read more about them
on [Styling guide](./styles.md).

### Property `simulation`

Fine-grained D3 simulation engine settings. This may be condensed into fewer, more abstract settings in the future.

### Property `zoomFitTransitionMs`

Use this property to adjust the transition time when recentering the graph. Defaults to `200ms`.

### Property `isOutOfBoundsDragEnabled`

Disabled by default. (`false`)

### Property `isSimulationAnimated`

Shows the process of simulation where the nodes are moved by the physics engine until they converge to a stable position.
If disabled, the graph will suddenly appear in its final position.
Enabled by default. (`true`)

### Property `areCoordinatesRounded`

Rounds node coordinates to integer values.
Slightly improves performance.
Enabled by default. (`true`)

## Settings

The above settings of the `DefaultView` can be defined on view initialization, but also anytime after the initialization with a view function `setSettings`:

```typescript
// If you want to see all the current view settings
const settings = orb.view.getSettings();

// Change the x and y axis
orb.view.setSettings({
  getPosition: (node) => ({ x: node.data.posY, y: node.data.posX }),
});

// Change the zoom fit and transform time while recentering and disable shadows
orb.view.setSettings({
  zoomFitTransformMs: 1000,
  render: {
    shadowIsEnabled: false,
    shadowOnEventIsEnabled: false,
  },
});
```

## Rendering

Just like other Orb views, use `render` to render the view and `recenter` to fit the view to
the rendered graph.

```typescript
orb.view.render(() => {
  orb.view.recenter();
});
```
