const webpack = require('webpack');
const path = require('path');

const entry = path.join(__dirname, './demos/vtkjs-uh60-vr/index.js');
const outputPath = path.join(__dirname, './website');

const vtkRules = require('./Utilities/config/rules-vtk.js');
const linterRules = require('./Utilities/config/rules-linter.js');

module.exports = {
  entry,
  output: {
    path: outputPath,
    filename: 'demo-uh60.js',
    libraryTarget: 'umd',
  },
  module: {
    rules: [].concat(linterRules, vtkRules),
  },
};
