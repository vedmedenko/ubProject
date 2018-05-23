const {XLSXBaseStyleElement} = require('./XLSXBaseStyleElement')
const {XLSXStyleControllerBorder} = require('./XLSXStyleBorder')
const {XLSXStyleControllerFill} = require('./XLSXStyleFill')
const {XLSXStyleControllerFormat} = require('./XLSXStyleFormat')
const {XLSXStyleControllerFont} = require('./XLSXStyleFont')
const {XLSXStyleControllerAlign} = require('./XLSXStyleAlign')
const {XLSXStyleControllerProtect} = require('./XLSXStyleProtect')
const tools = require('./tools')

/**
 *
 *   const wb = new XLSXWorkbook()
 *   wb.useSharedString = false
 *   var defFont = wb.style.fonts.add({code: 'def', name: 'Calibri', fontSize: 11, scheme: 'minor'})
 *    var borderFull = wb.style.borders.add({
 *       left: {style: 'thin'},
 *       right: {style: 'thin'},
 *       top: {style: 'thin'},
 *       bottom: {style: 'thin'}
 *    })
 *
 *    let fillBG = wb.style.fills.add({fgColor: {rgb: 'CFE39D'}})
 *    var fstyle = wb.style.getStyle({font: defFont})
 *    var fstyleWithFill = wb.style.getStyle({font: defFont, fill: fillBG})
 *
 * @class XLSXStyle
 */
class XLSXStyle {
  static get indexDefFormateDate () {
    return 14
  }
  static get predefinedFormats () {
    return {
      general: 0,
      sum: 2,
      numberGroup: 3,
      sumDelim: 4,
      percent: 9,
      percentDec: 10,
      date: 14,
      dateFull: 15,
      dateShort: 17,
      dateMY: 17,
      timeShortPM: 18,
      timeFullPM: 19,
      time: 20,
      timeFull: 21,
      dateTime: 22,
      numF: 37,
      numRedF: 38,
      sumF: 39,
      sumRedF: 40,
      mail: 49,
      decimal1: '#,#0.0_ ;[Red]\\-#,#0.0\\ ',
      decimal2: '#,##0.00_ ;[Red]\\-#,##0.00\\ ',
      decimal3: '#,###0.000_ ;[Red]\\-#,###0.000\\ ',
      decimal4: '#,####0.0000_ ;[Red]\\-\'#,####0.0000\\ ',
      decimal5: '#,#####0.00000_ ;[Red]\\-#,#####0.00000\\ ',
      decimal6: '#,######0.000000_ ;[Red]\\-#,######0.000000\\ ',
      number: '00 ',
      dateDay: 'dd ',
      dateMonthName: 'mmmm ',
      dateMonth: 'mm '
    }
  }

  /**
   * Use function wb.style.getStyle for create XLSXStyle
   * @private
   * @param {Object} config
   * @param {Number} id
   * @param {XLSXStyleController} controller
   */
  constructor (config, id, controller) {
    this.config = config
    this.id = id
    this.controller = controller
  }

  /**
   * Returns clone of this style with compounded config
   * @param {Object} config Configuration for compound. If config do not have properties the function return same style
   * @return {XLSXStyle}
   */
  compound (config) {
    return this.controller.getStyle(Object.assign(tools.configFromInstance(this.config), config))
  }

  compile () {
    let cfg = this.config
    let out = []
    out.push(
      `<xf numFmtId="${extractId(cfg.format)}" fontId="${extractId(cfg.font)}"`
    )
    out.push(
      ` fillId="${extractId(cfg.fill)}" borderId="${extractId(cfg.border)}" xfId="0"`
    )
    out.push(
      ` ${cfg.format ? 'applyNumberFormat="1"' : ''}  applyFont="1" ${cfg.fill ? 'applyFill="1"' : ''} ${cfg.border ? 'applyBorder="1"' : ''}`
    )
    let setAdditionalAlignment = cfg.wrapText || cfg.verticalAlign || cfg.horizontalAlign
    out.push(
      ` ${cfg.alignment || setAdditionalAlignment ? 'applyAlignment="1"' : ''} ${cfg.protect ? 'applyProtection="1"' : ''} >`
    )
    if (cfg.alignment) {
      out.push(cfg.alignment.compile())
    }
    if (cfg.protect) {
      out.push(cfg.protect.compile())
    }
    if (setAdditionalAlignment) {
      out.push(
        `<alignment ${cfg.wrapText ? 'wrapText="1"' : ''} ${cfg.verticalAlign ? 'vertical="' + cfg.verticalAlign + '"' : ''}`
      )
      // left (by default), center, right
      out.push(cfg.horizontalAlign ? ' horizontal="' + cfg.setHorizontalAlign + '" />' : ' />')
    }
    out.push('</xf>')
    return out.join('')
  }
}

class XLSXStyleController {
  constructor (config) {
    config = config || {}

    this.alignments = XLSXStyleControllerAlign.instance()
    this.borders = XLSXStyleControllerBorder.instance()
    this.borders.add({left: {}, right: {}, top: {}, bottom: {}})
    this.fills = XLSXStyleControllerFill.instance()
    this.fills.add({patternType: 'none'})
    this.formats = XLSXStyleControllerFormat.instance()
    this.fonts = XLSXStyleControllerFont.instance()
    this.protects = XLSXStyleControllerProtect.instance()

    this.elements = []
    this.named = {}
    this.styleHashList = {}
    this.styleHashListIndex = 0

    this.defaultStyle = this.getStyle({code: 'defaultStyle'})
  }

  compile (obj) {
    let out = []

    out.push(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    )
    if (obj.formatsCnt > 0) {
      out.push('<numFmts count="', obj.formats.elements.length, '">', obj.formats.render(), '</numFmts>')
    }
    if (obj.fontsCnt > 0) {
      out.push('<fonts count="', obj.fonts.elements.length, '">', obj.fonts.render(), '</fonts>')
    }
    if (obj.fillsCnt > 0) {
      out.push('<fills count="', obj.fills.elements.length, '">', obj.fills.render(), '</fills>')
    }
    if (obj.bordersCnt > 0) {
      out.push('<borders count="', obj.borders.elements.length, '">', obj.borders.render(), '</borders>')
    }
    out.push(
      '<cellStyleXfs count="1">',
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>',
      '</cellStyleXfs>',
      '<cellXfs count="', obj.elements.length, '">', obj.elementsJoined, '</cellXfs>',
      '<cellStyles count="1">',
      '<cellStyle name="Обычный" xfId="0" builtinId="0"/>',
      '</cellStyles>',
      '<dxfs count="0"/>',
      '<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleLight16"/>',
      '</styleSheet>'
    )

    return out.join('')
    // '<extLst><ext uri="" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main">',
    //    '<x14:slicerStyles defaultSlicerStyle="SlicerStyleLight1"/></ext></extLst>',
  }

  /**
   * If style not exists add new. Return style index
   * @param {object} config
   *  @param {Number|Object|XLSXBaseStyleElement} [config.border] (optional) {@link XLSXStyle#borders.add} {@link XLSXStyleBorder#add}
   *  @param {Number|Object|XLSXBaseStyleElement} [config.fill] (optional) {@link XLSXStyle#fills.add} {@link XLSXStyleFill#add}
   *  @param {Number|Object|XLSXBaseStyleElement} [config.format] (optional) {@link XLSXStyle#formats.add} {@link XLSXStyleFormat#add}
   *  @param {Number|Object|XLSXBaseStyleElement} [config.font] (optional) {@link XLSXStyle#fonts.add} {@link XLSXStyleFont#add}
   *  @param {Number|Object|XLSXBaseStyleElement} [config.alignment] (optional) {@link XLSXStyle#alignments.add} {@link XLSXStyleAlign#add}
   *  @param {Number|Object|XLSXBaseStyleElement} [config.protect] (optional) {@link XLSXStyle#protects.add} {@link XLSXStyleProtect#add}
   *  @return {XLSXStyle}
   */
  getStyle (config) {
    tools.checkParamTypeObj(config, 'XLSXStyleControllerProtect.getHash')
    const cfg = config
    if (typeof cfg.border !== 'undefined') {
      cfg.border = this.borders.get(cfg.border)
    }
    if (typeof cfg.fill !== 'undefined') {
      cfg.fill = this.fills.get(cfg.fill)
    }
    if (typeof cfg.format !== 'undefined') {
      cfg.format = this.formats.get(cfg.format)
    }
    if (typeof cfg.font !== 'undefined') {
      cfg.font = this.fonts.get(cfg.font)
    }
/*
    cfg.wrapText = cfg.wrapText !== undefined ? cfg.wrapText : cfg.setWrapText
    cfg.verticalAlign = cfg.verticalAlign || cfg.setVerticalAlign
    cfg.horizontalAlign = cfg.horizontalAlign || cfg.setHorizontalAlign
*/
    if (typeof cfg.alignment !== 'undefined') {
      cfg.alignment = this.alignments.get(cfg.alignment)
    }
    if (typeof cfg.protect !== 'undefined') {
      cfg.protect = this.protects.get(cfg.protect)
    }
    const styleHash = this.getStyleHash(cfg)
    let style = this.styleHashList[styleHash]
    if (style) {
      return style
    }

    style = new XLSXStyle(cfg, this.styleHashListIndex, this)
    this.styleHashList[styleHash] = style
    this.elements[this.styleHashListIndex] = style
    this.styleHashListIndex++
    if (cfg.code) {
      this.named[cfg.code] = cfg.id
    }
    return style
  }

  getDefDateStyle () {
    if (!this.named.DefDateStyle) {
      this.getStyle({format: XLSXStyle.indexDefFormateDate, code: 'DefDateStyle'})
    }
    return this.named.DefDateStyle
  }

  /**
   * @private
   * @param config
   * @return {String}
   */
  getStyleHash (config) {
    return [
      !config.border ? '#' : String(extractId(config.border)),
      !config.fill ? '#' : String(extractId(config.fill)),
      !config.format ? '#' : String(extractId(config.format)),
      !config.font ? '#' : String(extractId(config.font)),
      !config.alignment ? '#' : String(extractId(config.alignment)),
      !config.protect ? '#' : String(extractId(config.protect))
/*
      ,
      !config.wrapText ? '1' : '0',
      !config.verticalAlign ? '#' : config.verticalAlign,
      !config.horizontalAlign ? '#' : config.horizontalAlign
*/
    ].join('_')
  }

  /**
   * @private
   * @return {String}
   */
  render () {
    if (this.fonts.elements.length === 0) {
      this.fonts.add({name: 'Calibri', fontSize: 11, scheme: 'minor'})
    }

    this.elementsJoined = this.elements.map(item => item.compile()).join('')
    this.bordersCnt = this.borders.elements.length
    this.fillsCnt = this.fills.elements.length
    this.formatsCnt = this.formats.elements.length
    this.fontsCnt = this.fonts.elements.length
    this.alignmentsCnt = this.alignments.elements.length
    this.protectsCnt = this.protects

    return this.compile(this) // this.tpl.apply(this);
  }
}

function extractId (item) {
  switch (typeof item) {
    case 'undefined': return 0
    case 'object': return item.id
    case 'number': return item
  }
}

module.exports = {
  XLSXStyle,
  XLSXStyleController
}
