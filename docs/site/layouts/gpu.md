# GPU layout

For large graphs, the force layout can run on the GPU. Switch the renderer and engine and
scale the node count to feel the difference:

<OrbDemo src="/demos/gpu.html" :height="500" />

## Enabling it

Set `useGPU` on the force layout:

```typescript
const orb = new OrbView(container, {
  render: { type: 'webgl' }, // pair with the WebGL renderer for large graphs
  layout: { type: 'force', options: { useGPU: true } },
});
```

It's the same force layout as the [CPU version](/layouts/force) - the same forces and
options apply - just computed on the GPU using WebGL2 and a Barnes-Hut approximation.

## Automatic fallback

If WebGL2 isn't available, Orb silently falls back to the CPU force engine, so it's safe to
request `useGPU: true` everywhere.

## Trade-off: main thread

The CPU force layout runs in a web worker. The GPU layout needs a WebGL context, which a
worker can't provide, so it runs on the **main thread** instead. For most large graphs the
GPU speedup outweighs this; for small graphs there's no reason to leave the worker.

## When to use it

Reach for the GPU layout once you're simulating many thousands of nodes and the CPU layout
feels slow. Pair it with the [WebGL renderer](/rendering/renderers) so both the layout and
the drawing scale together.
