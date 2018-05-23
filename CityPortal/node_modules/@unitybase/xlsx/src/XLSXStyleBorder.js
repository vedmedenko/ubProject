/**
 * Created by xmax on 16.11.2017.
*/
const {XLSXBaseStyleController} = require('./XLSXBaseStyleElement')
const tools = require('./tools')
const Color = require('./Color')
const orderWrite = ['left', 'right', 'top', 'bottom', 'diagonal']

let instance = null
/**
 *
 *    const wb = new XLSXWorkbook()
 *    const borderAll = wb.style.borders.add({
 *     left: {style: 'thin'},
 *     right: {style: 'thin'},
 *     top: {style: 'thin'},
 *     bottom: {style: 'thin'}
 *   })
 *
 *    const borderAllAlt = wb.style.borders.add({
 *      style: 'thin',
 *      color: 'ffffff'
 *    })
 *
 * @class XLSXStyleBorder Registered border styles
 */
class XLSXStyleControllerBorder extends XLSXBaseStyleController {
  static instance () {
    return instance
  }

  /**
   * @param {XLSXBaseStyleElement} item
   * @return {string}
   */
  compile (item) {
    let out = []
    const element = item.config
    out.push('<border>')
    orderWrite.forEach(xKey => {
      let prop = element[xKey]
      if (prop) {
        if (xKey === 'id' || xKey === 'style' || xKey === 'color' || xKey === 'code') {
          return
        }
        if (prop.style) {
          let colorT = prop.color ? prop.color.compile() : '<color auto="1" />'
          out.push(`<${xKey} style="${prop.style}">${colorT}</${xKey}>`)
        } else {
          out.push(`<${xKey}/>`)
        }
      }
    })
    out.push('</border>')
    return out.join('')
  }

  /**
   * add new border style info. Used for add new style.
   * @param {Object} info
   * @param {Object} [info.left] (optional)
   * @param {String} [info.left.style] (optional) "none","thin","medium","dashed","dotted","thick","double","hair","mediumDashed","dashDot","mediumDashDot","dashDotDot","mediumDashDotDot","slantDashDot"
   * @param {String} [info.left.color] (optional) default=auto {rgb: 'FFFF0000}
   * @param {Object} [info.right] (optional) like left
   * @param {Object} [info.top] (optional) like left
   * @param {Object} [info.bottom] (optional) like left
   * @param {Object} [info.diagonal] (optional) like left
   * @param {String} [info.style] (optional) Default style for all border
   * @param {String} [info.color] (optional) Default color for all border
   * @param {String} [info.code] (optional) for link code to index in associative array
   * @return {XLSXBaseStyleElement}
   */
  add (info) {
    tools.checkParamTypeObj(info, 'XLSXStyleControllerBorder.add')
    info = info || {}
    info.left = info.left || {}
    info.right = info.right || {}
    info.top = info.top || {}
    info.bottom = info.bottom || {}
    if (info.style) {
      info.left.style = info.left.style || info.style
      info.right.style = info.left.style || info.style
      info.top.style = info.left.style || info.style
      info.bottom.style = info.left.style || info.style
    }
    if (info.color && !(info.color instanceof Color)) {
      info.color = new Color(info.color)
    }
    if (info.color) {
      info.left.color = info.left.color || info.color
      info.right.color = info.left.color || info.color
      info.top.color = info.left.color || info.color
      info.bottom.color = info.left.color || info.color
    }
    if (info.left.color && !(info.left.color instanceof Color)) {
      info.left.color = new Color(info.left.color)
    }
    if (info.right.color && !(info.right.color instanceof Color)) {
      info.right.color = new Color(info.right.color)
    }
    if (info.top.color && !(info.top.color instanceof Color)) {
      info.top.color = new Color(info.top.color)
    }
    if (info.bottom.color && !(info.bottom.color instanceof Color)) {
      info.bottom.color = new Color(info.bottom.color)
    }
    info.diagonal = info.diagonal || {}
    if (info.diagonal.color && !(info.diagonal.color instanceof Color)) {
      info.diagonal.color = new Color(info.diagonal.color)
    }
    return super.add(info, 'BORDER')
  }

  getHash (info) {
    return tools.createHash([
      info.left.style,
      info.left.color ? Color.getHash(info.left.color) : '#',
      info.right.style,
      info.right.color ? Color.getHash(info.right.color) : '#',
      info.top.style,
      info.top.color ? Color.getHash(info.top.color) : '#',
      info.bottom.style,
      info.bottom.color ? Color.getHash(info.bottom.color) : '#',
      info.diagonal.style,
      info.diagonal.color ? Color.getHash(info.diagonal.color) : '#'
    ])
  }

  /**
   * <border>
   * <left style="medium">
   *    <color rgb="FFFF0000"/>
   * </left>
   * <top/>
   * <right style="thin">
   *   <color auto="1"/>
   * </right>
   * </border>
   */
  /*
 */
}

instance = new XLSXStyleControllerBorder()

module.exports = {
  XLSXStyleControllerBorder
}
