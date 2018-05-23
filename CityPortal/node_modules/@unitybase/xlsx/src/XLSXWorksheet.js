/**
 * Created by xmax on 16.11.2017.
 */
const tools = require('./tools')
const ReachText = require('./ReachText')

/**
 * Class XLSXWorksheet
 */
class XLSXWorksheet {
  /**
   * @constructor
   * @param {Object} config
   * @param {String} [config.title=Worksheet]
   * @param {String} [config.name=Sheet] max length 30 symbols
   * @param {String} [config.orientation=portrait]
   * @param {Number} [config.worksheetScale] Scale of worksheet when printing
   * @param {Boolean} [config.fixFirstColumn] Fix for unfilling first column
   * @param {Object} [config.margins] all values are expressed in millimeters
   * @param {Number} [config.margins.left]
   * @param {Number} [config.margins.top]
   * @param {Number} [config.margins.right]
   * @param {Number} [config.margins.bottom]
   * @param {Number} [config.margins.header]
   * @param {Number} [config.margins.footer]
   * @param workBook
   */
  constructor (config, workBook) {
    config = config || {}
    this.workBook = workBook
    this.dataRows = []
    this.nextRowNum = 1
    this.columnProperies = ''
    this.defStyles = []
    this.merge = []
    /**
     * Worksheet orientation
     */
    this.orientation = 'portrait'
    /**
     * Scale of worksheet when printing
     */
    this.worksheetScale = null

    /**
     * @deprecated
     * Fix for unfilling first column
     */
    this.fixFirstColumn = false
    this.diapason = {
      minRowNum: 0, minColNum: 0, maxRowNum: 0, maxColNum: 0
    }

    config = Object.assign({
      title: 'Worksheet', name: 'Sheet', setActive: false, table: null, id: 1
    }, config)

    // todo check config
    Object.assign(this, config)

    this.margins = this.margins || {}

    if (this.name && this.name.length > 30) {
      this.name = this.name.substring(0, 30)
    }
    // Ext.ux.exporter.excelFormatter.Worksheet.superclass.constructor.apply(this, arguments);
  }

  /**
   * @private
   * @param context
   */
  render (context) {
    let me = this
    let d = this.diapason
    let result = ''

    d.minColNum = d.minColNum === 0 ? 1 : d.minColNum
    d.maxColNum = d.maxColNum === 0 ? 1 : d.maxColNum
    d.minRowNum = d.minRowNum === 0 ? 1 : d.minRowNum
    d.maxRowNum = d.maxRowNum === 0 ? 1 : d.maxRowNum

    result += '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">' +
      '<dimension ref="' + tools.numAlpha(d.minColNum - (this.fixFirstColumn ? 1 : 0)) + d.minRowNum.toString() +
      ':' + tools.numAlpha(d.maxColNum - (this.fixFirstColumn ? 1 : 0)) + d.maxRowNum.toString() + '"/><sheetViews><sheetView ' + (this.setActive ? 'tabSelected="1" ' : '') +
      ' workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15" />'

    result += this.columnProperies + '<sheetData>'

    result += this.dataRows.join('')
    result += '</sheetData>'

    if (this.merge.length > 0) {
      result += '<mergeCells count="' + this.merge.length.toString() + '">' +
        this.merge.join('') + '</mergeCells>'
    }

    // Отступы согласно https://enviance.softline.kiev.ua/confluence/pages/viewpage.action?pageId=70123712
    // 1 дюйм = 25.4 мм
    let mm = 25.4
    let margins = {
      left: 20,
      top: 10,
      right: 8,
      bottom: 8,
      header: 0,
      footer: 0
    }

    margins = Object.assign(me.margins, margins)
    margins.left = (margins.left || 0) / mm
    margins.top = (margins.top || 0) / mm
    margins.right = (margins.right || 0) / mm
    margins.bottom = (margins.bottom || 0) / mm
    margins.header = (margins.header || 0) / mm
    margins.footer = (margins.footer || 0) / mm

    result += '<pageMargins left="' + margins.left +
      '" right="' + margins.right +
      '" top="' + margins.top +
      '" bottom="' + margins.bottom +
      '" header="' + margins.header +
      '" footer="' + margins.footer + '" />'
    if (this.table) {
      result += '<tableParts count="1"><tablePart r:id="rId1"/></tableParts>'
    }

    // worksheet properties
    result += '<pageSetup paperSize="9" '

    // page fitting
    if (this.worksheetScale !== null) {
      result += 'scale="' + this.worksheetScale + '" '
    }
    // adds worksheet orientation
    if (this.orientation !== null) {
      result += 'orientation="' + this.orientation + '" '
    }
    // worksheet page dpi
    result += 'horizontalDpi="200" verticalDpi="200" />'

    result += '</worksheet>'
    context.xlWorksheets.file('sheet' + this.id + '.xml', result)

    /* todo : using table
     */
    /*
         if (this.table) {
         i = -1;
         l = data[0].length;
         t = st.numAlpha(data[0].length - 1) + data.length;
         result = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="' + id
         + '" name="Table' + id + '" displayName="Table' + id + '" ref="A1:' + t + '" totalsRowShown="0"><autoFilter ref="A1:' + t + '"/><tableColumns count="' + data[0].length + '">';
         while (++i < l) { result += '<tableColumn id="' + (i + 1) + '" name="' + data[0][i] + '"/>'; }
         result += '</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>';

         context.xl.folder('tables').file('table' + this.id + '.xml', result);
         context.xlWorksheets.folder('_rels').file('sheet' + this.id + '.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table' + id + '.xml"/></Relationships>');
         contentTypes[1].unshift('<Override PartName="/xl/tables/table' + id + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>');
         }
     */

    context.contentTypes.unshift('<Override PartName="/xl/worksheets/sheet' + this.id + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
    context.props.unshift(tools.escapeXML(this.name) || 'Sheet' + this.id)
    context.xlRels.unshift('<Relationship Id="rId' + this.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + this.id + '.xml"/>')
    context.worksheets.unshift('<sheet name="' + (tools.escapeXML(this.name) || 'Sheet' + this.id) + '" tabId="' + this.id + '" sheetId="' + this.id + '" r:id="rId' + this.id + '"/>')
  }

  /**
   * Return current row number. First row index is 1.
   * @return {Number}
   */
  getRowNum () {
    return this.nextRowNum
  }

  /**
   * Set position of current row. Current row number can only increase. 1,2,3,25,26 ....
   * First row index is 1.
   * @param rowNum
   * @return {Number}
   */
  setRowNum (rowNum) {
    XLSXWorksheet.checkRowNum(rowNum)
    if (rowNum > this.nextRowNum) {
      this.nextRowNum = rowNum
    }
    return this.nextRowNum
  }

  /*
   * Old description:
   * @param {Object} config.value type of Object must be in (string, boolean, date)
   * @param {string} config.formula
   * @param {Number} config.style style index for get call  WorkBook.style.add(config)
   * @param {Number} config.column column num
   */

  /**
   * Add next row to Worksheet.
   * _**Current row number can only increase!**_
   * For change the current row number, use {@link XLSX.csWorksheet#setRowNum}
   *
   * @param [{Object|*}] config Array of cell config {Object} If item type is not object it convert to yourValue >> {value: yourValue}
   * @param {Object} cell.value type of Object must be (number, string, boolean, date)
   * @param {string} [cell.formula]
   * @param {Number|XLSXStyle|Object} [cell.style]  Style index for get call  WorkBook.style.add(congig)
   * @param {Number} [cell.column] Column number First column 0
   * @param {Object} [cell.cellStyle]
   * @param {Number} [cell.cellStyle.colSpan]
   * @param {Number} [cell.cellStyle.rowSpan]
   * @param {Array} [template] (optional) Template for apply to config. Array of {Cell}. Use this parameters for apply styles.
   * @param {Object} [rowConfig] (optional)
   * @param {Object} [rowConfig.height] (optional)
   * @return {Number}
   */
  addRow (config, template, rowConfig) {
    let type
    let valAsTagIs = false
    let useSharedString = this.workBook.useSharedString

    if (!config) throw new Error('XLSXWorksheet.addRow empty config')
    config = Array.isArray(config) ? config : [config]
    if (template && !Array.isArray(template)) {
      template = [template] // undefined;
    }

    if (template && Array.isArray(template) && template[0] !== undefined && template[0].width !== undefined) {
      if (this.numberColumnsWidth !== undefined) {
        if (template.length > this.numberColumnsWidth) {
          this.numberColumnsWidth = template.length
          this.setColsProperties(template)
        }
      } else {
        this.numberColumnsWidth = template.length
        this.setColsProperties(template)
      }
    }

    rowConfig = rowConfig || {}
    rowConfig.columnsSpan = rowConfig.columnsSpan || 1

    XLSXWorksheet.checkRowNum(this.nextRowNum)

    // Будем считать кол-во строк
    if (!this.rowsCount) {
      this.rowsCount = 1
    } else {
      this.rowsCount++
    }

    this.dataRows.push('<row r="' + this.nextRowNum.toString() + '" ')
    if (rowConfig.height) {
      this.dataRows.push('ht="' + rowConfig.height.toString() + '" customHeight="1" ')
    }

    this.dataRows.push('> ') // + '" x14ac:dyDescent="0.25">';

    // let cellCount = 0
    const hasTemplate = typeof template !== 'undefined' && Array.isArray(template) &&
      template.length === config.length
    const hasCellTemplate = (typeof rowConfig.cellTemplate !== 'undefined' && Array.isArray(rowConfig.cellTemplate) &&
      rowConfig.cellTemplate.length === config.length)
    const existCell = {}
    config.forEach((cd) => {
      existCell[cd.column] = true
    })
    // write def
    let defR = this.defStyles[this.nextRowNum]
    let lastColCheckDef = 0

    config.forEach((cell, index) => {
      // cellCount++
      type = undefined
      valAsTagIs = false
      let cellType = typeof cell
      if (cellType !== 'object' || (cell instanceof Date)) {
        cell = {value: cell}
      }
      if (hasTemplate && typeof template[index] === 'object') {
        cell = Object.assign(cell, template[index])
      }
      if (hasCellTemplate && typeof rowConfig.cellTemplate[index] === 'object') {
        cell = Object.assign(cell, rowConfig.cellTemplate[index])
      }
      if (defR) { // write def styles before
        for (let i = lastColCheckDef; i < cell.column; i++) {
          if (defR[i]) {
            this.dataRows.push(
              '<c r="' + tools.numAlpha(i) + this.nextRowNum.toString() + '"' +
              (' s="' + tools.extractId(defR[i]) + '"') + ' />'
            )
          }
        }
        lastColCheckDef = cell.column
      }

      XLSXWorksheet.checkColNum(cell.column)
      const valueType = typeof cell.value
      if (cell.value && (valueType === 'string' || cell.value instanceof ReachText)) {
        // Ext.String.htmlEncode
        if (useSharedString) {
          cell.value = this.workBook.addString(cell.value)
          type = 's'
        } else {
          if (cell.value && (cell.value instanceof ReachText)) {
            cell.value = cell.value.getXML()
          } else {
            if ((typeof cell.value !== 'undefined') && (cell.value !== null)) {
              cell.value = `<t>${tools.escapeXML(cell.value)}</t>`
            }
          }
          valAsTagIs = true
          type = 'inlineStr'
        }
      } else if (valueType === 'boolean') {
        cell.value = (cell.value ? 1 : 0)
        type = 'b'
      } else if (cell.value && cell.value instanceof Date) {
        cell.value = tools.convertDate(cell.value)
        if (!cell.style) {
          cell.style = this.workBook.style.getDefDateStyle()
        }
      } else if (valueType === 'number') {
        type = 'n'
      }
      /* not implemented
          type = 'str' - cell contain formula
          'e' - error
       */
      if (this.diapason.minColNum === 0) {
        this.diapason.minColNum = cell.column
      }
      if (this.diapason.maxColNum < cell.column) {
        this.diapason.maxColNum = cell.column
      }
      this.dataRows.push(
        '<c r="' + tools.numAlpha(cell.column - (this.fixFirstColumn ? 1 : 0)) + this.nextRowNum.toString() + '"' +
        (cell.style ? ' s="' + tools.extractId(cell.style) + '"' : '') +
        (type ? ' t="' + type + '"' : '') +
        '>' +
        (cell.formula ? '<f>' + cell.formula + '</f>' : '') +
        ((valueType !== 'undefined') && (cell.value !== null)
          ? (valAsTagIs ? `<is>${cell.value}</is>` : `<v>${cell.value}</v>`) : '') +
        '</c>'
      )

      // remove used
      if (this.defStyles[this.nextRowNum]) {
        this.defStyles[this.nextRowNum][cell.column] = null
      }

      if (cell.cellStyle) {
        if (cell.cellStyle.rowSpan > 1 || cell.cellStyle.colSpan > 1) {
          this.addMerge({
            colFrom: cell.column,
            rowFrom: this.nextRowNum,
            colTo: cell.column + (cell.cellStyle.colSpan || 1) - 1,
            rowTo: this.nextRowNum + (cell.cellStyle.rowSpan || 1) - 1
          })
        }
        if (cell.cellStyle.colSpan > 1 && cell.style && cell.style.config.border && cell.style.config.border.id > 0) {
          // this.workBook.style.getStyle({border})
          let cEnd = cell.column + cell.cellStyle.colSpan - 1
          for (let i = cell.column + 1; i <= cEnd; i++) {
            if (!existCell[i]) {
              this.dataRows.push(
                '<c r="' + tools.numAlpha(i) + this.nextRowNum.toString() + '"' +
                (' s="' + tools.extractId(cell.style) + '"') + ' />'
              )
            }
          }
        }
        if (cell.cellStyle.rowSpan > 1 && cell.style && cell.style.config.border && cell.style.config.border.id > 0) {
          // remember style for down rows
          let rwEnd = this.nextRowNum + cell.cellStyle.rowSpan - 1
          let cEnd = cell.cellStyle.colSpan > 1 ? cell.column + cell.cellStyle.colSpan - 1 : cell.column
          for (let ri = this.nextRowNum + 1; ri <= rwEnd; ri++) {
            let rwCtx = this.defStyles[ri] = this.defStyles[ri] || []
            for (let ci = cell.column; ci <= cEnd; ci++) {
              rwCtx[ci] = cell.style
            }
          }
        }
      }
    })
    // write def style fin
    if (defR) {
      defR.forEach((item, index) => {
        if (!item || (index <= lastColCheckDef)) return
        this.dataRows.push(
          '<c r="' + tools.numAlpha(index) + this.nextRowNum.toString() + '"' +
          (' s="' + tools.extractId(item) + '"') + ' />'
        )
      })
      this.defStyles[this.nextRowNum] = null
    }

    if (this.diapason.minRowNum === 0) {
      this.diapason.minRowNum = this.nextRowNum
    }
    this.diapason.maxRowNum = this.nextRowNum

    this.dataRows.push('</row>')
    let res = this.nextRowNum
    this.nextRowNum++
    return res
  }

  /**
   * setup column properties
   * @param {Object} config array [{column: 1, width: 200},{colnum: 2, width: 20}]
   */
  setColsProperties (config) {
    let res = []
    // this.columnProperties
    res.push('<cols>')
    config = config.sort(f => f.column)
    config.forEach((column) => {
      if (typeof column.column !== 'number' || typeof column.width !== 'number') {
        throw new Error('Invalid parameters for XLSXWorksheet.setColsProperties')
      }
      let col = XLSXWorksheet.checkColNum(column.column) + 1
      res.push(`<col min="${col}" max="${col}" width="${column.width}" customWidth="1"/>`)
    })
    res.push('</cols>')
    this.columnProperies = res.join('')
  }

  /**
   * check value is number and in diapason 1 .. 65535
   * @param {Object} value must be number
   * @return {Number}
   */
  static checkRowNum (value) {
    if (Number.isInteger(value) && (value >= 0) && (value < 1048576)) {
      return value
    }
    throw new Error('Value is not row number')
  }

  /**
   * check value is number and in diapason 1 .. 256
   * @param value
   * @return {*}
   */
  static checkColNum (value) {
    if (Number.isInteger(value) && (value >= 0) && (value < 16384)) {
      return value
    }
    throw new Error('Value is not column number')
  }

  /**
   *  add Merge for cells
   *  @param {Object|[colFrom, colTo, rowFrom, rowTo]} config
   *  @param {Number} config.colFrom
   *  @param {Number} [config.rowFrom=current]
   *  @param {Number} config.colTo
   *  @param {Number} [config.rowTo=current]
   */
  addMerge (config) {
    if (Array.isArray(config)) {
      config = {
        colFrom: config[0],
        colTo: config[1],
        rowFrom: config[2],
        rowTo: config[3]
      }
    }
    config = config || {}
    config.colFrom = XLSXWorksheet.checkColNum(config.colFrom)
    config.rowFrom = XLSXWorksheet.checkRowNum(config.rowFrom || this.nextRowNum)
    config.colTo = XLSXWorksheet.checkColNum(config.colTo)
    config.rowTo = XLSXWorksheet.checkRowNum(config.rowTo || this.nextRowNum)

    this.merge.push('<mergeCell ref="' + tools.numAlpha(config.colFrom - (this.fixFirstColumn ? 1 : 0)) + config.rowFrom +
      ':' + tools.numAlpha(config.colTo - (this.fixFirstColumn ? 1 : 0)) + config.rowTo + '"/>')
    /*
     <mergeCells count="3">
     <mergeCell ref="A1:A3"/>
     <mergeCell ref="A4:B5"/>
     <mergeCell ref="A6:B6"/>
     </mergeCells>
 */
  }

  /**
   * Sets worksheet orientation
   * @param {string} orientation (portrait || landscape)
   */
  setOrientation (orientation) {
    this.orientation = orientation
  }

  /**
   *
   * @param {Int} scale
   */
  setWorksheetScale (scale) {
    this.worksheetScale = scale
  }

  /**
   * @deprecated
   * Setting up for fix first column
   */
  setFixForFirstColumn () {
    this.fixFirstColumn = false
  }
}

module.exports = XLSXWorksheet
