---
layout: home

hero:
  name: Memgraph Orb
  text: Graph visualization library
  tagline: Render interactive graphs on Canvas or WebGL, with force-directed and hierarchical layouts, a map view, and full styling control.
  actions:
    - theme: brand
      text: Get started
      link: /introduction/getting-started
    - theme: alt
      text: See it in action
      link: /demos/playground.html
      target: _self

features:
  - title: Canvas & WebGL
    details: Render on the 2D canvas for crisp small graphs, or switch to the WebGL renderer to draw tens of thousands of nodes at interactive frame rates.
    link: /rendering/renderers
    linkText: Choose a renderer
  - title: GPU-accelerated layout
    details: A force-directed layout engine that runs on the GPU for large graphs, with an automatic CPU fallback when WebGL2 is unavailable.
    link: /layouts/gpu
    linkText: GPU layout
  - title: Map view
    details: Plot geo-located nodes on an interactive map with latitude and longitude - no extra glue code required.
    link: /views/map
    linkText: Map view
  - title: Fully styleable
    details: Colors, sizes, shapes, borders, shadows, and labels for every node and edge, plus default-style callbacks to theme an entire graph at once.
    link: /concepts/styling
    linkText: Styling guide
---

<ExampleGallery />
