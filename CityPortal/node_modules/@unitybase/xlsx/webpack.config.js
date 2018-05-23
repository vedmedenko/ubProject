/**
 * Created by pavel.mash on 04.09.2016.
 */
const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: {
    app: './index.js'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'xlsx-all.min.js',
    library: 'XLSX',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/,
      query: {
        presets: ['es2015']
      }
    }, {
      test: /\.css$/,
      loader: 'style-loader!css-loader'
    }]
  },
  devtool: 'cheap-module-source-map',
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      beautify: false,
      comments: false,
      'screw-ie8': true,
      // compress: false
      compress: {
        sequences: true,
        booleans: true,
        loops: true,
        unused: false, // true
        warnings: true, // false,
        drop_console: false, // true,
        unsafe: true
      }
    })
  ]
}
