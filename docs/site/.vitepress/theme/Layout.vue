<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import HeroGraph from './components/HeroGraph.vue';

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <!-- Full-bleed drifting-graph backdrop behind the home hero. -->
    <template #home-hero-before>
      <HeroGraph />
    </template>
  </Layout>
</template>
