/*
* Created by xmax on 27.11.2017
*/
const tools = require('./tools')

class Color {
  /**
   * @param {String} color 9ED2E0
   * @constructor
   */
  static RGB (color) {
    return new Color(color)
  }

  static parseRGB (color) {
    if (!color || typeof color !== 'string') return color
    if (color[0] === '#') color = color.substr(1)
    return color
  }

  /**
   * From any source - string, object, Color
   * @param config
   * @return {Color}
   */
  static from (config) {
    if (!config) throw new Error('Invalid color config')
    if (config instanceof Color) return config
    return new Color(config)
  }

  constructor (config, baseTag) {
    if (typeof config === 'string') {
      config = {rgb: config}
    }
    this.theme = config.theme
    this.tint = config.tint
    this.indexed = config.indexed
    this.rgb = Color.parseRGB(config.rgb)
    this.baseTag = config.baseTag || baseTag
  }

  setBaseTag (baseTag) {
    this.baseTag = baseTag
  }

  static getHash (config) {
    return tools.createHash([config.theme, config.tint, config.indexed, config.rgb], '@')
  }

  compile (tag) {
    let out = []

    out.push('<' + (tag || this.baseTag || 'color') + ' ')
    if (this.theme) {
      out.push('theme="' + this.theme + '" ')
    }
    if (this.tint) {
      out.push('tint="' + this.tint + '" ')
    }
    if (this.indexed) {
      out.push('indexed="' + this.indexed + '" ')
    }
    if (this.rgb) { // rgb: '9ED2E0'
      out.push('rgb="' + this.rgb + '" ')
    }
    out.push('/>')
    return out.join('')
  }
}

module.exports = Color
