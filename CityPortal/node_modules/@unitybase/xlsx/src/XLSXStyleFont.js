/**
 * Created by xmax on 16.11.2017.
 */
const {XLSXBaseStyleController} = require('./XLSXBaseStyleElement')
const tools = require('./tools')
const Color = require('./Color')

let instance = null

/**
 * @class XLSXStyleFont Registered font styles
 */
class XLSXStyleControllerFont extends XLSXBaseStyleController {
  static instance () {
    return instance
  }

  compile (item) {
    let out = []
    let element = item.config
    // noinspection HtmlDeprecatedTag
    out.push('<font>')
    if (element.bold === true) {
      out.push('<b/>')
    }
    if (element.italic === true) {
      out.push('<i/>')
    }
    if (element.shadow === true) {
      out.push('<shadow/>')
    }
    if (element.fontSize) {
      out.push(`<sz val="${String(element.fontSize)}"/>`)
    }
    if (element.color) {
      out.push(element.color.compile())
    }
    if (element.name) {
      out.push(`<name val="${element.name}"/>`)
    }
    if (element.family) {
      out.push(`<family val="${element.family}"/>`)
    }
    if (element.scheme) {
      out.push(`<scheme val="${element.scheme}"/>`)
    }
    if (element.underline) { // <u /> <u val="double" />
      out.push(`<u val="${element.underline}"/>`)
    }
    if (element.strike) {
      out.push(`<strike />`)
    }
    out.push('</font>')
    return out.join('')
  }

  getHash (info) {
    return tools.createHash([
      info.patternType,
      info.charset,
      info.fontSize,
      info.bold,
      info.italic,
      info.shadow,
      info.family,
      info.scheme,
      info.underline,
      info.strike,
      info.color ? Color.getHash(info.color) : '#'
    ])
  }

  /**
   * add new fill style info. Used for add new style.
   * @param {Object} info
   * @param {String} [info.name] (optional) Calibri
   * @param {String} [info.charset] (optional)
   * @param {Number} [info.fontSize] (optional)
   * @param {Boolean} [info.bold] (optional)
   * @param {Boolean} [info.italic] (optional)
   * @param {Boolean} [info.shadow] (optional)
   * @param {Number} [info.family] (optional) 0 - 14
   * @param {String} [info.scheme] (optional)  none, major, minor
   * @param {String} [info.underline] (optional) single, double, singleAccounting, doubleAccounting, none,
   * @param {Boolean} [info.strike] (optional)
   * @param {Object|string|Color} [info.color] (optional)
   * @param {String} [info.color.theme] (optional)
   * @param {Number} [info.color.tint] (optional)
   * @param {Number} [info.color.indexed] (optional)
   * @param {String} [info.color.rgb] (optional)
   * @return {Number} index
   */
  add (info) {
    tools.checkParamTypeObj(info, 'XLSXStyleControllerFont.add')
    if (info.color) {
      info.color = Color.from(info.color)
    }
    return super.add(info, 'FONT')
  }
}

instance = new XLSXStyleControllerFont()

module.exports = {
  XLSXStyleControllerFont
}
