const fontsMap = {}
const _ = require('lodash')
const mustache = require('mustache')
const ReachText = require('./ReachText')
const {SpanMap} = require('./SpanMap')
const {XLSXStyle} = require('./XLSXStyle')
/**
 * This class used for extract value for html tag td and convert it to reachText
 */
class CellValue {
  /**
   *
   * @param rootNode
   * @param parentInfo
   * @return {ReachText}
   */
  static getValue (rootNode, parentInfo) {
    const cv = new CellValue(rootNode, parentInfo)
    return cv.getValue()
  }

  constructor (rootNode, parentInfo) {
    this.rootNode = rootNode
    this.parentInfo = parentInfo
    this.items = []
    this.reachText = new ReachText()
    this.useReachText = false
    this.reachInfo = null
  }

  /**
   *
   * @return {ReachText}
   */
  getValue () {
    const childCount = this.rootNode.childNodes.length
    for (let i = 0; i < childCount; ++i) {
      let childNode = this.rootNode.childNodes[i]
      this.addValue(childNode)
    }
    return this.useReachText ? this.reachText : (this.items.length > 0 ? this.items.join(',') : null)
  }

  addValue (node) {
    let value = node.nodeValue
    if ((!node.childNodes || node.childNodes.length === 0) && value !== null && value !== undefined) {
      if (this.reachInfo || this.useReachText) {
        if (!this.useReachText && this.items.length > 0) {
          this.items.forEach(F => this.reachText.addText(F))
          this.items = null
        }
        this.useReachText = true
        this.reachText.addText(value, this.reachInfo)
      } else {
        this.items.push(value)
      }
      return
    }
    let nodeInfo = (node.nodeName === '#text') ? null : getTagInfo(node)
    let reachInfo = nodeInfo ? tagInfoToReachTextConfig(nodeInfo) : null
    let masterReachInfo = this.reachInfo
    if (reachInfo) {
      if (masterReachInfo) {
        this.reachInfo = Object.assign({}, masterReachInfo)
      }
      this.reachInfo = Object.assign(this.reachInfo || {}, reachInfo)
    }
    for (let i = 0; i < node.childNodes.length; ++i) {
      let childNode = node.childNodes[i]
      this.addValue(childNode)
    }
    this.reachInfo = masterReachInfo
  }
}

/*
function mustacheFdExec (val, render) {
  const me = this
  let data = render(val)
  if (!data) return data
  let dataArr = JSON.parse('[' + data + ']')
  if (dataArr < 1) {
    throw new Error('$fd function require one or two parameter. {{#$fd}}"dateReg","dd.mm.yyyy"{{/fd}} ')
  }
  return XLSXfromHTML.formatValue(me[dataArr[0]], dataArr.length > 1 ? dataArr[1] : null)
}
*/

function getDottedProperty (me, property) {
  var value = me
  property.split('.').forEach(function (name) {
    if (!value) throw new Error('Invalid property ' + name)
    value = value[name]
  })
  return value
}

function formatMustache (format, fixFormat, root) {
  const predefinedFormats = XLSXStyle.predefinedFormats
  return function (val, render) {
    const me = this
    let data = render(val)
    if (!data) return data
    let dataArr = JSON.parse('[' + data + ']')
    if (dataArr < 1) {
      throw new Error('$format function require one or two parameter. {{#$f}}"amount"{{/f}} {{#$f}}"amount","sum"{{/f}} ')
    }
    let value = getDottedProperty(me, dataArr[0])
    if (fixFormat && (value !== undefined && value !== null)) {
      if (fixFormat === 'number') value = Number(value)
      else if (fixFormat === 'date' && !(value instanceof Date)) value = new Date(value)
    }
    const formatPattern = dataArr.length > 1 ? dataArr[1] : (format || (typeof value === 'number' ? 'sum' : 'date'))
    let formatR = predefinedFormats[formatPattern]
    if (!formatR && formatR !== 0) {
      throw new Error('Undefined format')
    }
    return XLSXfromHTML.formatValue(value, formatPattern)
  }
}

const optimizationProp = '$xlsx_optimization'
// const minLenOptimization = 1

/**
 * This function replace iterator block to iterator tag and save block template
 * @param sourceObj
 * @param tempObj
 * @param templates
 * @param templatesData
 * @param [path]
 */
function wrapIterator (sourceObj, tempObj, templates, templatesData, path, minLenOptimization) {
  // copy function from parent path
  let ctxt = path && templatesData[path] ? Object.assign({}, templatesData[path]) : {}
  const currCtxt = Object.keys(sourceObj)
    .map(key => typeof sourceObj[key] === 'function' ? sourceObj[key] : null)
    .filter(F => F)
  Object.assign(ctxt, currCtxt)
  Object.keys(sourceObj).map(key => {
    let item = sourceObj[key]
    let newPath = path ? path + '.' + key : key
    if (typeof item === 'object' && Array.isArray(item) && item.length >= minLenOptimization) {
      templatesData[newPath] = Object.assign({items: item}, currCtxt)
      tempObj[key] = function () {
        return function (iTemplate, render) {
          iTemplate = iTemplate.trim()
          let hasComment = iTemplate.substr(0, 3) === '-->'
          templates[newPath] = hasComment ? iTemplate.substr(3, iTemplate.length - 7) : iTemplate
          return hasComment ? `--><iterator name="${newPath}" /><!--` : `<iterator name="${newPath}" />`
        }
      }
    } else {
      if (typeof item === 'object') {
        tempObj[key] = {}
        wrapIterator(item, tempObj[key], templates, templatesData, newPath)
      }
      tempObj[key] = item
    }
  })
}

/**
 * Class for convert html to XLSX.
 * Example:
 *
 *      const {XLSXWorkbook, XLSXfromHTML} = require('xlsx')
 *      const xmldom = require('xmldom')
 *      const wb = new XLSXWorkbook({useSharedString: false})
 *      const converter = new XLSXfromHTML(xmldom.DOMParser, wb, [{name: 'Лист'}])
 *      converter.writeHtml({html: yourHtmlString})
 *
 * Example of usage exist in writeHtml
 */
class XLSXfromHTML {
  /**
   *
   * @param {xmldom.DOMParser} DOMParser Class factory
   * @param {XLSXWorkbook} workBook
   * @param {Object|Object[]} [sheetConfig] Config for {@link XLSXWorkbook.addWorkSheet}. You can see full list of config parameters in {@link XLSXWorkbook.addWorkSheet XLSXWorkbook.addWorkSheet}.
   * @param {String} [sheetConfig.title='Worksheet']
   * @param {String} [sheetConfig.name='Лист']
   * @param {String} [sheetConfig.setActive=false]
   */
  constructor (DOMParser, workBook, sheetConfig) {
    this.parser = new DOMParser()
    this.wb = workBook
    this.sheetConfig = sheetConfig
    this.defaultTableWidth = 90 // todo calculate this value
  }

  /**
   * @private
   * @param index
   * @return {{title: string, name: string, setActive: boolean}}
   */
  getSheetConfig (index) {
    let cfg = {title: 'Worksheet', name: 'sheet ' + (index + 1), setActive: (index === 0)}
    if (this.sheetConfig) {
      if (Array.isArray(this.sheetConfig)) {
        if (this.sheetConfig.length > index && (typeof this.sheetConfig[index] === 'object')) {
          Object.assign(cfg, this.sheetConfig[index])
        }
      } else {
        Object.assign(cfg, this.sheetConfig)
      }
    }
    return cfg
  }

  /**
   * Render html mustache template for transform to HTML with memory usage optimization.
   * This function render Mustache template and replace section with big data to "iterator" tag
   * Example
   *
   *
   *     const template = `
   *      <table><body>
   *        {{#bicycles}}
   *          <tr><td>{{name}}</td><td>{{#$f}}"weight","#,##0.00"{{/$f}}</td></tr>
   *        {{/bicycles}}
   *      </body></table>`
   *
   *      const data = {
   *         bicycles: [{name: 'Mountain', weight: 16.4}, {name: 'Marin', weight: 12.56}, {name: 'Tricycles', weight: 9.5}]
   *      }
   *
   *      const {XLSXWorkbook, XLSXfromHTML} = require('xlsx')
   *      const xmldom = require('xmldom')
   *      const wb = new XLSXWorkbook({useSharedString: false})
   *      const html = XLSXfromHTML.mustacheRenderOptimization(template, data, 2)
   *      const converter = new XLSXfromHTML(xmldom.DOMParser, wb, [{name: 'Лист'}])
   *      converter.writeHtml({html: html, sourceData: data})
   *
   *
   * @param {String} template
   * @param {Object} data
   * @param {Number} [minLenOptimization=10] Minimal count of item in source data list to start optimization.
   * Optimization will applied for items with Array data type.
   * Also it use as size of block html data rendering.
   * @return {String}
   */
  static mustacheRenderOptimization (template, data, minLenOptimization) {
    const tmpData = {}
    const templates = {}
    const templatesData = {}

    if (!minLenOptimization && minLenOptimization !== 0) {
      minLenOptimization = 10
    }
    wrapIterator(data, tmpData, templates, templatesData, null, minLenOptimization)
    XLSXfromHTML.addMustacheSysFunction(tmpData)
    data[optimizationProp] = {templates, templatesData}
    return mustache.render(template, tmpData)
  }

  /**
   * Convert any primitives data type value to format XLSXfromHTML compatible
   * @param {Primitives} value
   * @param {String} format
   * @return {String}
   */
  static formatValue (value, format) {
    let result
    let valueType = typeof value
    if (valueType === 'object' && value instanceof Date) {
      valueType = 'datetime'
    }
    switch (valueType) {
      case 'datetime':
        result = `${formatPrefix}d${value.getTime()}`
        break
      case 'number':
        result = `${formatPrefix}n${String(value)}`
        break
      default:
        result = (value !== null && value !== undefined) ? String(value) : ''
        format = null
    }
    if (result && format) {
      result += formatPrefix + 'f' + format
    }
    return result
  }

  /**
   * Add data format function to object that will be used as data for "Mustache" template.
   * Example usage in "Mustache" template
   *
   *
   *     {{#$f}}"propertyName","#,##0.00"{{/$f}}
   *
   * @param data
   */
  static addMustacheSysFunction (data) {
    if (typeof data !== 'object') throw new Error('Invalid param data type')
    // data.$fd = mustacheFdFactory.bind(data)
    // data.$fn = mustacheFnFactory.bind(data)
    // data.$f = mustacheFnFactory.bind(data)
    /**
     *
     * @return {Function}
     */
    data.$f = function () {
      return formatMustache()
    }

    data.$fn = function () {
      return formatMustache('number', 'number', data)
    }

    data.$fs = function () {
      return formatMustache('sum', 'number', data)
    }

    data.crn = function () {
      return formatMustache('sum', 'number', data)
    }

    data.$fd = function () {
      return formatMustache('date', 'date', data)
    }

    data.$ft = function () {
      return formatMustache('time', 'date', data)
    }

    data.$fdt = function () {
      return formatMustache('time', 'date', data)
    }
  }

  /**
   * @private Execute iterator
   * @param {Object} node
   * @param {String} tagName
   * @param {Object} sourceData
   * @param {Function} itemReady Callback for apply iterator result
   */
  applyIterator (node, tagName, sourceData, itemReady) {
    const {templates, templatesData} = sourceData[optimizationProp]
    const itemName = getAttribute(node, 'name')
    const template = `{{#item}}${templates[itemName]}{{/item}}`
    const blockLen = 2
    let blockArr = []
    let result = []
    mustache.parse(template)
    const data = templatesData[itemName]
    XLSXfromHTML.addMustacheSysFunction(data)
    data.items.forEach(F => {
      data.item = F
      blockArr.push(mustache.render(template, data))
      if (blockArr.length >= blockLen) {
        let root = this.parseXml(blockArr.join(''))
        blockArr = []
        findNode(root, tagName, result, true)
        result.forEach(itemReady)
        result = []
      }
    })
    if (blockArr.length > 0) {
      let root = this.parseXml(blockArr.join(''))
      findNode(root, tagName, result, true)
      result.forEach(itemReady)
    }
  }

  parseXml (xml) {
    let html = removeEntities(xml)
    html = html.replace(/(\r|\n)/g, '')
    const root = this.parser.parseFromString('<xmn>' + html + '</xmn>', 'application/xml').documentElement
    if (root.childNodes && root.childNodes.length > 0 && root.childNodes[0].nodeName === 'parsererror') {
      throw new Error(root.childNodes[0].innerHTML)
    }
    return root
  }

  /**
   * Convert html to XLSX.
   * This function search all tags "table" and transform each table to XLSX Sheet.
   * Inside table support tags:
   * body, header, iterator, tr, td, th, STRONG, b, EM, i, br, p, span, div
   * Supported style parameters:
   *     'font-family','font-weight','font-style','font-size','text-align','vertical-align','text-indent',
   *     'list-style-type',
   *     'list-style-position',
   *     'background-color',
   *     'width','height',
   *     'border-style','border-top-style','border-bottom-style','border-right-style','border-left-style','border',
   *     'border-width','border-top-width','border-bottom-width','border-right-width','border-left-width',
   *     'padding','padding-top','padding-bottom','padding-right','padding-left',
   *     'margin','margin-top','margin-bottom','margin-right','margin-left',
   *
   * Tag "iterator" used for render iterable data in html.
   * This methodic used for transform  XLSX iterable data by "Mustache" template.
   * Template for iterator tag must be valid xml (congruence part of HTML)
   *
   * By default all data from HTML have String data type and it will put into XLSX as String
   * If you want have other data types in XLSX use function XLSXfromHTML.formatValue.
   * It convert your data to formatted string that will be converted to correct data type and cell data render format
   *
   * Example
   * You put into HTML data
   *
   *
   *     const html = `
   *      <table><body>
   *         <iterator name="bicycles"></iterator>
   *      </body></table>`
   *
   *      const data = {
   *         $xlsx_optimization: {
   *             templates: {
   *               bicycles: '<tr><td>{{name}}</td><td>{{#$f}}"weight","#,##0.00"{{/$f}}</td></tr>'
   *             },
   *             templatesData: {
   *               bicycles: [{name: 'Mountain', weight: 16.4}, {name: 'Marin', weight: 12.56}, {name: 'Tricycles', weight: 9.5}]
   *             }
   *         }
   *      }
   *
   *      const {XLSXWorkbook, XLSXfromHTML} = require('xlsx')
   *      const xmldom = require('xmldom')
   *      const wb = new XLSXWorkbook({useSharedString: false})
   *      const converter = new XLSXfromHTML(xmldom.DOMParser, wb, [{name: 'Лист'}])
   *      XLSXfromHTML.addMustacheSysFunction(data)
   *      converter.writeHtml({html: html, sourceData: data})
   *
   *
   * @param {Object} config
   * @param {String} config.html
   * @param {Object} [config.sourceData] Data for render "iterator" tag
   */
  writeHtml (config) {
    if (!config.html) throw new Error('Empty config.html')
    let root = this.parseXml(config.html)

    let tables = []
    findNode(root, config.sourceData ? ['table', 'iterator'] : 'table', tables, true)
    if (tables.length === 0) {
      throw new Error('Table tag not found')
    }
    let idx = 0

    let addItem = F => {
      const cfg = this.getSheetConfig(idx)
      let ws = this.wb.addWorkSheet(cfg)
      this.writeTable(ws, F, config)
      idx++
    }

    tables.forEach((F, idx) => {
      if (F.nodeName.toLowerCase() === 'iterator') {
        this.applyIterator(F, 'table', config, addItem)
      } else {
        addItem(F)
      }
    })
  }

  /**
   *
   * @param ws
   * @param node
   * @param config
   */
  writeTable (ws, node, config) {
    let rows = []
    let rowIndex = config.startRowIndex || 0
    let ctxt = { tableInfo: getTagInfo(node), config: config }
    ctxt.tableStyle = styleToXlsx(ctxt.tableInfo)
    // html do not inherit this
    // let ts = ctxt.tableStyle
    // if (ts.border) delete ts.border
    ctxt.colWidth = []
    ctxt.spanMap = new SpanMap(ctxt.tableInfo.style.width || this.defaultTableWidth)
    findNode(node, config.sourceData ? ['tr', 'iterator'] : 'tr', rows, true)

    let addItem = F => {
      this.writeRow(ws, F, rowIndex, ctxt)
      rowIndex++
    }

    rows.forEach(F => {
      if (config.sourceData && F.nodeName.toLowerCase() === 'iterator') {
        this.applyIterator(F, 'tr', config.sourceData, addItem)
      } else {
        addItem(F)
      }
    })

    let widths = ctxt.spanMap.getWidths()
    widths = widths.map((F, i) => { return F ? {column: i, width: F} : null }).filter(F => F)
    if (widths.length) {
      ws.setColsProperties(widths)
    }
  }

  /**
   *
   * @param ws
   * @param node
   * @param index
   * @param ctxt
   */
  writeRow (ws, node, index, ctxt) {
    let cells = []
    let trInfo = getTagInfo(node)
    let minHeight = trInfo.style.height || trInfo.style.minHeight || 0
    let trStyle = styleToXlsx(trInfo)
    let startRow = ctxt.config.startRow || 0
    let colWidth = []

    findNode(node, ctxt.config.sourceData ? ['td', 'iterator'] : 'td', cells)
    let columnNum = startRow
    const cellsData = []
    let addItem = F => {
      let cellInfo = {}
      let tdInfo = getTagInfo(F)
      cellInfo.value = CellValue.getValue(F, tdInfo)
      let typedValue = getTypedValue(cellInfo.value)
      let valueStyle = {}
      if (typedValue) {
        cellInfo.value = typedValue.value
        if (typedValue.format) {
          valueStyle.format = typedValue.format
        }
      }
      let colSpan = getAttributeInt(F, 'colspan')
      if (colSpan) cellInfo.cellStyle = {colSpan: colSpan}
      let rowSpan = getAttributeInt(F, 'rowspan')
      if (rowSpan) {
        cellInfo.cellStyle = cellInfo.cellStyle || {}
        cellInfo.cellStyle.rowSpan = rowSpan
      }
      let tdMinHeight = tdInfo.style.height || tdInfo.style.minHeight
      if (tdMinHeight && tdMinHeight > minHeight) minHeight = tdMinHeight
      colWidth.push({rowSpan, colSpan, width: tdInfo.style.width, widthPercent: tdInfo.style.widthPercent})
      cellInfo.style = getStyleByHtml(ws.workBook, [valueStyle, styleToXlsx(tdInfo), trStyle, ctxt.tableStyle, {alignment: {wrapText: true}}])
      cellInfo.column = columnNum = ctxt.spanMap.getCurrentCellNum(columnNum)
      // columnNum = ctxt.spanMap.getNextCellNum(columnNum, colSpan)
      columnNum = columnNum + 1 + (colSpan || 1) - 1
      cellsData.push(cellInfo)
    }
    cells.forEach(F => {
      if (ctxt.config.sourceData && F.nodeName.toLowerCase() === 'iterator') {
        this.applyIterator(F, 'td', ctxt.config.sourceData, addItem)
      } else {
        addItem(F)
      }
    })

    ctxt.spanMap.addRow(colWidth)
    ws.addRow(cellsData, null, minHeight ? {height: minHeight} : null)
  }
}

const formatPrefix = '##$'
const formatPrefixLen = formatPrefix.length

/**
 * For date use (new Date()).getTime()
 * For number use String(1234.11)
 * ##$d1516790542564##$fdd.mm.yyyy
 *    ##$ - prefix
 *    d - type must be d (dateTime) or n (Number)
 *    $f - optional show format
 * @param {String} value
 * @return {*}
 */
function getTypedValue (value) {
  if ((typeof value !== 'string') || value.length <= formatPrefixLen) return null
  if (value.substr(0, formatPrefixLen) === formatPrefix) {
    let dataType = value.substr(formatPrefixLen, 1)
    let dataValue = value.substr(formatPrefixLen + 1)
    let dataFormat
    dataValue = dataValue.split(formatPrefix + 'f')
    if (dataValue.length > 1) {
      dataFormat = dataValue[1]
      let dataFormatF = XLSXStyle.predefinedFormats[dataFormat]
      if (dataFormatF || dataFormatF === 0) {
        dataFormat = dataFormatF
      }
    }
    dataValue = dataValue[0]
    switch (dataType) {
      case 'd':
        dataValue = new Date(Number(dataValue))
        break
      case 'n':
        dataValue = Number(dataValue)
        break
    }
    return {value: dataValue, format: dataFormat, dataType}
  }
  return null
}

function tagInfoToReachTextConfig (tagInfo) {
  if (!tagInfo || !tagInfo.style) return null
  let res = {}
  if (tagInfo.style.font.weight === 'bold') res.bold = true
  if (tagInfo.style.font.style === 'italic') res.italic = true
  if (tagInfo.style.font.name) {
    res.font = tagInfo.style.font.name
  }
  if (tagInfo.style.font.fontSize) {
    res.fontSize = tagInfo.style.font.fontSize
  }
  if (tagInfo.style.font.color) {
    res.color = tagInfo.style.font.color
  }
  if (tagInfo.style.textDecoration === 'line-through') res.strike = true
  if (tagInfo.style.textDecoration === 'underline') res.underline = 'single'
  return res
}

/**
 * Find child nodes by key[s]
 * @param {DOMNode} node
 * @param {string|array} key
 * @param {array} items
 * @param {bool} deep
 */
function findNode (node, key, items, deep) {
  if (!node.childNodes) return
  key = Array.isArray(key) ? key : [key]
  for (let nodeIndex = 0; nodeIndex < node.childNodes.length; nodeIndex++) {
    let nc = node.childNodes[nodeIndex]
    let nodeName = nc.nodeName.toLowerCase()
    if (key.indexOf(nodeName) >= 0) {
      items.push(nc)
    } else if (deep) {
      findNode(nc, key, items, deep)
    }
  }
}

function getFontNameByHtmlName (htmlName) {
  if (!htmlName) return htmlName
  let res = null
  let xName
  htmlName.split(',').every(function (name) {
    xName = name.trim()
    if (xName[0] === '"') {
      xName = xName.substring(1, xName.length - 1)
    }
    res = fontsMap[xName]
    return !res
  })
  return res || xName
}

function parseStyle (node) {
  if (!node.attributes) {
    return {}
  }
  let styleStr = node.attributes.getNamedItem('style')
  if (!styleStr || !styleStr.value) {
    return {}
  }
  let result = {}
  styleStr.value.split(';').forEach(function (elementStr) {
    if (!elementStr) return
    let pair = elementStr.split(':')
    if (pair.length < 2) {
      return
    }
    result[pair[0].trim()] = pair[1].trim()
  })
  return result
}

// todo calculate proportion point to mm from scale
function convertToMeasure (value, measure, horizontal) {
  if (!value) return value
  switch (measure) {
    case 'px':
    case 'pt':
      return horizontal ? value * 13.75 / 100 : value * 3 / 4 // 72 / 25.4
    case 'cm':
    case 'mm':
      return value
    default:
      return horizontal ? value * 13.75 / 100 : value * 3 / 4 // 72 / 25.4
      // throw new Error('Unknown measure ' + measure)
  }
}

function toXLSMeasure (styleProp, options) {
  if (!styleProp) return 0
  let val = styleProp
  let isPercent = false
  if (typeof (val) !== 'string') {
    val = val + ''
  }
  val = val.trim()
  if (val.substr(-1) === '%') {
    if (!options || options.banPercent) {
      throw new Error('% is not supported metric for font-size')
    } else {
      if (options) options.isPercent = isPercent = true
    }
  }
  val = parseInt(val, 10)
  if (val === 0) return val
  if (Number.isNaN(val)) return null  // do not throw error
  return isPercent ? val : convertToMeasure(val, 'px', options.horizontal)
}

function setDefaultNodeStyle (info, node) {
  switch (node.nodeName.toLowerCase()) {
    case 'em':
    case 'i':
      info.style.font.style = 'italic'
      break
    case 'strong':
    case 'b':
      info.style.font.weight = 'bold'
      break
  }
}

function getTagInfo (node) {
  let info = {}
  info.styleProps = parseStyle(node)
  info.style = getStyleProp(info.styleProps)
  info.border = getBorderInfo(info.styleProps)
  info.padding = getPaddingInfo(info.styleProps)
  info.margin = getMarginInfo(info.styleProps)
  setDefaultNodeStyle(info, node)
  return info
}

function getStyleByHtml (wb, styles) {
  let config = {}
  styles.reverse().forEach(F => {
    _.defaultsDeep(config, F)
    // Object.assign(config, F)
  })
  return wb.style.getStyle(config)
}

/**
 * Convert html align to xlsx
 * @param align
 * @return {*}
 */
function decodeAlign (align) {
  if (!align) return align
  // start | end | left | right | center | justify | match-parent
  // (general | left | center | right | fill | justify | centerContinuous | distributed)
  switch (align) {
    case 'start':
    case 'left': return 'left'
    case 'end':
    case 'right': return 'right'
    case 'center': return 'center'
    case 'justify': return 'justify'
    default: return 'general'
  }
}

/**
 * Decode html vertical align
 * @param align
 * @return {*}
 */
function decodeVAlign (align) {
  if (!align) return align
 // baseline | sub | super | text-top | text-bottom | middle | top | bottom
 // top | center | bottom | justify distributed
  switch (align) {
    case 'baseline':
    case 'sub':
    case 'text-top':
    case 'super':
    case 'top': return 'top'
    case 'text-bottom':
    case 'bottom': return 'bottom'
    case 'middle': return 'center'
    default: return 'top'
  }
}

function styleToXlsx (htmlStyleInfo) {
  let config = {}
  if (htmlStyleInfo.style.backgroundColor) {
    config.fill = htmlStyleInfo.style.backgroundColor
  }
  if (htmlStyleInfo.style.font) {
    let font = htmlStyleInfo.style.font
    config.font = {}
    if (font.name) config.font.name = font.name
    if (font.weight) config.font.bold = font.weight === 'bold'
    if (font.style) config.font.italic = font.style === 'italic'
    if (font.color) config.font.color = font.color
    if (font.size) config.font.fontSize = font.size
  }
  if (htmlStyleInfo.style.textDecoration) {
    config.font = config.font || {}
    // line-through, overline, underline
    if (htmlStyleInfo.style.textDecoration === 'line-through') config.font.strike = true
    if (htmlStyleInfo.style.textDecoration === 'underline') config.font.underline = 'single'
  }
  if (htmlStyleInfo.style.textRotation) {
    config.alignment = config.alignment || {}
    config.alignment.textRotation = parseInt(htmlStyleInfo.style.textRotation, 10)
  }
  if (htmlStyleInfo.style.align) {
    config.alignment = config.alignment || {}
    config.alignment.horizontal = decodeAlign(htmlStyleInfo.style.align)
  }
  if (htmlStyleInfo.style.verticalAlign) {
    config.alignment = config.alignment || {}
    config.alignment.vertical = decodeVAlign(htmlStyleInfo.style.verticalAlign)
  }
  setBorderItem(htmlStyleInfo.border, config, 'top')
  setBorderItem(htmlStyleInfo.border, config, 'bottom')
  setBorderItem(htmlStyleInfo.border, config, 'left')
  setBorderItem(htmlStyleInfo.border, config, 'right')

  return config
}

function setBorderItem (item, config, type) {
  if (item[type]) {
    config.border = config.border || {}
    config.border[type] = {}
    config.border[type].style = htmlBorderStyle2XLSX(item[type].style)
    if (item[type].color) {
      config.border[type].color = item[type].color
    }
  }
}

function htmlBorderStyle2XLSX (htmlStyle) {
  // "none","thin","medium","dashed","dotted","thick","double","hair","mediumDashed","dashDot","mediumDashDot","dashDotDot","mediumDashDotDot","slantDashDot"
  // none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset
  switch (htmlStyle) {
    case 'hidden':
    case 'none': return 'none'
    case 'dotted': return 'dotted'
    case 'dashed': return 'dashed'
    case 'solid': return 'thin'
    case 'groove':
    case 'ridge':
    case 'inset':
    case 'outset':
    case 'double': return 'double'
    default: return 'none'
  }
}

const RErotateDeg = /^rotate\((.*)deg\)$/

function getStyleProp (style) {
  let res = {
    font: {}
  }
  if (style['font-family']) {
    res.font.name = style['font-family']
    res.font.name = getFontNameByHtmlName(res.font.name) || res.font.name
  }
  let tmp
  if (style['font-weight']) {
    tmp = style['font-weight']
    if (tmp) {
      res.font.weight = tmp
      if (tmp !== 'normal') {
        res.font.weight = 'bold'
      }
    }
  }
  if (style['font-style']) {
    tmp = style['font-style']
    if (tmp) {
      res.font.style = tmp
      if (tmp !== 'normal') {
        res.font.style = (res.font.style || '') + 'italic'
      }
    }
  }
  if (style.color) {
    res.font.color = style.color
  }
  if (style['font-size']) {
    tmp = style['font-size']
    if (tmp && tmp !== 'normal') {
      res.font.size = parseFloat(tmp)
    }
  }
  if (style['text-decoration']) {
    tmp = style['text-decoration']
    if (tmp && tmp !== 'none') {
      res.textDecoration = style['text-decoration']
    }
  }
  if (style['transform']) {
    tmp = style['transform']
    let rotateDeg = tmp.match(RErotateDeg)
    if (rotateDeg && rotateDeg[1]) {
      res.textRotation = rotateDeg[1]
    }
  }

  //wrapText

  // cfg.color || pBlock.font.color);
  if (style['text-align']) {
    res.align = style['text-align']
  }
  if (style['vertical-align']) {
    res.verticalAlign = style['vertical-align']
  }
  if (style['text-indent']) {
    res.textIndent = toXLSMeasure(style['text-indent'])
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
  }

  if (style['list-style-position']) {
    res.listStylePosition = style['list-style-position']
  }
  if (style['list-style-type']) {
    res.listStyleType = style['list-style-type']
  }

  if (style.width) {
    tmp = {horizontal: true}
    res.width = toXLSMeasure(style.width, tmp)
    if (tmp.isPercent) {
      res.widthPercent = res.width
      res.width = undefined
    }
  }
  if (style.height) {
    tmp = {}
    res.height = toXLSMeasure(style.height, tmp)
    if (tmp.isPercent) {
      res.heightPercent = res.height
      res.height = undefined
    }
  }
  if (style['min-height']) {
    tmp = {}
    res.minHeight = toXLSMeasure(style['min-height'], tmp)
    if (tmp.isPercent) {
      res.minHeightPercent = res.minHeight
      res.minHeight = undefined
    }
  }
  return res
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

function getBorderInfo (itemStyle) {
  let borderStyle, bWidth, borderColor
  let border = {}

  if (itemStyle.border) {
    let brd = extractBorderProps(itemStyle.border)
    bWidth = [brd.width]
    borderStyle = [brd.style]
    borderColor = [brd.color]
  }
  if (!borderStyle) {
    borderStyle = itemStyle['border-style']
    if (borderStyle) {
      borderStyle = (borderStyle || '').split(' ')
    }
  }
  if (!borderColor) {
    borderColor = itemStyle['border-color']
    if (borderColor) {
      borderColor = (borderColor || '').split(' ')
    }
  }
  if (itemStyle['border-right']) {
    border.right = extractBorderProps(itemStyle['border-right'])
  }
  if (itemStyle['border-left']) {
    border.left = extractBorderProps(itemStyle['border-left'])
  }
  if (itemStyle['border-top']) {
    border.top = extractBorderProps(itemStyle['border-top'])
  }
  if (itemStyle['border-bottom']) {
    border.bottom = extractBorderProps(itemStyle['border-bottom'])
  }

  borderColor = parseComplex(borderColor || [])
  if (itemStyle['border-top-color']) {
    borderColor.top = itemStyle['border-top-color']
  }
  if (itemStyle['border-right-color']) {
    borderColor.right = itemStyle['border-right-color']
  }
  if (itemStyle['border-bottom-color']) {
    borderColor.bottom = itemStyle['border-bottom-color']
  }
  if (itemStyle['border-left-color']) {
    borderColor.left = itemStyle['border-left-color']
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
    rWidth.top = convertToMeasure(parseIntValue(rWidth.top), 'px')
  }
  if (rWidth.right) {
    rWidth.right = convertToMeasure(parseIntValue(rWidth.right), 'px')
  }
  if (rWidth.bottom) {
    rWidth.bottom = convertToMeasure(parseIntValue(rWidth.bottom), 'px')
  }
  if (rWidth.left) {
    rWidth.left = convertToMeasure(parseIntValue(rWidth.left), 'px')
  }

  setPropertyStyleFromType(border, 'right', rWidth, 'width')
  setPropertyStyleFromType(border, 'left', rWidth, 'width')
  setPropertyStyleFromType(border, 'bottom', rWidth, 'width')
  setPropertyStyleFromType(border, 'top', rWidth, 'width')

  setPropertyStyleFromType(border, 'right', borderStyle, 'style')
  setPropertyStyleFromType(border, 'left', borderStyle, 'style')
  setPropertyStyleFromType(border, 'bottom', borderStyle, 'style')
  setPropertyStyleFromType(border, 'top', borderStyle, 'style')

  setPropertyStyleFromType(border, 'right', borderColor, 'color')
  setPropertyStyleFromType(border, 'left', borderColor, 'color')
  setPropertyStyleFromType(border, 'bottom', borderColor, 'color')
  setPropertyStyleFromType(border, 'top', borderColor, 'color')

  let result = { borderWidth: rWidth, borderStyle: borderStyle, borderColor: borderColor }
  if (result.borderWidth.top && result.borderStyle.top) {
    result.top = {width: result.borderWidth.top, style: result.borderStyle.top, color: result.borderColor.top}
  }
  if (result.borderWidth.bottom && result.borderStyle.bottom) {
    result.bottom = {width: result.borderWidth.bottom, style: result.borderStyle.bottom, color: result.borderColor.bottom}
  }
  if (result.borderWidth.left && result.borderStyle.left) {
    result.left = {width: result.borderWidth.left, style: result.borderStyle.left, color: result.borderColor.left}
  }
  if (result.borderWidth.right && result.borderStyle.right) {
    result.right = {width: result.borderWidth.right, style: result.borderStyle.right, color: result.borderColor.right}
  }
  return result
}

function setPropertyStyleFromType (objType, type, obj, style) {
  if (objType[type] && objType[type][style] && (!obj[type] || !obj[type][style])) {
   // obj[type] = obj[type] || {}
    obj[type] = objType[type][style]
  }
}

const borderStyles = ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset']

function isWidth (value) {
  if (!value) return false
  return value.substr(-2) === 'px'
}

/**
 * parse html border style '1px solid black' and return object {style, width, color}
 * @param items
 * @return {*}
 */
function extractBorderProps (borderStyle) {
  let items = (borderStyle || '').split(' ')
  if (items.length < 2) return false
  const v0 = items[0]
  const v1 = items[1]
  const v2 = items.length > 2 ? items[2] : undefined
  let style = borderStyles.indexOf(v0) >= 0 ? v0 : null
  let styleIdx = 0
  if (!style) {
    style = borderStyles.indexOf(v1) >= 0 ? v1 : null
    styleIdx = 1
  }
  if (!style) {
    style = borderStyles.indexOf(v2) >= 0 ? v2 : null
    styleIdx = 2
  }
  if (!style) {
    throw new Error('Invalid border format ' + borderStyle)
  }
  let width
  let widthIdx
  if (styleIdx !== 0 && isWidth(v0)) {
    width = v0
    widthIdx = 0
  }
  if (!width && styleIdx !== 1 && isWidth(v1)) {
    width = v1
    widthIdx = 1
  }
  if (!width && styleIdx !== 2 && isWidth(v2)) {
    width = v2
    widthIdx = 2
  }
  if (!width) {
    throw new Error('Invalid border format ' + borderStyle)
  }
  let color
  if (styleIdx !== 0 && widthIdx !== 0) color = v0
  if (styleIdx !== 1 && widthIdx !== 1) color = v1
  if (styleIdx !== 2 && widthIdx !== 2) color = v2
  if (!color) {
    color = 'black'
  }
  return {style: style, width: convertToMeasure(parseIntValue(width)), color: color}
}

function getPaddingInfo (itemStyle, def) {
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
    rWidth.top = convertToMeasure(parseIntValue(rWidth.top), 'px')
  }
  if (rWidth.right) {
    rWidth.right = convertToMeasure(parseIntValue(rWidth.right), 'px')
  }
  if (rWidth.bottom) {
    rWidth.bottom = convertToMeasure(parseIntValue(rWidth.bottom), 'px')
  }
  if (rWidth.left) {
    rWidth.left = convertToMeasure(parseIntValue(rWidth.left), 'px')
  }
  return rWidth
}

function getMarginInfo (itemStyle, def) {
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
    rWidth.top = convertToMeasure(parseIntValue(rWidth.top), 'px')
  }
  if (rWidth.right) {
    rWidth.right = convertToMeasure(parseIntValue(rWidth.right), 'px')
  }
  if (rWidth.bottom) {
    rWidth.bottom = convertToMeasure(parseIntValue(rWidth.bottom), 'px')
  }
  if (rWidth.left) {
    rWidth.left = convertToMeasure(parseIntValue(rWidth.left), 'px')
  }
  return rWidth
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
/*
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
*/

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

function parseIntValue (value) {
  switch (typeof (value)) {
    case 'string':
      return parseInt(value, 10)
    case 'number':
      return value
    default: return 0
  }
}

module.exports = XLSXfromHTML
