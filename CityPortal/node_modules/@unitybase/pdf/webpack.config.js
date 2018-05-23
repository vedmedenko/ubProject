/**
 * Created by pavel.mash on 10.02.2017
 */
const webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: {
    app: './index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'pdf.min.js',
    publicPath: '/clientRequire/@unitybase/pdf/dist/',
    library: '@unitybase/pdf',
    libraryTarget: 'umd'
  },
  externals: {
    'lodash': {
      commonjs: 'lodash',
      commonjs2: 'lodash',
      amd: 'lodash',
      root: '_'
    }
  },
  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      exclude: /node_modules/,
      query: {
        presets: ['es2015']
      }
    }, {
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }]
  },
  devtool: 'source-map',

  plugins: [
    new webpack.DefinePlugin({
      BOUNDLED_BY_WEBPACK: true
    }),
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
