// noinspection Eslint
const me = ubs_report
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const FileBasedStoreLoader = require('@unitybase/base').FileBasedStoreLoader
const LocalDataStore = require('@unitybase/base').LocalDataStore
const UBDomain = require('@unitybase/base').UBDomain

me.entity.addMethod('select')
me.entity.addMethod('update')
me.entity.addMethod('insert')
me.entity.addMethod('testServerRendering')

/**
 *  here we store loaded forms
 */
let resultDataCache = null
let modelLoadDate

const TEMPLATE_CONTENT_TYPE = 'application/ubreport'
const CODE_BEHIND_CONTENT_TYPE = 'application/def'
const REL_PATH_TAIL = 'reports'
const TEMPLATE_EXTENSION = '.template'
const CODE_BEHIND_EXTENSION = '.js'

const REPORT_BODY_TPL = `
exports.reportCode = {
  /**
  * This function must be defined in report code block.
  *
  * Inside function you must:
  * 1) Prepare data
  * 2) Run method this.buildHTML(reportData); where reportData is data for mustache template
  * 3) If need create PDF run method this.transformToPdf(htmlReport); where htmlReport is HTML
  * 4) If is server side function must return report as string otherwise Promise or string
  *
  * @cfg {function} buildReport
  * @params {[]|{}} reportParams
  * @returns {Promise|Object} If code run on server method must return report data.
  * Promise object must be resolved report code
  */
  buildReport: function(reportParams){
    var result = this.buildHTML(reportParams)
    if (this.reportType === 'pdf') {
        result = this.transformToPdf(result)
    }
    return result
  }
}
`
/**
 * Check integrity of file content. Passed as a callback to FileBasedStore.onBeforeRowAdd
 * @param {FileBasedStoreLoader} loader
 * @param {String} fullFilePath
 * @param {String} content
 * @param {Object} row
 * @return {boolean}
 */
function postProcessing (loader, fullFilePath, content, row) {
  // we fill relPath in form "modelName"|"path inside model public folder" as expected by mdb virtual store
  let relPath = loader.processingRootFolder.model.name + '|' + REL_PATH_TAIL

  // fill model attribute by current folder model name
  row.model = loader.processingRootFolder.model.name

  // fill name attribute with file name w/o ".xml" extension
  let parts = fullFilePath.split('\\')
  let fileName = parts[parts.length - 1]
  row.report_code = fileName.substring(0, fileName.length - TEMPLATE_EXTENSION.length)

  if (row.ID) console.warn(`Please, remove a row "<!--@ID "${row.ID}"-->" from a file ${fileName}. In UB4 report ID is generated automatically as crc32(fileNameWoExtension)`)
  row.ID = ncrc32(0, row.report_code)

    // fill formDef attribute value
  row.template = JSON.stringify({
    fName: fileName,
    origName: fileName,
    ct: TEMPLATE_CONTENT_TYPE,
    size: content.length,
    md5: 'fakemd50000000000000000000000000',
    relPath: relPath
  })

  fileName = fileName.substring(0, fileName.length - TEMPLATE_EXTENSION.length) + CODE_BEHIND_EXTENSION
  parts[parts.length - 1] = fileName
  let jsFilePath = parts.join('\\')
  let jsFileStat = fs.statSync(jsFilePath)
  if (jsFileStat) { // file exists
    row.code = JSON.stringify({
      fName: fileName,
      origName: fileName,
      ct: CODE_BEHIND_CONTENT_TYPE,
      size: jsFileStat.size,
      md5: 'fakemd50000000000000000000000000',
      relPath: relPath
    })
    // check js file modification and if later when def file - replace mi_modifyDate
    if (loader.haveModifyDate && row.mi_modifyDate < jsFileStat.mtime) {
      row.mi_modifyDate = jsFileStat.mtime
    }
  }

  return true
}

function loadAll () {
  const models = App.domainInfo.models
  let folders = []
  let modelLastDate = new Date(App.globalCacheGet('UB_STATIC.modelsModifyDate')).getTime()

  console.debug('modelLastDate = ', modelLastDate)
  if (!resultDataCache || modelLoadDate < modelLastDate) {
    console.debug('load reports from models directory structure')

    for (let modelCode in models) {
      let model = models[modelCode]
      let mPath = path.join(model.realPublicPath, REL_PATH_TAIL)
      folders.push({
        path: mPath,
        model: model // used for fill Document content for `mdb` store in postProcessing
      })
    }
    let loader = new FileBasedStoreLoader({
      entity: me.entity,
      foldersConfig: folders,
      fileMask: new RegExp(TEMPLATE_EXTENSION + '$'),
      attributeRegExpString: FileBasedStoreLoader.XML_ATTRIBURE_REGEXP,
      onBeforeRowAdd: postProcessing
    })
    resultDataCache = loader.load()

    modelLoadDate = modelLastDate
  } else {
    console.debug('ubs_report: resultDataCache already loaded')
  }
  return resultDataCache
}

/** Retrieve data from resultDataCache and init ctxt.dataStore
 *  caller MUST set dataStore.currentDataName before call doSelect function
 * @param {ubMethodParams} ctxt
 */
function doSelect (ctxt) {
  const cType = ctxt.dataStore.entity.cacheType
  let mP = ctxt.mParams
  let aID = mP.ID

  let cachedData = loadAll()

  if (!(aID && (aID > -1)) && (cType === UBDomain.EntityCacheTypes.Entity || cType === UBDomain.EntityCacheTypes.Entity) && (!mP.skipCache)) {
    let reqVersion = mP.version
    mP.version = resultDataCache.version
    if (reqVersion === resultDataCache.version) {
      mP.resultData = {}
      mP.resultData.notModified = true
      return
    }
  }
  let filteredData = LocalDataStore.doFilterAndSort(cachedData, mP)
    // return as asked in fieldList using compact format  {fieldCount: 2, rowCount: 2, values: ["ID", "name", 1, "ss", 2, "dfd"]}
  let resp = LocalDataStore.flatten(mP.fieldList, filteredData.resultData)
  ctxt.dataStore.initFromJSON(resp)
}

/**
 *
 * @param {ubMethodParams} ctxt
 * @return {Boolean}
 */
me.select = function (ctxt) {
  ctxt.dataStore.currentDataName = 'select' // TODO надо или нет????
  doSelect(ctxt)
  ctxt.preventDefault()
  return true // everything is OK
}

/**
 * Check model exists
 * @param {Number} aID
 * @param {String} modelName
 */
function validateInput (aID, modelName) {
  let model = App.domainInfo.models[modelName]
  if (!model) {
    throw new Error(`ubs_report: Invalid model attribute value "${modelName}". Model not exist in domain`)
  }

  if (!aID) {
    throw new Error('No ID parameter passed in execParams')
  }
}

/**
 *
 * @param {ubMethodParams} ctxt
 * @param {Object} storedValue
 * @param {Boolean} isInsert
 * @return {boolean}
 */
function doUpdateInsert (ctxt, storedValue, isInsert) {
  let mP = ctxt.mParams
  let entity = App.domainInfo.get('ubs_report') // me.entity,
  let attributes = entity.attributes

  let newValues = mP.execParams || {}
  let ID = newValues.ID

  // move all attributes from execParams to storedValue
  _.forEach(newValues, function (val, key) {
    let attr = attributes[key]
    if (attr && (attr.dataType !== UBDomain.ubDataTypes.Document)) {
      storedValue[key] = val
    }
  })

  let newDocument = newValues.template
  let nDoc = newDocument ? JSON.parse(newDocument) : undefined

  let docReq = new TubDocumentRequest()
  docReq.entity = entity.name
  docReq.attribute = 'template'
  docReq.id = ID
  docReq.isDirty = nDoc ? !!nDoc.isDirty : !!isInsert // Boolean(!newDocument);
  let docHandler = docReq.createHandlerObject(false)
  docHandler.loadContent(TubLoadContentBody.Yes /* WithBody */)
  let docBody = docHandler.request.getBodyAsUnicodeString()
  if (docBody) {
    let clearAttrReg = new RegExp(FileBasedStoreLoader.XML_ATTRIBURE_REGEXP, 'gm') // seek for <!--@attr "bla bla"-->CRLF
        // docBody = '<!--@ID "' + ID + '"-->\r\n' + docBody.replace(clearAttrReg, ''); // remove all old entity attributes
    docBody = docBody.replace(clearAttrReg, '')
  }
  for (let attrName in attributes) {
    let attr = attributes[attrName]
    if (attr.dataType !== UBDomain.ubDataTypes.Document &&
      attr.defaultView && attrName !== 'ID' && attrName !== 'report_code') {
      docBody = '<!--@' + attrName + ' "' + storedValue[attrName] + '"-->\r\n' + docBody
    }
  }
  docHandler.request.setBodyAsUnicodeString(docBody)

  let ct = docHandler.content
  ct.fName = storedValue.report_code + TEMPLATE_EXTENSION
  ct.relPath = storedValue.model + '|' + REL_PATH_TAIL
  ct.ct = TEMPLATE_CONTENT_TYPE
  docReq.isDirty = true
  docHandler.saveContentToTempStore()
  docHandler.moveToPermanentStore('')
  storedValue.template = JSON.stringify(ct)

  newDocument = newValues.code
  if (newDocument) {
    nDoc = JSON.parse(newDocument)
  }
  docReq = new TubDocumentRequest()
  docReq.entity = entity.name
  docReq.attribute = 'code'
  docReq.id = ID
    // if passed new form definition - load from temp store, else - from permanent
  docReq.isDirty = !!newDocument || isInsert // !!newDocument Boolean(newDocument);
  docHandler = docReq.createHandlerObject(false)
  docHandler.loadContent(TubLoadContentBody.Yes /* with body */)
  docBody = docHandler.request.getBodyAsUnicodeString()
  if ((!docBody || docBody === '{}') && newDocument === undefined) {
    docBody = REPORT_BODY_TPL
  }

  docHandler.request.setBodyAsUnicodeString(docBody)
  ct = docHandler.content
  ct.fName = storedValue.report_code + CODE_BEHIND_EXTENSION
  ct.relPath = storedValue.model + '|' + REL_PATH_TAIL
  ct.ct = CODE_BEHIND_CONTENT_TYPE
  storedValue.code = JSON.stringify(ct)

  docHandler.saveContentToTempStore()
  docHandler.moveToPermanentStore('')

  resultDataCache = null // drop cache. afterInsert call select and restore cache
  return true
}

/**
 *
 * @param {ubMethodParams} ctxt
 * @return {boolean}
 */
me.update = function (ctxt) {
  let inParams = ctxt.mParams.execParams || {}
  let ID = inParams.ID

  let cachedData = loadAll()
  let storedValue = LocalDataStore.byID(cachedData, ID)
  if (storedValue.total !== 1) {
    throw new Error('Record with ID=' + ID + 'not found')
  }
  storedValue = LocalDataStore.selectResultToArrayOfObjects(storedValue)[0]

  validateInput(ID, inParams.model || storedValue.model)

  doUpdateInsert(ctxt, storedValue)

  ctxt.preventDefault()
  return true // everything is OK
}

me.on('delete:before', function () {
  throw new Error('<<<To delete Report you must manually delete corresponding xml file from modelFolder/public/reports folder>>>')
})

/**
 * Check ID is unique and perform insertion
 * @param {ubMethodParams} ctxt
 * @return {boolean}
 */
me.insert = function (ctxt) {
  let inParams = ctxt.mParams.execParams
  let ID = inParams.ID
  let oldValue = {}

  let cachedData = loadAll()
  validateInput(ID, inParams.model)

  let row = LocalDataStore.byID(cachedData, ID)
  if (row.total) {
    throw new Error('<<<Report with ID ' + ID + ' already exist>>>')
  }

  doUpdateInsert(ctxt, oldValue, true)
  ctxt.preventDefault()
  return true // everything is OK
}

const mime = require('mime-types')
/**
 * REST endpoint for Report test purpose
 * Expect POST request with JSON on body {reportCode: 'reportCode', responseType: 'pdf'|'html', reportParams: {paramName: paramValue, ...}}
 * Return a HTML/PDF
 * @param {null} ctxt
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
me.testServerRendering = function (ctxt, req, resp) {
  let body = req.read()
  let params = JSON.parse(body)
  const UBServerReport = require('./modules/UBServerReport')
  let result = UBServerReport.makeReport(params.reportCode, params.responseType, params.reportParams)

  if (result.reportType === 'pdf') {
    console.debug('Generate a PDF report of size=', result.reportData.byteLength)
  } else {
    console.debug('Generate a HTML report of size=', result.reportData.length)
  }
  resp.writeEnd(result.reportData)
  resp.writeHead(resp.writeHead('Content-Type: ' + mime.lookup(result.reportType)))
  resp.statusCode = 200

}
