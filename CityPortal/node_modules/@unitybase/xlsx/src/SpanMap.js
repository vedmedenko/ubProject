/*
* Created by xmax on 23.01.2018
*/

/**
 * Class used for accumulate table span map and calculate columns width
 */
class SpanMap {
  constructor (tableWidth) {
    this.spanRows = {}
    this.colWidth = []
    this.colWidthCalcSpan = []
    this.columnCount = null
    this.tableWidth = tableWidth || 90
    this.rowIndex = 1
  }

  /**
   * Initialize columns count by first row params
   * @param columnsConfig
   */
  initColumnCount (columnsConfig) {
    if (this.columnCount === null) {
      this.columnCount = 0
      columnsConfig.forEach(F => {
        this.columnCount++
        if (F.colSpan) {
          this.columnCount += F.colSpan - 1
        }
      })
    }
  }

  /**
   * Return column widths
   * @return {number[]}
   */
  getWidths () {
    let colWidth = this.colWidth.map(I => I)
    this.colWidthCalcSpan.forEach((v, i) => {
      if (!colWidth[i]) {
        colWidth[i] = v
      }
    })
    return colWidth
  }

  /**
   * row map
   * @param rowNum
   * @return {*|{}}
   */
  getRowMap (rowNum) {
    return this.spanRows[rowNum] || {}
  }

  /**
   * return next cell number that not in span group
   * @param {Number} cellNum
   * @param {Number} colSpan
   * @return {Number}
   */
  getNextCellNum (cellNum, colSpan) {
    if (!this.columnCount) {
      return cellNum + (colSpan || 1)
    }
    const spanRow = this.spanRows[this.rowIndex] || {}
    for (let i = cellNum + (colSpan || 1); i < this.columnCount; i++) {
      if (!spanRow[i]) return i
    }
    return this.columnCount // null
  }

  getCurrentCellNum (cellNum) {
    if (!this.columnCount) {
      return cellNum
    }
    const spanRow = this.spanRows[this.rowIndex] || {}
    for (let i = cellNum; i < this.columnCount; i++) {
      if (!spanRow[i]) return i
    }
    return this.columnCount // null
  }

  /**
   * Register row params in map
   * @param {Array} columnsConfig
   * @param {Number} columnsConfig[x].rowSpan
   * @param {Number} columnsConfig[x].colSpan
   * @param {Number} [columnsConfig[x].width] optional
   * @param {Number} [columnsConfig[x].widthPercent] optional
   */
  addRow (columnsConfig) {
    if (this.columnCount === null) {
      this.initColumnCount(columnsConfig)
    }
    // throw new Error('You must call method initColumnCount before')
    if (columnsConfig.length > this.columnCount) throw new Error(`To many columns in row config. Max=${this.columnCount} Current=${columnsConfig.length}`)
    let rowNum = this.rowIndex
    // colNum, width, rowSpan, colSpan
    let spanRow = this.spanRows[rowNum]
    if (!spanRow) this.spanRows[rowNum] = spanRow = {}
    let configNum = 0
    for (let colNum = 0; colNum < this.columnCount; colNum++) {
      if (spanRow[colNum]) {
        continue
      }
      let config = columnsConfig[configNum]
      if (config.rowSpan && config.rowSpan > 1) {
        for (let rw = rowNum + 1; rw < rowNum + config.rowSpan; rw++) {
          let rowForSpan = this.spanRows[rw]
          if (!rowForSpan) this.spanRows[rw] = rowForSpan = {}
          for (let colSp = colNum; colSp <= colNum + (config.colSpan || 1) - 1; colSp++) {
            rowForSpan[colSp] = true
          }
        }
      }
      if (config.colSpan || config.colSpan > 1) {
        for (let i = colNum; i < colNum + config.colSpan; i++) {
          spanRow[i] = true
        }
      }
      if (((typeof config.width === 'number') || (typeof config.widthPercent === 'number'))) {
        let width = config.width
        if (typeof config.widthPercent === 'number') {
          width = this.tableWidth * config.widthPercent / 100
        }
        if (width) {
          if (config.colSpan) {
            width = width / config.colSpan
            for (let colSp = colNum; colSp < colNum + config.colSpan; colSp++) {
              this.colWidthCalcSpan[colSp] = width
            }
          } else {
            this.colWidth[colNum] = width
          }
        }
      }
      configNum++
    }
    this.spanRows[rowNum] = undefined
    this.rowIndex++
  }
}

module.exports = {
  SpanMap
}
