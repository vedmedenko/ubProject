const _ = require('lodash')
const pdfUtils = require('./pdfUtils')
const PdfTextBox = require('./PdfTextBox')

/**
 * Normally you do not use this class.
 * @param {PdfDataGrid} grid
 * @param {Array} [columnConfigs] By default cells created with grid columns config. Here is possible to override default columns settings
 * @param {Array} cellValues Array of cell values. non-string values converting to string via "" + value.
 * @param {Object} [config]
 * @param {Boolean} [config.noWrite]
 * @param {Boolean} [config.noChangePage] when true component does not change global Page context until write method called.
 * @param {Boolean} [config.splitOnPage]  break row when it exceed page area. Default false.
 * @param {Integer} [config.pageNumber] default currentPage
 * @param {Integer} [config.topThroughRow]  ????
 * @param {Integer} [config.top] ???
 * Space before and after row
 * @param {Object} [config.rowMargin]
 *  Ignored for first row in grid and first row in page
 * @param {Integer} [config.rowMargin.top]
 *  Ignored for first row in grid and first row in page
 * @param {Integer} [config.rowMargin.bottom]
 * @param {Boolean} [config.drawBorderOnSplit=false]
 */
function PdfDataGridRow (grid, columnConfigs, cellValues, config) {
  let me = this
  let tBoxesCfg

  function mergeCol (cto, cfrom) {
    _.assign(cto, cfrom)
  }

  this.externalCells = []
  this.externalCellsToWrite = []

  if (!grid) throw new Error('PdfDataGridRow - No grid in config')

  if (!config) {
    config = {}
  }

  me.externalCells = []
  me.externalCellsToWrite = []

  me.grid = grid
  me.splitOnPage = config.splitOnPage || false
  me.noChangePage = config.noChangePage || me.grid.noChangePage
  if (me.noChangePage) {
    me.splitOnPage = false
  }

  let context = me.context = me.grid.context

  me.pdf = grid.pdf
  me.noWrite = config.noWrite || false

  pdfUtils.checkNumberValid(config.pageNumber, false, 'PDF.csPdfDataGridRow: Invalid config parameter pageNumber ')
  if (config.pageNumber || config.pageNumber === 0) {
    me.pageNumber = config.pageNumber
  } else {
    me.pageNumber = me.context.getPageNumber()
  }
  me.lastPageNumber = me.pageNumber

  if (columnConfigs && !columnConfigs.isCloned) {
    let customParams = []
    for (let colNum = 0; colNum < columnConfigs.length; colNum++) {
      customParams.push(columnConfigs[colNum].customParams)
      columnConfigs[colNum].customParams = null
    }
    if (!config.isCloned) {
      columnConfigs = _.cloneDeep(columnConfigs)
    }
    for (let colNum = 0; colNum < customParams.length; colNum++) {
      columnConfigs[colNum].customParams = customParams[colNum]
    }
  }
  if (grid.columns.length) {
    tBoxesCfg = []
    grid.columns.forEach(function (column) {
      tBoxesCfg.push(_.cloneDeep(column))
    })
  } else {
    tBoxesCfg = columnConfigs || []
  }
  let colSpan = 0
  let cfgNum = 0
  let values = []
  for (let colNum = 0; colNum < tBoxesCfg.length; colNum++) {
    values[colNum] = null
    if (grid.rowSpanCells[colNum]) {
      me.externalCells[colNum] = grid.rowSpanCells[colNum]
      me.externalCellsToWrite[colNum] = grid.rowSpanCellsRemain[colNum] === 1 ? 1 : 0
      tBoxesCfg[colNum] = {width: 0, isDummy: true} // hidden textBox
      colSpan = (grid.rowSpanCells[colNum].colSpan || 1) - 1
      continue
    }
    if (colSpan > 0) {
      tBoxesCfg[colNum] = {width: 0, isDummy: true} // hidden textBox
      colSpan--
      continue
    }
    if (cellValues) {
      values[colNum] = cellValues[cfgNum]
    }
    if (columnConfigs) {
      let cfgCol = columnConfigs[cfgNum]
      if (!cfgCol) {
        throw new Error(['Invalid parameter columnConfigs. Not exist config with index =',
          cfgNum, '. If parameter columnConfigs is not empty you must specify all column.'].join(''))
      }
      mergeCol(tBoxesCfg[colNum], cfgCol)
      cfgCol = tBoxesCfg[colNum]
      if (cfgCol.colSpan > 1) {
        if (colNum + cfgCol.colSpan > tBoxesCfg.length) {
          throw new Error('Colspan exceeds the number of columns. \r\n' + (cellValues ? JSON.stringify(cellValues) : ''))
        }
        for (let i = colNum + 1; i < colNum + cfgCol.colSpan; i++) {
          cfgCol.width += tBoxesCfg[i].width
        }
        colSpan = cfgCol.colSpan - 1
      }
      cfgCol.mapIndex = colNum
    }
    cfgNum++
  }
  me.rowMargin = config.rowMargin
  me.top = me.grid.topNextRow
  if (config.top >= 0 && _.isNumber(config.top)) {
    me.top = config.top
  }
  if (me.rowMargin && me.rowMargin.top && (me.grid.rowNum > 0)) {
    me.top = me.top + me.rowMargin.top
  }

  _.forEach(values, function (value, idx) {
    tBoxesCfg[idx].text = (typeof value === 'undefined') ? '' : (value || '')
  })

  let items = []
  let tbLeft = grid.left
  let lastTextBox = null
  let inVerticalSpan = false
  _.forEach(tBoxesCfg, function (cfg, index) {
    cfg.context = context
    cfg.isCloned = true
    cfg.left = cfg.left || tbLeft
    cfg.top = me.top
    if (me.grid.topThroughRowHeight > 0) {
      cfg.reserveTopHeight = me.grid.topThroughRowHeight
    }
    if (!cfg.hasOwnProperty('drawBorderOnSplit')) {
      if (config.hasOwnProperty('drawBorderOnSplit')) {
        cfg.drawBorderOnSplit = config.drawBorderOnSplit
      } else {
        cfg.drawBorderOnSplit = me.grid.drawBorderOnSplit
      }
    }
    cfg.pageNumber = me.pageNumber
    cfg.wordWrap = cfg.wordWrap === true || cfg.wordWrap === false ? cfg.wordWrap : true
    cfg.splitOnPage = (cfg.splitOnPage !== null && cfg.splitOnPage !== undefined
        ? cfg.splitOnPage
        : me.splitOnPage) === true
    if (me.noChangePage) {
      cfg.splitOnPage = false
    }
    // cfg.splitOnPage = me.splitOnPage && !cfg.disallowSplit;
    cfg.autoWrite = false
    if (cfg.width === 0) {
      items.push(null)
      lastTextBox = null
    } else {
      lastTextBox = new PdfTextBox(cfg)
      if (config.topThroughRow) {
        lastTextBox.topThroughRow = true
      }
      items.push(lastTextBox)
    }
    // MPV smart check of horizontal & vertical cells split
    // tbLeft = lastTextBox ? lastTextBox.right : tbLeft + grid.columns[index].width;
    if (lastTextBox) {
      tbLeft = lastTextBox.right
      inVerticalSpan = false
    } else { // last text box is "virtual"
      if (inVerticalSpan || grid.rowSpanCells[index]) { // this is part of vertical cell split
        tbLeft = tbLeft + grid.columns[index].width
        inVerticalSpan = true
      }
      // else - do not move left position in case of horizontal cells split - it already calculated
    }
  })

  me.items = items
  me.alignRow()

  if (me.rowMargin && me.rowMargin.bottom) {
    me.lastPageBottom = me.lastPageBottom + me.rowMargin.bottom
    if (me.lastPageBottom > context.page.innerSize.bottomColon && !me.noChangePage) {
      me.lastPageBottom = context.page.innerSize.bottomColon
    }
  }

  if (!me.noWrite) {
    me.write()
  }
}
    /**
     * free resources
     */
PdfDataGridRow.prototype.destroy = function () {
  this.grid = null
  this.context = null
  this.pdf = null

  if (this.isDestroyed) return

  _.forEach(this.items, function (tb) {
    if (tb) {
      tb.destroy()
    }
  })
  this.items = null

  this.isDestroyed = true
}

    /**
     * @private
     */
PdfDataGridRow.prototype.alignRow = function () {
  let me = this
  let itemCount = 0
  let largestItems = []
  let largestItemsTb, extCelMaxDelta, tbHeight, liHeight
  let lastBottom = 0
  let itemOutOfPage = false

  me.height = 0
  me.lastPageNumber = me.pageNumber
  // check out of page
  _.forEach(me.items, function (tb) {
    if (tb && !tb.splitItems) {
      if ((tb.top + tb.height) > me.grid.context.getInnerPageBottomPos()) {
        if (!me.noChangePage) {
          itemOutOfPage = true
          me.pageNumber = me.pageNumber + 1
          me.context.requirePage(me.pageNumber)
          me.lastPageNumber = me.pageNumber
          me.top = me.grid.getPageTopPosition()
          return false
        } else {
          me.outOfPage = true
        }
      }
    }
  })
  me.itemOutOfPage = itemOutOfPage

  // synchronize height and detail item
  _.forEach(me.items, function (tb) {
    if (!tb) {
      return
    }
    if (itemOutOfPage) {
      tb.setTop(me.top, me.pageNumber)
    }   // rowSpanCell
    if (tb.rowSpan && tb.rowSpan > 1) {
      return
    }
    if (tb.rowSpanCell) {
      return
    }
    tbHeight = (tb.fullHeight || 0) > (tb.height || 0) ? tb.fullHeight : tb.height
    me.height = tbHeight > me.height ? tbHeight : me.height
    if (tb.splitItems) {
      // учеcть что последняя деталь при равном количестве может быть больше у другой детали
      if (largestItems && (tb.splitItems.length === itemCount) &&
        (largestItems[itemCount - 1].height < tb.splitItems[itemCount - 1].height)
      ) {
        largestItems = tb.splitItems
        largestItemsTb = tb
      }
      if (tb.splitItems.length > itemCount) {
        itemCount = tb.splitItems.length
        largestItems = tb.splitItems
        largestItemsTb = tb
      }
    }
  })

  liHeight = 0
  if (largestItems && largestItems.length > 0) {
    let detailItem = largestItems[largestItems.length - 1]
    me.lastPageNumber = detailItem.pageNumber
    _.forEach(largestItems, function (tb) {
      liHeight += tb.height
    })
  }

  // check external (merged) cells are largest then normal cell
  extCelMaxDelta = 0
  _.forEach(me.items, function (tb, index) {
    if (!tb) {
      let spanCell = me.externalCells[index]
      if (spanCell && me.externalCellsToWrite[index] === 1) {
        tbHeight = spanCell.height
        _.forEach(spanCell.splitItems, function (item) {
          tbHeight += item.height
        })
        if (tbHeight > spanCell.spanHeight + me.height + liHeight) {
          tbHeight = tbHeight - (spanCell.spanHeight + me.height + liHeight)
          extCelMaxDelta = tbHeight > extCelMaxDelta ? tbHeight : extCelMaxDelta
        }
      }
    }
  })
  if (extCelMaxDelta > 0) {
    if (largestItemsTb) {
      largestItemsTb.setHeight(me.height + liHeight + extCelMaxDelta)
    } else {
      me.height += extCelMaxDelta
    }
  }

  /**
   * Array of detail info about
   * @type {Array}
   */
  me.itemsInfo = []

  _.forEach(me.items, function (tb, index) {
    if (!tb) {
      me.itemsInfo.push(null)
      let spanCell = me.externalCells[index]
      if (spanCell) {
        if (me.splitOnPage && !spanCell.splitOnPage) {
          spanCell.splitOnPage = true
        }

        spanCell.spanHeight += me.height
        _.forEach(largestItems, function (item) {
          spanCell.spanHeight += item.height
        })
        if (me.externalCellsToWrite[index] === 1) {
          spanCell.setHeight(spanCell.spanHeight, true)
        }
      }
      return
    }
    let itemInfo = { baseHeight: tb.height }
    if (tb.rowSpan > 1) {
      tb.spanHeight = me.height
      _.forEach(largestItems, function (item) {
        tb.spanHeight += item.height
      })
      return
    }
    tb.setHeight(me.height) // only increase

    // align detail items by largest textBox. Start when splitOnPage === true
    _.forEach(largestItems, function (item, index) {
      if (!tb.splitItems) {
        tb.splitItems = []
      }
      let detailItem
      if (tb.splitItems.length > index) {
        detailItem = tb.splitItems[index]
        detailItem.pageNumber = item.pageNumber
        if (detailItem.top !== item.top) {
          detailItem.setTop(item.top, detailItem.pageNumber)
        }
        detailItem.setHeight(item.height)
      } else {
        detailItem = tb.getConfig()
        detailItem.pageNumber = item.pageNumber
        detailItem.top = item.top
        detailItem.height = item.height
        detailItem.splitOnPage = null
        detailItem.autoWrite = false
        detailItem.textXml = null
        detailItem.text = ''
        detailItem.onWriteCallBack = null
        detailItem = new PdfTextBox(detailItem)

        tb.splitItems.push(detailItem)
      }
      if (me.lastPageNumber === item.pageNumber) {
        lastBottom = lastBottom < detailItem.bottom ? detailItem.bottom : lastBottom
      }
    })
    me.itemsInfo.push(itemInfo)
  })

  me.bottom = me.top + me.height
  me.lastPageBottom = me.bottom
  if (lastBottom > 0) {
    me.lastPageBottom = lastBottom
  }
}

/**
 *
 * @param {Integer} newPosition
 * @param {Integer} pageNumber
 */
PdfDataGridRow.prototype.setTop = function (newPosition, pageNumber) {
  pdfUtils.checkNumberValid(newPosition, true, 'PDF.csPdfDataGridRow.setTop: Invalid value for parameter newPosition ')
  if (this.top === newPosition && (this.pageNumber === (pageNumber || this.pageNumber))) {
    return
  }
  this.top = newPosition
  this.pageNumber = pageNumber
  _.forEach(this.items, function (tb) {
    if (tb) {
      tb.setTop(newPosition, pageNumber)
    }
  })
  this.alignRow()
}

    /**
     * write row
     */
PdfDataGridRow.prototype.write = function () {
  for (let i = 0; i < this.grid.columns.length; i++) {
    if (this.externalCellsToWrite[i]) {
      this.externalCells[i].write()
    }
  }
  _.forEach(this.items, function (tb) {
    if (tb && (tb.rowSpan || 0) < 2) {
      tb.write()
    }
  })
}

module.exports = PdfDataGridRow
