const typescript = require('rollup-plugin-typescript');
const nodePolyFills = require('rollup-plugin-polyfill-node');
const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;

const input = 'src/index.ts';
const inputESM = {
  'output/bundle.esm': 'src/index.ts',
};

module.exports = [
  // UMD builds
  // dist/bundle.min.js
  // dist/bundle.js
  {
    input,
    plugins: [
      nodePolyFills(),
      nodeResolve(),
      commonjs(),
    ],
    output: {
      name: 'Orb',
      file: 'dist/bundle.js',
      sourcemap: true,
      format: 'umd',
    },
    plugins: [typescript()],
  },

  // ES6 builds
  // dist/bundle.esm.js
  // helpers/*.js
  {
    input: inputESM,
    plugins: [
      nodePolyFills(),
      nodeResolve(),
      commonjs(),
    ],
    output: {
      dir: './',
      chunkFileNames: 'dist/chunks/[name].js',
      format: 'esm',
      indent: false,
    },
  },
];
