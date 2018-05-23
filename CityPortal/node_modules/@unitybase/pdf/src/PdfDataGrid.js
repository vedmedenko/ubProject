const _ = require('lodash')
const pdfUtils = require('./pdfUtils')
const PdfDataGridRow = require('./PdfDataGridRow')

/**
 *
 * @param {Object} [config]
 * @param {String} [config.top] default is current position
 * @param {String} [config.left] default is left size of page margin
 * @param {Array}   config.columns  array of columns config
 * @param {Boolean} [config.noWrite] default value for all row.
 * @param {Boolean} [config.noChangePage] default value for all row. When true component does not change global Page context until write method called.
 * @param {Boolean} [config.splitOnPage]  default value for all row. break row when row out of page size. Default false.
 * @param {Integer} [config.pageNumber] default currentPage
 * @param {Boolean} [config.isXml]  ????
 * @param {Object} [config.rowMargin]
 * @param {Integer} [config.rowMargin.top]
 * @param {Integer} [config.rowMargin.bottom]
 * @param {Boolean} [config.collectRow] When true it start collect rows into rowList property. By default false.
 * @param {Boolean} [config.drawBorderOnSplit=false]
 */
function PdfDataGrid (config) {
  function cnv (value, required, attrName) {
    pdfUtils.checkNumberValid(value, required, 'PDF.csPdfDataGrid: Invalid config parameter ' + attrName)
  }

  /**
   * @property rowNum
   * @type {Number}
   */
  this.rowNum = 0

  this.rowSpanCells = []
  this.rowSpanCellsRemain = []

  this.context = config.context
  if (!this.context) { throw new Error('PDF.csPdfDataGrid - No context in config') }
  config.context = null
  if (!config.isCloned) {
    config = _.cloneDeep(config)
  }

  this.drawBorderOnSplit = config.drawBorderOnSplit
  cnv(config.pageNumber, false, 'left')
  if (config.pageNumber || config.pageNumber === 0) {
    this.pageNumber = config.pageNumber
  } else {
    this.pageNumber = this.context.getPageNumber()
  }
  this.lastPageNumber = this.pageNumber

  this.initConfig = config
  this.isXml = config.isXml
  this.noChangePage = config.noChangePage || false
  this.rowMargin = config.rowMargin
  this.pdf = this.context.pdf
  this.pageSize = this.pdf.internal.pageSize
  this.columns = config.columns ? config.columns : []

  this.collectRow = config.collectRow
  if (this.collectRow) {
    this.rowList = []
  }
  this.left = config.left || 0
  this.top = config.top || 0
  this.bottom = this.top

  cnv(this.left, true, 'left')
  cnv(this.top, true, 'top')

  this.rows = []

  _.forEach(this.columns, (column) => {
    if (column.isXml === null || column.isXml === undefined) {
      column.isXml = this.isXml
    }
  })

  this.isAddRange = false
  this.rowSpanCells = []
  this.rowSpanCellsRemain = []
  this.topThroughRow = []
  this.topThroughRowHeight = 0
  this.setTopNextRow(this.top, this.pageNumber)
}

PdfDataGrid.brdFull = { right: '1px', left: '1px', top: '1px', bottom: '1px' }
PdfDataGrid.brdLTR = { right: '1px', left: '1px', top: '1px', bottom: 0 }
PdfDataGrid.brdLRB = { right: '1px', left: '1px', top: 0, bottom: '1px' }
PdfDataGrid.brdLR = { right: '1px', left: '1px', top: 0, bottom: 0 }
PdfDataGrid.brdL = { right: 0, left: '1px', top: 0, bottom: 0 }
PdfDataGrid.brdR = { right: '1px', left: 0, top: 0, bottom: 0 }
PdfDataGrid.brdB = { bottom: '1px', top: 0, left: 0, right: 0 }
PdfDataGrid.brdT = { bottom: 0, top: '1px', left: 0, right: 0 }
PdfDataGrid.brdTB = { bottom: '1px', top: '1px', left: 0, right: 0 }
PdfDataGrid.brdNone = { right: 0, left: 0, top: 0, bottom: 0 }
PdfDataGrid.stHidden = { width: 0 }
PdfDataGrid.paddingTB = { top: 2, bottom: 2 }

PdfDataGrid.bordersCash = { '': { left: 0, top: 0, bottom: 0, right: 0 } }
/**
 * @deprecated use PrintToPdf.parseBorder
 * brgConfig create border config by key chars: R - right, L - left, T - top, B - bottom
 * example PDF.csPdfDataGrid.border('RL') left and right
 * or PDF.csPdfDataGrid.border('R2L2') - thick
 * @param {String} val
 * @param {String} [dimension] optional default px  (px, mm)
 */
PdfDataGrid.border = function (val, dimension) {
  let cashVal = PdfDataGrid.bordersCash[val]
  if (cashVal) {
    return cashVal
  }
  let result = { left: 0, top: 0, bottom: 0, right: 0 }
  dimension = !dimension ? 'px' : dimension
  let i = 0
  while (i < val.length) {
    let key = 1
    if (i < val.length - 1 && val[i + 1] > 0) {
      key = val[i + 1] + 0
    }
    switch (val[i]) {
      case 'L': result.left = key + dimension; break
      case 'T': result.top = key + dimension; break
      case 'B': result.bottom = key + dimension; break
      case 'R': result.right = key + dimension; break
    }
    i = i + (key === 1 ? 1 : 2)
  }
  PdfDataGrid.bordersCash[val] = result
  return result
}
/**
 * parse range string settings from format 'x0:1,y0:0'
 * @param {String} val
 */
PdfDataGrid.range = function (val) {
  if (!val || (typeof val !== 'string')) {
    throw new Error('Incorrect format range settings', 'rangeFormatError')
  }
  let parts = val.split(',')
  let isX = false
  let isY = false
  let result = {x1: 0, x2: 0, y1: 0, y2: 0}
  _.forEach(parts, function (st) {
    isX = !isX && (st[0] === 'x')
    isY = !isY && (st[0] === 'y')
    if ((!isX && !isY) || (!isX && !isY) || (st.length <= 1)) {
      throw new Error('Incorrect format range settings', 'rangeFormatError')
    }
    let vst = st.substr(1).split(':')
    if (isX) {
      switch (vst.length) {
        case 1:
          result.x1 = vst[0] * 1
          result.x2 = vst[0] * 1
          break
        case 2:
          result.x1 = vst[0] * 1
          result.x2 = vst[1] * 1
          break
        default:
          throw new Error('Incorrect format range settings', 'rangeFormatError')
      }
    }
    if (isY) {
      switch (vst.length) {
        case 1:
          result.y1 = vst[0] * 1
          result.y2 = vst[0] * 1
          break
        case 2:
          result.y1 = vst[0] * 1
          result.y2 = vst[1] * 1
          break
        default:
          throw new Error('Incorrect format range settings', 'rangeFormatError')
      }
    }
  })
  return result
}

/**
 * @private
 * @param {Integer} top
 * @param {Integer} pageNumber
 */
PdfDataGrid.prototype.setTopNextRow = function (top, pageNumber) {
  this.topNextRow = top
  if (!this.noChangePage) {
    this.context.setPage(pageNumber)
  }
  if (this.topThroughRow.length > 0) {
    let pageN = this.lastPageNumber + 1
    while (this.lastPageNumber < pageNumber) {
      this.addThroughRow(pageN)
      this.lastPageNumber = pageN
      pageN++
    }
  }
  this.lastPageNumber = pageNumber
  if (this.context && !this.isAddRange) {
    this.context.setPosition(top)
  }
}

PdfDataGrid.prototype.newPage = function () {
  this.context.addPage()
  this.context.setPosition(this.context.page.innerSize.topColon)
  this.setTopNextRow(this.context.page.innerSize.topColon, this.context.getPageNumber())
}

/**
 * Получить сумму щирины колонок по индексам колонок
 * @param {Array<Number>} fieldsNum
 * @return {Number}
 */
PdfDataGrid.prototype.getColumnsWidth = function (fieldsNum) {
  let result = 0
  fieldsNum.forEach((itm) => {
    if (this.columns[itm]) result += this.columns[itm] || 0
  })
  return result
}

/**
 * getColumnsWidthByRange
 * @param {Number} columnFrom
 * @param {Number} columnTo
 */
PdfDataGrid.prototype.getColumnsWidthByRange = function (columnFrom, columnTo) {
  if ((this.columns.length < columnFrom) || (columnFrom < 0)) {
    throw new Error('Bad index columnFrom')
  }
  if ((this.columns.length < columnTo) || (columnTo < 0)) {
    throw new Error('Bad index columnTo')
  }
  let result = 0
  for (let i = columnFrom; i <= columnTo; i++) {
    result += this.columns[i] ? this.columns[i].width || 0 : 0
  }
  return result
}

/**
 * Set new property's of grid columnus by merging grid.columnus definition with newColumnConfigs
 * @param {Array} newColumnConfigs
 */
PdfDataGrid.prototype.setColumnProps = function (newColumnConfigs) {
  this.columns = _.merge(this.columns, newColumnConfigs)
}

/**
 * Add row to grid
 *
 * @example
 *
 *          grid = pdf.createGrid({
 *          splitOnPage: true,
 *          columns: [
 *              { width: 30, border:{top:'1pt', bottom: '1pt', left:'1pt', right:'1pt', color: 'red' }, align: 'center', hAlign: 'center'},
 *              { width: 30, border: '1pt', borderColor: 'red', align: 'center', hAlign: 'center'},
 *              { width: 20, border: '1pt', borderColor: 'red', align: 'right', hAlign: 'bottom'},
 *              { width: 10, border: '1pt', borderColor: 'red', hAlign: 'bottom'}
 *          ]});
 *
 *          grid.addRow(['cellNum 1  rowSpan: 2, colSpan: 2 ',  'cellNum 2 colSpan: 2 '], [{rowSpan: 2, colSpan: 2},{ colSpan:2}]);
 *          grid.addRow(['cellNum 3',  'cellNum 4']);
 *          grid.addRow(['cellNum 5' , 'cellNum 6 colSpan: 2 ',  'cellNum 7'], [{},{colSpan: 2},{rowSpan: 2}]);
 *          grid.addRow(['cellNum 8' , 'cellNum 9', 'cellNum 10']);
 *
 *
 * @param {Array|Object} cellValues
 * Array of cell values. Non-string values converting to string via "" + value.
 * When type is object same as config param.
 *
 *        grid.addRow(['cellNum 3',  'cellNum 4'], {});
 *        // same as
 *        grid.addRow({ cellValues: ['cellNum 3',  'cellNum 4'], columnConfigs: {}});
 *
 * @param {Array} [columnConfigs] By default cells created with grid columns config. Here is possible to override default columns settings.
 *   You can use this any parameter of {@link PdfTextBox#constructor}
 * @param {Number} [columnConfigs.colSpan] If > 1 then grid merge horizontal cells. This parameter works like in HTML table.
 * @param {Number} [columnConfigs.rowSpan] If > 1 then grid merge vertical cells. This parameter works like in HTML table.
 * @param {Object} [config]
 * @param {Integer} [config.noWrite]
 * @param {Boolean} [config.noWrite]
 * @param {Boolean} [config.noChangePage] If true component does not change global Page context until write method called.
 * @param {Boolean} [config.splitOnPage=false]  break row when row out of page size.
 * @param {Integer} [config.pageNumber] By default currentPage or last row pageNumber
 * @param {Integer} [config.top] By default grid top position or last row bottom position
 * @param {Object} [config.rowMargin]
 * @param {Integer} [config.rowMargin.top]
 * @param {Integer} [config.rowMargin.bottom]
 * @param {*} [config.cellValues] ???
 * @param {*} [config.columnConfigs] ???
 * @param {Boolean} [config.isCloned]
 * @return {PdfDataGridRow}
 */
PdfDataGrid.prototype.addRow = function (cellValues, columnConfigs, config) {
  let me = this
  let rowConfig = {}
  let i, addThrow

  if (cellValues && !(Array.isArray(cellValues))) {
    config = cellValues
    cellValues = config.cellValues
    columnConfigs = config.columnConfigs
  }
  if (config && !config.isCloned) {
    rowConfig = _.cloneDeep(config)
  } else {
    rowConfig = config || {}
  }

  rowConfig.top = rowConfig.top || this.topNextRow
  rowConfig.pageNumber = rowConfig.pageNumber || this.lastPageNumber

  rowConfig.noWrite = rowConfig.noWrite !== undefined ? rowConfig.noWrite : me.initConfig.noWrite || false
  rowConfig.noChangePage = me.noChangePage || rowConfig.noChangePage || false
  rowConfig.splitOnPage = rowConfig.splitOnPage !== undefined ? rowConfig.splitOnPage : me.initConfig.splitOnPage || false
  rowConfig.top = rowConfig.top || this.topNextRow
  if (me.rowMargin) {
    rowConfig.rowMargin = rowConfig.rowMargin || {}
    pdfUtils.applyIf(rowConfig.rowMargin, me.rowMargin)
  }
  let customParams = null
  if (columnConfigs) {
    customParams = []
    for (i = 0; i < columnConfigs.length; i++) {
      if (columnConfigs[i]) {
        customParams.push(columnConfigs[i].customParams)
      }
    }
  }

  let row = new PdfDataGridRow(this, columnConfigs, cellValues, rowConfig)

  // put-through line when the line is out of page
  if (row.itemOutOfPage && me.topThroughRow.length > 0) {
    me.addThroughRow(row.lastPageNumber)
  }

  // put-through line when line is slitted
  let item
  for (i = 0; i < row.items.length; i++) {
    item = row.items[i]
    if (item) {
      break
    }
  }
  if (me.topThroughRow.length > 0 && item.splitItems) { // row.items[0].splitItems
    let splitItems = item.splitItems // row.items[0].splitItems;

    for (i = 0; i < splitItems.length; i++) {
      item = splitItems[i]
      me.addThroughRow(item.pageNumber)
    }
  }

  if (rowConfig.topThroughRow && !rowConfig.isTopThroughRow) {
    rowConfig.top = me.context.page.innerSize.topColon
    rowConfig.height = row.height
    rowConfig.noWrite = false
    rowConfig.isTopThroughRow = addThrow = true
    if (customParams) {
      for (i = 0; i < columnConfigs.length; i++) {
        columnConfigs[i].customParams = customParams[i]
      }
    }
    me.topThroughRow.push({ height: row.height, columnConfigs: columnConfigs, cellValues: cellValues, rowConfig: rowConfig })
    me.topThroughRowHeight += row.height
  }

  /**
   * true when exist cells stretched to next row. (Cells who has rowSpan more 1)
   * @property {boolean} existRowSpanCells
   */
  me.existRowSpanCells = false
  _.forEach(me.columns, function (column, index) {
    if (me.rowSpanCellsRemain[index] > 0) {
      me.rowSpanCellsRemain[index] -= 1
    }
    if (!me.rowSpanCellsRemain[index]) {
      me.rowSpanCells[index] = null
    }
    if (me.rowSpanCellsRemain[index] > 0) {
      me.existRowSpanCells = true
    }
  })

  _.forEach(row.items, function (cell) {
    if (cell && (cell.rowSpan > 1) && !me.rowSpanCells[cell.mapIndex]) {
      me.rowSpanCells[cell.mapIndex] = cell
      cell.rowSpanCell = true
      me.rowSpanCellsRemain[cell.mapIndex] = cell.rowSpan - 1
      me.existRowSpanCells = true
    }
  })

  ++me.rowNum
  if (me.collectRow) {
    me.rowList.push(row)
  }
  if (!rowConfig.isTopThroughRow || addThrow) {
    this.setTopNextRow(row.lastPageBottom, row.lastPageNumber)
    this.bottom = row.lastPageBottom
  }
  return row
}

    /**
     * Return top position of page
     * @returns {Number}
     */
PdfDataGrid.prototype.getPageTopPosition = function () {
  return this.context.page.innerSize.topColon + this.topThroughRowHeight || 0
}

/**
 * Move table to position. It works if only were set config options collectRow and noWrite.
 * @param {Number} position
 * @param {Number} pageNumber
 */
PdfDataGrid.prototype.setTop = function (position, pageNumber) {
  if (!this.collectRow) {
    throw new Error('Grid method moveTo require configuration parameter collectRow')
  }
  this.setTopNextRow(position, pageNumber)

  _.forEach(this.rowList, (row) => {
    row.setTop(this.topNextRow, this.lastPageNumber)
    this.setTopNextRow(row.lastPageBottom, row.lastPageNumber)
  })
}

/**
 * Write prepared data. It works if only were set config options collectRow and noWrite.
 */
PdfDataGrid.prototype.write = function () {
  if (!this.collectRow) {
    throw new Error('Grid method moveTo require configuration parameter collectRow')
  }
  _.forEach(this.rowList, function (row) {
    row.write()
  })
}

/**
 * Add through rows
 * @private
 * @param {Number} pageNumber
 */
PdfDataGrid.prototype.addThroughRow = function (pageNumber) {
  let topPosition = this.context.getInnerPageTopPos()

  if (this.topThroughRow.length === 0) {
    return
  }
  let rowSpanCellsRemain = this.rowSpanCellsRemain
  let rowSpanCells = this.rowSpanCells
  this.rowSpanCellsRemain = []
  this.rowSpanCells = []

  _.forEach(this.topThroughRow, (topThroughRow) => {
    topThroughRow.rowConfig.top = topPosition
    topThroughRow.rowConfig.pageNumber = pageNumber
    topThroughRow.rowConfig.topThroughRow = false

    let columnConfigs = []
    for (let i = 0; i < topThroughRow.columnConfigs.length; i++) {
      columnConfigs[i] = topThroughRow.columnConfigs[i].customParams
    }

    if (topThroughRow.rowConfig.onTopThroughRow) {
      topThroughRow.rowConfig.onTopThroughRow(topThroughRow)
    }
    let thRow = this.addRow(topThroughRow.cellValues,
      topThroughRow.columnConfigs,
      topThroughRow.rowConfig
    )

    if (columnConfigs.length > 0) {
      for (let i = 0; i < topThroughRow.columnConfigs.length; i++) {
        topThroughRow.columnConfigs[i].customParams = columnConfigs[i]
      }
    }

    topPosition = thRow.bottom
  })
  this.rowSpanCellsRemain = rowSpanCellsRemain
  this.rowSpanCells = rowSpanCells
}

/** Free resources */
PdfDataGrid.prototype.destroy = function () {
  this.context = null
  this.initConfig = null
  this.pdf = null
  this.columns = null

  if (this.isDestroyed) return

  if (this.collectRow) {
    _.forEach(this.rowList, function (row) {
      row.destroy()
    })
  }
  this.rowList = null
  this.rowSpanCells = null
  this.rowSpanCellsRemain = null
  this.isDestroyed = true
}

/**
 * @deprecated Use addRow instead of addRange
 */
PdfDataGrid.prototype.addRange = function () {
  throw new Error('Use PdfDataGrid.addRow instead of PdfDataGrid.addRange')
}

module.exports = PdfDataGrid
