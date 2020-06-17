const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './index.ts',
  devtool: 'inline-source-map',
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: './package.json', to: 'package.json' },
        { from: './package-lock.json', to: 'package-lock.json' },
        { from: './README.md', to: 'README.md' },
      ],
    }), // TODO: do we need to do this? probably not.
  ],
  module: {
    rules: [
      { 
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ],
  },
  resolve: {
    extensions: [ '.ts', '.js' ],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
    library: 'NaiveTsECS',
    umdNamedDefine: true
  },
};