const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: './src',
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
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    libraryExport: 'default',
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '/examples/'),
    },
    compress: true,
    port: 9000,
  },
  plugins: [
    new CopyWebpackPlugin([
      {
        from: './examples',
      }
    ])
  ]
};
