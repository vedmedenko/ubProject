/**
 * Utils for load data from different formats. You can find many examples of the use inside models `_initialData` folders.
 *
 * Sample:
 *
         const csvLoader = require('@unitybase/base').dataLoader
         conn = session.connection;
         csvLoader.loadSimpleCSVData(conn, path.join(__dirname, 'ubm_enum-CDN.csv'),
           'ubm_enum', 'eGroup;code;name;sortOrder'.split(';'), [0, 1, 2, 3]
         )

 * Sample with data transformation - in this case we pass transformation function to mapping
 * array instead of CSV column index:
 *
 *           var ukraineID = conn.lookup('cdn_country', 'ID',
 *              {expression: 'code', condition: 'equal', values: {code: 'UKR'}}
 *           );
             if (!ukraineID) {
                  throw new Error('Country with code UKR not found');
              }

             // CSV columns: code,regionType,name,fullName
             // we map:
             //  - parentAdminUnitID to id of Ukraine (constant)
             //  - regionTypeID fo function what lookup region ID using region code from CSV file
             csvLoader.loadSimpleCSVData(conn, __dirname + '/cdn_region_ukraine.csv', 'cdn_region',
                ['parentAdminUnitID', 'code', 'regionTypeID', 'name', 'caption', 'fullName'],
                [
                    function(){return ukraineID;},
                    0,
                    function(row){
                        var regionType;
                        regionType = conn.lookup('cdn_regiontype', 'ID', {expression: 'code', condition: 'equal', values: {code: row[1]}});
                        if (!regionType){
                            throw new Error('Unknown region type ' + row[1]);
                        }
                        return regionType;
                    },
                    2, 2, 3
                ],
                1, ','
             );

 * @module @unitybase/base/dataLoader
 * @author pavel.mash
 */

const _ = require('lodash')
const Repository = require('./ServerRepository').fabric
const csv = require('./csv1')
const fs = require('fs')
const path = require('path')

module.exports = {
  loadSimpleCSVData,
  loadArrayData,
  localizeEntity,
  lookup
}

/**
 * Load data from CSV with delimiter (";" by default)
 * @param {UBConnection} conn Connection to UnityBase server
 * @param {String} fileName Full path to file
 * @param {String} entityName Entity code to load data into
 * @param {Array<string>} ettAttributes Array of attribute codes
 * @param {Array<Number|Object|Function>} [mapping] Mapping of CSV file columns to attributes. Can be one of:
 *   - either numeric (zero based) index of column is CSV file
 *   - or lookup configuration
 *   - or function what take a array representing current row in CSW file on input and return a attribute value to bi inserted
 *  
 *   If argument is not passed, it defaults to all ettAttributes passed "as is".
 *
 * @param {Number} [startRow=0] Start from this CSV file row
 * @param {String} [delimiter=';'] CSV file delimiter
 * @param {Number} [transLen=1000} Maximum rows count to be inserted on the single database transaction
 */
function loadSimpleCSVData (conn, fileName, entityName, ettAttributes, mapping, startRow, delimiter, transLen) {
  mapping = mapping || ettAttributes.map((a, i) => i)
  if (ettAttributes.length !== mapping.length) { throw new Error('Length of ettAttributes and mapping arrays must be identical') }
  delimiter = delimiter || ';'
  transLen = transLen || 1000
  startRow = startRow || 0

  let fContent = fs.readFileSync(fileName)
  if (!fContent) { throw new Error('File ' + fileName + ' is empty or not exist') }
  fContent = fContent.trim()
  let csvData = csv.parse(fContent, delimiter)
  if (!Array.isArray(csvData)) {
    throw new Error('Invalid CSV format or file ' + fileName + ' not found')
  }
  if (csvData.length < startRow) {
    throw new Error('Length of CSVData (' + csvData.length + ') is smaller then startRow' + startRow)
  }
  if (startRow > 0) {
    csvData.splice(0, startRow)
  }
  loadArrayData(conn, csvData, entityName, ettAttributes, mapping, transLen)
}

/**
 * Load data from a array (rows) of array (columns data).
 * @param {UBConnection} conn Connection to UnityBase server
 * @param {Array} dataArray - array to load
 * @param {String} entityName Entity code to load data into
 * @param {Array<string>} ettAttributes Array of attribute codes
 * @param {Array<Number|Object|Function>} [mapping] Mapping of CSV file columns to attributes. Can be one of:
 *   - numeric (zero based) index of column is CSV file
 *   - lookup configuration
 *   - function (currentRowAsArray, newRecordID) what take a array representing current row in CSV file & new RecordID on input and return a attribute value to be inserted
 *  
 *   If argument is not passed, it defaults to all ettAttributes passed "as is".
 *
 * @param {Number} [transLen=1000] Maximum rows count to be inserted on the single database transaction
 */
function loadArrayData (conn, dataArray, entityName, ettAttributes, mapping, transLen) {
  let attrCnt = ettAttributes.length
  let curTransCnt = 0
  let cmdArray = []
  let currentRecord, cmd, valToInsert, cmdIdx, idList, a, curMapObj
  let dataLength = dataArray.length

  transLen = transLen || 1000
  mapping = mapping || ettAttributes.map((a, i) => i)

  for (let i = 0; i < dataLength; true) {
    cmdArray = []
    // fill add new array and get ID's
    for (curTransCnt = 0; (curTransCnt < transLen) && (i + curTransCnt < dataLength); ++curTransCnt) {
      cmdArray.push({entity: entityName, method: 'addnew', fieldList: ['ID'], __nativeDatasetFormat: true})
    }
    idList = conn.query(cmdArray)
        // fill insert array
    cmdArray = []
    for (curTransCnt = 0; (curTransCnt < transLen) && (i < dataLength); ++curTransCnt, ++i) {
      currentRecord = dataArray[i]
      cmdIdx = cmdArray.push({entity: entityName, method: 'insert', execParams: {ID: idList[curTransCnt].resultData[0].ID}})
      cmd = cmdArray[cmdIdx - 1]
      for (a = 0; a < attrCnt; ++a) {
        curMapObj = mapping[a]
        if (_.isNumber(curMapObj)) {
          valToInsert = currentRecord[curMapObj]
        } else if (_.isFunction(curMapObj)) {
          valToInsert = curMapObj(currentRecord, cmd.execParams.ID)
        } else {
          throw new Error('Invalid mapping definition in element#' + a)
        }
        cmd.execParams[ettAttributes[a]] = _.isUndefined(valToInsert) ? null : valToInsert
      }
    }
    conn.query(cmdArray)
  }
}

/**
 * Perform localization of entities data based on config & locale. See *.js in models `_initialData/locale` folder for usage samples.
 *
       const loader = require('@unitybase/base').dataLoader
       let localizationConfig = {
          entity: 'ubm_enum',
          keyAttribute: 'eGroup;code',
          localization: [
            {keyValue: 'UBS_MESSAGE_TYPE;user',  execParams: {name: 'Користувачів'}},
            {keyValue: 'UBS_MESSAGE_TYPE;system',  execParams: {name: 'Система'}},
            {keyValue: 'UBS_MESSAGE_TYPE;warning',  execParams: {name: 'Попереждення'}},
            {keyValue: 'UBS_MESSAGE_TYPE;information',  execParams: {name: 'Інформація'}}
          ]
       }
       loader.localizeEntity(session, localizationConfig, __filename);

 * @param {ServerSession} session
 * @param {Object} config
 * @param {String} config.entity Entity to localize
 * @param {String} config.keyAttribute Unique key attribute (language independent) we search row for localize. If the key is a component that values should be separated by a ";"
 * @param {Array.<Object>} config.localization Array of object {keyValue: valueOfKeyAttribute}, execParams: {attrToLocalize1: 'localized value', ...}} If config.keyAttribute is complex, key value must be a ; separated string
 * @param {String} locale Locale to localize to. Either locale file name (contain file start with locale^ (uk^my_data.js)) or locale ("uk")
 */
function localizeEntity (session, config, locale) {
  let command = []
  let conn = session.connection
  let defaultLang = session.appInfo.defaultLang
  let lang = path.basename(locale).split('^')[ 0 ]
  let keys = config.keyAttribute.split(';')
  let isMultyKey = (keys.length > 1)
  let idValue

  console.info('\tRun localize for', config.entity, 'to locale', lang)

  _.forEach(config.localization, function (oneRow) {
    let execParams = {}
    let lookupValue = {}
    let whereCondition = {}
    let keyValues

    if (isMultyKey && oneRow['keyValue']) {
      keyValues = oneRow['keyValue'].split(';')
    } else {
      keyValues = [oneRow['keyValue']]
    }

    _.forEach(keys, function (key, idx) {
      let lookupValue = {}
      lookupValue[key] = keyValues[idx]
      whereCondition['F' + key] = {
        expression: '[' + key + ']', condition: 'equal', values: lookupValue
      }
    })

    idValue = conn.lookup(config.entity, 'ID', whereCondition)
    if (idValue) {
       // add language prefix
      _.forEach(oneRow.execParams, function (value, key) {
        if (lang === defaultLang) {
          execParams[key] = value // update language
        } else {
          execParams[key + '_' + lang + '^'] = value // update language
        }
      })
      execParams.ID = idValue
      command.push({
        entity: config.entity,
        method: 'update',
        __skipOptimisticLock: true,
        execParams: execParams
      })
    } else {
      console.warn('\toriginal row do not found for localization condition ' + JSON.stringify(lookupValue))
    }
  })
  conn.query(command)
}

/**
 * A helper for dataLoader.  Resolves code to ID.
 * Supports combined keys, in that case, both "attributeName" and "colIndex" parameters shall be arrays.
 *
 * @example

  loader.loadArrayData(
    conn,
    [
      ['employee1@example.com', 'users'],
      ['employee2@example.com', 'users'],
      ['manager1@example.com', 'users'],
      ['manager2@example.com', 'users']
    ],
    'uba_userrole',
    ['userID', 'roleID'],
    [
      lookup(conn, 'uba_user', 'name', 0),
      lookup(conn, 'uba_role', 'name', 1)
    ],
    1000
  )

 * @param {UBConnection} conn
 * @param {string} entityName
 * @param {string|Array<string>} attributeName  Attribute name or array of names
 * @param {number|Array<number>} colIndex      Column index or indexes
 * @param {boolean} [doNotUseCache] Option to skip using cache on lookup.  Use, when entity refer itself and next rows may use previous.
 * @returns {Function}
 */
function lookup (conn, entityName, attributeName, colIndex, doNotUseCache) {
  /**
  * A function which lookup a value for dataLoader.
  * @param {UBConnection} conn
  * @param {string} entityName
  * @param {string|Array<string>} attributeName  Attribute name or array of names
  * @param {number|Array<number>} colIndex      Column index or indexes
  * @param {Array<Array>} row
  * @returns {number|null}
  */
  function doLookup (conn, entityName, attributeName, colIndex, row) {
    function buildWhereList (attrs, indexes) {
      return attrs
                .reduce(
                    (r, a, i) => r.where(a, '=', row[indexes[i]]),
                    Repository(entityName))
                .ubql().whereList
    }

    const isMultiKeys = _.isArray(attributeName)

    if (isMultiKeys ? _.every(colIndex, i => row[i] == null) : row[colIndex] == null) {
      return undefined
    }

    const whereList = isMultiKeys
            ? buildWhereList(attributeName, colIndex)
            : buildWhereList([attributeName], [colIndex])

    return conn.lookup(entityName, 'ID', whereList, doNotUseCache)
  }

  return doLookup.bind(null, conn, entityName, attributeName, colIndex)
}
