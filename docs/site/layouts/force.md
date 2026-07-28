# Force layout

The default layout. Nodes repel each other, edges act like springs, and the graph settles
into an organic shape through a physics simulation. Drag a node to nudge it:

<OrbDemo src="/demos/layouts.html?type=force" :height="460" />

## Usage

```typescript
const orb = new OrbView(container, {
  layout: {
    type: 'force',
    options: {
      // any subset of the forces below
      links: { distance: 80 },
      manyBody: { strength: -200 },
    },
  },
});
```

## Forces

Each force is an object under `options`; omit one to use its default, or set it to `null`
to disable it.

| Force | Default | What it does |
| --- | --- | --- |
| `links` | `{ distance: 50, strength: 1, iterations: 1 }` | Pulls connected nodes toward a target edge length. |
| `manyBody` | `{ strength: -100, theta: 0.9, distanceMin: 1, distanceMax: 5000 }` | Node-to-node repulsion (negative) or attraction (positive). |
| `collision` | `{ radius: 15, strength: 1, iterations: 1 }` | Stops nodes from overlapping. |
| `centering` | `{ x: 0, y: 0, strength: 1 }` | Pulls the whole graph toward a center point. |
| `positioning` | `{ forceX: { x: 0, strength: 0.1 }, forceY: { y: 0, strength: 0.1 } }` | Gentle pull toward specific x / y coordinates. |

`anchorX` / `anchorY` (`'start' | 'center' | 'end'`, both default `'center'`) set where the
settled graph is anchored in the view.

### Edge midpoint repulsion

`manyBody` takes an optional `edgeMidpointRepulsion: boolean` (default off):

```typescript
manyBody: { strength: -100, theta: 0.9, distanceMin: 1, distanceMax: 400, edgeMidpointRepulsion: true }
```

When enabled, nodes are also repelled from the midpoint of every edge - not just from other
nodes - which pushes edges out from under unrelated nodes and reduces edges routed straight
through them. It reuses the `manyBody` `strength` and `distanceMax`, and works on both the CPU
and GPU engines. Because it compares every node against every edge midpoint each tick, it adds
work proportional to nodes x edges, so it is best on small-to-medium graphs where readability
matters more than raw scale. Try it live in the [playground](/demos/playground.html).

## Convergence

The simulation cools down over time, controlled by `alpha`:

```typescript
alpha: { alpha: 1, alphaMin: 0.05, alphaDecay: 0.028, alphaTarget: 0 }
```

It runs until `alpha` decays below `alphaMin`, then emits `SIMULATION_END`. Lower
`alphaDecay` for a longer, more settled layout; raise it for a faster finish.

## Simulation control

| Option | Default | Effect |
| --- | --- | --- |
| `isSimulatingOnDataUpdate` | `true` | Re-run the simulation when nodes/edges change. |
| `isSimulatingOnSettingsUpdate` | `true` | Re-run when layout settings change. |
| `isSimulatingOnUnstick` | `true` | Re-run when a dragged (fixed) node is released. |
| `isPhysicsEnabled` | `false` | Keep physics running continuously instead of settling. |
| `useGPU` | `false` | Run the simulation on the GPU - see [GPU layout](/layouts/gpu). |

Track progress with the `SIMULATION_START`, `SIMULATION_STEP`, and `SIMULATION_END`
[events](/concepts/events). By default this simulation runs in a web worker, off the main
thread - see [Performance](/rendering/performance).
