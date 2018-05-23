/**
 * Created by xmax on 16.11.2017.
 */
const {XLSXBaseStyleController} = require('./XLSXBaseStyleElement')
const tools = require('./tools')
const Color = require('./Color')

let instance = null
/**
 * @class XLSXStyleControllerFill Registered fill styles
 *  example
 *
 *    const wb = new XLSXWorkbook()
 *    let fillBG = wb.style.fills.add({fgColor: {rgb: 'fff100'}})
 *    same as
 *    fillBG = wb.style.fills.add('fff100')
 *    same as
 *    fillBG = wb.style.fills.add(Color.rgb('fff100'))
 *    same as
 *    fillBG = wb.style.fills.add({fgColor: Color.rgb('fff100'))
 *    let fillBG1 = wb.style.fills.add({fgColor: {rgb: 'fff100'}})
 */
class XLSXStyleControllerFill extends XLSXBaseStyleController {
  static instance () {
    return instance
  }

  compile (item) {
    let element = item.config
    let fg = element.fgColor ? element.fgColor.compile('fgColor') : ''
    let bg = element.bgColor ? element.bgColor.compile('bgColor') : ''
    return `<fill><patternFill patternType="${element.patternType || 'solid'}"> ${fg}${bg}</patternFill></fill>`
  }

  getHash (info) {
    return tools.createHash([
      info.patternType,
      info.bgColor ? Color.getHash(info.bgColor) : '#',
      info.fgColor ? Color.getHash(info.fgColor) : '#'
    ])
  }

  /**
   * add new fill style info. Used for add new style.
   * .!!!!
   *  fgColor - Background color of cell
   *  bgColor - Color of pattern
   * @param {Object|String|Color} info
   * @param {String} [info.patternType] Type of pattern of cell
   * @param {Object|Color} [info.fgColor] (optional) Background color of cell
   * @param {String} [info.fgColor.theme] (optional)
   * @param {Number} [info.fgColor.tint] (optional)
   * @param {Number} [info.fgColor.indexed] (optional)
   * @param {Number} [info.fgColor.rgb] (optional)
   * @param {Object|Color} [info.bgColor] (optional) Color of pattern
   * @param {String} [info.bgColor.theme] (optional)
   * @param {Number} [info.bgColor.tint] (optional)
   * @param {Number} [info.bgColor.indexed] (optional)
   * @param {Number} [info.bgColor.rgb] (optional)
   * @return {XLSXBaseStyleElement}
   */
  add (info) {
    tools.checkParamTypeObjStr(info, 'XLSXStyleControllerFill.add')
    if (typeof info === 'string') {
      info = {fgColor: new Color(info)}
    }
    if (info instanceof Color) {
      info = {fgColor: info}
    }
    if (info.fgColor && !(info.fgColor instanceof Color)) {
      info.fgColor = new Color(info.fgColor)
    }
    if (info.bgColor && !(info.bgColor instanceof Color)) {
      info.bgColor = new Color(info.bgColor)
    }
    return super.add(info, 'FILL')
  }
}

instance = new XLSXStyleControllerFill()

module.exports = {
  XLSXStyleControllerFill
}
