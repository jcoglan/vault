var path = require('path');

var spec = path.join(__dirname, 'spec');

module.exports = {
  devtool: 'source-map',

  entry: {
    'spec/browser_bundle': path.join(spec, 'node')
  },

  output: {
    filename: '[name].js'
  },

  module: {
    noParse: /jstest/
  }
};
