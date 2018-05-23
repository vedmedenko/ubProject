/* global Blob, gc */
const _ = require('lodash')
const JsPDF = require('../libs/jsPDF/jspdf.js') // important to require .js (for webpack)
const PdfDataGrid = require('./PdfDataGrid')
const PdfTextBox = require('./PdfTextBox')
const HtmlToPdf = require('./HtmlToPdf')
const pfdUtils = require('./pdfUtils')
/**
 * PDF Document builder
 * @param config
 * @param {String} [config.orientation] 'p' or 'l' default 'p' portrait
 * @param {String} [config.measure] default 'mm'
 * @param {String} [config.format] default 'a4'
 * @param {Boolean} [config.compress] true to enable compress content. By default true
 * @param {Boolean} [config.compressFont] true to enable compress font. By default true
 * @param {Object} [config.margin] set page margin
 * @param {Number} [config.margin.left] page margin left default 3
 * @param {Number} [config.margin.right] page margin right default 3
 * @param {Number} [config.margin.bottom] page margin bottom default 3
 * @param {Number} [config.margin.top] page margin top default 3
 * @param {Object} [config.font] name, type, size
 * @param {Object} [config.topColontitle]
 * @param {Number} [config.topColontitle.height] default 0 - no colontitle
 * @param {Object} [config.topColontitle.font] name, type, size
 * @param {Object} [config.bottomColontitle]
 * @param {Object} [config.bottomColontitle]
 * @param {Object} [config.listeners]
 * @param {Function} [config.listeners.initPage] Called when initialized new page
 * @param {Function} [config.listeners.initColontitle] Called when build header or footer
 */
function PrintToPdf (config) {
  function defNum (v, def) {
    return _.isNumber(v) ? v : def
  }

  this.globalTBScope = []
  this.page = {}
  config = config || {}
  this.page.orientation = config.orientation || 'p'
  this.page.measure = config.measure || 'mm'
  this.page.format = config.format || 'a4'
  this.compress = (config.compress === false ? false : (config.compress || true))
  this.compressFont = (config.compressFont === false ? false : (config.compressFont || true))
  this.compress = false
  this.pdf = new JsPDF(this.page.orientation, this.page.measure, this.page.format, this.compress)
  let pageSize = this.pdf.internal.pageSize

  if (!this.compressFont) {
    this.pdf.setFontDeflate(this.compressFont)
  }

  this.page.margin = config.margin || {}
  this.page.margin.left = defNum(this.page.margin.left, 3)
  this.page.margin.right = defNum(this.page.margin.right, 3)
  this.page.margin.bottom = defNum(this.page.margin.bottom, 3)
  this.page.margin.top = defNum(this.page.margin.top, 3)

  this.page.innerSize = {
    top: this.page.margin.top,
    left: this.page.margin.left,
    right: pageSize.width - this.page.margin.right,
    bottom: pageSize.height - this.page.margin.bottom
  }

  this.page.innerSize.width = this.page.innerSize.right - this.page.innerSize.left
  this.page.innerSize.height = this.page.innerSize.bottom - this.page.innerSize.top

  this.page.innerSize.bottomColon = this.page.innerSize.bottom
  this.page.innerSize.topColon = this.page.innerSize.top

  // this.page.onInitPage = config.onInitPage;

  this.page.topColontitle = config.topColontitle || {height: 0}
  this.page.bottomColontitle = config.bottomColontitle || {height: 0}
  this.page.topColontitle.isTop = true
  this.page.bottomColontitle.isTop = false

  this.font = config.font || {}
  this.font.name = this.font.name || 'CourierImp'
  this.font.type = this.font.type || 'Normal'
  this.font.size = this.font.size || 12
  this.font.color = this.font.color || 'black'

  this.pageNumber = 1
  this.totalPageNumber = 1
  this.lineHeight = 1.0
  this.defaultColor = {r: 0, g: 0, b: 0}

  this.setFont(this.font, true)
  // this.setFont(this.font.name, this.font.type);
  // this.setFontSize(this.font.size);

  // this.mixins.observable.constructor.call(this, config);

  // this.addEvents(
  /**
   * @event initPage
   * Fires when new page added {@link #handler}
   * @param {PrintToPdf} this
   * @param {Event} e The click event
   */
  //    'initPage'
  // );
  /**
   * @event onInitColontitle
   * @param {PrintToPdf} this
   * @param {Object} result
   * @param {String} result.text
   * @param {String} result.align
   * @param {String} result.isXml
   * @param {Object} result.colontitle cinfig of colontitle
   * @param {Boolean} result.noWrite default true
   */
  //    'initColontitle'

  if (config.listeners && config.listeners.initColontitle) {
    this.oninitColontitle = config.listeners.initColontitle
  }
  if (config.listeners && config.listeners.initPage) {
    this.onInitPage = config.listeners.initPage
    this.raiseInitPage()
  }

  this.currentPosition = this.page.topColontitle.height + this.page.innerSize.top

  this.page.innerSize.topColon = this.page.innerSize.top + (this.page.topColontitle && this.page.topColontitle.height ? this.page.topColontitle.height : 0)
  this.page.innerSize.bottomColon = this.page.innerSize.bottom - (this.page.bottomColontitle && this.page.bottomColontitle.height ? this.page.bottomColontitle.height : 0)
  return this
}

/**
 * @deprecated Use pdfUtils.colors enum
 */
PrintToPdf.colors = pfdUtils.colors
PrintToPdf.alignType = {center: 'center', left: 'left', right: 'right'}

PrintToPdf.baseFontPath = 'models/PDF/fonts'

/**
 * load fonts
 * @param {Object} config
 * @param {Object|Array} config.fonts
 * @param {string} [config.fonts.path] (Optional) by default  models/PDF/fonts
 * @param {string} config.fonts.fontName
 * @param {string} config.fonts.fontStyle
 * @param {Function} [config.onLoad] (Optional)  This parameter is deprecated
 * @param {Object} [config.scope] (Optional)
 * @returns {Promise|Boolean} Either Promise resolved to true for browser of true for server
 */
PrintToPdf.requireFonts = function (config) {
  if (!config) {
    throw new Error('Empty config for PrintToPdf.requireFonts')
  }
  let fonts = Array.isArray(config.fonts) ? config.fonts : [config.fonts]
  let notLoadedFonts = []
  for (let i = 0, l = fonts.length; i < l; i++) {
    let font = fonts[i]
    if (!JsPDF.API.UnicodeFontExists(font.fontName, font.fontStyle)) {
      notLoadedFonts.push(`fonts/${font.fontName}${font.fontStyle}.json`)
    }
  }
  if (typeof window === 'undefined') { // server side - read file from disk
    // hack for SystemJS. If bundled - will be stripped by webpack DefinePlugin
    // noinspection Eslint
    global.BOUNDLED_BY_WEBPACK = false
    if (!BOUNDLED_BY_WEBPACK) {
      var re = require
      var path = re('path')
      var fs = re('fs')
    }
    for (let i = 0, l = notLoadedFonts.length; i < l; i++) {
      const realPath = path.join(__dirname, '..', notLoadedFonts[i])
      let fontData = JSON.parse(fs.readFileSync(realPath))
      JsPDF.API.addRawFontData(fontData)
    }
    return true
  } else { // client side
    if (!notLoadedFonts.length) {
      return Promise.resolve(true)
    } else {
      let promises = notLoadedFonts.map(
        (fontPath) => $App.connection.get('clientRequire/@unitybase/pdf/' + fontPath, { responseType: 'json' })
      )
      return Promise.all(promises).then(
        fontsDataResponses => {
          for (let resp of fontsDataResponses){
            JsPDF.API.addRawFontData(resp.data)
          }
          return true
        }
      )
    }
  }

  // if (UB.isServer) {
  //   var fontPath, fs, fName, modelName, basePath
  //   var modelsConfig = App.domain.config.models
  //
  //   fs = require('fs')
  //   for (i = 0; i < fonts.length; i++) {
  //     font = fonts[i]
  //     if (jsPDF.API.UnicodeFontExists(font.fontName, font.fontStyle)) {
  //       continue
  //     }
  //     fontPath = font.path || this.baseFontPath
  //     if (fontPath) {
  //       fontPath = fontPath.replace(/[\/]/g, '\\')
  //       modelName = fontPath.split('\\')
  //       if (modelName && modelName.length > 1) {
  //         modelName = modelName[1]  // 'models/PDF/fonts'
  //       } else {
  //         modelName = 'PDF'
  //       }
  //     }
  //     basePath = modelsConfig.byName(modelName).path
  //
  //     fName = basePath + 'public\\fonts\\' + font.fontName + font.fontStyle + '.json'
  //     JsPDF.API.addRawFontData(require(fName))
  //   }
  //   if (config.onLoad) {
  //     config.onLoad.call(config.scope || me, [])
  //   }
  //   return null
  // } else { // web client
  //           /* jshint -W038 */
  //   defer = Q.defer()
  //           /* jshint +W038 */
  //
  //   function fontLoaded (data) {
  //     JsPDF.API.addRawFontData(data.data)
  //     scriptsToLoad--
  //     if (scriptsToLoad === 0) {
  //       defer.resolve()
  //       if (config.onLoad) {
  //         config.onLoad.call(config.scope || me, [])
  //       }
  //     }
  //   }
  //   for (i = 0; i < fonts.length; i++) {
  //     font = fonts[i]
  //     if (JsPDF.API.UnicodeFontExists(font.fontName, font.fontStyle)) {
  //       continue
  //     }
  //     scriptsToLoad++
  //     $App.connection.get((font.path || this.baseFontPath) + '/' + font.fontName + font.fontStyle + '.json', null,
  //                   {responseType: 'json'})
  //                   .done(fontLoaded)
  //   }
  //   if (scriptsToLoad === 0) {
  //     defer.resolve()
  //     if (config.onLoad) {
  //       config.onLoad.call(config.scope || me, [])
  //     }
  //   }
  //   return defer.promise
  // }
}

/**
 * @deprecated Use pdfUtils.convertToMeasure instead
 * @param {Number|null} value
 * @param {String} measure Possible values mm, cm, px, pt
 * @param {String} measureTo Possible values mm, cm, px, pt
 * @returns {Number}
 */
PrintToPdf.convertToMeasure = function (value, measure, measureTo) {
  return pfdUtils.convertToMeasure(value, measure, measureTo)
}

// /**
//  * Get pdf plugin info
//  * @return {Object}
//  */
// PrintToPdf.checkPlugin = function () {
//   let result = { instaledAdobe: false, isDefault: false, trueBrowser: false }
//
//   if (Ext.isChrome) {
//     result.trueBrowser = true
//     for (let key in navigator.plugins) {
//       if (navigator.plugins[key].name === 'Adobe Acrobat') {
//         result.instaledAdobe = true
//         break
//       }
//     }
//     for (let key in navigator.mimeTypes) {
//       if (navigator.mimeTypes[key].type === 'application/pdf') {
//         if (navigator.mimeTypes[key].enabledPlugin.name === 'Adobe Acrobat') {
//           result.isDefault = true
//         }
//         break
//       }
//     }
//   }
//   return result
// }

/**
 * @deprecated Use pdfUtils.isNumberValid
 * @param value
 */
PrintToPdf.isNumberValid = function (value) {
  return pfdUtils.isNumberValid(value)
}

/**
 * @deprecated Use pdfUtils.checkNumberValid
 * @param value
 * @param {Boolean} required
 * @param messageContext
 */
PrintToPdf.checkNumberValid = function (value, required, messageContext) {
  return pfdUtils.checkNumberValid(value, required, messageContext)
}

PrintToPdf.units = {
  'px': 1,
  'pt': 1,
  'mm': 1,
  'cm': 1
}

/**
 *
 * @param {String} value
 * @returns {*}
 */
PrintToPdf.getUnitValue = function (value) {
  let result = ''
  if (value.length <= 2) {
    return null
  }
  let uname = value.substr(-2)
  _.forEach(PrintToPdf.units, function (pvalue, pname) {
    if (uname === pname) {
      result = pvalue
      return false
    }
  })
  return result
}

PrintToPdf.isUnitValue = function (value) {
  let res = false
  if (value.length <= 2) {
    return false
  }
  let uname = value.substr(-2)
  _.forEach(PrintToPdf.units, function (pvalue, pname) {
    res = (uname === pname)
    return !res
  })
  return res
}

/**
 * Parse from string notation to object. Value must be delimited by space.
 * When exists 4 values then order: top, right, bottom, left. When exists 3 values then order: top, right, left (bottom like top).
 * When exists 2 values then order: top, left (bottom like top and right like left).
 * Example:
 *
 *      pdf.parseBorder('1px 2px 1px 3px'); //when base measure is 'px' return {top: 1, right: 2, bottom: 1, left: 3}
 *
 * @param {String} val
 * @returns {{ left: String|number, top: String|number, bottom: String|number, right: String|number}}
 */
PrintToPdf.prototype.parseBorder = function (val) {
  const pm = this.parseMeasure.bind(this)

  if (val && typeof (val) === 'string') {
    let strS = val.split(' ')
    if (strS.length > 1) {
      switch (strS.length) {
        case 2:
          return {top: pm(strS[0]), right: pm(strS[1]), bottom: pm(strS[0]), left: pm(strS[1])}
        case 3:
          return {top: pm(strS[0]), right: pm(strS[1]), bottom: pm(strS[0]), left: pm(strS[2])}
        case 4:
          return {top: pm(strS[0]), right: pm(strS[1]), bottom: pm(strS[2]), left: pm(strS[3])}
      }
    } else if (PrintToPdf.isUnitValue(val)) {
      return {top: pm(val), right: pm(val), bottom: pm(val), left: pm(val)}
    } else {
      throw new Error('MPV: this code do nothing')
      // // old format
      // var result = {left: 0, top: 0, bottom: 0, right: 0}
      // dimension = 'px'
      // var i = 0
      // while (i < val.length) {
      //   var key = 1
      //   if (i < val.length - 1 && val[i + 1] > 0) {
      //     key = val[i + 1] + 0
      //   }
      //   switch (val[i]) {
      //     case 'L': result.left = key + dimension; break
      //     case 'T': result.top = key + dimension; break
      //     case 'B': result.bottom = key + dimension; break
      //     case 'R': result.right = key + dimension; break
      //   }
      //   i = i + (key === 1 ? 1 : 2)
      // }
    }
  }
}

/**
 * Add alone text box and change current position. Full list parameters are in {@link  PdfTextBox}
 * @param {Object} config
 * @param {String} config.text
 * @param {Number} [config.left] (optional) default min left position
 * @param {Number} [config.top] (optional) default current position
 * @param {String} [config.align] (optional) default left
 * @param {Number} [config.width] (optional) default inner page width
 * @return {PdfTextBox}
 */
PrintToPdf.prototype.writeSimpleText = function (config) {
  let cfg = _.cloneDeep(config, true)
  // MPV add isCloned
  cfg.isCloned = true
  cfg.width = cfg.width || this.page.innerSize.width
  // config.wordWrap = config.wordWrap || true;
  let autoWrite = cfg.autoWrite === true || cfg.autoWrite === false ? cfg.autoWrite : true
  cfg.autoWrite = false
  cfg.align = config.align || 'left'
  cfg.top = cfg.top || this.getPosition()
  cfg.left = cfg.left || this.page.innerSize.left
  cfg.noChangePosition = cfg.noChangePosition || false
  cfg.noCheckPage = cfg.noCheckPage || false
  let tb = this.createTextBox(cfg)

  if (!cfg.splitOnPage && !cfg.noCheckPage && (tb.bottom > this.page.innerSize.bottomColon)) {
    this.addPage()
    tb.setTop(this.getPosition(), this.getPageNumber())
  }

  if (autoWrite) {
    tb.write()
    // TODO - MPV tb.destroy();
  }

  if (!config.noChangePosition) {
    this.setPage(tb.lastPageNumber, false)
    this.setPosition(tb.lastPageBottom)
  }
  return tb
}

/**
 * @private
 * @param {Object} colontitle
 * @param {Number} pageNum
 */
PrintToPdf.prototype.initColontitle = function (colontitle, pageNum, current) {
  let ct = colontitle
  let result = {
    text: colontitle.text || '',
    align: colontitle.align || 'right',
    colontitle: colontitle,
    noWrite: false,
    pageNumber: pageNum,
    totalPages: this.totalPages,
    currentDate: current
  }

  if (this.oninitColontitle) {
    this.oninitColontitle(this, result)
  }

  if (!result.noWrite && (ct.height > 0) && result.text !== '') {
    this.writeSimpleText({
      isXml: !!result.isXml,
      text: result.text,
      align: result.align,
      top: ct.isTop ? this.page.innerSize.top : this.page.innerSize.bottomColon,
      left: this.page.innerSize.left,
      width: this.page.innerSize.width,
      height: ct.height,
      noChangePosition: true,
      noCheckPage: true,
      font: colontitle.font,
      pageNumber: pageNum
    })
  }
}

/**
* return current position of document
* @return {Number}
*/
PrintToPdf.prototype.getPosition = function () {
  return this.currentPosition
}

/**
 * Set new position. If position more then page size then position will
 * @param newPosition
 * @return {Number}
 */
PrintToPdf.prototype.setPosition = function (newPosition) {
  let innerSize = this.page.innerSize
  this.currentPosition = newPosition > innerSize.bottom
    ? innerSize.bottom
    : (newPosition < innerSize.top ? innerSize.top : newPosition)
  return this.currentPosition
}

/**
 * Move position to sheet top. This function take into account the headers and footers and margins.
 */
PrintToPdf.prototype.movePositionToTop = function () {
  this.setPosition(this.page.innerSize.topColon)
}

/**
 * Move position of document. If position more then page size then position move to new page.
 * @param delta
 * @return {Number}
 */
PrintToPdf.prototype.movePosition = function (delta) {
  let innerSize = this.page.innerSize
  this.currentPosition += delta
  if (this.currentPosition < innerSize.topColon) {
    this.currentPosition = innerSize.top
  }
  if (this.currentPosition > innerSize.bottomColon) {
    // this.currentPosition  = innerSize.top;
    this.addPage()
  }
  return this.currentPosition
}

/**
 * Convert to base measure from string notation.
 * Example:
 *
 *      pdf.parseMeasure('1px'); // when base measure is 'mm' return 0,35277777777777777777777777777778
 *
 * @param {String} value
 * Possible measure - pt, px, mm, cm
 * @returns {Number}
 */
PrintToPdf.prototype.parseMeasure = function (value) {
  let baseMeasure = this.page.measure

  if (!value) { return }
  if (typeof value !== 'string') { return value }
  if ((value.indexOf('px', value.length - 2) !== -1) ||
      (value.indexOf('pt', value.length - 2) !== -1)) {
    return pfdUtils.convertToMeasure(parseInt(value.substring(0, value.length - 2), 10), 'px', baseMeasure)
  }
  if ((value.indexOf('mm', value.length - 2) !== -1)) {
    return pfdUtils.convertToMeasure(parseInt(value.substring(0, value.length - 2), 10), 'mm', baseMeasure)
  }
  if ((value.indexOf('cm', value.length - 2) !== -1)) {
    return pfdUtils.convertToMeasure(parseInt(value.substring(0, value.length - 2), 10), 'mm', baseMeasure)
  }

  return parseInt(value, 10)
}

/**
 *
 * @param {Number} value
 * @param {String} [measureFrom] default 'px'
 * @param {String} [measureTo] default is document measure
 * @returns {Number}
 */
PrintToPdf.prototype.convertToMeasure = function (value, measureFrom, measureTo) {
  return pfdUtils.convertToMeasure(value, measureFrom || 'px', measureTo || this.page.measure)
}

/**
 * Return inner page size
 * @returns {number}
 */
PrintToPdf.prototype.getInnerPageSize = function () {
  return this.page.innerSize.bottomColon - this.page.innerSize.topColon
}

/**
 * Return inner page width
 * @returns {number}
 */
PrintToPdf.prototype.getInnerPageWidth = function () {
  return this.page.innerSize.right - this.page.innerSize.left
}

/**
 * Return inner page right
 * @returns {number}
 */
PrintToPdf.prototype.getInnerPagePosRight = function () {
  return this.page.innerSize.right
}

/**
 * Return inner page left
 * @returns {number}
 */
PrintToPdf.prototype.getInnerPagePosLeft = function () {
  return this.page.innerSize.left
}

/**
 *
 * @returns { Number}
 */
PrintToPdf.prototype.getInnerPageTopPos = function () {
  return this.page.innerSize.topColon
}

/**
 *
 * @returns { Number}
 */
PrintToPdf.prototype.getInnerPageBottomPos = function () {
  return this.page.innerSize.bottomColon
}

/**
 * free resources
 */
PrintToPdf.prototype.destroy = function () {
  if (this.pdf && this.pdf.destroy) {
    this.pdf.destroy()
  }
  this.pdf = null

  this.isDestroyed = true
}

/**
 * Color for draw line
 * @param {String|{r: number, g: number, b: number}|[r,g,b]} config
 * When config is string it is HTML color. For example '#ffffff' or 'black'.
 * @param {Number} pageNumber
 */
PrintToPdf.prototype.setDrawColor = function (config, pageNumber) {
  if (typeof config === 'string') {
    this.pdf.setDrawColorOnPageRaw(pageNumber || this.pageNumber, (this.formatColor(config) || '').toUpperCase())
  } else if (Array.isArray(config) && config.length > 2) {
    this.pdf.setDrawColorOnPage(pageNumber || this.pageNumber, config[0], config[1], config[2])
  } else {
    this.pdf.setDrawColorOnPage(pageNumber || this.pageNumber, config.r, config.g, config.b)
  }
}

/**
 * Color to fill
 * @param {String|{r: number, g: number, b: number}|[r,g,b]} config
 * When config is string it is HTML color. For example '#ffffff' or 'black'.
 * @param {Number} pageNumber
 */
PrintToPdf.prototype.setFillColor = function (config, pageNumber) {
  if (typeof config === 'string') {
    this.pdf.setFillColorOnPageRaw(pageNumber || this.pageNumber, (this.formatColor(config) || '').toLowerCase())
  } else if (Array.isArray(config) && config.length > 2) {
    this.pdf.setFillColorOnPage(pageNumber || this.pageNumber, config[0], config[1], config[2])
  } else {
    this.pdf.setFillColorOnPage(pageNumber || this.pageNumber, config.r, config.g, config.b)
  }
}

PrintToPdf.prototype.formatColor = function (color) {
  return this.pdf.formatColor(color)
}

/**
 * return current page number
 * @return {Number}
 */
PrintToPdf.prototype.getPageNumber = function () {
  return this.pageNumber
}

/**
 * Return total page count. Each call addPage increases the amount of.
 * @returns {number}
 */
PrintToPdf.prototype.getTotalPages = function () {
  return this.totalPageNumber
}

/**
 * return width of text in selected measure
 * @param {String} text
 * @param {Object} [font] (optional)
 * @returns {number}
 */
PrintToPdf.prototype.getTextWidth = function (text, font) {
  return this.pdf.getStringUnitWidth(text) * (font ? font.size : this.font.size)
}

/**
 * Start new page
 * @param {boolean} [noChangePosition]
 */
PrintToPdf.prototype.addPage = function (noChangePosition) {
  this.pdf.addPage()
  this.totalPageNumber++

    /*
    me.currentPosition = me.page.margin.top;
    me.initColontitle(me.page.topColontitle);
    me.initColontitle(me.page.bottomColontitle);
    */
  if (!noChangePosition) {
    this.pageNumber++
    this.currentPosition = this.page.innerSize.topColon // me.page.topColontitle.height + me.page.innerSize.top;
  }

    // if (me.page.onInitPage){
    // this.fireEvent('initPage', this);
    // }

  this.raiseInitPage()
}

/**
 *  Return top position on page
 * @returns {Number}
 */
PrintToPdf.prototype.getPageTop = function () {
  return this.page.innerSize.topColon
}

/**
 * @private
 */
PrintToPdf.prototype.raiseInitPage = function () {
  if (this.onInitPage) {
    this.onInitPage(this)
  }
}

/**
 * Init page context to pageNumber
 * @param pageNumber
 */
PrintToPdf.prototype.requirePage = function (pageNumber) {
  while (this.totalPageNumber < pageNumber) {
    this.addPage(true)
  }
}

/**
 * @param {Number} pageNumber
 * @param {Boolean} movePositionToTop
 */
PrintToPdf.prototype.setPage = function (pageNumber, movePositionToTop) {
  this.requirePage(pageNumber)
  this.pageNumber = pageNumber
  if (movePositionToTop) {
    this.currentPosition = this.page.innerSize.topColon
  }
}

/**
 * Return page size parameters width and height
 * @return {Object}
 */
PrintToPdf.prototype.getPageSize = function () {
  return this.pdf.internal.pageSize
}

/**
 * Checks if there enough remaining space on the current page. Otherwise adds new page.
 * @param elementHeight
 * @returns {boolean} False if the element aren't fit and new page was added. Otherwise - true.
 */
PrintToPdf.prototype.ensureElementFits = function (elementHeight) {
  if (isNaN(elementHeight) || typeof elementHeight !== 'number') {
    throw new Error('PrintToPdf.ensureElementFits(): elementHeight (' + elementHeight + ') is NaN or not a number')
  }

  if (elementHeight > this.getAvailHeight()) {
    this.addPage()
    return false
  }

  return true
}

/**
 * Gets height of the empty space available on the current document page.
 * @returns {number}
 */
PrintToPdf.prototype.getAvailHeight = function () {
  return this.page.innerSize.bottomColon - this.currentPosition
}

/**
 * @private
 * @param {Object} font
 * @param {String} [font.name] Font name (Optional)
 * @param {String} [font.type] Font type (Optional) default Normal
 * @param {Number} [font.size] Font size (Optional) default 12
 * @param {Number} [font.color] (Optional) The color in html format. Default 'black'. Example 'red', '#ffaa11'
 */
PrintToPdf.prototype.formatFont = function (font) {
  font.name = font.name || this.font.name
  font.type = font.type || this.font.type
  font.wide = font.wide || this.font.wide
  font.size = font.size || this.font.size
  font.color = font.color || this.font.color
}

/**
 *
 * @returns {number}
 */
PrintToPdf.prototype.getlineHeight = function () {
  return this.lineHeight
}

/**
 * value - any positive number
 * 1 - normal
 * 2 - double
 * 1.5 - sesquialteral
 * 55.3445565 - incredible
 * @param {number} value
 */
PrintToPdf.prototype.setlineHeight = function (value) {
  let oldValue = this.lineHeight
  this.lineHeight = value
  this.pdf.setLineLeading(this.lineHeight)
  return oldValue
}

/**
 *
 * @param {Object} newFont
 * @param {String} [newFont.name] (Optional) default CourierImp
 * @param {String} [newFont.type] (Optional) default Normal
 * @param {Number} [newFont.wide] (Optional) default 0
 * @param {Number} [newFont.size] (Optional) default 12
 * @param {Number} [newFont.color] (Optional) The color in html format. Default 'black'. Example 'red', '#ffaa11'
 * @param {Boolean} [force] (Optional) Ignore checking font attributes were changed
 * @returns {*}
 */
PrintToPdf.prototype.setFont = function (newFont, force) {
  newFont.name = newFont.name || this.font.name || 'CourierImp'
  newFont.type = newFont.type || this.font.type || 'Normal'
  newFont.wide = newFont.wide || this.font.wide || 0
  newFont.size = newFont.size || this.font.size || 12
  newFont.color = newFont.color || this.font.color || 'black'
  if (newFont.type && (newFont.type !== 'Normal' && newFont.type !== 'Bold' && newFont.type !== 'Italic') &&
            newFont.type.length > 0) {
    newFont.type = newFont.type[0].toUpperCase() + newFont.type.substring(1)
  }
  let result = _.cloneDeep(this.font)
  this.font = newFont

  if (force || (result.name !== newFont.name || result.type !== newFont.type)) {
    this.pdf.setFont(newFont.name, newFont.type)
  }
  if (force || (this.pdf.internal.getFontSize() !== newFont.size || result.size !== newFont.size)) {
    this.pdf.setFontSize(newFont.size)
  }
  if (force || (result.wide !== newFont.wide)) {
    this.pdf.setFontWidth(newFont.wide)
  }
  if (force || (result.color !== newFont.color)) {
    this.setFontColor(newFont.color)
  }

  return result
}

/**
 * Use formatColor to create PDF color format
 * @param {Number} r
 * @param {Number} g
 * @param {Number} b
 * @returns {String}
 */
PrintToPdf.prototype.formatColorRGB = function (r, g, b) {
  return this.pdf.formatColorRGB(r, g, b)
}

/**
 * Set font color in PDF format or HTML format (#FF0000). Use formatColor to create PDF color format.
 * @param {String} color
 */
PrintToPdf.prototype.setFontColor = function (color) {
  this.font.color = this.formatColor(color)
  this.pdf.setTextColorExtRaw(this.font.color)
}

/**
 * Set default document font
 * @param {String} name
 * @param {String} type
 */
PrintToPdf.prototype.setFontType = function (name, type) {
  this.font.name = name
  this.font.type = type
  this.pdf.setFont(name, type)
}

/**
 * setFontSize
 * @param {Number} size
 */
PrintToPdf.prototype.setFontSize = function (size) {
  this.font.size = size
  this.pdf.setFontSize(size)
}

/**
 * Create Grid
 * @param {Object} config
 * @param {String} [config.top] (optional) default is current position
 * @param {String} [config.left] (optional) default is left size of page margin
 * @param {Array}   config.columns  array of columns config
 * @param {Boolean} [config.noWrite] (optional) default value for all row.
 * @param {Boolean} [config.noChangePage] (optional) default value for all row. When true component does not change global Page context until write method called.
 * @param {Boolean} [config.splitOnPage]  (optional) default value for all row. break row when row out of page size. Default false.
 * @param {Integer} [config.pageNumber] (optional) default currentPage
 * @return {PDF.csPdfDataGrid}
 */
PrintToPdf.prototype.createGrid = function (config) {
  let grdConfig = config ? _.cloneDeep(config) : {}
  grdConfig.context = this
  grdConfig.isCloned = true
  grdConfig.top = grdConfig.top || this.getPosition()
  grdConfig.left = grdConfig.left || this.page.innerSize.left
  return new PdfDataGrid(grdConfig)
}

/**
 * Create TextBox. Better use {@link #writeSimpleText}
 * @param {Object} config
 * @param {String} [config.text] (optional)
 * @param {Integer} [config.left] (optional) default 0
 * @param {Integer} [config.top] (optional) default getPosition
 * @param {Integer} [config.bottom] (optional) default 0
 * @param {Integer} [config.right] (optional) default 0
 * @param {Integer} [config.width] (optional) default 0 limit textBox width when more than 0
 * @param {Integer} [config.height] (optional) default 0 limit textBox height when more than 0
 * @param {String} [config.align] (optional) default 'left'. Horizontal align. Possible values: left, center, right, justify
 * @param {String} [config.hAlign] (optional) default 'top'. Vertical align: top bottom
 * @param {Boolean} [config.autoWrite] (optional) default true
 * @param {Object} [config.font] (optional) default context.font
 * @param {Integer} [config.pageNumber] (optional) default context.pageNumber
 * @param {Boolean} [config.wordWrap] (optional) default true. Require width > 0
 * @param {Object} [config.border] (optional)  {left: 1, top: 1, bottom: 1, right: 1, color: 'red' }
 * @param {Object} [config.margin] (optional)  {left: 1, top: 1, bottom: 1, right: 1 }
 * @param {Object} [config.padding] (optional)  {left: 1, top: 1, bottom: 1, right: 1 }
 * @param {Boolean} [config.splitOnPage] (optional)  by default false.
 *  When "splitOnPage" is true TextBox split if the text exceed the page area
 *  TextBox do not change page context but create new textBoxes to next pages.
 *  New TextBoxes stores in array property "splitItems".
 * @return {PDF.PdfTextBox}
 */
PrintToPdf.prototype.createTextBox = function (config) {
  config.context = this
  config.top = config.top || this.getPosition()
  return new PdfTextBox(config)
}

/**
 * Return output
 * @param {string} type  undefined - as string data, 'dataurlstring' - as base64, blobUrl
 * @return {string}
 */
PrintToPdf.prototype.output = function (type) {
  let pdfData, pdfLength, pdfArray, i
  this.finalizeDocument()
  if (type && (type === 'arrayBuffer')) {
    pdfData = this.pdf.output()
    pdfLength = pdfData.length
    pdfArray = new Uint8Array(new ArrayBuffer(pdfLength))

    for (i = 0; i < pdfLength; i++) {
      pdfArray[i] = pdfData.charCodeAt(i)
    }
    return pdfArray
  } else if (type && (type === 'blob')) {
    pdfData = this.pdf.output()
    pdfLength = pdfData.length
    pdfArray = new Uint8Array(new ArrayBuffer(pdfLength))

    for (i = 0; i < pdfLength; i++) {
      pdfArray[i] = pdfData.charCodeAt(i)
    }

    return new Blob([pdfArray], {type: 'application/pdf'})
  } else if (type && (type === 'blobUrl')) {
    pdfData = this.pdf.output()
    pdfLength = pdfData.length
    pdfArray = new Uint8Array(new ArrayBuffer(pdfLength))

    for (i = 0; i < pdfLength; i++) {
      pdfArray[i] = pdfData.charCodeAt(i)
    }

    // var rform = new FormData();
    this.outputBlob = new Blob([pdfArray], {type: 'application/pdf'})
    // rform.append("filename","getFileName");
    // rform.append("blob",rblob);

    return window.URL.createObjectURL(this.outputBlob)  // + '#zoom=75'
  } else {
    return this.pdf.output(type)
  }
}

/**
 * return output as local Url (createObjectURL from Blob)
 * @return {String}
 */
PrintToPdf.prototype.getOutputAsBlobUrl = function () {
  return this.output('blobUrl')
}

  // @private
PrintToPdf.prototype.finalizeDocument = function () {
  let current = new Date()
  for (let i = 0, l = this.globalTBScope.length; i < l; i++) {
    this.globalTBScope.write()
  }
  this.totalPages = this.pageNumber

  for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
    this.pageNumber = pageNum
    this.currentPosition = this.page.margin.top

    this.initColontitle(this.page.topColontitle, pageNum, current)
    this.initColontitle(this.page.bottomColontitle, pageNum, current)
    // this.pdf.shrinkPage(pageNum);
  }
  if (typeof gc === 'function') {
    gc()
    gc()
    gc()
    gc()
    gc()
  }
}

/**
 * Write html to pdf document.
 * Supported tags:
 *
 *    - `<STRONG>, <b>, <EM>, <BIG>, <i>, <h1-6>, <br/>, <p>, <span>`
 *    - `<font name="Times.." type="Bold" size="12" color="green" >`
 *    - top-level (not nested) - `<table><hr><!--pagebreak-->`
 *
 * Supported tags attributes:
 *
 *  - style="font-family: 'String'; font-weight: 'bold|normal'; font-style: 'italic|normal', font-size: Number; text-align: 'string'; "
 *  - for `table` tag also support `line-height` style attribute
 *
 *  Special features:
 *    For 'tr' tag style attribute 'disable-split'. If it is true table row will be fully on one page.
 *    For 'tr' tag style attribute 'top-through-line'. If it is true this row will be automatically added on the top of each next page.
 *
 *     <tr style="disable-split: true; top-through-line: true;">...
 *
 *
 *   For 'table' tag style attributes 'indissoluble-first-rows' and 'indissoluble-end-rows'.
 *   If value of 'indissoluble-first-rows'  more than one N first rows will be always on one page.
 *
 *
 *     <table style="indissoluble-first-rows: 5; indissoluble-end-rows: 6;">
 *
 * @param {Object} config
 * @param {String} config.html
 * HTML must be without root tag.
 * Example:
 *
 *      pdf.writeHtml({html: '<p>this <b>is bould</b> text</p>'});
 *
 *
 * @param {Integer} [config.left] (optional) default 0
 * @param {Integer} [config.top] (optional) default current position
 * @param {Integer} [config.width] (optional) default maxPageWidth limit width when more than 0
 * @param {Boolean} [config.autoWrite] (optional) default true. When false then method return array of created components but not call its write method.
 * @param {Object} [config.font] (optional) default context.font
 * @param {Integer} [config.pageNumber] (optional) default context.pageNumber
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
 * @return {[]}
 */
PrintToPdf.prototype.writeHtml = function (config) {
  // use in server xmldom lib
  let transformer = new HtmlToPdf(this)
  let res = transformer.writeHtml(config)
  if (!config.noChangePosition) {
    this.setPage(res.pageNumber, false)
    this.setPosition(res.bottom)
  }
  return res
}

PrintToPdf.prototype.circle = function (x, y, r, style, pageNumber) {
  let info = this.pdf.getCurrentPageInfo()
  pageNumber = pageNumber || this.pageNumber
  if (info.pageNumber !== pageNumber) {
    this.pdf.setPage(pageNumber)
  }
  this.pdf.circle(x, y, r, style)
  if (info.pageNumber !== pageNumber) {
    this.pdf.setPage(info.pageNumber)
  }
}

PrintToPdf.prototype.ellipse = function (x, y, rx, ry, style, pageNumber) {
  let info = this.pdf.getCurrentPageInfo()
  pageNumber = pageNumber || this.pageNumber
  if (info.pageNumber !== pageNumber) {
    this.pdf.setPage(pageNumber)
  }
  this.pdf.circle(x, y, rx, ry, style)
  if (info.pageNumber !== pageNumber) {
    this.pdf.setPage(info.pageNumber)
  }
}

PrintToPdf.prototype.rect = function (x, y, w, h, style, pageNumber) {
  let info = this.pdf.getCurrentPageInfo()
  pageNumber = pageNumber || this.pageNumber
  if (info.pageNumber !== pageNumber) {
    this.pdf.setPage(pageNumber)
  }
  this.pdf.rect(x, y, w, h, style)
  if (info.pageNumber !== pageNumber) {
    this.pdf.setPage(info.pageNumber)
  }
}

/**
 *
 * @param {Number} width
 * @param {Number} pageNumber
 */
PrintToPdf.prototype.setLineWidth = function (width, pageNumber) {
  this.requirePage(pageNumber)
  this.pdf.setLineWidthOnPage(width, pageNumber)
}

module.exports = PrintToPdf
