const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
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
    chunkFilename(pathData) {
      if (pathData.chunk.id.includes('d3-force')) {
        return 'orb-d3.js';
      }
      return pathData.chunk.name === 'process.worker' ? 'orb-worker.js' : '[name].bundle.js';
    },
    filename: 'orb.js',
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
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './examples',
        }
      ]
    })
  ]
};
