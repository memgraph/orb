# What is Orb

Orb is a graph visualization library for the browser. You give it nodes and edges, and it
lays them out, renders them interactively, and hands you events to build on. It's written in
TypeScript, ships with no UI framework dependency, and works from a bundler or a plain
`<script>` tag.

## Features

- **Two renderers** - a 2D **Canvas** renderer (default) for crisp small and medium graphs,
  and a **WebGL** renderer for tens of thousands of nodes at interactive frame rates. See
  [Canvas vs WebGL](/rendering/renderers).
- **Layouts** - a force-directed layout (with an optional **GPU** engine), plus static
  **circular**, **grid**, and **hierarchical** layouts. See [Layouts](/layouts/overview).
- **Off-main-thread simulation** - the force layout runs in a web worker by default, so it
  doesn't block the UI.
- **Full styling** - per-object or whole-graph theming of colors, sizes, shapes, borders,
  shadows, line styles, and labels. See [Styling](/concepts/styling).
- **Interaction** - built-in selection (single, multi, cascade), hover, drag, pan, and zoom,
  plus a programmatic API. See [Selection & interaction](/concepts/interaction).
- **Events** - a typed emitter for clicks, hovers, drags, right/double-clicks, and
  simulation progress. See [Events](/concepts/events).
- **Map view** - plot geo-located nodes on an interactive Leaflet map. See
  [Map view](/views/map).
- **SVG export** - serialize a graph to a standalone vector image. See
  [SVG export](/rendering/svg-export).

## Which renderer should I use?

Start with the default **Canvas** renderer. Reach for the **WebGL** renderer (usually paired
with the **GPU** layout) once you're drawing many thousands of nodes and the Canvas renderer
can't keep up. The renderer is chosen when you create the view - see
[Canvas vs WebGL](/rendering/renderers).

## Next steps

- [Getting started](/introduction/getting-started) - install Orb and render your first graph
- [Graph data](/concepts/data) - the node and edge data model
