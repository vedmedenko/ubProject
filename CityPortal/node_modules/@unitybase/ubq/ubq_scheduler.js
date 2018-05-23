let me = ubq_scheduler

const fs = require('fs')
const {argv, LocalDataStore} = require('@unitybase/base')
const _ = require('lodash')

me.entity.addMethod('select')

/**
 *  here we store loaded forms
 */
let resultDataCache = null
const FILE_NAME_TEMPLATE = '_schedulers.json'

// calculate default value for entity attributes
let attributes = JSON.parse(me.entity.attributes.asJSON)
let defaultValues = _(attributes).toArray().filter('defaultValue').value()
    .reduce(function (result, attr) {
      result[attr.name] = attr.defaultValue
      return result
    }, {})

/**
 * Load a schedulers from a file. Override a already loaded schedulers if need
 * @param {TubModelConfig} model
 * @param {Array<Object>} loadedData Data already loaded
 */
function loadOneFile (model, loadedData) {
  let fn = model.path + FILE_NAME_TEMPLATE
  let modelName = model.name
  let content, i, l, existedItem, item

  if (!fs.existsSync(fn)) { return }
  let schedulersEnabled = (!(App.serverConfig.application.schedulers && (App.serverConfig.application.schedulers.enabled === false)))
  const FALSE_CONDITION = 'false //disabled in app config'
  try {
    content = argv.safeParseJSONfile(fn)
    if (!_.isArray(content)) {
      console.error('SCHEDULER: invalid config in %. Must be a array ob objects', fn)
      return
    }
    for (i = 0, l = content.length; i < l; i++) {
      item = content[i]
      existedItem = _.find(loadedData, {name: item.name})
      _.defaults(item, defaultValues)
      item.actualModel = modelName
      if (!schedulersEnabled) {
        item.schedulingCondition = FALSE_CONDITION
      }
      if (existedItem) { // override
        _.assign(existedItem, item)
        existedItem.overridden = '1'
      } else {
        item.ID = ncrc32(0, item.name)
        loadedData.push(item)
      }
    }
  } catch (e) {
    console.error('SCHEDULER: Invalid config in %. Error: %. File is ignored', fn, e.toString())
  }
}

function loadAll () {
  let models = App.domain.config.models
  let model, i, l
  let loadedData = []

  if (!resultDataCache) {
    console.debug('load schedulers from models directory structure')

    for (i = 0, l = models.count; i < l; i++) {
      model = models.items[i]
      loadOneFile(model, loadedData)
    }

    let attrList = Object.keys(attributes)
    resultDataCache = {
      version: 0,
      fields: attrList,
      data: LocalDataStore.arrayOfObjectsToSelectResult(loadedData, attrList)
    }
  } else {
    console.debug('ubq_scheduler: already loaded')
  }
  return resultDataCache
}

/** Retrieve data from resultDataCache and init ctxt.dataStore
 *  caller MUST set dataStore.currentDataName before call doSelect function
 * @param {ubMethodParams} ctxt
 */
function doSelect (ctxt) {
  let mP = ctxt.mParams
  let aID = mP.ID
  let cType = ctxt.dataStore.entity.cacheType
  let cachedData = loadAll()

  if (!(aID && (aID > -1)) && (cType === TubCacheType.Entity || cType === TubCacheType.SessionEntity) && (!mP.skipCache)) {
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
