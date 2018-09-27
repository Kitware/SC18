// const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const template = path.join(__dirname, './demos/template.html');
const entry = path.join(__dirname, './demos/vtkjs-scene/index.js');
const outputPath = path.join(__dirname, 'website', 'vr-vtk-js');

const vtkRules = require('vtk.js/Utilities/config/rules-vtk.js');
const linterRules = require('vtk.js/Utilities/config/rules-linter.js');

module.exports = {
  plugins: [new HtmlWebpackPlugin({ template })],
  entry,
  output: {
    path: outputPath,
    filename: 'vr-scene-loader.js',
    libraryTarget: 'umd',
  },
  module: {
    rules: [].concat(linterRules, vtkRules),
  },
  devServer: {
    contentBase: [outputPath, path.join(__dirname, 'data')],
    port: 9999,
    host: '0.0.0.0',
    disableHostCheck: true,
    hot: false,
    quiet: false,
    noInfo: false,
    stats: {
      colors: true,
    },
  },
};
