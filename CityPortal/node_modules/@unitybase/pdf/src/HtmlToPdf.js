/*
 * @author Maksim Loboda
 * Refactored for ES6 by pavel.mash on 10.02.2017
 */

/* global DOMParser, XMLSerializer */

const _ = require('lodash')
const pdfUtils = require('./pdfUtils')
const PdfTextBox = require('./PdfTextBox')
const PNG = require('../libs/png')
/**
 * @param {Object} pdf
 */
function HtmlToPdf (pdf) {
  this.pdf = pdf
  this.parser = new DOMParser() // do not use window.DOMParser for server-side compatibility
  this.serializer = new XMLSerializer()
  this.reserveTopHeight = 0
}

/**
 *
 * @returns {number}
 */
HtmlToPdf.prototype.getPageTopPos = function () {
  return this.pdf.getInnerPageTopPos() + this.reserveTopHeight
}

HtmlToPdf.prototype.serializeArray = function (arr) {
  let res = arr.map(elm => this.serializer.serializeToString(elm))
  return res.join('')
}

HtmlToPdf.prototype.parseStyle = function (node) {
  if (!node.attributes) {
    return {}
  }
  let styleStr = node.attributes.getNamedItem('style')
  if (!styleStr || !styleStr.value) {
    return {}
  }
  let result = {}
  _.forEach(styleStr.value.split(';'), function (elementStr) {
    if (!elementStr) return
    let pair = elementStr.split(':')
    if (pair.length < 2) {
      return
    }
    result[pair[0].trim()] = pair[1].trim()
  })
  return result
}

HtmlToPdf.prototype.toPdfMeasure = function (styleProp, options) {
  if (!styleProp) return 0
  let val = styleProp
  if (typeof (val) !== 'string') {
    val = val + ''
  }
  val = val.trim()
  if (val.substr(-1) === '%') {
    if (!options || options.banPercent) {
      throw new Error('% is not supported metric for font-size')
    } else {
      if (options) {
        options.isPercent = true
      }
    }
  }
  val = parseInt(val, 10)
  if (val === 0) {
    return val
  }
  if (Number.isNaN(val)) {
    return null  // do not throw error
  }
  return pdfUtils.convertToMeasure(val, 'px', this.pdf.page.measure)
}

HtmlToPdf.prototype.getStyleProp = function (style) {
  let res = {
    font: {}
  }
  if (style['font-family']) {
    res.font.name = style['font-family']
    res.font.name = this.pdf.pdf.getFontNameByHtmlName(res.font.name) || res.font.name
  }
  let tmp
  if (style['font-weight']) {
    tmp = style['font-weight']
    if (tmp) {
      res.font.weight = tmp
      if (tmp !== 'normal') {
        res.font.type = 'bold'
      }
    }
  }
  if (style['font-style']) {
    tmp = style['font-style']
    if (tmp) {
      res.font.style = tmp
      if (tmp !== 'normal') {
        res.font.type = (res.font.type || '') + 'italic'
      }
    }
  }
  if (style.color) {
    res.font.color = style.color
  }
  if (style['font-size']) {
    tmp = style['font-size']
    if (tmp && tmp !== 'normal') {
      res.font.size = parseFloat(tmp) // me.toPdfMeasure(tmp);
    }
  }
  // cfg.color || pBlock.font.color);
  if (style['text-align']) {
    tmp = style['text-align']
    if (tmp) {
      res.align = tmp
    }
  }
  if (style['vertical-align']) {
    tmp = style['vertical-align']
    tmp = tmp === 'middle' ? 'center' : tmp
    res.verticalAlign = tmp
  }
  if (style['text-indent']) {
    res.textIndent = this.toPdfMeasure(style['text-indent'])
  }
  if (style['background-color']) {
    res.backgroundColor = style['background-color']
  }

  if (style['list-style']) {
    tmp = style['list-style']
    let tmpArr = tmp.trim().split(' ')
    switch (tmpArr.length) {
      case 1:
        res.listStyleType = tmpArr[0]
        break
      case 2:
      case 3:
        res.listStyleType = tmpArr[0]
        res.listStylePosition = tmpArr[1]
        break
    }
      // list-style: square outside
  }

  if (style['list-style-position']) {
    res.listStylePosition = style['list-style-position']
  }
  if (style['list-style-type']) {
    res.listStyleType = style['list-style-type']
  }

  if (style.disableSplit === 'true' || style.disablesplit === 'true' || style['disable-split'] === 'true') {
    res.disableSplit = true
  }
  if (style.disableSplit === 'false' || style.disablesplit === 'false' || style['disable-split'] === 'false') {
    res.disableSplit = false
  }

  if (style.width) {
    tmp = {}
    res.width = this.toPdfMeasure(style.width, tmp)
    if (tmp.isPercent) {
      res.widthPercent = res.width
      res.width = undefined
    }
  }
  if (style.height) {
    tmp = {}
    res.height = this.toPdfMeasure(style.height, tmp)
    if (tmp.isPercent) {
      res.heightPercent = res.height
      res.height = undefined
    }
  }

  return res
}

function getAttribute (node, name, defaultValue) {
  if (!node.attributes) {
    return defaultValue
  }
  let val = node.attributes.getNamedItem(name)
  if (val) {
    return val.value || defaultValue
  }
  return defaultValue
}

function getAttributeInt (node, name) {
  return parseInt(getAttribute(node, name, 0), 10)
}

/**
 * Set attribute value. If attribute not exist create it.
 * @param {xmldom.Node} node
 * @param {String} name
 * @param {Int} value
 */
function updateAttributeInt (node, name, value) {
  if (!node.attributes) return

  let val = node.attributes.getNamedItem(name)
  if (val) {
    val.value = value
  } else {
    val = node.ownerDocument.createAttribute(name)
    val.value = value
    node.attributes.setNamedItem(val)
  }
}

const htmlBaseEntity = {'&lt;': 1, '&gt;': 1, '&amp;': 1, '&apos;': 1, '&quot;': 1}
// all HTML4 entities as defined here: http://www.w3.org/TR/html4/sgml/entities.html
// added: amp, lt, gt, quot and apos
const htmlEntityTable = {'quot': 34, 'amp': 38, 'apos': 39, 'lt': 60, 'gt': 62, 'nbsp': 160, 'iexcl': 161, 'cent': 162, 'pound': 163, 'curren': 164, 'yen': 165, 'brvbar': 166, 'sect': 167, 'uml': 168, 'copy': 169, 'ordf': 170, 'laquo': 171, 'not': 172, 'shy': 173, 'reg': 174, 'macr': 175, 'deg': 176, 'plusmn': 177, 'sup2': 178, 'sup3': 179, 'acute': 180, 'micro': 181, 'para': 182, 'middot': 183, 'cedil': 184, 'sup1': 185, 'ordm': 186, 'raquo': 187, 'frac14': 188, 'frac12': 189, 'frac34': 190, 'iquest': 191, 'Agrave': 192, 'Aacute': 193, 'Acirc': 194, 'Atilde': 195, 'Auml': 196, 'Aring': 197, 'AElig': 198, 'Ccedil': 199, 'Egrave': 200, 'Eacute': 201, 'Ecirc': 202, 'Euml': 203, 'Igrave': 204, 'Iacute': 205, 'Icirc': 206, 'Iuml': 207, 'ETH': 208, 'Ntilde': 209, 'Ograve': 210, 'Oacute': 211, 'Ocirc': 212, 'Otilde': 213, 'Ouml': 214, 'times': 215, 'Oslash': 216, 'Ugrave': 217, 'Uacute': 218, 'Ucirc': 219, 'Uuml': 220, 'Yacute': 221, 'THORN': 222, 'szlig': 223, 'agrave': 224, 'aacute': 225, 'acirc': 226, 'atilde': 227, 'auml': 228, 'aring': 229, 'aelig': 230, 'ccedil': 231, 'egrave': 232, 'eacute': 233, 'ecirc': 234, 'euml': 235, 'igrave': 236, 'iacute': 237, 'icirc': 238, 'iuml': 239, 'eth': 240, 'ntilde': 241, 'ograve': 242, 'oacute': 243, 'ocirc': 244, 'otilde': 245, 'ouml': 246, 'divide': 247, 'oslash': 248, 'ugrave': 249, 'uacute': 250, 'ucirc': 251, 'uuml': 252, 'yacute': 253, 'thorn': 254, 'yuml': 255, 'OElig': 338, 'oelig': 339, 'Scaron': 352, 'scaron': 353, 'Yuml': 376, 'fnof': 402, 'circ': 710, 'tilde': 732, 'Alpha': 913, 'Beta': 914, 'Gamma': 915, 'Delta': 916, 'Epsilon': 917, 'Zeta': 918, 'Eta': 919, 'Theta': 920, 'Iota': 921, 'Kappa': 922, 'Lambda': 923, 'Mu': 924, 'Nu': 925, 'Xi': 926, 'Omicron': 927, 'Pi': 928, 'Rho': 929, 'Sigma': 931, 'Tau': 932, 'Upsilon': 933, 'Phi': 934, 'Chi': 935, 'Psi': 936, 'Omega': 937, 'alpha': 945, 'beta': 946, 'gamma': 947, 'delta': 948, 'epsilon': 949, 'zeta': 950, 'eta': 951, 'theta': 952, 'iota': 953, 'kappa': 954, 'lambda': 955, 'mu': 956, 'nu': 957, 'xi': 958, 'omicron': 959, 'pi': 960, 'rho': 961, 'sigmaf': 962, 'sigma': 963, 'tau': 964, 'upsilon': 965, 'phi': 966, 'chi': 967, 'psi': 968, 'omega': 969, 'thetasym': 977, 'upsih': 978, 'piv': 982, 'ensp': 8194, 'emsp': 8195, 'thinsp': 8201, 'zwnj': 8204, 'zwj': 8205, 'lrm': 8206, 'rlm': 8207, 'ndash': 8211, 'mdash': 8212, 'lsquo': 8216, 'rsquo': 8217, 'sbquo': 8218, 'ldquo': 8220, 'rdquo': 8221, 'bdquo': 8222, 'dagger': 8224, 'Dagger': 8225, 'bull': 8226, 'hellip': 8230, 'permil': 8240, 'prime': 8242, 'Prime': 8243, 'lsaquo': 8249, 'rsaquo': 8250, 'oline': 8254, 'frasl': 8260, 'euro': 8364, 'image': 8465, 'weierp': 8472, 'real': 8476, 'trade': 8482, 'alefsym': 8501, 'larr': 8592, 'uarr': 8593, 'rarr': 8594, 'darr': 8595, 'harr': 8596, 'crarr': 8629, 'lArr': 8656, 'uArr': 8657, 'rArr': 8658, 'dArr': 8659, 'hArr': 8660, 'forall': 8704, 'part': 8706, 'exist': 8707, 'empty': 8709, 'nabla': 8711, 'isin': 8712, 'notin': 8713, 'ni': 8715, 'prod': 8719, 'sum': 8721, 'minus': 8722, 'lowast': 8727, 'radic': 8730, 'prop': 8733, 'infin': 8734, 'ang': 8736, 'and': 8743, 'or': 8744, 'cap': 8745, 'cup': 8746, 'int': 8747, 'there4': 8756, 'sim': 8764, 'cong': 8773, 'asymp': 8776, 'ne': 8800, 'equiv': 8801, 'le': 8804, 'ge': 8805, 'sub': 8834, 'sup': 8835, 'nsub': 8836, 'sube': 8838, 'supe': 8839, 'oplus': 8853, 'otimes': 8855, 'perp': 8869, 'sdot': 8901, 'lceil': 8968, 'rceil': 8969, 'lfloor': 8970, 'rfloor': 8971, 'lang': 9001, 'rang': 9002, 'loz': 9674, 'spades': 9824, 'clubs': 9827, 'hearts': 9829, 'diams': 9830}

/**
 * Remove all not xml Entities
 * @param htmlText
 * @returns {*}
 */
function removeEntities (htmlText) {
    /*
     var matches, re = /&([A-Za-z]{2,20})?;/g,
     rRe;
     matches = htmlText.match(re);
     if (!matches){
     return  htmlText;
     }

     rRe = new RegExp('(' +
     _.difference(_.uniq(matches),['&lt;', '&gt;', '&amp;', '&apos;', '&quot;']).join('|') + ')', 'g');
     return htmlText.replace(rRe,' ');
     */

  if (!htmlText) {
    return htmlText
  }

  return htmlText.replace(/&([A-Za-z0-9]{2,20})?;/g, function (c) {
    if (htmlBaseEntity[c]) {
      return c
    }
    let e = htmlEntityTable[c.substr(1, c.length - 2)]
    return e ? String.fromCharCode(e) : ' '
  })
}

/**
 *
 * @param {Object} n Node
 * @returns {{}}
 */
HtmlToPdf.prototype.getImageInfo = function (n) {
  let img = {
    imgData: n.attributes.getNamedItem('src').nodeValue
  }

  img.imgType = img.imgData.match(/^data:image\/(.*);/)
  if (img.imgType && img.imgType.length > 1) {
    img.imgType = (img.imgType[1] || '').toUpperCase()
  } else {
    img.imgType = 'JPEG'
  }

  let initHeight = img.nodeHeight = n.attributes.getNamedItem('height') ? Number(n.attributes.getNamedItem('height').nodeValue) * this.kWidth : null
  let initWidth = img.nodeWidth = n.attributes.getNamedItem('width') ? Number(n.attributes.getNamedItem('width').nodeValue) * this.kWidth : null
  if ((initHeight === null) || (initWidth === null)) {
    let imgData = img.imgData.split(',')[1]
    let imgParams, baseWidth, baseHeight
    switch (img.imgType) {
      case 'JPEG':
        imgParams = getJpegSizeFromBytes(base64toArrayBuffer(imgData))
        baseWidth = imgParams.width
        baseHeight = imgParams.height
        break
      case 'PNG':
        imgParams = new PNG(base64toArrayBuffer(imgData))
        baseWidth = imgParams.width
        baseHeight = imgParams.height
        break
      default:
        throw new Error('Unknown image format')
    }
    if (!img.nodeWidth) {
      img.nodeWidth = baseWidth
      if (initHeight && (initHeight !== baseHeight)) {
        img.nodeWidth = img.nodeWidth * (baseHeight / initHeight)
      }
    }
    if (!img.nodeHeight) {
      img.nodeHeight = baseHeight * this.kWidth
      if (initWidth && (initWidth !== baseWidth)) {
        img.nodeHeight = img.nodeHeight * (baseWidth / initWidth)
      }
    }
  }
  return img
}

function parseComplex (value, onValue) {
  let result = {}
  if (!onValue) {
    onValue = function (v) { return v }
  }
  switch (value.length) {
    case 1:
      result.top = result.left = result.right = result.bottom = onValue(value[0])
      break
    case 2:
      result.top = result.bottom = onValue(value[0])
      result.left = result.right = onValue(value[1])
      break
    case 3:
      result.top = onValue(value[0])
      result.left = result.right = onValue(value[1])
      result.bottom = onValue(value[2])
      break
    case 4:
      result.top = onValue(value[0])
      result.right = onValue(value[1])
      result.bottom = onValue(value[2])
      result.left = onValue(value[3])
      break
  }
  return result
}

HtmlToPdf.prototype.getBorderInfo = function (itemStyle) {
  let borderStyle, bWidth

  if (itemStyle.border) {
    let brd = itemStyle.border.split(' ')
    if (brd.length > 0) {
      bWidth = [brd[0]]
    }
    if (brd.length > 1) {
      borderStyle = [brd[1]]
    }
  }
  if (!borderStyle) {
    borderStyle = itemStyle['border-style']
    if (borderStyle) {
      borderStyle = (borderStyle || '').split(' ')
    }
  }
  borderStyle = parseComplex(borderStyle || [])
  if (itemStyle['border-top-style']) {
    borderStyle.top = itemStyle['border-top-style']
  }
  if (itemStyle['border-right-style']) {
    borderStyle.right = itemStyle['border-right-style']
  }
  if (itemStyle['border-bottom-style']) {
    borderStyle.bottom = itemStyle['border-bottom-style']
  }
  if (itemStyle['border-left-style']) {
    borderStyle.left = itemStyle['border-left-style']
  }

  if (!bWidth) {
    bWidth = itemStyle['border-width']
    if (bWidth) {
      bWidth = (bWidth || '').split(' ')
    }
  }
  let rWidth = parseComplex(bWidth || [])
  if (itemStyle['border-top-width']) {
    rWidth.top = itemStyle['border-top-width']
  }
  if (itemStyle['border-right-width']) {
    rWidth.right = itemStyle['border-right-width']
  }
  if (itemStyle['border-bottom-width']) {
    rWidth.bottom = itemStyle['border-bottom-width']
  }
  if (itemStyle['border-left-width']) {
    rWidth.left = itemStyle['border-left-width']
  }
  if (rWidth.top) {
    rWidth.top = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.top), 'px')
  }
  if (rWidth.right) {
    rWidth.right = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.right), 'px')
  }
  if (rWidth.bottom) {
    rWidth.bottom = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.bottom), 'px')
  }
  if (rWidth.left) {
    rWidth.left = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.left), 'px')
  }
  return { borderWidth: rWidth, borderStyle: borderStyle }
}

function parseIntValue (value) {
  switch (typeof (value)) {
    case 'string':
      return parseInt(value, 10)
    case 'number':
      return value
    default: return 0
  }
}

HtmlToPdf.prototype.getPaddingInfo = function (itemStyle, def) {
  let fdef = def || {}
  let rWidth = { top: fdef.top, left: fdef.left, right: fdef.right, bottom: fdef.bottom }
  let bWidth = itemStyle.padding

  if (bWidth) {
    bWidth = (bWidth || '').split(' ')
    rWidth = parseComplex(bWidth || [])
  }
  if (itemStyle['padding-top']) {
    rWidth.top = itemStyle['padding-top']
  }
  if (itemStyle['padding-right']) {
    rWidth.right = itemStyle['padding-right']
  }
  if (itemStyle['padding-bottom']) {
    rWidth.bottom = itemStyle['padding-bottom']
  }
  if (itemStyle['padding-left']) {
    rWidth.left = itemStyle['padding-left']
  }
  if (rWidth.top) {
    rWidth.top = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.top), 'px')
  }
  if (rWidth.right) {
    rWidth.right = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.right), 'px')
  }
  if (rWidth.bottom) {
    rWidth.bottom = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.bottom), 'px')
  }
  if (rWidth.left) {
    rWidth.left = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.left), 'px')
  }
  return rWidth
}

HtmlToPdf.prototype.getMarginInfo = function (itemStyle, def) {
  let fDef = def || {}
  let rWidth = { top: fDef.top || 0, left: fDef.left || 0, right: fDef.right || 0, bottom: fDef.bottom || 0 }
  let bWidth = itemStyle.margin

  if (bWidth) {
    bWidth = (bWidth || '').split(' ')
    rWidth = parseComplex(bWidth || [])
  }
  if (itemStyle['margin-top']) {
    rWidth.top = itemStyle['margin-top']
  }
  if (itemStyle['margin-right']) {
    rWidth.right = itemStyle['margin-right']
  }
  if (itemStyle['margin-bottom']) {
    rWidth.bottom = itemStyle['margin-bottom']
  }
  if (itemStyle['margin-left']) {
    rWidth.left = itemStyle['margin-left']
  }
  if (rWidth.top) {
    rWidth.top = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.top), 'px')
  }
  if (rWidth.right) {
    rWidth.right = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.right), 'px')
  }
  if (rWidth.bottom) {
    rWidth.bottom = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.bottom), 'px')
  }
  if (rWidth.left) {
    rWidth.left = this.pdf.pdf.convertToMeasure(parseIntValue(rWidth.left), 'px')
  }
  return rWidth
}

/**
 * Write html to pdf document.
 * Supported tags:
 *
 *    - `<STRONG>, <b>, <EM>, <BIG>, <i>, <h1-6>, <br/>, <p>, <span>`
 *    - `<font name="Times.." type="Bold" size="12" color="green" >`
 *     - <table>, <tbody>, <tr>, <td>,  <img> (as block element), <div>, <li>, <ul>, <ol>, <blockquote>
 *    - top-level (not nested) - <hr><!--pagebreak-->`
 *
 * Supported tags attributes:
 *
 *  - style="font-family: 'String'; font-weight: 'bold|normal'; font-style: 'italic|normal', font-size: Number; text-align: 'string'; "
 *    supported style parameters:
 *     'font-family','font-weight','font-style','font-size','text-align','vertical-align','text-indent',
 *     'list-style-type',
 *     'list-style-position',
 *     'background-color',
 *     'width','height',
 *     'border-style','border-top-style','border-bottom-style','border-right-style','border-left-style','border',
 *     'border-width','border-top-width','border-bottom-width','border-right-width','border-left-width',
 *     'padding','padding-top','padding-bottom','padding-right','padding-left',
 *     'margin','margin-top','margin-bottom','margin-right','margin-left',
 *     'disable-split','disableSplit','disablesplit',
 *     'indissoluble-first-rows','indissoluble-end-rows','draw-border-onsplit','top-through-line'
 *  - for `table` tag also support `line-height` style attribute
 *
 *  Special features:
 *    For 'tr' tag style attribute 'disable-split'. If it is true table row will be fully on one page.
 *    For 'tr' tag style attribute 'top-through-line'. If it is true this row will be automatically added on the top of each next page.
 *
 *     <tr style="disable-split: true; top-through-line: true;">...
 *
 *   For 'table' tag style attributes 'indissoluble-first-rows' and 'indissoluble-end-rows'.
 *   If value of 'indissoluble-first-rows'  more than one N first rows will be always on one page.
 *
 *     <table style="indissoluble-first-rows: 5; indissoluble-end-rows: 6;">
 *
 *   For 'table' tag style attribute 'draw-border-onsplit'. If it is true table row draw lines on page break.
 *
 * @param {Object} config
 * @param {String} config.html
 * HTML must be without root tag.
 * Example:
 *
 *      pdf.writeHtml({html: '<p>this <b>is bould</b> text</p>'});
 *
 *
 * @param {Integer} [config.left=0]
 * @param {Integer} [config.top] Default value - current position
 * @param {Integer} [config.width] Default value - maxPageWidth limit width when more than 0
 * @param {Boolean} [config.autoWrite=true] !Reserved. Does not works now. When false then method return array of created components but not call its write method.
 * @param {Object} [config.font] Default value - context.font
 * @param {Integer} [config.pageNumber] Default value - context.pageNumber
 * @param {Number} [config.pageWidth=700]
 * @param {Number} [config.tableLineHeight] If was passed then will change line height for tables inside html.
 * @param {function} [config.onPositionDetermine] If exist this parameter program looking for markers in HTML having format "<%=markerCode%>" and call back this function.
 * The "markerCode" must contain only literal without whitespace.
 * Will be called with the following config parameters:
 *
 * - position {object}
 * - position.top {Number} Top position in selected measure (default mm)
 * - position.left {Number}
 * - position.width {Number}
 * - position.height {Number}
 *
 * This position is nearest "block" HTML element containing marker.
 * @param {String} [config.orientation]
 */
HtmlToPdf.prototype.writeHtml = function (config) {
  let html = removeEntities(config.html)
  html = html.replace(/(\r|\n)/g, '')
  this.parsePositionMark = !!config.onPositionDetermine
  if (this.parsePositionMark) {
    let REPositionMaskRP = /<%=([A-Za-z0-9 -_]+?)%>/g
    let REInlinePositionMaskRP = /&lt;%=([A-Za-z0-9 -_]+?)%&gt;/g

    html = html.replace(REPositionMaskRP, '<position-mark code="$1"></position-mark>')
    html = html.replace(REInlinePositionMaskRP, '<position-mark code="$1"></position-mark>')
  }

  let root = this.parser.parseFromString('<xmn>' + html + '</xmn>', 'application/xml').documentElement
  if (root.childNodes && root.childNodes.length > 0 && root.childNodes[0].nodeName === 'parsererror') {
    throw new Error(root.childNodes[0].innerHTML)
  }

  this.config = config
  this.autoWrite = config.autoWrite === null || config.autoWrite === undefined ? true : config.autoWrite
  this.defWidth = config.orientation === 'landscape' ? 1086 : 758   // 793  1121
  this.kWidth = this.pdf.page.innerSize.width / (config.pageWidth || this.defWidth)

  let ctx = new HtmlContext(this.pdf, null, root, _.defaults({inline: false}, getEmptyInfo()), {
    maxWidth: this.pdf.page.innerSize.width,
    top: config.top || this.pdf.getPosition() || this.pdf.page.innerSize.topColon,
    left: config.left || this.pdf.page.innerSize.left,
    pageNumber: config.pageNumber || this.pdf.getPageNumber()
  })

    // console.profile('HtmlToPdf.writeHtml');
  this.parseNodes(ctx)
    // console.profileEnd();
  return ctx.getOutPosition()
}

const tagInfo = {
  table: {inline: false},
  img: {inline: false},
  tr: {inline: false},
  td: {inline: false},
  div: {inline: false},
  blockquote: {inline: false},
    // br: {inline: false},
  ul: {inline: false},
  ol: {inline: false},
  li: {inline: false},
  p: {inline: false},
  hr: {inline: true},
  strong: {inline: true},
  em: {inline: true},
  big: {inline: true},
  span: {inline: true},
  font: {inline: true},
  h1: {inline: false},
  h2: {inline: false},
  h3: {inline: false},
  h4: {inline: false},
  h5: {inline: false},
  h6: {inline: false},
  '#comment': {inline: true, skip: true, comment: true},
  '#text': {inline: true, text: true}
}
tagInfo.b = tagInfo.strong
tagInfo.i = tagInfo.em

function getEmptyInfo () {
  return {
    styleProps: {},
    style: {},
    border: {borderWidth: {}},
    padding: {},
    margin: {}
    // border: {borderWidth: {top: 0, left: 0, right: 0, bottom: 0} },
    // padding: {top: 0, left: 0, right: 0, bottom: 0},
    // /margin: {top: 0, left: 0, right: 0, bottom: 0}
  }
}

/**
 *
 * @param {Object} node
 * @returns {Object}
 */
HtmlToPdf.prototype.getTagInfo = function (node) {
  let nodeName = node.nodeName.toLowerCase()
  let info = tagInfo[nodeName]
  if (info) {
    info = _.cloneDeep(info)
  }
  info = info || {text: true, inline: true}
  if (nodeName === '#comment') {
    if (node.data && (node.data.trim() === 'pagebreak')) {
      info.inline = false
    }
  }
  _.defaults(info, getEmptyInfo())

  if (!info.skip && !info.text) {
    info.styleProps = this.parseStyle(node)
    info.style = this.getStyleProp(info.styleProps)
    info.border = this.getBorderInfo(info.styleProps)
    info.padding = this.getPaddingInfo(info.styleProps)
    info.margin = this.getMarginInfo(info.styleProps)
  }
  return info
}

HtmlToPdf.prototype.afterWriteMarked = function (component, ctxt) {
  this.config.onPositionDetermine({
    code: ctxt.code,
    pageNumber: component.pageNumber,
    top: component.top,
    left: component.left,
    width: component.width,
    height: component.height
  })
}

HtmlToPdf.prototype.getAfterWriteMarked = function (ctxt) {
  let me = this
  return function (component) {
    me.afterWriteMarked(component, ctxt)
  }
}

/**
 *
 * @param {HtmlContext[]} items
 * @param {Boolean} noWrite
 * @return {PdfTextBox|null}
 */
HtmlToPdf.prototype.writeInlineBlock = function (items, noWrite) {
  if (items.length === 0) {
    throw Error('writeInlineBlock: Incorrect items.')
  }
  let parent = items[0].parent
  let node = {childNodes: []}
  _.forEach(items, function (child) {
    node.childNodes.push(child.node)
  })
  // ntext = '<span>' + ntext.join('') + '</span>';

  let calcParams = parent.calcChildParam()
  let width = calcParams.width || calcParams.maxWidth || parent.info.style.width
  if (width && width > parent.info.style.width) {
    width = parent.info.style.width
  }

  let tb = new PdfTextBox(_.defaults({
    top: calcParams.top,
    reserveTopHeight: this.reserveTopHeight,
    // font: parent.info.style.font,
    // align: parent.info.style.align,
    // verticalAlign: parent.info.style.verticalAlign,
    // textIndent: parent.info.style.textIndent,
    splitOnPage: !parent.info.style.disableSplit,
    pageNumber: calcParams.pageNumber,
    left: calcParams.left,
    width: width,
    textXml: node,
    isCloned: true,
    // text: ntext,
    autoWrite: !noWrite,
    onWriteCallBack: parent.positionMarkKey
      ? this.getAfterWriteMarked({code: parent.positionMarkKey})
      : null,
    isXml: true,
    context: this.pdf }, parent.info.style))
  parent.setTopPosition(tb.lastPageBottom, tb.lastPageNumber)
  // parent.items.push(tb);
  if (noWrite) {
    return tb
  } else {
    tb.destroy()
    return null
  }
}

/**
 * Set zero as default
 * @param {Number} v
 * @returns {number}
 */
function dNum (v) {
  return v || 0
}

HtmlToPdf.prototype.writeImage = function (context, noWrite) {
  let image = this.getImageInfo(context.node)
  let top = context.top + dNum(context.info.padding.top) + dNum(context.info.margin.top)
  let pageNum = context.pageNumber
  if (top + image.nodeHeight + dNum(context.info.padding.bottom) + dNum(context.info.margin.bottom) > this.pdf.getInnerPageBottomPos()) {
    top = this.getPageTopPos()
    pageNum += 1
    this.pdf.requirePage(pageNum)
  }
  if (!noWrite) {
    this.pdf.pdf.addImage(image.imgData, image.imgType,
      context.left + dNum(context.info.padding.left) + dNum(context.info.margin.left),
      top,
      image.nodeWidth,
      image.nodeHeight
      // pageNum
    )
  }
  context.parent.setTopPosition(top + image.nodeHeight + dNum(context.info.padding.bottom) + dNum(context.info.margin.bottom), pageNum)
}

/**
 * Write nodes that has special structure
 *
 * @param {HtmlContext} context
 * @param {Boolean} noWrite
 * @returns {number} 2 - processed break parent 1 - processed; 0 - unknown tag
 */
HtmlToPdf.prototype.writeSpecial = function (context, noWrite) {
  let cfg, cmp
  let result = 0
  let node = context.node
  switch (node.nodeName.toUpperCase()) {
    case 'POSITION-MARK':
      let keyName = node.attributes.getNamedItem('code').nodeValue
      context.getFirstBlockElm().positionMarkKey = keyName
      result = 1
      break
    case 'OL':
    case 'UL':
      this.parseList(context, noWrite)
      result = 1
      break
    case 'TABLE':
      this.parseTable(context, noWrite)
      result = 1
      break
    case 'IMG':
      this.writeImage(context, noWrite)
      result = 1
      break
    case 'HR':
      cfg = {
        top: context.getTopPosition(),
        pageNumber: context.getTopPageNumber(),
        border: {bottom: '1px'},
        padding: 0,
        autoWrite: !noWrite,
        left: context.left,
        width: context.width || context.maxWidth,
        margin: (context.info.margin.top || '4px') + ' 0 ' + (context.info.margin.bottom || '4px') + ' 0'
      }
      cmp = this.pdf.writeSimpleText(cfg)
      context.parent.setTopPosition(cmp.bottom, cmp.lastPageNumber)
      result = 1
      break
    case 'HHH1':
      cfg = {
        top: context.getTopPosition(),
        pageNumber: context.getTopPageNumber(),
        left: context.left,
        width: context.width || context.maxWidth,
        margin: context.info.margin
      }
      cmp = this.pdf.writeSimpleText(cfg)
      context.parent.setTopPosition(cmp.bottom, cmp.lastPageNumber)
      result = 1
      break
    case '#COMMENT':
      if (node.data && node.data.trim() === 'pagebreak') {
        context.info.inline = false
        result = 2
        context.parent.setTopPosition(this.pdf.getPageTop(), context.parent.getTopPageNumber() + 1)
        break
      } else {
        result = 1
      }
      break
  }
  return result
}

/**
 *
 * @param {HtmlContext} context
 * @param {Boolean} [noWrite]
 * @param {Array} [items]
 * @returns {number} 2 - processed break parent 1 - processed; 0 - unknown tag or empty node
 */
HtmlToPdf.prototype.parseNodes = function (context, noWrite, items) {
  var me = this
  var writeRes
  let itemList = []
  let result = 0
  function writeInline () {
    if (itemList.length > 0) {
      let item = me.writeInlineBlock(itemList, noWrite)
      if (noWrite && items && item) {
        items.push(item)
      } else if (item) {
        item.destroy()
      }
      itemList = []
    }
  }
  if (!context.node.childNodes) {
    return 1
  }
  for (let nodeIndex = 0; nodeIndex < context.node.childNodes.length; nodeIndex++) {
    let node = context.node.childNodes[nodeIndex]
    let ctx = new HtmlContext(me.pdf, context, node, me.getTagInfo(node), null, me.parsePositionMark)
    if (ctx.skip) {
      return 0
    }
    if (!ctx.info.inline) {
      writeInline()
      ctx.updatePosition()
      writeRes = me.writeSpecial(ctx, noWrite)
      if (writeRes === 0) {
        let nRes = me.parseNodes(ctx, noWrite, items)
        result = result || nRes
      } else if (writeRes === 2) {
        writeInline()
        result = 1
      } else {
        result = result || writeRes
      }
    } else {
      if (ctx.info.comment) {
        writeRes = me.writeSpecial(ctx, noWrite)
        if (writeRes === 2) {
          writeInline()
          result = 1
        }
      } else {
        itemList.push(ctx)
      }
    }
  }
  if (itemList.length > 0) {
    writeInline()
    result = 1
  }
  return result
}

HtmlToPdf.prototype.getDefaultPrm = function () {
  if (!this.defaultPrm) {
    this.defaultPrm = {
      ul: {
        padding: {
          left: this.pdf.convertToMeasure(25, 'px'),
          top: this.pdf.convertToMeasure(5, 'px'),
          bottom: this.pdf.convertToMeasure(5, 'px')
        }
      }
    }
  }
  return this.defaultPrm
}

/**
 * Html list OL UL + LI
 * @param {HtmlContext} context
 * @param {Boolean} noWrite
 */
HtmlToPdf.prototype.parseList = function (context, noWrite) {
  let me = this
  let node = context.node
  let defPrm = me.getDefaultPrm()
  let lastNum, vText, defStyle, oldFont, lineH, tw

  context.setDefaultInfo(defPrm.ul)

  _.forEach(node.childNodes, function (child) {
    if (child.nodeName.toLowerCase() === 'li') {
      let liItem = []
      _.forEach(child.childNodes, function (subChild) {
        let childName = subChild.nodeName.toLowerCase()
        if (childName !== 'ul' && childName !== 'ol') {
          liItem.push(subChild) // .nodeValue;
                    // return false;
        }
      })
      defStyle = node.nodeName.toLowerCase() === 'ol' ? 'decimal' : 'disc'
      let liCtx = new HtmlContext(me.pdf, context, child, me.getTagInfo(child))
      let liPrm = liCtx.calcChildParam()
      let liInside = liCtx.info.style.listStylePosition === 'inside'
      let liDeltaPos = liInside ? 7 : 0
      let markerX = liDeltaPos + liPrm.left - 3
      let markerY = liPrm.top
      let pn = liCtx.getTopPageNumber()

      me.pdf.setLineWidth(0.32, pn)
      me.pdf.setDrawColor('black', pn)
      let nfont = _.clone(liCtx.info.style.font || {})
      me.pdf.formatFont(nfont)
      if (liCtx.info.style.font) {
        oldFont = me.pdf.setFont(nfont)
      }
      lineH = me.pdf.pdf.getLineHeigh(nfont)
      switch (liCtx.info.style.listStyleType || defStyle) {
        case 'circle':
          me.pdf.circle(markerX, markerY + (lineH - 0.6) / 2, 0.6, 'S', pn); break
        case 'square':
          me.pdf.rect(markerX, markerY + (lineH - 0.6) / 2, 0.6, 0.6, 'F', pn); break
        case 'decimal':
          lastNum = lastNum || 0
          lastNum++
          vText = String(lastNum) + '.'
          tw = me.pdf.pdf.getTextWidth(vText, nfont) - 0.6
          me.pdf.pdf.textExt(markerX - tw, markerY, vText, { pageNumber: pn })
          break
        case 'decimal-leading-zero':
          lastNum = lastNum || 0
          lastNum++
          vText = (lastNum < 10 ? '0' + String(lastNum) : String(lastNum)) + '.'
          tw = me.pdf.pdf.getTextWidth(vText, nfont) - 0.6
          me.pdf.pdf.textExt(markerX - tw, markerY, vText, { pageNumber: pn })
          break
        case 'lower-alpha':
        case 'lower-latin':
          lastNum = lastNum || 96
          lastNum++
          vText = String.fromCharCode(lastNum) + '.'
          tw = me.pdf.pdf.getTextWidth(vText, nfont) - 0.6
          me.pdf.pdf.textExt(markerX - tw, markerY, vText, { pageNumber: pn })
          break
        case 'upper-alpha':
        case 'upper-latin':
          lastNum = lastNum || 64
          lastNum++
          vText = String.fromCharCode(lastNum) + '.'
          tw = me.pdf.pdf.getTextWidth(vText, nfont) - 0.6
          me.pdf.pdf.textExt(markerX - tw, markerY, vText, { pageNumber: pn })
          break
        default:
        case 'disc ':
          me.pdf.circle(markerX, markerY + (lineH - 0.6) / 2, 0.6, 'F', pn); break
      }
      // armenian | georgian |  lower-greek | | lower-roman | | upper-roman | none | inherit
      if (oldFont) {
        me.pdf.setFont(oldFont)
      }

      let cItems = []
      me.parseNodes(liCtx, noWrite, cItems)
      cItems.forEach(function () {
        if (cItems.destroy) {
          cItems.destroy()
        }
      })
    }
  })
}

/**
 *
 * @param {Object} tbody
 * @param {Array} rowSpan
 * @param {Array} colSpan
 * @returns {Object}
 */
HtmlToPdf.prototype.createSpanTableMap = function (tbody, rowSpan, colSpan) {
  let row, q, qi, qq, i, ii, y, cCnt, len, cell, cellLast, rowCount, rowCountR, cCntR, cSpan, rSpan, fRow
  let colCount = 0
  let calc = false

  for (let p = 0; p < tbody.childNodes.length; p++) {
    rowSpan[p] = []
    colSpan[p] = []
  }
  rowCountR = 0
  // create span maps
  rowCount = tbody.childNodes.length
  for (let p = 0; p < rowCount; p++) {
    row = tbody.childNodes[p]
    if (row.nodeName.toLowerCase() !== 'tr') {
      continue
    }
    rowCountR++
    // calc cell count
    if (!calc) {
      for (q = 0; q < row.childNodes.length; q++) {
        cell = row.childNodes[q]
        if (cell.nodeName.toLowerCase() !== 'td') {
          continue
        }
        cSpan = getAttributeInt(cell, 'colspan')
        if (cSpan > 1) {
          colCount += cSpan - 1
        }
        colCount++
      }
      calc = true
    }
    cCntR = 0
    for (q = 0, qi = 0; (q < colCount); q++) {
      if (colSpan[p][q] || rowSpan[p][q]) {
        cCntR++
        continue
      }
      if (qi >= row.childNodes.length) {
        continue
      }
      cell = row.childNodes[qi]
      while (cell.nodeName.toLowerCase() !== 'td') {
        qi++
        cell = row.childNodes[qi]
      }
      cellLast = cell
      cCntR++

      cSpan = getAttributeInt(cell, 'colspan', 0)
      rSpan = getAttributeInt(cell, 'rowspan', 0)
      // check valid rowSpan
      if (rSpan > 1) {
        if (rSpan - 1 + p >= rowCount) {
          rSpan = (rowCount - p) || 1
          updateAttributeInt(cell, 'rowspan', rSpan)
        }
        for (ii = p + 1, i = p + 1; (i < p + rSpan) && ii < tbody.childNodes.length; ii++) {
          fRow = tbody.childNodes[ii]
          if (fRow.nodeName.toLowerCase() !== 'tr') {
            continue
          }
          len = fRow.childNodes.length
          cCnt = 0
          for (y = 0; y < len; y++) {
            if (fRow.childNodes[y].nodeName.toLowerCase() === 'td') {
              cCnt++
              cCnt += (getAttributeInt(fRow.childNodes[y], 'colspan') || 1) - 1
            }
          }
          len = rowSpan[i].length
          for (y = 0; y < len; y++) {
            if (rowSpan[i][y]) {
              cCnt++
            }
          }
          if (cCnt + ((cSpan || 1) - 1) >= colCount) {
            rSpan = i - p
            updateAttributeInt(cell, 'rowspan', rSpan)
            break
          }
          i++
        }
      }
      // check valid colSpan
      if (cSpan > 1) {
        cCnt = 0
        for (i = q; i < colCount; i++) {
          if (rowSpan[p][i]) {
            continue
          }
          cCnt++
        }
        if (cSpan > cCnt) {
          cSpan = cCnt || 1
          updateAttributeInt(cell, 'colspan', cSpan)
        }
      }
      if (rSpan > 1) {
        for (let r = p + 1; r < p + rSpan; r++) {
          rowSpan[r][q] = 1
          if (cSpan > 1) {
            for (qq = q + 1; qq < q + cSpan; qq++) {
              if (!colSpan[r]) {
                colSpan[r] = []
              }
              colSpan[r][qq] = 1
            }
          }
        }
      }
      if (cSpan > 1) {
        // cCntR += cSpan - 1;
        for (qq = q + 1; qq < q + cSpan; qq++) {
          colSpan[p][qq] = 1
        }
      }
      qi++
    }
    if (cCntR < colCount) {
      updateAttributeInt(cellLast, 'colspan', colCount - cCntR + 1)
    }
  }
  return {colCount: colCount, rowCount: rowCountR}
}

/**
 *
 * @param {Object} tbody
 * @param {Number} colCount
 * @param {Array} colSpan
 * @param {Array} rowSpan
 * @param {Number} width
 * @param {Object} tabPrm
 */
HtmlToPdf.prototype.calcTableCellWidth = function (tbody, colCount, colSpan, rowSpan, width, tabPrm) {
  let me = this
  let cellNum, cellWidth
  let isFirst = true
  let cellWidthNum = 0
  let cellConfig = []
    // calc cell width
  for (let rowNum = 0; rowNum < tbody.childNodes.length; rowNum++) {
    let row = tbody.childNodes[rowNum]
    if (row.nodeName.toLowerCase() !== 'tr') {
      continue
    }
    let colNum
    for (colNum = 0, cellNum = 0; (cellNum < colCount) && (colNum < row.childNodes.length); colNum++) {
      if (colSpan[rowNum][cellNum] || rowSpan[rowNum][cellNum]) {
        if (isFirst) {
          cellConfig.push({calcWidth: null})
        }
        cellNum++
        continue
      }
      let col = row.childNodes[colNum]
      if (col.nodeName.toLowerCase() !== 'td') {
        continue
      }
      let cellStyle = me.parseStyle(col)
      let spanProp = {
        colspan: getAttributeInt(col, 'colspan'),
        rowspan: getAttributeInt(col, 'rowspan')
      }
      if (spanProp.colspan > 1) {
        cellWidth = cellStyle.width ? parseFloat(cellStyle.width) : null
        cellWidth = cellWidth ? cellWidth / spanProp.colspan : null
        cellNum += spanProp.colspan - 1
        for (let i = spanProp.colspan; i > 0; i--) {
          if (isFirst) {
            cellConfig.push({calcWidth: cellWidth})
          }
        }
      } else {
        cellWidth = cellStyle.width ? parseFloat(cellStyle.width) : null
        if (isFirst) {
          cellConfig.push({ width: cellWidth })
          if (cellWidth) {
            cellWidthNum++
          }
        } else {
          if (!cellConfig[cellNum].width) {
            cellConfig[cellNum].width = cellWidth
            if (cellWidth) {
              cellWidthNum++
            }
          }
        }
      }
      cellNum++
    }
    isFirst = false
    if (cellWidthNum === cellNum) {
      break
    }
  }

  cellNum = cellConfig.length
  cellWidth = width / cellNum
    // kWidth = me.page.innerSize.width / (config.pageWidth || 793);

  let cellSumW = 0
  _.forEach(cellConfig, function (c) {
    c.width = (c.width || c.calcWidth || cellWidth)
    cellSumW += c.width
    c.border = tabPrm.border
  })
  cellSumW = width / cellSumW
  _.forEach(cellConfig, function (c) {
    c.width = c.width * cellSumW * me.kWidth
  })
  return cellConfig
}

/**
 *
 * @param {Object} tbody
 * @param {Number} tabHeight
 * @param {Number} rowHeight
 * @returns {number}
 */
HtmlToPdf.prototype.calcTableRowHeight = function (tbody, tabHeight, rowHeight) {
    // calc row height
  let rowWHCount = 0
  let usedHeight = 0
  let rowMinHeight = 0
  if (tabHeight) {
    tabHeight = parseFloat(tabHeight)
    if ((tbody.childNodes.length - rowWHCount) === 0) {
      rowMinHeight = 0
    } else {
      rowMinHeight = (tabHeight * this.kWidth - usedHeight) / (tbody.childNodes.length - rowWHCount)
    }
  }
  return rowMinHeight
}

/**
 *
 * @param {HtmlContext} context
 * @param {Boolean} noWrite
 */
HtmlToPdf.prototype.parseTable = function (context, noWrite) {
  var me = this,
    cfg, tableStyle, cellStyleProp, width,
    row, col, rowNum, colNum, cellNum, cellConfig, pdfRow,
    tabPrm = {}, tabHeight, rowMinHeight, info,
    node = context.node,
    tbody, thead, firstEl,
    grid, rowData, spanProp = {}, images,
    rowConfig, rowSpan = [], colSpan = [], colCount,
    oldLineHeight, preferredLineHeight,
    indissolubleFirstRows, indissolubleEndRows, indissolubleRows, rowsUnit = [],
    layoutParams = context.calcChildParam(), maxWidth = null, onNewPageWhenOver,
    tbodyContext, parseRes, tdDefaults, tabParam

  tdDefaults = {padding: {
    left: me.pdf.convertToMeasure(4, 'px'),
    right: me.pdf.convertToMeasure(4, 'px'),
    top: me.pdf.convertToMeasure(3, 'px'),
    bottom: me.pdf.convertToMeasure(3, 'px')
  }}

  _.forEach(node.childNodes, function (child) {
    if (child.nodeName.toLowerCase() === 'tbody') {
      tbody = child
    }
    if (child.nodeName.toLowerCase() === 'thead') {
      thead = child
    }
  })

  tbodyContext = new HtmlContext(me.pdf, context, tbody, me.getTagInfo(tbody))
  tbodyContext.setDefaultStyle({verticalAlign: 'center'})

  tableStyle = context.info.styleProps // parseStyle(node);
  indissolubleFirstRows = parseFloat(tableStyle['indissoluble-first-rows'] || '0') || 0
  indissolubleFirstRows = indissolubleFirstRows <= 1 ? 0 : indissolubleFirstRows
  indissolubleEndRows = parseFloat(tableStyle['indissoluble-end-rows'] || '0') || 0
  indissolubleEndRows = indissolubleEndRows <= 1 ? 0 : indissolubleEndRows
  indissolubleRows = indissolubleFirstRows
  preferredLineHeight = me.config.tableLineHeight || me.lineHeight
  if (tableStyle['line-height']) {
    preferredLineHeight = parseFloat(tableStyle['line-height'])
  }
  if (preferredLineHeight !== me.lineHeight) {
    oldLineHeight = me.pdf.setlineHeight(preferredLineHeight)
  }
  width = tableStyle.width || getAttribute(node, 'width')
  if (width) {
    if (width.indexOf('%') >= 0) {
      width = parseFloat(width)
      if (width) {
        width = Math.floor(width * me.defWidth / 100)
      }
    } else {
      width = parseFloat(width)
    }
  }

  if (maxWidth) {
    width = maxWidth / me.kWidth
  }
  if (!width) {
    throw new Error('Table must have width in style')
  }

  info = context.info.border // getBorderInfo(tableStyle);
  tabPrm.border = info.borderWidth.top ? dNum(info.borderWidth.top) + 'px' : null // tableStyle['border-width'];
  tabPrm.border = getAttribute(node, 'border', tabPrm.border)
  if (info.borderStyle.top === 'dashed') {
    tabPrm.border = '0px'
  }

  tabHeight = tableStyle.height || getAttribute(node, 'height', null)

  if (thead) {
    firstEl = tbody.childNodes.length > 0 ? tbody.childNodes[0] : null
    _.forEach(thead.childNodes, function (child) {
      if (child.getAttribute) {
        let styleVal = child.getAttribute('style') || ''
        styleVal += 'top-through-line: true;' + styleVal
        child.setAttribute('style', styleVal)
        tbody.insertBefore(child, firstEl)
      }
    })
  }

  tabParam = me.createSpanTableMap(tbody, rowSpan, colSpan)
  colCount = tabParam.colCount

  if (tabHeight && tabParam.rowCount > 0) {
    tabHeight = parseFloat(tabHeight)
    rowMinHeight = tabHeight * this.kWidth / tabParam.rowCount
  }

  cellConfig = me.calcTableCellWidth(tbody, colCount, colSpan, rowSpan, width, tabPrm)
    /*
    if (tabHeight){
        //rowHeight =  new Array(tbody.childNodes.length);
        //rowMinHeight = me.calcTableRowHeight(tbody, tabHeight, rowHeight);
        rowMinHeight = (tabHeight * this.kWidth) / (tbody.childNodes.length);
    } */

  grid = me.pdf.createGrid({ /* isXml: true, */ collectRow: !me.autoWrite || onNewPageWhenOver,
    columns: cellConfig,
    top: layoutParams.top,
    pageNumber: layoutParams.pageNumber,
    noChangePage: context.info.style.disableSplit,
    left: layoutParams.left,
    drawBorderOnSplit: (tableStyle.drawBorderOnSplit === 'true' || tableStyle.drawborderonsplit === 'true' || tableStyle['draw-border-onsplit'] === 'true'),
    noWrite: noWrite })

  var rowInfo = [], prevRowInfo = null, cellBorder, borderCVal = {}, hasBorder = false, trStyle,
    serialiseChild, childWidth, childLeft, requiredHeight,
    trCtxt, tdCtxt, cellTbItems, currentRowTop, maxRowHeight = 0, topThroughLine

  function addBorder (cellBorder, type) {
    if (cellBorder.borderWidth[type] && cellBorder.borderStyle[type] !== 'dashed' &&
            parseFloat(dNum(cellBorder.borderWidth[type])) > 0) {
      borderCVal[type] = dNum(cellBorder.borderWidth[type])
      hasBorder = true
    } else {
      borderCVal[type] = 0
    }
  }

  function onTopThroughRow (config) {
    var context
    if (config.columnConfigs && config.columnConfigs.length > 0) {
      _.forEach(config.columnConfigs, function (col) {
        if (col.customParams && col.customParams.context) {
          context = col.customParams.context
          context.setTop(config.rowConfig.top, config.rowConfig.pageNumber)
        }
      })
    }
  }

    // синхронизация контента ячеек
  function onWriteBaseTextBox (textBox) {
    var context = textBox.customParams.context, reWrite = false, isAlign = true, deltaPos = 0, contentIndex,
      contentItems = textBox.customParams.items, contentItem, contentHeight = 0,
      throughItem = textBox.customParams.throughItem, newTop, oldTop
    if (textBox.initConfig.requireRewriteContent) {
      reWrite = true
    }
    if (textBox.top !== textBox.initConfig.top || textBox.pageNumber !== textBox.initConfig.pageNumber) {
      deltaPos += textBox.pageNumber !== textBox.initConfig.pageNumber
        ? me.pdf.getInnerPageBottomPos() - textBox.initConfig.top + textBox.top - me.pdf.getInnerPageTopPos() /* + (textBox.topThroughRow ? 0: me.reserveTopHeight) */
        : /* me.getPageTopPos() : */ textBox.top - textBox.initConfig.top

      reWrite = true
      isAlign = false
    }
    if (textBox.initConfig.verticalAlign && textBox.initConfig.verticalAlign !== 'top') {
      if (textBox.initConfig.contentMinHeight < (textBox.heightIn || textBox.height)) {
        deltaPos += ((textBox.heightIn || textBox.height) - textBox.initConfig.contentMinHeight) / (textBox.initConfig.verticalAlign !== 'bottom' ? 2 : 1)
        reWrite = true
      }
    }
    if (throughItem && !reWrite) {
      if (contentItems.length > 0) {
        contentHeight = contentItems[contentItems.length - 1].bottom - contentItems[0].top
      }
      deltaPos = textBox.height - contentHeight - dNum(context.info.padding.top) /* - context.info.padding.bottom */
      deltaPos = deltaPos < 0 ? 0 : deltaPos
      if (textBox.initConfig.verticalAlign && textBox.initConfig.verticalAlign !== 'top') {
        deltaPos = deltaPos / 2
      }
      if (textBox.initConfig.verticalAlign && textBox.initConfig.verticalAlign !== 'top') {
        deltaPos = 0
      }
      newTop = textBox.top + dNum(context.info.padding.top) + deltaPos
      oldTop = 0
      for (contentIndex = 0; contentIndex < contentItems.length; contentIndex++) {
        contentItem = contentItems[contentIndex]
        contentItem.pageNumber = textBox.pageNumber
        if (oldTop > 0) {
          newTop += oldTop - contentItem.top
        }
        oldTop = contentItem.top
        contentItem.setTop(newTop)
        contentItem.write()
      }
      return
    }
    if (!reWrite) {
      for (contentIndex = 0; contentIndex < textBox.customParams.items.length; contentIndex++) {
        contentItem = textBox.customParams.items[contentIndex]
        contentItem.write()
      }
    } else {
      for (contentIndex = 0; contentIndex < textBox.customParams.items.length; contentIndex++) {
        contentItem = textBox.customParams.items[contentIndex]
        contentItem.destroy()
      }
      context.resetContextPos()
      context.currentTop += deltaPos
      if (context.currentTop > me.pdf.getInnerPageBottomPos()) {
        context.currentTop = /* (textBox.topThroughRow ? 0: me.reserveTopHeight) + */ me.pdf.getInnerPageTopPos() +
                    context.currentTop - me.pdf.getInnerPageBottomPos()
        context.currentTopPageNumber++
      }
            // пишем начисто
      me.parseNodes(context, false)
    }
  }
  for (rowNum = 0; rowNum < tbody.childNodes.length; rowNum++) {
    row = tbody.childNodes[rowNum]
    rowData = []
    rowConfig = []
    images = []
    rowInfo = []
        // rowTbItems = [];
    maxRowHeight = 0
    if (row.nodeName.toLowerCase() !== 'tr') {
      continue
    }
    if (indissolubleEndRows > 0 && rowNum === (tbody.childNodes.length - indissolubleEndRows)) {
      indissolubleRows = indissolubleEndRows
    }
    trCtxt = new HtmlContext(me.pdf, tbodyContext, row, me.getTagInfo(row), {horizontalLayout: true})
    trStyle = trCtxt.info.styleProps // me.parseStyle(row);
    topThroughLine = trStyle['top-through-line'] === 'true'
    trCtxt.disableSplit = Boolean(trCtxt.disableSplit || trStyle.disableSplit === 'true' || trStyle.disablesplit === 'true' || trStyle['disable-split'] === 'true')
    currentRowTop = grid.topNextRow
    trCtxt.setTop(currentRowTop)
    for (colNum = 0, cellNum = 0; colNum < row.childNodes.length; colNum++) {
      serialiseChild = true
      cellTbItems = []
      col = row.childNodes[colNum]
      if (col.nodeName.toLowerCase() !== 'td') {
        continue
      }
      while (rowSpan[rowNum][cellNum] || colSpan[rowNum][cellNum]) {
        cellNum++
      }

      tdCtxt = new HtmlContext(me.pdf, trCtxt, col, me.getTagInfo(col))
      tdCtxt.setDefaultInfo(tdDefaults)
      tdCtxt.setTop(currentRowTop, grid.lastPageNumber)
            // cellStyle = tdCtxt.info.styleProps; //me.parseStyle(col);
      cellStyleProp = tdCtxt.info.style // me.getStyleProp(cellStyle);

            // rowInfo[colNum] = getBorderInfo(cellStyle);
      spanProp = {
        colspan: getAttribute(col, 'colspan', null),
        rowspan: getAttribute(col, 'rowspan', null)
      }
      cfg = {}
      if (cellStyleProp.font.color) {
        cfg.font = cfg.font || {}
        cfg.font.color = cellStyleProp.font.color
      }
      if (cellStyleProp.font.size) {
        cfg.font = cfg.font || {}
        cfg.font.size = cellStyleProp.font.size
      }
      if (cellStyleProp.font.type) {
        cfg.font = cfg.font || {}
        cfg.font.type = cellStyleProp.font.type
      }
      if (spanProp.colspan) {
        cfg.colSpan = parseInt(spanProp.colspan, 10)
      }
      if (spanProp.rowspan) {
        cfg.rowSpan = parseInt(spanProp.rowspan, 10)
      }
      if (cellStyleProp.align) {
        cfg.align = cellStyleProp.align
      }
      if (cellStyleProp.backgroundColor) {
        cfg.backgroundColor = cellStyleProp.backgroundColor
      }

      cfg.verticalAlign = 'center'
      if (cellStyleProp.verticalAlign) {
        cfg.verticalAlign = cellStyleProp.verticalAlign
      }

      hasBorder = false
      cellBorder = tdCtxt.info.border // me.getBorderInfo(cellStyle);
      borderCVal = {}
      addBorder(cellBorder, 'top')
      addBorder(cellBorder, 'right')
      addBorder(cellBorder, 'bottom')
      addBorder(cellBorder, 'left')
      if (hasBorder) {
        cfg.border = borderCVal
      }
      cfg.emptyText = true

      requiredHeight = 0

            // write cell inner html
      childWidth = 0
      for (var cellCfgNum = cellNum; (cellCfgNum < cellConfig.length) &&
                (cellCfgNum < cellNum + (cfg.colSpan || 1)); cellCfgNum++) {
        childWidth += cellConfig[cellCfgNum].width
      }
      childLeft = grid.left
      for (cellCfgNum = 0; cellCfgNum < cellNum; cellCfgNum++) {
        childLeft += cellConfig[cellCfgNum].width
      }
      tdCtxt.setLeft(childLeft)

      tdCtxt.setTop(currentRowTop, grid.lastPageNumber)
      tdCtxt.setLeft(childLeft)
      tdCtxt.setWidth(childWidth)
      tdCtxt.baseTopPosDelta = tdCtxt.top - tdCtxt.currentTop
      parseRes = me.parseNodes(tdCtxt, true, cellTbItems)
      cfg.requireRewriteContent = (parseRes === 1)

            // check going beyond the page
      if (!grid.noChangePage && cellTbItems.length > 0 && cellTbItems[0].firstRowBreaked && !grid.existRowSpanCells) {
        currentRowTop = me.getPageTopPos()
        grid.setTopNextRow(currentRowTop, grid.lastPageNumber + 1)
        tdCtxt.setTop(currentRowTop, grid.lastPageNumber)
        // deltaPos = me.pdf.getInnerPageBottomPos() - cellTbItems[0].top + tdCtxt.baseTopPosDelta;
        for (let contentIndex = 0; contentIndex < cellTbItems.length; contentIndex++) {
          let contentItem = cellTbItems[contentIndex]
          contentItem.destroy()
        }
        cellTbItems = []
        parseRes = me.parseNodes(tdCtxt, true, cellTbItems)
        cfg.requireRewriteContent = (parseRes === 1)
      }

      cfg.minHeight = tdCtxt.getFullHeight(me.reserveTopHeight)
      cfg.contentMinHeight = cfg.minHeight

      cfg.customParams = {context: tdCtxt, items: cellTbItems}
      cfg.onWriteCallBack = onWriteBaseTextBox

      if (topThroughLine) {
        cfg.throughItem = true
        cfg.customParams.throughItem = true
      }

      if (trCtxt.info.style.height && trCtxt.info.style.height > cfg.minHeight) {
        cfg.minHeight = trCtxt.info.style.height
      }
      if (rowMinHeight && ((cfg.minHeight || 0) < rowMinHeight)) {
        cfg.minHeight = rowMinHeight
      }
      if (!cfg.rowSpan || cfg.rowSpan <= 1) {
        maxRowHeight = maxRowHeight > (cfg.minHeight || 0) ? maxRowHeight : cfg.minHeight
      }

      rowData.push('')
      rowConfig.push(cfg)
      // if (cfg.colSpan){
      //    cellNum += cfg.colSpan - 1;
      // }
      cellNum++
    }
    prevRowInfo = rowInfo
    // synchronise
    //
    if (maxRowHeight) {
      for (colNum = 0; colNum < rowConfig.length; colNum++) {
        // rowConfig[colNum].contentMinHeight = rowConfig[colNum].minHeight;
        if (rowConfig[colNum].minHeight < maxRowHeight) {
          rowConfig[colNum].minHeight = maxRowHeight
        }
      }
    }

    pdfRow = grid.addRow({
      cellValues: rowData,
      columnConfigs: rowConfig,
      splitOnPage: indissolubleRows === 0 && !trCtxt.disableSplit,
      /* collectRow: !autoWrite || onNewPageWhenOver, */
      noWrite: noWrite || !me.autoWrite || (indissolubleRows > 0),
      topThroughRow: topThroughLine,
      onTopThroughRow: topThroughLine ? onTopThroughRow : null,
      isCloned: true
    })
    if (grid.topThroughRowHeight > 0) {
      me.reserveTopHeight = grid.topThroughRowHeight
    }

    if (indissolubleRows > 0) {
      // pdfRow.content = rowTbItems;
      rowsUnit.push(pdfRow)
      indissolubleRows--
    } // else {
        // pdfRow.destroy();
    // }

    // обрабатываем неразрывные строки
    if (indissolubleRows === 0 && rowsUnit.length > 0) {
      let lastPageNumber = rowsUnit[rowsUnit.length - 1].pageNumber
      let rewritedRow = rowsUnit[0].pageNumber < lastPageNumber
      let newPos = grid.getPageTopPosition()
      for (let rowIndex = 0; rowIndex < rowsUnit.length; rowIndex++) {
        let rowUnit = rowsUnit[rowIndex]
        if (rewritedRow) {
          rowUnit.setTop(newPos, lastPageNumber)
          newPos = rowUnit.bottom
          rowUnit.content = undefined
        }
        if (!noWrite) {
          rowUnit.write()
        }
        // rowUnit.destroy();
      }
      rowsUnit = []
      if (rewritedRow) {
        grid.setTopNextRow(newPos, lastPageNumber)
      }
    }
  }
  if (oldLineHeight) {
    me.pdf.setlineHeight(oldLineHeight)
  }
  context.parent.setTopPosition(grid.topNextRow + dNum(context.info.margin.bottom), grid.lastPageNumber)
  me.reserveTopHeight = 0
  return grid
}

/**
 * @param {Object} pdf
 * @param {HtmlContext} parent
 * @param {Object} node
 * @param {Object} tagInfo
 * @param {Object} [config]
 * @param {Boolean} [parsePositionMark]
 */
function HtmlContext (pdf, parent, node, tagInfo, config, parsePositionMark) {
  this.parent = parent
  this.node = node
  this.currentTop = null
  this.items = []
  this.info = tagInfo
  this.pdf = pdf

  if (this.info) {
   /*
   if (this.parent){
       if (this.info.text ){
           this.info.styleProps = this.parent.info.styleProps;
           this.info.style = this.parent.info.style;
       } else {
           _.defaults(this.info.style, this.parent.info.style);
       }
   }
   */
    this.width = this.info.width
    this.maxWidth = this.info.maxWidth
  }
  if (config) {
    _.defaults(this, config)
  }
  this.setInheritanceProp()
  this.setTagDefaults()
  if (config) {
    if (config.left && (!this.left || this.left < config.left)) {
      this.left = config.left
    }
    if (config.top && (!this.top || this.top < config.top)) {
      this.top = config.top
    }
    if (config.width && (!this.width || this.width > config.width)) {
      this.width = config.width
    }
  }
  if (this.top) {
    this.currentTop = this.top + dNum(this.info.margin.top) + dNum(this.info.border.borderWidth.top) + dNum(this.info.padding.top)
  }
  this.convertStyle()

  if (parsePositionMark && node.nodeName && node.nodeName.toLowerCase() === 'position-mark') {
    this.getFirstBlockElm().positionMarkKey = node.attributes.getNamedItem('code').nodeValue
  }
/*
    if (parsePositionMark){
        this.parsePositionMark();
    }
*/
}

HtmlContext.prototype.getFirstBlockElm = function () {
  let elm = this
  while (elm.parent && elm.info.inline) {
    elm = elm.parent
  }
  return elm
}

HtmlContext.prototype.REPositionMask = /(?:<%=([A-Za-z0-9 -_]+?)%>)/
HtmlContext.prototype.REPositionMaskRP = /(<%=[A-Za-z0-9 -_]+?)%>/g
HtmlContext.prototype.REInlinePositionMask = /(?:&lt;%=([A-Za-z0-9 -_]+?)%&gt;)/
HtmlContext.prototype.REInlinePositionMaskRP = /(&lt;%=[A-Za-z0-9 -_]+?)%&gt;/g

HtmlContext.prototype.parsePositionMark = function () {
  let keyName, vm
  if (this.node.nodeValue) {
    vm = HtmlContext.prototype.REPositionMask.exec(this.node.nodeValue)
    if (vm && vm.length > 1 && !keyName) {
      keyName = vm[1]
    }
    this.node.nodeValue = this.node.nodeValue.replace(HtmlContext.prototype.REPositionMaskRP, ' ')
  } else if (this.info.inline && this.node.innerHTML) {
    vm = HtmlContext.prototype.REInlinePositionMask.exec(this.node.innerHTML)
    if (vm && vm.length > 1 && !keyName) {
      keyName = vm[1]
    }
    this.node.innerHTML = this.node.innerHTML.replace(HtmlContext.prototype.REInlinePositionMaskRP, ' ') // &nbsp;
  }
  if (keyName) {
    this.getFirstBlockElm().positionMarkKey = keyName
  }
}

HtmlContext.prototype.setTagDefaults = function () {
  switch (this.node.nodeName.toUpperCase()) {
    case 'P':
      this.info.padding.top = this.pdf.convertToMeasure(4, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(4, 'px')
      break
    case 'BR':
      this.info.padding.top = this.pdf.convertToMeasure(4, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(4, 'px')
      break
    case 'H1':
      this.info.style = this.info.style || {}
      this.info.style.font.type = 'Bold'
      this.info.style.font.size = '22'
      this.info.padding.top = this.pdf.convertToMeasure(14.74, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(14.74, 'px')
      break
    case 'H2':
      this.info.style = this.info.style || {}
      this.info.style.font.type = 'Bold'
      this.info.style.font.size = '17'
      this.info.padding.top = this.pdf.convertToMeasure(13.67, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(13.67, 'px')
      break
    case 'H3':
      this.info.style = this.info.style || {}
      this.info.style.font.type = 'Bold'
      this.info.style.font.size = '13'
      this.info.padding.top = this.pdf.convertToMeasure(12.87, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(12.87, 'px')
      break
    case 'H4':
      this.info.style = this.info.style || {}
      this.info.style.font.type = 'Bold'
      this.info.style.font.size = '11'
      this.info.padding.top = this.pdf.convertToMeasure(14.63, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(14.63, 'px')
      break
    case 'H5':
      this.info.style = this.info.style || {}
      this.info.style.font.type = 'Bold'
      this.info.style.font.size = '9'
      this.info.padding.top = this.pdf.convertToMeasure(15.24, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(15.24, 'px')
      break
    case 'H6':
      this.info.style = this.info.style || {}
      this.info.style.font.type = 'Bold'
      this.info.style.font.size = '7'
      this.info.padding.top = this.pdf.convertToMeasure(17.17, 'px')
      this.info.padding.bottom = this.pdf.convertToMeasure(17.17, 'px')
      break
    case 'blockquote':
      this.info.style = this.info.style || {}
      this.info.padding.left = this.pdf.convertToMeasure(10, 'px')
  }
}

HtmlContext.prototype.convertStyle = function () {
  if (this.info.style) {
    if (this.info.style.verticalAlign) {
      if (this.info.style.verticalAlign === 'middle') {
        this.info.style.verticalAlign = 'center'
      }
    }
  }
}

HtmlContext.prototype.setDefaultInfo = function (info) {
  function mergeDef (baseObject, baseProp, defObj) {
    if (!baseObject || !defObj || !defObj.hasOwnProperty(baseProp)) {
      return
    }
    if (!baseObject.hasOwnProperty(baseProp) || (baseObject[baseProp] === undefined) || (baseObject[baseProp] === null)) {
      baseObject[baseProp] = defObj[baseProp]
    }
  }
  if (!this.info) {
    this.info = {padding: {}}
  }
  if (!this.info.padding) {
    this.info.padding = {}
  }
  if (info.padding) {
    mergeDef(this.info.padding, 'top', info.padding)
    mergeDef(this.info.padding, 'right', info.padding)
    mergeDef(this.info.padding, 'bottom', info.padding)
    mergeDef(this.info.padding, 'left', info.padding)
  }
  if (this.top) {
    this.currentTop = this.top + dNum(this.info.margin.top) + dNum(this.info.border.borderWidth.top) + dNum(this.info.padding.top)
  }
}

HtmlContext.prototype.setDefaultStyle = function (style) {
  if (!this.info) {
    this.info = {}
  }
  if (!this.info.style) {
    this.info.style = {}
  }
  _.defaults(this.info.style, style)
}
/**
 *  Returns top position for child item
 * @returns {Number}
 */
HtmlContext.prototype.getTopPosition = function () {
  return this.currentTop
}

HtmlContext.prototype.getTopPageNumber = function () {
  if (!this.currentTopPageNumber && this.pageNumber) {
    this.currentTopPageNumber = this.pageNumber
  }
  return this.currentTopPageNumber
}

HtmlContext.prototype.getOutPosition = function () {
  if (!this.currentTopPageNumber && this.pageNumber) {
    this.currentTopPageNumber = this.pageNumber
  }
  return {
    bottom: this.currentTop + dNum(this.info.border.borderWidth.bottom) + dNum(this.info.padding.bottom) + dNum(this.info.margin.bottom),
    pageNumber: this.currentTopPageNumber
  }
}

/**
 *
 * @param {Number} position
 * @param {Number} [pageNumber]
 */
HtmlContext.prototype.setTopPosition = function (position, pageNumber) {
  this.currentTop = position
  if (this.horizontalLayout) {
    if (!this.maxPageNumber || this.maxPageNumber < pageNumber) {
      this.maxPageNumber = pageNumber
      this.maxTop = position
    } else {
      this.maxTop = this.maxTop < position ? position : this.maxTop
    }
  } else {
    if (pageNumber) {
      this.currentTopPageNumber = pageNumber
    }
    if (this.parent) {
      this.parent.setTopPosition(this.currentTop + dNum(this.info.border.borderWidth.bottom) +
        dNum(this.info.padding.bottom) + dNum(this.info.margin.bottom), this.currentTopPageNumber)
    }
  }
}

function defPropValue (destination, source, prop) {
  if (!destination.hasOwnProperty(prop)) {
    destination[prop] = source[prop]
  }
}

function inheritStyle (child, parent) {
  if (parent.style.font) {
    child.style.font = child.style.font || {}
    _.defaults(child.style.font, parent.style.font)
  }
  defPropValue(child.style, parent.style, 'align')
  defPropValue(child.style, parent.style, 'verticalAlign')
  defPropValue(child.style, parent.style, 'disableSplit')

  defPropValue(child.style, parent.style, 'listStyleType')
  defPropValue(child.style, parent.style, 'listStylePosition')
}

HtmlContext.prototype.setInheritanceProp = function () {
  if (this.parent) {
    inheritStyle(this.info, this.parent.info || {})
    let calcData = this.parent.calcChildParam()
    _.defaults(this, calcData)
    this.disableSplit = this.parent.disableSplit

    if (this.info) {
      this.currentTop = this.top + dNum(this.info.margin.top) + dNum(this.info.border.borderWidth.top) + dNum(this.info.padding.top)
      this.currentTopPageNumber = this.pageNumber
    } else {
      this.currentTop = this.top
      this.currentTopPageNumber = this.pageNumber
    }
  }
}

HtmlContext.prototype.updatePosition = function () {
  if (this.parent) {
    this.top = this.parent.getTopPosition()
    this.pageNumber = this.parent.getTopPageNumber()

    if (this.info) {
      this.setTopPosition(this.top + dNum(this.info.margin.top) + dNum(this.info.border.borderWidth.top) + dNum(this.info.padding.top), this.pageNumber)
    } else {
      this.setTopPosition(this.top, this.pageNumber)
    }
  }
}

/**
 * return position parameters for child element
 * @returns {{}}
 */
HtmlContext.prototype.calcChildParam = function () {
  let result = {}
  result.left = this.left + dNum(this.info.margin.left) + dNum(this.info.border.borderWidth.left) + dNum(this.info.padding.left)
  result.top = this.getTopPosition()
  if (this.width) {
    result.width = this.width - dNum(this.info.margin.left) - dNum(this.info.border.borderWidth.left) - dNum(this.info.padding.left) -
            dNum(this.info.margin.right) - dNum(this.info.border.borderWidth.right) - dNum(this.info.padding.right)
  }
  if (this.maxWidth) {
    result.maxWidth = this.maxWidth - dNum(this.info.margin.left) - dNum(this.info.border.borderWidth.left) - dNum(this.info.padding.left) -
            dNum(this.info.margin.right) - dNum(this.info.border.borderWidth.right) - dNum(this.info.padding.right)
  }
  result.pageNumber = this.getTopPageNumber()
  return result
}

/**
 *
 * @param {number} reserveTopHeight
 * @returns {number}
 */
HtmlContext.prototype.getFullHeight = function (reserveTopHeight) {
  let pageSize = this.pdf.getInnerPageSize() - (reserveTopHeight || 0)
  if (this.horizontalLayout) {
    return ((this.maxPageNumber || this.pageNumber) - this.pageNumber) * pageSize + ((this.maxTop || this.top) - this.top)
  } else {
    return this.getTopPosition() - this.top + (this.getTopPageNumber() - this.pageNumber) * pageSize +
      dNum(this.info.margin.top) + dNum(this.info.margin.bottom) + dNum(this.info.border.borderWidth.top) + dNum(this.info.border.borderWidth.bottom) +
      dNum(this.info.padding.top) + dNum(this.info.padding.bottom)
  }
}

HtmlContext.prototype.setLeft = function (pos) {
  this.left = pos
}

HtmlContext.prototype.setWidth = function (val) {
  this.width = val
}

HtmlContext.prototype.setMaxWidth = function (val) {
  this.maxWidth = val
}

HtmlContext.prototype.setTop = function (val, pageNumber) {
  var me = this
  me.top = val
  if (me.top) {
    me.currentTop = me.top + dNum(me.info.margin.top) + dNum(me.info.border.borderWidth.top) + dNum(me.info.padding.top)
  }
  if (pageNumber) {
    this.currentTopPageNumber = this.pageNumber = pageNumber
  }
}

HtmlContext.prototype.resetContextPos = function () {
  var me = this
  if (me.top) {
    me.currentTop = me.top + dNum(me.info.margin.top) + dNum(me.info.border.borderWidth.top) + dNum(me.info.padding.top)
  }
  this.currentTopPageNumber = this.pageNumber
}

/**
 * RETURN container border rectangle
 * @returns {{top: *, left: *}}
 */
HtmlContext.prototype.getBorderRectangle = function () {
  let pageRight = this.pdf.getInnerPagePosRight()
  let result = {
    top: this.top + dNum(this.info.margin.top),
    left: this.left + dNum(this.info.margin.left)
  }
  result.right = this.info.style.width ? this.info.style.width + result.left : pageRight - dNum(this.info.margin.right)
  return result
}

function readBytes(data, offset) {
  return data.subarray(offset, offset+ 5);
}

// takes a string imgData containing the raw bytes of
// a jpeg image and returns [width, height]
function getJpegSizeFromBytes (data) {
  var hdr = (data[0] << 8) | data[1]

  if (hdr !== 0xFFD8) {
    throw new Error('Supplied data is not a JPEG')
  }

  var len = data.length,
    block = (data[4] << 8) + data[5],
    pos = 4,
    bytes, width, height, numcomponents

  while (pos < len) {
    pos += block
    bytes = readBytes(data, pos)
    block = (bytes[2] << 8) + bytes[3]
    if ((bytes[1] === 0xC0 || bytes[1] === 0xC2) && bytes[0] === 0xFF && block > 7) {
      bytes = readBytes(data, pos + 5)
      width = (bytes[2] << 8) + bytes[3]
      height = (bytes[0] << 8) + bytes[1]
      numcomponents = bytes[4]
      return {width: width, height: height, numcomponents: numcomponents}
    }

    pos += 2
  }

  throw new Error('getJpegSizeFromBytes could not find the size of the image')
}

// todo use node buffer to convert
var BASE64STRING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

var BASE64DECODELOOKUP = new Uint8Array(256);
(function () {
  for (var i = 0, l = BASE64STRING.length; i < l; i++) {
    BASE64DECODELOOKUP[BASE64STRING[i].charCodeAt(0)] = i
  }
})()

function base64toArrayBuffer (base64) {
  var bufferLength = base64.length * 0.75,
    len = base64.length, i, p = 0,
    encoded1, encoded2, encoded3, encoded4

  if (base64[base64.length - 1] === '=') {
    bufferLength--
    if (base64[base64.length - 2] === '=') {
      bufferLength--
    }
  }

  var arrayBuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arrayBuffer)

  for (i = 0; i < len; i += 4) {
    encoded1 = BASE64DECODELOOKUP[base64.charCodeAt(i)]
    encoded2 = BASE64DECODELOOKUP[base64.charCodeAt(i + 1)]
    encoded3 = BASE64DECODELOOKUP[base64.charCodeAt(i + 2)]
    encoded4 = BASE64DECODELOOKUP[base64.charCodeAt(i + 3)]

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4)
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
  }

  return arrayBuffer
}

module.exports = HtmlToPdf

