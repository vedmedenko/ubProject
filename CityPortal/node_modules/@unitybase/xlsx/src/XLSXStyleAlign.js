/**
 * Created by xmax on 16.11.2017.
 */
const {XLSXBaseStyleController} = require('./XLSXBaseStyleElement')
const tools = require('./tools')

let instance = null

/**
 * @class XLSXStyleControllerAlign Singleton for manage alignment styles
 */
class XLSXStyleControllerAlign extends XLSXBaseStyleController {
  static instance () {
    return instance
  }

  /**
   * Add new alignment style info. Used for add new style.
   * @param {Object} info
   * @param {String} [info.horizontal] = (general | left | center | right | fill | justify | centerContinuous | distributed)
   * @param {String} [info.vertical] = (top | center | bottom | justify distributed)
   * @param {Number} [info.textRotation]
   * @param {Boolean} [info.wrapText]
   * @param {Number} [info.indent]
   * @param{Number} [info.relativeIndent]
   * @param {Boolean} [info.justifyLastLine]
   * @param {Boolean} [info.shrinkToFit]
   * @param {Number} [info.readingOrder]
   * @return {XLSXBaseStyleElement}
   */
  add (info) {
    tools.checkParamTypeObj(info, 'XLSXStyleControllerAlign.add')
    return super.add(info, 'ALIGN')
  }

  getHash (config) {
    return tools.createHash([
      config.horizontal,
      config.vertical,
      config.textRotation,
      config.wrapText,
      config.indent,
      config.relativeIndent,
      config.justifyLastLine,
      config.shrinkToFit,
      config.readingOrder
    ])
  }

  /**
   * @param {XLSXBaseStyleElement} item
   * @return {string}
   */
  compile (item) {
    let prop
    let out = []
    const element = item.config
    out.push('<alignment ')
    for (prop in element) {
      if (element.hasOwnProperty(prop)) {
        if (prop === 'id' || prop === 'code' || prop === 'code') {
          continue
        }
        out.push(prop, '="', element[prop], '" ')
      }
    }
    out.push('/>')
    return out.join('')
  }
}

instance = new XLSXStyleControllerAlign()

module.exports = {
  XLSXStyleControllerAlign
}
