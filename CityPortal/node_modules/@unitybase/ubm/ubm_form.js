/* jshint multistr:true */
/* global TubAttrDataType, ubm_form, require */
let me = ubm_form

const fs = require('fs')
const FileBasedStoreLoader = require('@unitybase/base').FileBasedStoreLoader
const LocalDataStore = require('@unitybase/base').LocalDataStore
const path = require('path')

me.entity.addMethod('select')
me.entity.addMethod('update')
me.entity.addMethod('insert')

/**
 *  here we store loaded forms
*/
let resultDataCache = null
let modelLoadDate

const JSON_CONTENT_TYPE = 'application/json; charset=UTF-8'
const DFM_CONTENT_TYPE = 'text/javascript; charset=UTF-8'
const REL_PATH_TAIL = 'forms'
const DEF_FILE_TAIL = '-fm.def'
const JS_FILE_TAIL = '-fm.js'

/**
 * Check integrity of file content. Passed as a callback to FileBasedStore.onBeforeRowAdd
 * @param {FileBasedStoreLoader} loader
 * @param {String} fullFilePath
 * @param {String} content
 * @param {Object} row
 * @return {boolean}
 */
function postProcessing (loader, fullFilePath, content, row) {
  let jsFilePath, jsFileStat

  // check entity exist in domain
  let val = row.entity
  if (!App.domainInfo.has(val)) {
    console.error(`ubm_form: Invalid //@entity attribute "${val}". File ${fullFilePath} ignored`)
    return false
  }
  // check fileName = entity code + "-fm.def"
  let parts = fullFilePath.split('\\')
  let fileName = parts[parts.length - 1]
  if (row.code) { console.warn(`Please, remove a row //@code "${row.code}" from a file ${fileName}. In UB4 form code = file name without -fm.def`) }

  row.code = fileName.substring(0, fileName.length - 7)
  // if (row.code !== fileName.substring(0, fileName.length - 7)){
  //     console.error('ubm_form: Invalid file name. Must be //@code attribute value (' + row.code + ') + "-fm.def" for ', fullFilePath)
  // }
  if (row.ID) console.warn(`Please, remove a row "//@ID ${row.ID}" from a file ${fileName}. In UB4 form ID is generated automatically as crc32(code)`)
  row.ID = ncrc32(0, row.code)

  // form can be stored in other model than entity
  // we fill relPath in form "modelName"|"path inside model public folder" as expected by mdb virtual store
  let relPath = (row.model || loader.processingRootFolder.model.name) + '|' + REL_PATH_TAIL
  // fill formDef attribute value
  row.formDef = JSON.stringify({
    fName: fileName,
    origName: fileName,
    ct: DFM_CONTENT_TYPE,
    size: content.length,
    md5: 'fb6a51668017be0950bd18c2fb0474a0',
    relPath: relPath
  })
  if (!row.model) {
    row.model = loader.processingRootFolder.model.name
  }
  // in case form js exist - fill formCode
  fileName = fileName.substring(0, fileName.length - DEF_FILE_TAIL.length) + JS_FILE_TAIL
  parts[parts.length - 1] = fileName
  jsFilePath = parts.join('\\')
  jsFileStat = fs.statSync(jsFilePath)
  if (jsFileStat) { // file exists
    row.formCode = JSON.stringify({
      fName: fileName,
      origName: fileName,
      ct: JSON_CONTENT_TYPE,
      size: jsFileStat.size,
      md5: 'fb6a51668017be0950bd18c2fb0474a0',
      relPath: relPath
    })
    // check js file modification and if later when def file - replace mi_modifyDate
    if (loader.haveModifyDate && row.mi_modifyDate < jsFileStat.mtime) {
      row.mi_modifyDate = jsFileStat.mtime
    }
  }
  return true
}

function loadAllForms () {
  var models = App.domain.config.models,
    folders = [],
    model, mPath,
    modelLastDate = new Date(App.globalCacheGet('UB_STATIC.modelsModifyDate')).getTime()

  console.debug('modelLastDate = ', modelLastDate)
  if (!resultDataCache || modelLoadDate < modelLastDate) {
    console.debug('load ubm_forms from models directory structure')

    resultDataCache = []
    for (let i = 0, l = models.count; i < l; i++) {
      model = models.items[i]
      mPath = path.join(model.publicPath, REL_PATH_TAIL)
      folders.push({
        path: mPath,
        model: model // used for fill Document content for `mdb` store in postProcessing
      })
    }
    let loader = new FileBasedStoreLoader({
      entity: me.entity,
      foldersConfig: folders,
      fileMask: /-fm\.def$/,
      onBeforeRowAdd: postProcessing
    })
    resultDataCache = loader.load()

    modelLoadDate = modelLastDate
  } else {
    console.debug('ubm_form: resultDataCache already loaded')
  }
  return resultDataCache
}

/** Retrieve data from resultDataCache and init ctxt.dataStore
 *  caller MUST set dataStore.currentDataName before call doSelect
 * @param {ubMethodParams} ctxt
 */
function doSelect (ctxt) {
  var
    mP = ctxt.mParams,
    aID = mP.ID,
    cachedData, filteredData,
    resp, cType = ctxt.dataStore.entity.cacheType,
    reqVersion

  cachedData = loadAllForms()

  if (!(aID && (aID > -1)) && (cType === TubCacheType.Entity || cType === TubCacheType.SessionEntity) && (!mP.skipCache)) {
    reqVersion = mP.version
    mP.version = resultDataCache.version
    if (reqVersion === resultDataCache.version) {
      mP.resultData = {}
      mP.resultData.notModified = true
      return
    }
  }
  filteredData = LocalDataStore.doFilterAndSort(cachedData, mP)
  // return as asked in fieldList using compact format  {fieldCount: 2, rowCount: 2, values: ["ID", "name", 1, "ss", 2, "dfd"]}
  resp = LocalDataStore.flatten(mP.fieldList, filteredData.resultData)
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
 * Check form code start from form entity code and entity exist in domain. throw exception on fail
 * TODO - check mi_modifyDate in case entity.mixins.mStorage.simpleAudit and !runParams.skipOptimisticLock
 * @param {Number} aID
 * @param {String} formCode
 * @param {String} formEntity
 */
function validateInput (aID, formCode, formEntity) {
  if (!App.domainInfo.has(formEntity)) {
    throw new Error(`<<<entity "${formEntity}" not exist in Domain>>>`)
  }

  if (!aID) {
    throw new Error('No ID parameter passed in execParams')
  }

  if (formCode.length < formEntity.length ||
        (formCode.length === formEntity.length && formCode !== formEntity) ||
        (formCode.length !== formEntity.length && formCode.substring(0, formEntity.length + 1) !== formEntity + '-')
  ) {
    throw new Error(`<<<Invalid form code format. Must be "${formEntity}-FormVersion" where FormVersion is any character string>>>`)
  }
  let theSameCode = LocalDataStore.doFilterAndSort(resultDataCache, {whereList: {
    byID: {expression: 'ID', condition: 'notEqual', values: {ID: aID}},
    byCode: {expression: 'code', condition: 'equal', values: {code: formCode}}
  }})
  if (theSameCode.total !== 0) {
    throw new Error('<<<Form with code "' + formCode + '" already exist>>>')
  }
}

/**
 * Return form body template from UBM/_templates/fileName is any or defaultBody
 * @param {String} fileName
 * @param {String} [defaultBody]
 */
function getFormBodyTpl (fileName, defaultBody) {
  let filePath = path.join(App.domain.config.models.byName('UBM').publicPath, '_templates', fileName)
  return fs.isFile(filePath) ? fs.readFileSync(filePath) : defaultBody
}
/**
 *
 * @param {ubMethodParams} ctxt
 * @param {Object} storedValue
 * @param {boolean} isInsert
 * @return {boolean}
 */
function doUpdateInsert (ctxt, storedValue, isInsert) {
  var
    mP = ctxt.mParams,
    newValues,
    newFormCodeMeta, newFormDefMeta, codeOfModelToStore,
    ID,
    docHandler, docReq, ct, docBody, attr, attrName,
    formEntity,
    entity = me.entity,
    attributes = entity.attributes

  console.debug('--==== ubm_forms.doUpdateInsert ===-')
  newValues = mP.execParams || {}
  ID = newValues.ID

  // move all attributes from execParams to storedValue
  newFormCodeMeta = newValues.formCode
  newFormDefMeta = newValues.formDef
  _.forEach(newValues, function (val, key) {
    attr = attributes.byName(key)
    if (attr && (attr.dataType !== TubAttrDataType.Document)) {
      storedValue[key] = val
    }
  })

  formEntity = App.domain.byName(storedValue.entity)
  codeOfModelToStore = storedValue.model || formEntity.modelName
  // check form -fm.js
  docReq = new TubDocumentRequest()
  docReq.entity = entity.name
  docReq.attribute = 'formCode'
  docReq.id = ID
  docReq.isDirty = Boolean(newFormCodeMeta) || isInsert
  docHandler = docReq.createHandlerObject(false)
  docHandler.loadContent(TubLoadContentBody.Yes /* WithBody */)
  docBody = docHandler.request.getBodyAsUnicodeString()
  if ((storedValue.formType === 'auto') && (!docBody || docBody === '{}')) {
    docBody = getFormBodyTpl('new_autoFormJS.mustache', 'exports.formCode = {\r\n};')
    docHandler.request.setBodyAsUnicodeString(docBody)
  } else if ((storedValue.formType === 'vue') && (!docBody || docBody === '{}')) {
    docBody = getFormBodyTpl('new_vueFormJS.mustache', 'exports.formCode = {\r\n\tinitUBComponent: function () {\r\n\r\n\t}\r\n};')
    docHandler.request.setBodyAsUnicodeString(docBody)
  }
  ct = docHandler.content
  ct.fName = storedValue.code + JS_FILE_TAIL
  ct.relPath = codeOfModelToStore + '|' + REL_PATH_TAIL
  ct.ct = JSON_CONTENT_TYPE
  docReq.isDirty = true
  docHandler.saveContentToTempStore()
  docHandler.moveToPermanentStore('')
  storedValue.formCode = JSON.stringify(ct)

  // in all case load form definition
  docReq = new TubDocumentRequest()
  docReq.entity = entity.name
  docReq.attribute = 'formDef'
  docReq.id = ID
  // if passed new form definition - load from temp store, else - from permanent
  docReq.isDirty = Boolean(newFormDefMeta) || isInsert
  docHandler = docReq.createHandlerObject(false)
  docHandler.loadContent(TubLoadContentBody.Yes /* with body */)
  docBody = docHandler.request.getBodyAsUnicodeString()
  let clearAttrReg = /^\/\/[ \t]?@(.+) "(.*)"[ \t]*\r?\n/gm // seek for //@ "bla bla" CRLF
  if (!docBody) {
    if (storedValue.formType === 'auto') {
      docBody = getFormBodyTpl('new_autoFormDef.mustache', 'exports.formDef = {\r\n\titems:[\r\n\t\t/*put your items here*/\r\n\t]\r\n};')
    } else if (storedValue.formType === 'custom') {
      let codeParts = storedValue.code.split('-')
      let className = formEntity.modelName + '.' + (codeParts[1] ? codeParts[1] : 'BetterToSetFormCodeToEntity-ClassName')
      docBody = getFormBodyTpl('new_customForm.mustache', '').replace('{{className}}', className)
    } else if (storedValue.formType === 'vue') {
      docBody = getFormBodyTpl('new_vueFormDef.mustache', '')
    }
  } else {
    docBody = docBody.replace(clearAttrReg, '') // remove all old entity attributes
  }

  let addedAttr = ''
  for (let j = 0, attrCnt = attributes.count; j < attrCnt; j++) {
    attr = attributes.items[j]
    attrName = attr.name
    if (attr.dataType !== TubAttrDataType.Document && attr.defaultView && attrName !== 'ID' && attrName !== 'code') {
      addedAttr = '// @' + attrName + ' "' + storedValue[attrName] + '"\r\n' + addedAttr
    }
  }
  docBody = '// @! "do not remove comments below unless you know what you do!"\r\n' + addedAttr + docBody
  docHandler.request.setBodyAsUnicodeString(docBody)
  ct = docHandler.content
  ct.fName = storedValue.code + DEF_FILE_TAIL
  ct.relPath = codeOfModelToStore + '|' + REL_PATH_TAIL
  ct.ct = JSON_CONTENT_TYPE
  storedValue.formDef = JSON.stringify(ct)

  docHandler.saveContentToTempStore()
  docHandler.moveToPermanentStore('')
  console.debug('--== ubm_form: resultDataCache cleared ==--')
  resultDataCache = null // drop cache. afterInsert call select and restore cache
  return true
}

/**
 *
 * @param {ubMethodParams} ctxt
 * @return {boolean}
 */
me.update = function (ctxt) {
  var
    inParams = ctxt.mParams.execParams || {},
    ID = inParams.ID

  console.debug('!!ubm_form.update-----------------')
  let cachedData = loadAllForms()
  let storedValue = LocalDataStore.byID(cachedData, ID)
  if (storedValue.total !== 1) {
    throw new Error('Record with ID=' + ID + 'not found')
  }
  storedValue = LocalDataStore.selectResultToArrayOfObjects(storedValue)[0]

  validateInput(ID, inParams.code || storedValue.code, inParams.entity || storedValue.entity)

  if (inParams.code && inParams.code !== storedValue.code) {
    throw new Error('<<<To change form code rename both *.def & *.js files & change "//@code "formCode" comment inside new def file>>>')
  }
  doUpdateInsert(ctxt, storedValue)
  ctxt.preventDefault()
  return true // everything is OK
}

me.on('delete:before', function () {
  throw new UB.UBAbort(`<<<To delete Form you must manually delete corresponding ${DEF_FILE_TAIL} and ${JS_FILE_TAIL} file(s) from model folder>>>`)
})

/**
 * Check ID is unique and perform insertion
 * @param {ubMethodParams} ctxt
 * @return {boolean}
 */
me.insert = function (ctxt) {
  var
    inParams = ctxt.mParams.execParams,
    aID = inParams.ID,
    oldValue = {}
  console.debug('--====== ubm_form.insert ====--')
  let cachedData = loadAllForms()

  validateInput(aID, inParams.code, inParams.entity)
  let row = LocalDataStore.byID(cachedData, aID)
  if (row.total) {
    throw new UB.UBAbort('<<<Form with ID ' + aID + 'already exist in domain>>>')
  }

  doUpdateInsert(ctxt, oldValue, true)
  ctxt.preventDefault()
  return true // everything is OK
}
