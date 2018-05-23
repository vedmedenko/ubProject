/**
 * Helper class for manipulation with data, stored locally in ({@link TubCachedData} format).
 *
 * This module shared between client & server. In case of server we use it together with {@link dataLoader},
 * in case of client - inside {@link UBConnection#select} to handle operations with entity data cached in IndexedDB.
 *
 * For server-side samples see ubm_forms.doSelect method implementation.
 *
 * Client-side sample:
 *
 *         $App.connection.run({
                entity: 'tst_IDMapping',
                method: 'addnew',
                fieldList: ['ID', 'code']
           }).done(function(result){
                // here result in array-of-array format: [{"entity":"tst_IDMapping","method":"addnew","fieldList":["ID","code"],"__fieldListExternal":["ID","code"],"resultData":{"fields":["ID","code"],"rowCount": 1, "data":[[3500000016003,null]]}}]
                var objArray = UB.LocalDataStore.selectResultToArrayOfObjects(result); // transform array-of-array result representation to array-of-object
                console.log(objArray); // now result in more simple array-of-object format: [{ID: 12312312312, code: null}]
           });

 * @module @unitybase/base/LocalDataStore
 */
/*
 @author pavel.mash
 */

// ***********   !!!!WARNING!!!!! **********************
// Module shared between server and client code

const _ = require('lodash')
/**
 * Format for UBQ select request
 * @typedef {Object} TubSelectRequest
 * @property {Array<String>} fieldList Array of entity attribute names
 * @property {Object} whereList Where clauses
 * @property {Object} orderList Order clauses
 * @property {Object} options Options
 * @property {Number} ID ID
 */

/**
 * Format for data, stored in client-side cache
 * @typedef {Object} TubCachedData
 * @property {Array<Array>} data
 * @property {Array<String>} fields
 * @property {Number} rowCount
 * @property {Number} [version] A data version in case `mi_modifyDate` is in fields
 */

/**
 * Perform local filtration and sorting of data array according to ubRequest whereList & order list
 * @param {TubCachedData} cachedData Data, retrieved from cache
 * @param {TubSelectRequest} ubRequest Initial server request
 * @returns {*} new filtered & sorted array
 */
module.exports.doFilterAndSort = function (cachedData, ubRequest) {
  let rangeStart

  let filteredData = this.doFiltration(cachedData, ubRequest)
  let totalLength = filteredData.length
  this.doSorting(filteredData, cachedData, ubRequest)
    // apply options start & limit
  if (ubRequest.options) {
    rangeStart = ubRequest.options.start || 0
    if (ubRequest.options.limit) {
      filteredData = filteredData.slice(rangeStart, rangeStart + ubRequest.options.limit)
    } else {
      filteredData = filteredData.slice(rangeStart)
    }
  }
  return {
    resultData: {
      data: filteredData,
      fields: cachedData.fields
    },
    total: totalLength
  }
}

/**
 * Just a helper for search cached data by row ID
 * @param {TubCachedData} cachedData Data, retrieved from cache
 * @param {Number} IDValue row ID.
 */
module.exports.byID = function (cachedData, IDValue) {
  return this.doFilterAndSort(cachedData, {ID: IDValue})
}

/**
 * Apply ubRequest.whereList to data array and return new array contain filtered data
 * @protected
 * @param {TubCachedData} cachedData Data, retrieved from cache
 * @param {TubSelectRequest} ubRequest
 * @returns {Array.<Array>}
 */
module.exports.doFiltration = function (cachedData, ubRequest) {
  let f, isAcceptable
  let rawDataArray = cachedData.data
  let byPrimaryKey = Boolean(ubRequest.ID)

  let filterFabric = whereListToFunctions(ubRequest, cachedData.fields)
  let filterCount = filterFabric.length

  if (filterCount === 0) {
    return rawDataArray
  }

  let result = []
  let l = rawDataArray.length
  let i = -1
  while (++i < l) { // for each data
    isAcceptable = true; f = -1
    while (++f < filterCount && isAcceptable === true) {
      isAcceptable = filterFabric[f](rawDataArray[i])
    }
    if (isAcceptable) {
      result.push(rawDataArray[i])
      if (byPrimaryKey) {
        return result
      }
    }
  }
  return result
}

/**
 * Apply ubRequest.orderList to inputArray (inputArray is modified)
 * @protected
 * @param {Array.<Array>} filteredArray
 * @param {TubCachedData} cachedData
 * @param {Object} ubRequest
 */
module.exports.doSorting = function (filteredArray, cachedData, ubRequest) {
  let preparedOrder = []
  if (ubRequest.orderList) {
    _.each(ubRequest.orderList, function (orderItem) {
      let attrIdx = cachedData.fields.indexOf(orderItem.expression)
      if (attrIdx < 0) {
        throw new Error('Ordering by ' + orderItem.expression + ' attribute that don\'t present in fieldList not allowed')
      }
      preparedOrder.push({
        idx: attrIdx,
        modifier: (orderItem.order === 'desc') ? -1 : 1
      })
    })
    let orderLen = preparedOrder.length
    if (orderLen) {
      let compareFn = function (v1, v2) {
        let res = 0
        let idx = -1
        while (++idx < orderLen && res === 0) {
          let colNum = preparedOrder[idx].idx
          if (v1[colNum] !== v2[colNum]) {
            if (v1[colNum] === null && v2[colNum] !== null) {
              res = 1
            } else if (v2[colNum] === null && v1[colNum] !== null) {
              res = -1
            } else if (v2[colNum] === null && v1[colNum] === null) {
              res = 0
            } else if (v1[colNum] > v2[colNum]) {
              res = 1
            } else {
              res = -1
            }
            res = res * preparedOrder[idx].modifier
          }
        }
        return res
      }
      filteredArray.sort(compareFn)
    }
  }
}

/**
 * Transform whereList to array of function
 * @private
 * @param {TubSelectRequest} request
 * @param {Array.<String>} fieldList
 * @returns {Array}
 */
function whereListToFunctions (request, fieldList) {
  Object.keys(request) // FIX BUG WITH TubList TODO - rewrite to native
  let propIdx, fValue, filterFabricFn
  let filters = []
  let escapeForRegexp = function (text) {
    // convert text to string
    return text ? ('' + text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') : ''
  }
  let whereList = request.whereList

  filterFabricFn = function (propertyIdx, condition, value) {
    let regExpFilter

    switch (condition) {
      case 'like':
        regExpFilter = new RegExp(escapeForRegexp(value), 'i')
        return function (record) {
          let val = record[propertyIdx]
          return val && regExpFilter.test(val)
        }
      case 'equal':
        return function (record) {
          return record[propertyIdx] === value
        }
      case 'notEqual':
        return function (record) {
          return record[propertyIdx] !== value
        }
      case 'more':
        return function (record) {
          return record[propertyIdx] > value
        }
      case 'moreEqual':
        return function (record) {
          return record[propertyIdx] >= value
        }
      case 'less':
        return function (record) {
          return record[propertyIdx] < value
        }
      case 'lessEqual':
        return function (record) {
          return record[propertyIdx] <= value
        }
      case 'isNull':
        return function (record) {
          return record[propertyIdx] === null
        }
      case 'notIsNull':
        return function (record) {
          return record[propertyIdx] !== null
        }
      case 'notLike':
        regExpFilter = new RegExp(escapeForRegexp(value), 'i')
        return function (record) {
          let val = record[propertyIdx]
          return val && !regExpFilter.test(val)
        }
      case 'startWith':
        return function (record) {
          let str = record[propertyIdx]
          return (str && str.indexOf(value) === 0)
        }
      case 'notStartWith':
        return function (record) {
          let str = record[propertyIdx]
          return str && str.indexOf(value) !== 0
        }
      case 'in':
        return function (record) {
          let str = record[propertyIdx]
          return str && value.indexOf(str) >= 0
        }
      case 'notIn':
        return function (record) {
          let str = record[propertyIdx]
          return str && value.indexOf(str) < 0
        }
      default:
        throw new Error('Unknown whereList condition')
    }
  }

  function transformClause (clause) {
    let property = clause.expression || ''

    if (clause.condition === 'custom') {
      throw new Error('Condition "custom" is not supported for cached instances.')
    }
    property = (property.replace(/(\[)|(])/ig, '') || '').trim()
    propIdx = fieldList.indexOf(property)
    if (propIdx === -1) {
      throw new Error('Filtering by field ' + property + ' is not allowed, because it is not in fieldList')
    }

    fValue = _.values(clause.values)[0]
    filters.push(filterFabricFn(propIdx, clause.condition, fValue))
  }
    // check for top level ID  - in this case add condition for filter by ID
  const reqID = request.ID
  if (reqID) {
    transformClause({expression: '[ID]', condition: 'equal', values: {ID: reqID}})
  }
  _.forEach(whereList, transformClause)
  return filters
}

/**
 * Transform result of {@link UBConnection#select} response
 * from Array of Array representation to Array of Object.
 *
 *      LocalDataStore.selectResultToArrayOfObjects({resultData: {
 *          data: [['row1_attr1Val', 1], ['row2_attr2Val', 22]],
 *          fields: ['attrID.name', 'attr2']}
 *      });
 *      // result is:
 *      // [{"attrID.name": "row1_attr1Val", attr2: 1},
 *      //  {"attrID.name": "row2_attr2Val", attr2: 22}
 *      // ]
 *
 *      // object keys simplify by passing fieldAliases
 *      LocalDataStore.selectResultToArrayOfObjects({resultData: {
 *          data: [['row1_attr1Val', 1], ['row2_attr2Val', 22]],
 *          fields: ['attrID.name', 'attr2']}
 *      }, {'attrID.name': 'attr1Name'});
 *      // result is:
 *      // [{attr1Name: "row1_attr1Val", attr2: 1},
 *      //  {attr1Name: "row2_attr2Val", attr2: 22}
 *      // ]
 *
 * @param {{resultData: TubCachedData}} selectResult
 * @param {Object<string, string>} [fieldAlias] Optional object to change attribute names during transform array to object. Keys are original names, values - new names
 * @returns {Array.<*>}
 */
module.exports.selectResultToArrayOfObjects = function (selectResult, fieldAlias) {
  let inData = selectResult.resultData.data
  let inAttributes = selectResult.resultData.fields
  let inDataLength = inData.length
  let result = inDataLength ? new Array(inDataLength) : []
  if (fieldAlias) {
    _.forEach(fieldAlias, function (alias, field) {
      let idx = inAttributes.indexOf(field)
      if (idx >= 0) {
        inAttributes[idx] = alias
      }
    })
  }
  for (let i = 0; i < inDataLength; i++) {
    result[i] = _.zipObject(inAttributes, inData[i])
  }
  return result
}

/**
 * Flatten cached data (or result of {@link LocalDataStore#doFilterAndSort}.resultData )
 * to Object expected by TubDataStore.initialize Flatten format (faster than [{}..] format).
 *
        //consider we have cached data in variable filteredData.resultData
        // to initialize dataStore with cached data:
        mySelectMethod = function(ctxt){
            var fieldList = ctxt.mParams.fieldList;
            resp = LocalDataStore.flatten(fieldList, filteredData.resultData);
            ctxt.dataStore.initFromJSON(resp);
        }
 *
 * cachedData may contain more field or field in order not in requestedFieldList - in this case we use expectedFieldList
 * @param {Array.<string>} requestedFieldList Array of attributes to transform to. Can be ['*'] - in this case we return all cached attributes
 * @param {TubCachedData} cachedData
 * @result {{fieldCount: number, rowCount: number, values: array.<*>}}
 */
module.exports.flatten = function (requestedFieldList, cachedData) {
  let fldIdxArr = []
  let cachedFields = cachedData.fields
  let rowIdx = -1
  let col = -1
  let pos = 0
  let resultData = []
  let rowCount = cachedData.data.length
  let idx, row, fieldCount

  if (!requestedFieldList || !requestedFieldList.length) {
    throw new Error('fieldList not exist or empty')
  }

    // client ask for all attributes
  if (requestedFieldList.length === 1 && requestedFieldList[0] === '*') {
    requestedFieldList = cachedData.fields
  }

  requestedFieldList.forEach(function (field) {
    idx = cachedFields.indexOf(field)
    if (idx !== -1) {
      fldIdxArr.push(idx)
    } else {
      throw new Error('Invalid field list. Attribute ' + field + ' not found in local data store')
    }
  })
  fieldCount = requestedFieldList.length
  resultData.length = rowCount * (fieldCount + 1) // reserve fieldCount for field names
  while (++col < fieldCount) {
    resultData[pos] = requestedFieldList[pos]; pos++
  }
  while (++rowIdx < rowCount) {
    col = -1; row = cachedData.data[rowIdx]
    while (++col < fieldCount) {
      resultData[pos++] = row[ fldIdxArr[col] ]
    }
  }
  return {fieldCount: fieldCount, rowCount: rowCount, values: resultData}
}

/**
 * Reverse conversion to {@link LocalDataStore#selectResultToArrayOfObjects}
 * Transform array of object to array of array using passed attributes array
 *
 *      LocalDataStore.arrayOfObjectsToSelectResult([{a: 1, b: 'as'}, {b: 'other', a: 12}], ['a', 'b']);
 *      // result is: [[1,"as"],[12,"other"]]
 *
 * @param {Array.<Object>} arrayOfObject
 * @param {Array.<String>} attributeNames
 * @returns {Array.<Array>}
 */
module.exports.arrayOfObjectsToSelectResult = function (arrayOfObject, attributeNames) {
  let result = []
  arrayOfObject.forEach(function (obj) {
    let row = []
    attributeNames.forEach(function (attribute) {
      row.push(obj[attribute])
    })
    result.push(row)
  })
  return result
}

