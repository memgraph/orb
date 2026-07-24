import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import Layout from './Layout.vue';
import OrbDemo from './components/OrbDemo.vue';
import ExampleGallery from './components/ExampleGallery.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('OrbDemo', OrbDemo);
    app.component('ExampleGallery', ExampleGallery);
  },
} satisfies Theme;
