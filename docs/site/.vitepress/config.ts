import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Served from https://memgraph.github.io/orb/ on GitHub Pages.
  base: '/orb/',
  lang: 'en-US',
  title: 'Orb',
  description: 'A graph visualization library by Memgraph.',
  cleanUrls: true,

  // Every page has real content now; fail the build on broken internal links.
  ignoreDeadLinks: false,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Ubuntu+Mono:wght@400;700&display=swap',
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/introduction/getting-started', activeMatch: '/(introduction|concepts|layouts|rendering|views)/' },
      { text: 'Reference', link: '/reference/api', activeMatch: '/reference/' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@memgraph/orb' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Orb', link: '/introduction/what-is-orb' },
          { text: 'Getting started', link: '/introduction/getting-started' },
        ],
      },
      {
        text: 'Core concepts',
        items: [
          { text: 'Graph data', link: '/concepts/data' },
          { text: 'Styling', link: '/concepts/styling' },
          { text: 'Events', link: '/concepts/events' },
          { text: 'Selection & interaction', link: '/concepts/interaction' },
        ],
      },
      {
        text: 'Layouts',
        items: [
          { text: 'Overview', link: '/layouts/overview' },
          { text: 'Force layout', link: '/layouts/force' },
          { text: 'GPU layout', link: '/layouts/gpu' },
          { text: 'Static layouts', link: '/layouts/static' },
        ],
      },
      {
        text: 'Rendering',
        items: [
          { text: 'Canvas vs WebGL', link: '/rendering/renderers' },
          { text: 'Performance', link: '/rendering/performance' },
          { text: 'SVG export', link: '/rendering/svg-export' },
        ],
      },
      {
        text: 'Views',
        items: [
          { text: 'Default view', link: '/views/default' },
          { text: 'Map view', link: '/views/map' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'API reference', link: '/reference/api' }],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/memgraph/orb' }],

    search: { provider: 'local' },

    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © 2016-present Memgraph Ltd.',
    },
  },
});
