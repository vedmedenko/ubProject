/**
 * UnityBase file-system based virtual store **select**. Able to load files & transform it content to {@link TubCachedData} format.
 *
 * Good sample of usage can be found in `ubm_form.loadAllForm`
 *
 * For work with data, loaded by FileBasedStoreLoader you can use {@link LocalDataStore} class.
 * @module @unitybase/base/FileBasedStoreLoader
 */

const lds = require('./LocalDataStore')
const path = require('path')
const UBDomain = require('./UBDomain')
const _ = require('lodash')

module.exports = FileBasedStoreLoader
/**
 * @example

    const FileBasedStoreLoader = require('@unitybase/base')FileBasedStoreLoader
    let loader = new FileBasedStoreLoader({
      entity: me.entity,
      foldersConfig: folders,
      fileMask: /-fm\.def$/,
      onBeforeRowAdd: postProcessing
    });
    let resultDataCache = loader.load()

 * @class
 * @param {Object}    config
 * @param {TubEntity|UBEntity} config.entity
 * @param {Array.<{path: string}>} config.foldersConfig   Array of folder configuration to scan for files.
 *                                              Necessary param is path - path to folder. You can also pass additional information
 *                                              for use in  `onBeforeRowAdd` and `onNewFolder` callbacks.
 *                                              Currently processed root folder accessible from FileBasedStoreLoader.processingRootFolder
 * @param {Boolean}   config.zipToArray     Transform result from array of object to array-of-array representation. Default true
 * @param {Boolean}   config.uniqueID       Result data must contain ID attribute and values must be unique. Default true.
 * @param {RegExp}    [config.fileMask]     Regular expression to filter folder files. Each fileName (without path) will be tested by this regExp
 * @param {String}    [config.attributeRegExpString] String representation of regular expression to found attribute and it value in input content.
 *                                                   Default is '^\\/\\/@(\\w+)\\s"(.*?)"' what mean find all string like: //@attribute "value"
 *                                                   You can pass empty string to disable attribute parsing by regExp and do it manually in `onBeforeRowAdd` handler.
 * @param {Function}  [config.onBeforeRowAdd] Callback called for each row BEFORE it added to store. In case it return false row not added.
 *                          Called with args (this: FileBasedStoreLoader, fullFilePath: string, fileContent: string, oneRow: Object);
 * @param {Function}  [config.onNewFolder] Callback called for each new folder in case of recursive folder.
 *                          In case callback return false or not defined - folder not processed.
 *                          Called with args (this: FileBasedStoreLoader, fullFolderPath: string, recursionLevel: integer);
 */
function FileBasedStoreLoader (config) {
  let entityAttributes
  if (config.entity instanceof UBDomain.UBEntity) {
    entityAttributes = config.entity.attributes
  } else {
    entityAttributes = App.domainInfo.get(config.entity.name).attributes
  }

  /**
   * Configuration
   * @type {Object}
   */
  this.config = _.clone(config)
  if (!Array.isArray(config.foldersConfig)) {
    throw new Error('config.foldersConfig must be array')
  }
  if (config.attributeRegExpString !== '') {
    this.config.attributeRegExpString = config.attributeRegExpString || FileBasedStoreLoader.JSON_ATTRIBURE_REGEXP
  }

  if (!this.config.hasOwnProperty('uniqueID')) { this.config.uniqueID = true }
  if (!this.config.hasOwnProperty('zipToArray')) { this.config.zipToArray = true }

  /**
   * Entity attributes array
   * @type {Array.<Object>}
   * @readonly
   */
  this.attributes = []
  for (let attrName in entityAttributes) {
    let attr = entityAttributes[attrName]
    this.attributes.push({
      name: attr.name,
      dataType: attr.dataType,
      defaultValue: attr.defaultValue,
      defaultView: attr.defaultView
    })
  }
  /**
   * Is `mStore.simpleAudit` enabled for current entity (exist `mi_modifyDate` attribute)
   * @type {Boolean}
   * @readonly
   */
  this.haveModifyDate = Boolean(_.find(this.attributes, {name: 'mi_modifyDate'}))
  /**
   * Is `mStore.simpleAudit` enabled for current entity (exist `mi_createDate` attribute)
   * @type {Boolean}
   * @readonly
   */
  this.haveCreateDate = Boolean(_.find(this.attributes, {name: 'mi_createDate'}))

  /**
   * Currently processed root folder
   * @type {*}
   * @readonly
   */
  this.processingRootFolder = null
}

FileBasedStoreLoader.JSON_ATTRIBURE_REGEXP = '^\\/\\/[ \t]?@(\\w+)\\s"(.*?)"'
FileBasedStoreLoader.XML_ATTRIBURE_REGEXP = '<!--@(\\w+)\\s*"(.+)"\\s*-->'

/**
 * Perform actual loading.
 * @return {TubCachedData}
 */
FileBasedStoreLoader.prototype.load = function () {
  let me = this
  let result

  /**
   * Array of Object representing dirty result
   * @type {Array.<Object>}
   * @protected
   */
  this.resultCollection = []
  me.config.foldersConfig.forEach(function (folderConfig) {
    me.processingRootFolder = folderConfig
    me.parseFolder(folderConfig.path, 0)
  })
    // transformation to array=of=array
  if (me.config.zipToArray) {
    result = {
      data: [],
      fields: [],
      rowCount: 0
    }
    result.fields = _.map(me.attributes, 'name')
    result.data = lds.arrayOfObjectsToSelectResult(me.resultCollection, result.fields)
    result.rowCount = result.data.length
    let l = result.fields.indexOf('mi_modifyDate')
    if (l !== -1) {
      let dataVersion = 0
      // for UnityBase calculate accum of crc32(prev, fileDate.toString()) and forms count
      if (typeof ncrc32 === 'function') {
        result.data.forEach((row) => {
          dataVersion = ncrc32(dataVersion, '' + row[l])
        })
        result.version = ncrc32(dataVersion, '' + result.data.length)
      } else {
        // for NodeJS - max date
        // we can update one model earlier than other, so max date of file changes is a bad choice
        result.data.forEach((row) => {
          if (dataVersion < row[l]) {
            dataVersion = row[l]
          }
        })
        // add a row count for case when some row are deleted or added with old date
        result.version = new Date(dataVersion).getTime() + result.data.length
      }

    }
  } else {
    result = me.resultCollection
  }
  me.resultCollection = []
  return result
}

/**
 * @method parseFolder
 * @protected
 * @param {String} folderPath Folder to parse
 * @param {Number} recursionLevel current level of folder recursion
 */
FileBasedStoreLoader.prototype.parseFolder = function (folderPath, recursionLevel) {
  const fs = require('fs')
  const config = this.config

  if (!fs.existsSync(folderPath)) {
    return
  }

  if (config.onNewFolder) {
    if (config.onNewFolder(this, folderPath, recursionLevel) === false) return
  }
  let folderFiles = fs.readdirSync(folderPath)

  folderFiles.forEach((fileName) => {
    let fullPath = path.join(folderPath, fileName)
    let stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      if (config.onNewFolder) {
        let newFolderCheck = config.onNewFolder(this, folderPath + fileName, recursionLevel + 1)
        if (newFolderCheck !== false) {
          this.parseFolder(fullPath + '\\', recursionLevel + 1)
        }
      }
    } else if (!this.config.fileMask || this.config.fileMask.test(fileName)) { // filtration by mask
      let content = fs.readFileSync(fullPath)
      let oneRow = this.extractAttributesValues(content)

      if (this.haveModifyDate) {
        oneRow['mi_modifyDate'] = stat.mtime
      }
      if (this.haveCreateDate) {
        oneRow['mi_createDate'] = stat.ctime
      }
      let canAdd = this.config.onBeforeRowAdd ? this.config.onBeforeRowAdd(this, fullPath, content, oneRow) : true
      // check unique ID
      if (canAdd && config.uniqueID) {
        if (!oneRow.ID) {
          console.error('Parameter ID not set. File "%" ignored', fullPath)
          canAdd = false
        } else if (_.find(this.resultCollection, {ID: oneRow.ID})) {
          console.error('Record with ID "' + oneRow.ID + '" already exist. File ignored ', fullPath)
          canAdd = false
        }
      }
      if (canAdd) {
        this.resultCollection.push(oneRow)
      }
    }
  })
}

/**
 * Extract attribute values from content using regular expression passed in the config.attributeRegExpString.
 *
 * Convert values from string representation to JS data type using entity attribute dataType information
 *
 * Add default values for missed attributes
 *
 * @private
 * @param {String} content
 * @result {Object} dictionary looking like {attrbuteName: "value"}
 */
FileBasedStoreLoader.prototype.extractAttributesValues = function (content) {
  const me = this
  let regexp = me.config.attributeRegExpString ? new RegExp(me.config.attributeRegExpString, 'gm') : false
  let result = {}

    // extraction block
  if (regexp !== false) {
    let attrVal = regexp.exec(content)
    while (attrVal !== null) {
      result[attrVal[1]] = attrVal[2]
      attrVal = regexp.exec(content)
    }
  }
    // default block
  me.attributes.forEach(function (attribute) {
    if (attribute.defaultValue !== '' && !result[attribute.name]) {
      result[attribute.name] = attribute.defaultValue
    }
  })
    // transformation block
  _.forEach(result, function (value, attribute) {
    let attr = _.find(me.attributes, {name: attribute})

    if (!attr) { return }
    switch (attr.dataType) {
      case UBDomain.ubDataTypes.Int:
      case UBDomain.ubDataTypes.BigInt:
      case UBDomain.ubDataTypes.ID:
      case UBDomain.ubDataTypes.Float:
      case UBDomain.ubDataTypes.Currency:
      case UBDomain.ubDataTypes.Entity:
      case UBDomain.ubDataTypes.TimeLog:
        result[attribute] = +value
        break
      case UBDomain.ubDataTypes.Boolean:
        result[attribute] = (value === true) || (value === 'true') || (value === '1')
        break
      case UBDomain.ubDataTypes.DateTime:
        result[attribute] = _.isDate(value) ? value : new Date(value)
        break
      case UBDomain.ubDataTypes.Unknown:
      case UBDomain.ubDataTypes.String:
      case UBDomain.ubDataTypes.Text:
      case UBDomain.ubDataTypes.Many:
      case UBDomain.ubDataTypes.Document:
      case UBDomain.ubDataTypes.Enum:
      case UBDomain.ubDataTypes.BLOB:
        break // just to be sure we handle all types
      default:
        throw new Error('Unknown attribute type ' + attr.dataType)
    }
  })
  return result
}
