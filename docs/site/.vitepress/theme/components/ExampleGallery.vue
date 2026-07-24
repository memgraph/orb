<script setup lang="ts">
import { withBase, useData } from 'vitepress';
import { computed } from 'vue';

const { isDark } = useData();
const theme = computed(() => (isDark.value ? 'dark' : 'light'));

// Full-page standalone demos in /public/demos. The card links open the full
// interactive demo; the preview iframe shows it with its chrome hidden.
const examples = [
  {
    title: 'Playground',
    desc: 'Switch layouts and tweak node shape, color, size, edges and labels - watch the graph respond live.',
    href: '/demos/playground.html',
  },
  {
    title: 'Map view',
    desc: 'A network of European cities plotted on an interactive Leaflet map.',
    href: '/demos/map.html',
  },
  {
    title: 'Styling showcase',
    desc: 'Every node shape, a color palette, and solid / dashed / dotted / custom edge line styles.',
    href: '/demos/styles-showcase.html',
  },
  {
    title: 'Kyiv Metro',
    desc: 'A real, hard-coded transit network - three colored lines with interchange transfers.',
    href: '/demos/metro.html',
  },
];

const openSrc = (href: string) => `${withBase(href)}?theme=${theme.value}`;
const previewSrc = (href: string) => `${withBase(href)}?preview=1&theme=${theme.value}`;
</script>

<template>
  <section class="example-section">
    <h2 class="example-heading">Examples</h2>
    <p class="example-lead">Full, standalone demos - open one and play with it.</p>
    <div class="example-gallery">
      <a v-for="e in examples" :key="e.href" class="example-card" :href="openSrc(e.href)" target="_self">
        <div class="thumb">
          <iframe :src="previewSrc(e.href)" loading="lazy" tabindex="-1" aria-hidden="true" title="" />
        </div>
        <div class="body">
          <h3>{{ e.title }}</h3>
          <p>{{ e.desc }}</p>
          <span class="open">Open example →</span>
        </div>
      </a>
    </div>
  </section>
</template>

<style scoped>
.example-section {
  max-width: 1152px;
  margin: 0 auto;
  /* No horizontal padding: align to the same inset as the feature cards above. */
  padding: 16px 0 48px;
}
.example-heading {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.example-lead {
  margin: 4px 0 0;
  font-size: 15px;
  color: var(--vp-c-text-2);
}
.example-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 20px;
}
.example-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px; /* match VitePress feature cards */
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  text-decoration: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.example-card:hover {
  border-color: var(--brand-orange);
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.1);
}
.thumb {
  height: 150px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  overflow: hidden;
}
/* The preview is decorative; the whole card is the click target. Render the demo
   at 2x logical size and scale it down so labels/markers are proportionally
   smaller and maps show more detail than they would at the tiny thumb size. */
.thumb iframe {
  width: 200%;
  height: 200%;
  border: 0;
  pointer-events: none;
  display: block;
  transform: scale(0.5);
  transform-origin: top left;
}
.body {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.body h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.body p {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  flex: 1;
}
.body .open {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-orange);
}
</style>
