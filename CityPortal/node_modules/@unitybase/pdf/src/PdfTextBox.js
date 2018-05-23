const _ = require('lodash')
const pdfUtils = require('./pdfUtils')

/**
 * Output to pdf sheet text and border over it.
 * @param {Object} config
 * @param {PrintToPdf} config.context
 * @param {String} [config.text] (optional)
 * @param {Integer} [config.left] (optional) default 0
 * @param {Integer} [config.top] (optional) default 0
 * @param {Integer} [config.bottom] (optional) default 0
 * @param {Integer} [config.right] (optional) default 0
 * @param {Integer} [config.width] (optional) default 0 limit textBox width when more than 0
 * @param {Integer} [config.height] (optional) default 0 limit textBox height when more than 0
 * @param {Integer} [config.minHeight] (optional) default 0 is taken as the height when calculated height less then it
 * @param {String} [config.align] (optional) default 'left'.
 * Horizontal align. Possible values: left, center, right, justify
 * @param {String} [config.hAlign] (optional) default 'top'.
 * Vertical align: top bottom. You can use synonym "verticalAlign". Possible values: top, center, bottom.
 * @param {Boolean} [config.autoWrite] (optional) default true
 * @param {Object} [config.font] (optional) default context.font
 * @param {String} [config.font.name] Font name
 * @param {String} [config.font.type] Font type
 * @param {Number} [config.font.size] Font size
 * @param {Number} [config.font.color] The color in html format. Example 'red', '#ffaa11'
 * @param {Integer} [config.lineHeight] (optional) default context.lineHeight.
 * @param {Integer} [config.pageNumber] (optional) default context.pageNumber. start from 1
 * @param {Boolean} [config.wordWrap] (optional) default true. Require width > 0
 * @param {Object|string} [config.border] (optional)
 * You can set in string notation '1px 2px 1px 1px'. For detail see {@link PrintToPdf.parseBorder}
 * Or you can set in object notation {left: 1, top: 1, bottom: 1px, right: 1, color: 'red' }
 * @param {String} [config.backgroundColor]
 * @param {String|{r: number, g: number, b: number}|[r,g,b]} [config.borderColor]
 * When config is string it is HTML color. For example '#ffffff' or 'black'.
 * @param {Object|string} [config.margin] (optional)  Like {@link #border}
 * @param {Object|string} [config.padding] (optional)  Like {@link #border}
 * @param {Number} [config.textIndent]
 * @param {Number} [config.reserveTopHeight] Reserve space at the top of page when the text is split on pages. It work if splitOnPage is true.
 * @param {Boolean} [config.drawBorderOnSplit] (optional) By default false.
 * @param {Boolean} [config.splitOnPage] (optional) By default false.
 *  When "splitOnPage" is true TextBox split if the text exceed the page area
 *  TextBox do not change page context but create new textBoxes to next pages.
 *  New TextBoxes stores in array property "splitItems".
 * @param {Boolean} [config.isXml] By default false.
 * When true the {@link #text} value must be xml format but without root tag.
 * Supported tags:
 * <STRONG>,<b>,<EM>,<BIG>,<i>,<h1-6> <br/>, <p>, <font name="Times.." type="Bold" size="12" color="green" >,<span>
 * Supported tags attributes:
 * style="font-family: 'String'; font-weight: 'bold|normal'; font-style: 'italic|normal', font-size: Number; text-align: 'string'; "
 * Example
 *
 *           pdf.writeSimpleText({text: 'This is <b>bold text</b>and this is <i>italic</i><br/> on new line. Colors: ' +
 *          '<font color="red">R</font><font color="orange">A</font><font color="yellow">I</font>' +
 *          '<font color="green">N</font><font color="#6495ed">B</font><font color="blue">O</font>' +
 *          '<font color="#9370db">W</font>', isXml: true});
 *
 */
function PdfTextBox (config) {
  let cnv = function (value, requred, attrName) {
    pdfUtils.checkNumberValid(value, requred, 'PdfTextBox: Invalid config parameter ' + attrName)
  }
  let border

  this.sourceText = null
  this.heightIn = null

  this.context = config.context
  if (!this.context) {
    throw new Error('PdfTextBox - Required context in config')
  }
  this.pdf = this.context.pdf
  if (config.pdf) {
    throw new Error('config for Text box must not contain reference to PDF')
  }
  config.context = null
  this.textXml = config.textXml
  config.textXml = null

  if (config.customParams) {
    this.customParams = config.customParams
    config.customParams = null
  }
  // delete config.pdf;
  if (!config.isCloned) {
    config = _.cloneDeep(config) // TODO - bad, but not leak
  }
  this.initConfig = config

  this.drawBorderOnSplit = config.drawBorderOnSplit
  this.rowSpan = config.rowSpan
  this.colSpan = config.colSpan
  this.mapIndex = config.mapIndex
  this.onWriteCallBack = config.onWriteCallBack

  let k = this.pdf.internal.scaleFactor

  this.text = config.text || ''
  if (typeof this.text !== 'string') {
    this.text = this.text + ''
  }
  this.isXml = !!config.isXml

  this.left = config.left || 0
  this.top = config.top || 0
  this.textIndent = config.textIndent || 0

  this.bottom = config.bottom || 0
  this.right = config.right || 0
  this.width = config.width || 0
  this.width = this.width < 0 ? 0 : this.width
  this.widthIn = config.width // this.width;  this.widthIn == 0 - ничего не пишем
  this.height = config.height || 0
  this.minHeight = config.minHeight || 0
  this.height = this.height < 0 ? 0 : this.height
  this.heightIn = this.minHeight > this.height && this.height > 0 ? this.minHeight : this.height
  this.align = config.align || 'left'
  this.lineHeight = config.lineHeight || this.context.lineHeight
  if (this.align && this.align !== 'left' && this.align !== 'right' &&
    this.align !== 'center' && this.align !== 'justify'
  ) {
    throw new Error('Invalid align ' + this.align)
  }
  this.hAlign = config.hAlign || config.verticalAlign || 'top'
  if (this.hAlign && this.hAlign !== 'top' && this.hAlign !== 'bottom' && this.hAlign !== 'center') {
    throw new Error('Invalid align ' + this.hAlign)
  }
  this.font = config.font || (this.context ? this.context.font : {})
  if (this.context) {
    this.context.formatFont(this.font)
  }

  this.isNotEndParagraph = !!config.isNotEndParagraph

  cnv(this.left, true, 'left')
  cnv(this.top, true, 'top')
  cnv(this.bottom, false, 'bottom')
  cnv(this.right, false, 'right')
  cnv(this.width, false, 'width')
  cnv(this.height, false, 'height')

  this.splitOnPage = config.splitOnPage || false
  if (this.splitOnPage) {
    this.reserveTopHeight = config.reserveTopHeight
  }
  this.emptyText = !!config.emptyText

  this.autoWrite = config.autoWrite === undefined || config.autoWrite === null ? true : config.autoWrite
  if (config.pageNumber || config.pageNumber === 0) {
    this.pageNumber = config.pageNumber
  } else {
    this.pageNumber = this.context.getPageNumber()
  }
  this.lastPageNumber = this.pageNumber

  this.wordWrap = (config.wordWrap === true || config.wordWrap === false) ? config.wordWrap : true
  this.wordWrap = this.width !== null && this.width !== undefined && this.width > 0 ? this.wordWrap : false

  this.backgroundColor = config.backgroundColor

  if (config.border && (typeof config.border === 'string')) {
    this.border = this.context.parseBorder(config.border) // pgrg.border(config.border);
    if (config.borderColor) {
      this.border.color = config.borderColor
    }
  }

  if (config.border && !config.borderWidth && Number.isFinite(config.border)) {
    this.borderWidth = config.border
  }

  if (!this.border) {
    if (config.border && (typeof config.border !== 'string')) {
      border = config.border
    } else {
      border = {}
    }
    this.border = {
      left: this.context.parseMeasure(border.left) || this.borderWidth || 0,
      right: this.context.parseMeasure(border.right) || this.borderWidth || 0,
      top: this.context.parseMeasure(border.top) || this.borderWidth || 0,
      bottom: this.context.parseMeasure(border.bottom) || this.borderWidth || 0,
      color: border.color || config.borderColor || border.colour ||
        config.borderColour || pdfUtils.colors.BLACK
    }
  }

  cnv(this.border.left, false, 'border.left')
  cnv(this.border.right, false, 'border.right')
  cnv(this.border.top, false, 'border.top')
  cnv(this.border.bottom, false, 'border.bottom')

  this.margin = null
  if (config.margin && (typeof config.margin === 'string')) {
    this.margin = this.context.parseBorder(config.margin)
  }
  if (config.margin && Number.isFinite(config.margin)) {
    this.marginWidth = config.margin
  }
  if (!this.margin) {
    if (config.margin && (typeof config.margin !== 'string')) {
      border = config.margin
    } else {
      border = {}
    }
    this.margin = {
      left: this.context.parseMeasure(border.left) || this.marginWidth || 0,
      right: this.context.parseMeasure(border.right) || this.marginWidth || 0,
      top: this.context.parseMeasure(border.top) || this.marginWidth || 0,
      bottom: this.context.parseMeasure(border.bottom) || this.marginWidth || 0
    }
  }
  cnv(this.margin.left, false, 'margin.left')
  cnv(this.margin.right, false, 'margin.right')
  cnv(this.margin.top, false, 'margin.top')
  cnv(this.margin.bottom, false, 'margin.bottom')

  this.padding = null
  if (config.padding && (typeof config.padding === 'string')) {
    this.padding = this.context.parseBorder(config.padding)
  }
  if (config.padding && Number.isFinite(config.padding)) {
    this.paddingWidth = config.padding
  }
  if (!this.padding) {
    if (config.padding && (typeof config.padding !== 'string')) {
      border = config.padding
    } else {
      border = {}
    }
    this.padding = {
      left: this.context.parseMeasure(border.left) || this.paddingWidth || 0,
      right: this.context.parseMeasure(border.right) || this.paddingWidth || 0,
      top: this.context.parseMeasure(border.top) || this.paddingWidth || 0,
      bottom: this.context.parseMeasure(border.bottom) || this.paddingWidth || 0
    }
  }
  cnv(this.padding.left, false, 'padding.left')
  cnv(this.padding.right, false, 'padding.right')
  cnv(this.padding.top, false, 'padding.top')
  cnv(this.padding.bottom, false, 'padding.bottom')

  this.textInfo = this.pdf.createTextInfo(this.textXml || this.text, {isXml: this.isXml, disableAutoIndent: true, font: this.font, textIndent: this.textIndent })

  this.innerBox = {}
  this.recalcInnerBoxPos()
  this.innerBox.width = this.width <= 0
    ? 0
    : this.width - (this.padding.left + this.border.left + this.margin.left) - (this.padding.right + this.border.right + this.margin.right)
  this.innerBox.height = this.height <= 0
    ? 0
    : this.height - (this.padding.top + this.border.top + this.margin.top) - (this.padding.bottom + this.border.bottom + this.margin.bottom)

  this.calcMetrics()
  if (this.autoWrite) { this.write() }
}

/**
 * free resources
 */
PdfTextBox.prototype.destroy = function () {
  this.context = null
  this.pdf = null
  this.textInfo = null
  this.tbMetrics = null

  if (this.isDestroyed) return

  if (this.splitItems) {
    _.forEach(this.splitItems, function (item) {
      item.destroy()
    })
  }
  this.splitItems = null
  this.onWriteCallBack = null

  this.isDestroyed = true
}

/**
* get config for create clone of this textBox
*/
PdfTextBox.prototype.getConfig = function () {
  let clone = {}
  if (this.initConfig) {
    clone = _.cloneDeep(this.initConfig)
    clone.isCloned = true
  }
  clone.context = this.context

  return clone
}

/**
 * @private
 */
PdfTextBox.prototype.recalcInnerBoxPos = function () {
  this.innerBox.left = this.left + this.padding.left + this.border.left + this.margin.left
  this.innerBox.top = this.top + this.padding.top + this.border.top + this.margin.top
}

/**
 * Fix height of textBox. Cut the text when text is out of height
 * @param {Integer} newValue
 * @param {Boolean} [forceCalc=false]
 */
PdfTextBox.prototype.setHeight = function (newValue, forceCalc) {
  pdfUtils.checkNumberValid(newValue, true, 'PdfTextBox.setHeight: Invalid value for parameter newValue ')
  this.heightIn = newValue || 0
  if (this.height === newValue) {
    return
  }
  this.heightChanged = true
  let less = this.height > newValue
  this.height = newValue || this.height || 0
  this.height = this.height < 0 ? 0 : this.height
  this.bottom = this.top + this.height
  if (this.sourceMinHeight) {
    this.minHeight = this.sourceMinHeight
  }
  if (less || forceCalc) {
    this.calcMetrics()
  }
}

/**
 * Set top position
 * @param {Number} newPosition Integer value of new position
 * @param {Number} [pageNumber] (optional) by default same page. Integer
 */
PdfTextBox.prototype.setTop = function (newPosition, pageNumber) {
  let doCalc = false
  pdfUtils.checkNumberValid(newPosition, true, 'PdfTextBox.setTop: Invalid value for parameter newPosition ')
  pdfUtils.checkNumberValid(pageNumber, false, 'PdfTextBox.setTop: Invalid value for parameter pageNumber ')
  if (this.top === newPosition && (this.pageNumber === (pageNumber || this.pageNumber))) {
    return
  }
  this.topPosChanged = true
  this.top = newPosition
  this.pageNumber = pageNumber || this.pageNumber || this.context.getPageNumber()
  this.lastPageNumber = pageNumber
  if (this.sourceMinHeight) {
    this.minHeight = this.sourceMinHeight
  }
  if (this.top >= this.context.getInnerPageBottomPos()) {
    this.pageNumber += 1
    this.top = this.context.getInnerPageTopPos() + this.top - this.context.getInnerPageBottomPos()
    doCalc = true
  }
  this.recalcInnerBoxPos()
  if (doCalc || this.splitItems || ((this.top + this.height) > this.context.getInnerPageBottomPos())) {
    this.calcMetrics()
  }
}

/**
 * @private
 * @param newText
 * @param [textXml]
 */
PdfTextBox.prototype.updateTextInfo = function (newText, textXml) {
  if (textXml) {
    this.sourceTextXml = textXml
    this.textXml = textXml
  } else {
    this.text = newText
    this.sourceTextXml = this.textXml
    this.textXml = null
  }
  this.sourceMinHeight = this.minHeight
  this.minHeight = null
  this.textInfo = this.pdf.createTextInfo(this.textXml || this.text, {isXml: this.isXml, disableAutoIndent: true, font: this.font, textIndent: this.textIndent })
}

/**
 * @private  Calc text detail info and
 */
PdfTextBox.prototype.calcMetrics = function () {
  var
    me = this,
    addH, addHF, metrics, hasText = false,
    currentHeight = 0, fullHeight = 0, deltaText, line,
    stline,
    isFirstLine,
    oldFont,
    tbConfig,
    addDetail,
    newTB,
    splitItems = [], requreDetail = false, tbPage,
    oldLineHeight, options, textInfo,
    requireHeight = Math.max(me.minHeight, me.heightIn, me.height)

  if (me.sourceText) {
    if (me.text !== me.sourceText) {
      me.updateTextInfo(me.sourceText)
    }
  }
  if (me.sourceTextXml) {
    me.textXml = me.sourceTextXml
    me.updateTextInfo(null, me.textXml)
  }
  me.firstRowBreaked = null
  me.splitItems = null
  me.lastPageNumber = me.pageNumber

  oldFont = me.context.setFont(me.font)
  oldLineHeight = me.context.setlineHeight(me.lineHeight)

  options = { wordWrap: me.wordWrap,
    align: me.align,
    width: (me.innerBox.width > 0 ? me.innerBox.width : null)
  }

  me.tbMetrics = metrics = me.pdf.textCalcMetricsByInfo(me.textInfo, options)

  me.context.setFont(oldFont)
  me.context.setlineHeight(oldLineHeight)
  me.fullHeight = me.tbMetrics.height

  addH = me.padding.top + me.border.top + me.margin.top + me.padding.bottom + me.border.bottom + me.margin.bottom

  function getDetail (n) {
    return metrics.textInfo.details[n] || {}
  }

  addDetail = function (emptyBox, minHeight) {
    tbPage++
    me.lastPageNumber = tbPage
    tbConfig = me.getConfig()
    tbConfig.splitOnPage = null
    tbConfig.onWriteCallBack = null
    tbConfig.textXml = null
    tbConfig.text = ''
    if (!emptyBox) {
      deltaText = textInfo.getLineSource(stline, line - 1, me.isXml, !isFirstLine)
      tbConfig.text = deltaText
      tbConfig.isNotEndParagraph = line > 0 ? !getDetail(line - 1).isEndParagraph : false
    } else {
      if (minHeight) {
        tbConfig.minHeight = minHeight
      }
    }

    tbConfig.autoWrite = false
    tbConfig.top = me.context.page.innerSize.topColon + (me.reserveTopHeight || 0)
    tbConfig.pageNumber = tbPage
    tbConfig = new PdfTextBox(tbConfig)
    splitItems.push(tbConfig)
    return tbConfig
  }

  tbPage = me.pageNumber || me.context.getPageNumber()
  if (me.splitOnPage && me.wordWrap && !me.emptyText && (me.innerBox.width > 0) && metrics && metrics.lines > 0) {
    textInfo = me.tbMetrics.textInfo
    me.isInSplit = true
    me.sourceText = me.text
    line = 0
    currentHeight = 0
    fullHeight = 0
    isFirstLine = false
    stline = line
    addHF = me.top + addH
    while (line < metrics.lines) {
      if (addHF + currentHeight + metrics.lineHeights[line] > me.context.getInnerPageBottomPos()) {
        isFirstLine = false
        if (requreDetail) {
          newTB = addDetail()
          fullHeight += newTB.height
        } else {
          // for first page text
          if (!hasText /* currentText === '' */) { // первая строка не влазит
            isFirstLine = true
            me.updateTextInfo('')
            me.tbMetrics = me.pdf.textCalcMetricsByInfo(me.textInfo, options)
            // me.fullHeight = me.tbMetrics.height
            // me.height = 0
            // real height
            me.height = me.context.getInnerPageBottomPos() - me.top
            me.fullHeight = me.height
            // -
            me.firstRowBreaked = true
            me.innerBox.height = 0
          } else {
            deltaText = textInfo.getLineSource(stline, line - 1, me.isXml)
            me.updateTextInfo(deltaText)
            me.height = me.context.getInnerPageBottomPos() - me.top
            me.recalcInnerBoxHeight()
            me.isNotEndParagraph = line > 0 ? !getDetail(line - 1).isEndParagraph : false
            me.tbMetrics = me.pdf.textCalcMetricsByInfo(me.textInfo, options)
            me.fullHeight = me.tbMetrics.height
          }
          fullHeight += me.height
          addHF = me.context.getInnerPageTopPos() + addH
        }
        currentHeight = 0
        hasText = false
                       // currentText = '';
        stline = line
        requreDetail = true
      }

      currentHeight += metrics.lineHeights[line]
      fullHeight += metrics.lineHeights[line]
      hasText = true
      line++
    }
    if (requreDetail && hasText /* currentText !== '' */ /* textLen > 0 */) {
      newTB = addDetail()
      fullHeight += newTB.height
    }
    if (fullHeight < requireHeight) {
      let deltaH = requireHeight - fullHeight
      let pH = me.context.getInnerPageSize()

      let cTop = !requreDetail ? me.top + fullHeight : me.context.getInnerPageTopPos()
      while (cTop + deltaH > me.context.getInnerPageTopPos()) {
        if (requreDetail) {
          addDetail(true, deltaH < pH ? deltaH : pH)
          deltaH = deltaH < pH ? 0 : deltaH - pH
        } else {
          me.tbMetrics = me.pdf.textCalcMetricsByInfo(me.textInfo, options)
          deltaH = deltaH - (me.context.getInnerPageBottomPos() - cTop)
          me.height = me.context.getInnerPageBottomPos() - me.top
          me.recalcInnerBoxHeight()
          requreDetail = true
          cTop = me.context.getInnerPageTopPos()
        }
      }
      if (requreDetail && deltaH > 0) {
        addDetail(true, deltaH < pH ? deltaH : pH)
      }
    }
  }
  if (me.splitOnPage) {
    // divide by the remaining height
    var remainHeight, itemNum, item, newTop, currHeight
    remainHeight = requireHeight - me.height
    // exists height attribute and textBox beyond page bottom and text is empty or less height
    if (splitItems.length === 0 && (me.top + me.height > me.context.page.innerSize.bottomColon)) {
      me.height = me.context.page.innerSize.bottomColon - me.top
      remainHeight = requireHeight - me.height
    }
    for (itemNum = 0; itemNum < splitItems.length; itemNum++) {
      item = splitItems[itemNum]
      remainHeight -= item.height
    }
    if (me.height === 0 && splitItems.length === 0) {
      if (me.context.getInnerPageBottomPos() - me.top < remainHeight) {
        me.height = me.context.getInnerPageBottomPos() - me.top
        me.recalcInnerBoxHeight()
        remainHeight -= me.height
      } else {
        me.height = remainHeight
        me.recalcInnerBoxHeight()
        remainHeight = 0
      }
    }
    if (remainHeight > 0) {
      if (item) {
        if (item.height + remainHeight > me.context.getInnerPageBottomPos()) {
          currHeight = me.context.getInnerPageSize() - item.height
          remainHeight -= currHeight
        } else {
          currHeight = item.height + remainHeight
          remainHeight = 0
        }
        item.heightIn = item.height = currHeight
      }
      newTop = me.context.getInnerPageTopPos() + (me.reserveTopHeight || 0)
      currHeight = me.context.getInnerPageBottomPos() - newTop
      while (remainHeight > 0) {
        if (remainHeight < currHeight) {
          currHeight = remainHeight
          remainHeight = 0
        } else {
          remainHeight -= currHeight
        }
        tbPage++
        me.lastPageNumber = tbPage
        me.context.requirePage(tbPage)
        item = me.getConfig()
        item.minHeight = null
        item.pageNumber = tbPage
        item.top = newTop
        item.height = currHeight
        item.splitOnPage = null
        item.autoWrite = false
        item.textXml = null
        item.text = ''
        item.emptyText = true
        item.onWriteCallBack = null
        item = new PdfTextBox(item)
        splitItems.push(item)
      }
    }
  }
  me.isSplited = false
  if (splitItems.length > 0) {
    me.splitItems = splitItems
    me.isSplited = true
  }
  me.updateByResult()
}

PdfTextBox.prototype.recalcInnerBoxHeight = function () {
  this.innerBox.height = this.height - (this.padding.top + this.border.top + this.margin.top + this.padding.bottom + this.border.bottom + this.margin.bottom)
}

/**
 * @private
 */
PdfTextBox.prototype.updateByResult = function () {
  if (this.heightIn === 0 || this.splitOnPage) {
    if (this.minHeight === 0 || !this.isSplited) {
      this.innerBox.height = this.tbMetrics.height // this.innerBox.lines  * (1020 / 1000) * this.pdf.internal.scaleFactor / this.pdf.internal.getFontSize();
      this.height = this.padding.top + this.border.top + this.margin.top + this.innerBox.height + this.padding.bottom + this.border.bottom + this.margin.bottom
    }
    if (this.firstRowBreaked) {
      this.height = 0
    }
    if (this.heightIn !== 0 && !this.isSplited) {
      this.height = this.heightIn
    }
  }
  if (this.minHeight > this.height && !this.isSplited) {
    this.height = this.minHeight
    this.recalcInnerBoxHeight()
  }
  this.bottom = this.top + this.height
  this.innerBox.width = this.innerBox.width > 0 ? this.innerBox.width : this.tbMetrics.width
  this.width = this.width <= 0 ? 0 : this.innerBox.width + this.padding.left + this.border.left + this.margin.left + this.padding.right + this.border.right + this.margin.right
  this.right = this.left + this.width
  this.lastPageBottom = this.bottom
  if (this.splitItems && this.splitItems.length > 0) {
    this.lastPageBottom = this.splitItems[this.splitItems.length - 1].bottom
  }
}

/**
 * Write textBox to PDF stream
 * @param {Object} [options]
 * @param [options.ignoreTopBorder] Ignore top border
 * @param [options.ignoreBottomBorder] Ignore bottom border
 */
PdfTextBox.prototype.write = function (options) {
  var
    me = this,
    oldFont,
    oldLineHeight,
    colorWrited,
    writeDetail = function (forceBorder) {
      if (me.splitItems) {
        for (let i = 0; i < me.splitItems.length; i++) {
          me.splitItems[i].write({
            ignoreTopBorder: !me.drawBorderOnSplit && !forceBorder,
            ignoreBottomBorder: !me.drawBorderOnSplit && !forceBorder && (i + 1 < me.splitItems.length)
          })
        }
      }
    }
  if (me.widthIn === 0) {
    writeDetail(true)
    return
  } // nothing to do
  if (me.height === 0 && !me.text) {
    writeDetail(true)
    return // nothing to do
  }
  if (me.splitItems && !me.drawBorderOnSplit) {
    if (!options) {
      options = {}
    }
    options.ignoreBottomBorder = true
  }
  if (me.heightIn !== 0) {
    switch (me.hAlign) {
      case 'center':
        me.innerBox.top += (me.heightIn - me.innerBox.height - me.padding.top - me.border.top - me.margin.top -
           me.padding.bottom - me.border.bottom - me.margin.bottom) / 2
        break
      case 'bottom':
        me.innerBox.top += (me.heightIn - me.innerBox.height - me.padding.top - me.border.top - me.margin.top -
           me.padding.bottom - me.border.bottom - me.margin.bottom)
        break
    }
  }
  if (me.pageNumber) {
    me.context.requirePage(me.pageNumber)
  }

  oldFont = me.context.setFont(me.font)
  oldLineHeight = me.context.setlineHeight(me.lineHeight)

  if (me.backgroundColor) {
    me.context.setFillColor(me.backgroundColor, me.pageNumber)
    me.pdf.rectOnPage(me.left + me.margin.left, me.top + me.margin.top,
                 me.width ? me.width - me.margin.left - me.margin.right : me.innerBox.width,
                 me.height - me.margin.top - me.margin.bottom, 'F', me.pageNumber)
  }

  me.pdf.textExt(
     me.innerBox.left, me.innerBox.top, me.text, // me.tbMetrics ? me.tbMetrics.text : me.text
    { wordWrap: me.wordWrap,
      align: me.align,
      isNotEndParagraph: me.isNotEndParagraph,
      width: (me.innerBox.width > 0 ? me.innerBox.width : null),
      pageNumber: me.pageNumber,
      textInfo: me.textInfo,
      metrics: me.tbMetrics
    }
  )
  me.context.setFont(oldFont)
  me.context.setlineHeight(oldLineHeight)
  me.updateByResult()

  let rW = function (w) { return Number(w) }

  colorWrited = false

  if (me.border.left && me.border.left > 0) {
    if (me.border.color && !colorWrited) {
      colorWrited = true
      me.context.setDrawColor(me.border.color, me.pageNumber)
    }
    me.pdf.setLineWidthOnPage(rW(me.border.left), me.pageNumber)
    me.pdf.lineOnPage(me.left + me.margin.left, // + me.border.left
      me.top + me.margin.top,
      me.left + me.margin.left, // + me.border.left
      me.bottom - me.margin.bottom, me.pageNumber
    )
  }
  if (me.border.right && me.border.right > 0) {
    if (me.border.color && !colorWrited) {
      colorWrited = true
      me.context.setDrawColor(me.border.color, me.pageNumber)
    }
    me.pdf.setLineWidthOnPage(rW(me.border.right), me.pageNumber)
    me.pdf.lineOnPage(me.right - me.margin.right, // - me.border.right
       me.top + me.margin.top,
       me.right - me.margin.right, // - me.border.right
       me.bottom - me.margin.bottom, me.pageNumber
    )
  }
  if (me.border.top && me.border.top > 0 && (!options || !options.ignoreTopBorder)) {
    if (me.border.color && !colorWrited) {
      colorWrited = true
      me.context.setDrawColor(me.border.color, me.pageNumber)
    }
    me.pdf.setLineWidthOnPage(rW(me.border.top), me.pageNumber)
    me.pdf.lineOnPage(me.left + me.margin.left, // + me.border.left
      me.top + me.margin.top,
      me.right - me.margin.right, // - me.border.right
      me.top + me.margin.top, me.pageNumber
    )
  }
  if (me.border.bottom && me.border.bottom > 0 && (!options || !options.ignoreBottomBorder)) {
    if (me.border.color && !colorWrited) {
      me.context.setDrawColor(me.border.color, me.pageNumber)
    }
    me.pdf.setLineWidthOnPage(rW(me.border.bottom), me.pageNumber)
    me.pdf.lineOnPage(
      me.left + me.margin.left, // + me.border.left
      me.bottom - me.margin.bottom,
      me.right - me.margin.right, // - me.border.right
      me.bottom - me.margin.bottom, me.pageNumber
    )
  }

  writeDetail()
  if (me.onWriteCallBack) {
    me.onWriteCallBack(me)
  }
}

module.exports = PdfTextBox
