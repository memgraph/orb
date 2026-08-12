const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const name = 'orb';

const inlineWorkerPath = path.resolve(__dirname, 'dist/simulator/types/web-worker-simulator/simulator.worker.inline.js');

if (!fs.existsSync(inlineWorkerPath)) {
  throw new Error(
    `Missing generated worker bundle at ${inlineWorkerPath}.\n` +
      'Run "node scripts/build-inline-worker.mjs" (or "npm run build") before webpack. ' +
      'The "build:release" script does this automatically.',
  );
}

const inlineWorkerReplacement = new webpack.NormalModuleReplacementPlugin(/simulator\.worker\.inline$/, inlineWorkerPath);

const commonConfiguration = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: '/node_modules/',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: `${name}.js`,
    path: path.resolve(__dirname, 'dist/browser'),
    library: {
      name: 'Orb',
      type: 'umd'
    }
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '/examples/'),
    },
    compress: true,
    port: 9000,
  },
  plugins: [
    inlineWorkerReplacement,
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './examples',
        }
      ]
    })
  ],
  performance: {
    hints: false,
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000, // 500kb
  },
};

const developmentConfiguration = {
  ...commonConfiguration,
  mode: 'development',
  devtool: 'inline-source-map',
};

const productionConfiguration = {
  ...commonConfiguration,
  mode: 'production',
  output: {
    ...commonConfiguration.output,
    filename: `${name}.min.js`,
  },
}

module.exports = [developmentConfiguration, productionConfiguration];
