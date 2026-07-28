<script setup lang="ts">
import { withBase, useData } from 'vitepress';
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Path (relative to site base) of the standalone demo HTML in /public. */
    src: string;
    /** Rendered height in pixels. */
    height?: number;
    /** Hero styling: transparent, borderless, fills the hero image slot. */
    hero?: boolean;
  }>(),
  { height: 420, hero: false },
);

const { isDark } = useData();
const frame = ref<HTMLIFrameElement | null>(null);

// Push the site's theme into the (same-origin) demo iframe: a `data-theme`
// attribute drives its CSS chrome, and an optional `__orbSetTheme` hook lets the
// demo recolor graph labels (which are set in JS, not CSS).
function syncTheme() {
  const win = frame.value?.contentWindow as (Window & { __orbSetTheme?: (d: boolean) => void }) | null;
  const doc = frame.value?.contentDocument;
  try {
    doc?.documentElement?.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
    win?.__orbSetTheme?.(isDark.value);
  } catch {
    // Cross-origin (shouldn't happen for same-site demos) - ignore.
  }
}

watch(isDark, syncTheme);
</script>

<template>
  <div class="orb-demo" :class="{ 'orb-demo--hero': hero }">
    <iframe
      ref="frame"
      :src="withBase(src)"
      :style="{ height: height + 'px' }"
      title="Live Orb demo"
      loading="lazy"
      @load="syncTheme"
    />
  </div>
</template>

<style scoped>
.orb-demo {
  width: 100%;
  margin: 20px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.1);
}
.orb-demo iframe {
  display: block;
  width: 100%;
  border: 0;
}
/* Hero: let the graph float on the page background, no card chrome. */
.orb-demo--hero {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
</style>
