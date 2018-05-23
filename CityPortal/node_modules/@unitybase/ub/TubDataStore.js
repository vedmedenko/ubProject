/**
 *  Initialize DataStore from one of supported source formats:
 *
 *   - Flatten(fastest): <pre>{fieldCount: K, rowCount: Z, values: [field1Name, ..., fieldKName, row1field1Value,  ..., row1fieldKValue, row2field1Value,..]}</pre>
 *   - Array-of-array  : <pre>[[row1field1Value,  ..., row1fieldKValue], ..., [rowZfield1Value, ... rowZfieldKValue]</pre>
 *   - Array-of-object : <pre>[{field1Name: row1field1Value, ..., fieldKName: row1fieldKValue}, ....]</pre>
 *
 *  Can (optionally) convert source field names to new names using keyMap array.
 *  @example
 *
     var ds = new TubDataStore('my_entity');

     // init empty (rowCount=0) dataStore with provided fields.
     // In case keyMap is omitted we consider it contain one attribute 'ID'
     ds.initialize([]); // the same as ds.initialize([], ['ID']);
     ds.initialize([], ['ID', 'name', {from: 'AGE', to: 'age'}]);

     // Initialize dataStore from array-of-object representation
     // Resulting datstore will contain 3 field: ID, nam, age (in order, they listen in keyMap array).
     // During initialization we convert fiend name 'AGE' -> age;
     ds.initialize([{ID: 10, name: 'Jon', AGE: 10}, {ID: 20, name: 'Smith', AGE: 63}],
        ['ID', 'name', {from: 'AGE', to: 'age'}]);

     //the same, but do not convert AGE->age. Result dataset field order is unknown
     ds.initialize([{ID: 10, name: 'Jon', AGE: 10}, {ID: 20, name: 'Smith', AGE: 63}]);

     //result dataset will contain only two field 'ID' & 'age'
     ds.initialize([{ID: 10, name: 'Jon', AGE: 10}, {ID: 20, name: 'Smith', AGE: 63}],
        ['ID', {from: 'AGE', to: 'age'}]);

     // Initialize dataStore from Array-of-array data
     // in this case keyMap is mandatory.
     // In case of mapping from is zero-based index of source element in row array
     ds.initialize([[10, 'Jon', 10], [20, 'Smith', 63]], ['ID', 'name', 'age']);
     // or use mapping
     ds.initialize([[10, 'Jon', 10], [20, 'Smith', 63]],
        ['ID', {from: 2, to: 'age'}, {from: 1, to: 'name'}]);

 * @memberof TubDataStore
 * @param {Object|Array} source
 * @param {Array.<String|Object>} [keyMap] Optional mapping of source field names to new field names
 * @returns {TubDataStore}
 */
TubDataStore.initialize = function (source, keyMap) {
  var
    flatArray = [], resultFields = [], sourceFields = [],
    i, j, l, rowCount, fieldCount, row

  function keyMap2Mapping (keyMap, isIndexBased) {
    for (let i = 0, l = keyMap.length; i < l; i++) {
      let elm = keyMap[i]
      if (typeof elm === 'object') {
        sourceFields.push(isIndexBased ? parseInt(elm.from, 10) : elm.from)
        resultFields.push(elm.to)
      } else {
        sourceFields.push(isIndexBased ? i : elm)
        resultFields.push(elm)
      }
    }
  }

  if (Array.isArray(source)) {
    rowCount = source.length
    if (rowCount === 0) {                   //   1) empty store
      keyMap2Mapping((keyMap && keyMap.length) ? keyMap : ['ID'])
      this.initFromJSON({fieldCount: resultFields.length, rowCount: 0, values: resultFields}) // empty dataStore initialization
    } else if (Array.isArray(source[0])) { //  2) Array-of-array
      if ((!keyMap) || (!keyMap.length)) {
        throw new Error('TubDataStore.initialize: for array-of-array keyMap is required')
      }
      keyMap2Mapping(keyMap, true)
      fieldCount = resultFields.length
      for (i = 0; i < fieldCount; i++) { // field names
        flatArray.push(resultFields[i])
      }

      for (i = 0; i < rowCount; i++) { // data
        row = source[i]
        for (j = 0; j < fieldCount; j++) {
          flatArray.push(row[sourceFields[j]]) // add source field using it index in keyMap
        }
      }
      this.initFromJSON({fieldCount: fieldCount, rowCount: rowCount, values: flatArray})
    } else if (typeof source[0] === 'object') {     //  3) Array-of-object
      keyMap2Mapping((keyMap && keyMap.length) ? keyMap : Object.keys(source[0]))
      fieldCount = resultFields.length
      for (i = 0; i < fieldCount; i++) { // field names
        flatArray.push(resultFields[i])
      }
      for (i = 0; i < rowCount; i++) { // data
        row = source[i]
        for (j = 0; j < fieldCount; j++) {
          flatArray.push(row[sourceFields[j]]) // add source field using it name from keyMap
        }
      }
      this.initFromJSON({fieldCount: fieldCount, rowCount: rowCount, values: flatArray})
    } else {
      throw new Error('TubDataStore.initialize: invalid source format for TubDataStore.initialize')
    }
  } else if ((typeof source === 'object') && (source.fieldCount > 0) && (source.rowCount > 0)) { // flatten
    if (keyMap) {
      if (keyMap.length !== source.fieldCount) {
        throw new Error('TubDataStore.initialize: for flatten data keyMap length must be equal to fieldCount')
      }
      for (i = 0, l = source.fieldCount; i < l; i++) {
        if (typeof keyMap[i] !== 'string') {
          throw new Error('TubDataStore.initialize: for flatten data keyMap must contain only field names')
        }
        source.values[i] = keyMap[i]
      }
    }
    this.initFromJSON({fieldCount: source.fieldCount, rowCount: source.rowCount, values: source.values}) // order of properties is important for native reader realization
  } else {
    throw new Error('TubDataStore.initialize: invalid source format')
  }
  return this
}
