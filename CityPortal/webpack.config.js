var webpack = require('webpack')
const path = require('path')

module.exports = {
  entry: './www/src/app.js',
  output: {
    path: path.join(__dirname, 'www'),
    filename: 'app.min.js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel-loader',
      // exclude: /node_modules/,
      include: [/(@|ub)/],
      query: {
        presets: ['es2015']
      }
    }]
  },

  plugins: [
    new webpack.DefinePlugin({
      BOUNDLED_BY_WEBPACK: true
    }),
    new webpack.optimize.UglifyJsPlugin({
      beautify: false,
      comments: false,
      'screw-ie8': true,
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
