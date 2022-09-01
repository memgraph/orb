const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const name = 'orb';

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
    chunkFilename(pathData) {
      return pathData.chunk.name === 'process.worker' ? `${name}.worker.js` : `${name}.worker.vendor.js`;
    },
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
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './examples',
        }
      ]
    })
  ]
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
    chunkFilename(pathData) {
      return pathData.chunk.name === 'process.worker' ? `${name}.worker.min.js` : `${name}.worker.vendor.min.js`;
    },
    filename: `${name}.min.js`,
  },
}

module.exports = [developmentConfiguration, productionConfiguration];
