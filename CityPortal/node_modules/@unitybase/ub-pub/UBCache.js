/* eslint-disable prefer-promise-reject-errors */
// Originally found on  from https://github.com/mozilla/localForage
let dbInfo = {
  name: 'UB',
  stores: ['permanent', 'session', 'userData'],
  version: 1
}

const iDB = (typeof window !== 'undefined') && window.indexedDB

/**
 * @classdesc
 * Client side cache. Wrapper around <a href="https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB">indexedDB</a>
 * !!! Don't try to refactor this code - starting of transaction in separate promise is not work for Firefox!!! see <a href="http://stackoverflow.com/questions/28388129/inconsistent-interplay-between-indexeddb-transactions-and-promises">this topic</a>
 *
 * Contain functions for simple key/value manipulations and advanced (entity related) manipulations.
 *
 * Create separate <a href="https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase">database</a>
 * for each connection inside application.
 *
 * For every database will create three <a href ="https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase.createObjectStore">store</a>
 *
 *  - **permanent** for data persistent between sessions and
 *  - **session** for data, live inside user session only (from login to login)
 *  - **user** for custom data
 *
 * Usage sample

        var c = new UBCache('mydb');
        c.put([
            {key: 'note1', value: {prop1: 1, prop2: 'do something'} },
            {key: 'note2', value: 'do something else'}
        ]).then();
        c.get('note1').then(UB.logDebug); //output result to console
        c.clear();
        c.get('note1').then(function(value){
            console.log(value === undefined ? 'all cleared': 'hm... something wrong')
        });

 * @class UBCache
 * @author pavel.mash on 17.04.2014 (rewrites to ES6 on 12.2016)
 * @param {String} dbName Name of indexedDB database we create. Usually this is {@link UBConnection#baseURL}. Constructor lower case dbName during creation
 * @param {Number} [version] Optionally database version.
 */
function UBCache (dbName, version) {
  /** indexedDB name
   * @property {String} dbName
   * @readonly
   */
  this.dbName = dbName.toLowerCase()

  if (!iDB) {
    /* {storeType: {values...}} */
    this.__inMemoryCache = {}
    return this
  }

  let _dbPromise = new Promise((resolve, reject) => {
    let openRequest = iDB.open(this.dbName, version || 1)
    openRequest.onerror = function withStoreOnError (e) {
      reject(e) // openRequest.error.name
    }
    openRequest.onblocked = function () {
      reject({errMsg: 'databaseIsBlocked', errDetails: 'we need to upgrade database, but some other browser tab also open it'})
    }
    openRequest.onsuccess = function withStoreOnSuccess () {
      resolve(openRequest.result)
    }
    openRequest.onupgradeneeded = function withStoreOnUpgradeNeeded (e) {
      // First time setup: create an empty object stores
      let db = e.target.result
      let tx = e.target.transaction
      console.debug(`upgrading database "${db.name}" from version ${e['oldVersion']} to version ${e['newVersion']}...`)
      dbInfo.stores.forEach(function (storeName) {
        // noinspection JSUnresolvedVariable
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName)
        } else {
          // noinspection JSUnresolvedFunction
          tx.objectStore(storeName).clear()
        }
      })
    }
  })

  /**
   * Must be called before access to UBCache methods
   * @method
   * @private
   * @returns {Promise} resolved to IDBDatabase
   */
  this.ready = function () {
    return _dbPromise
  }
}

/**
 * SESSION store name
 * @readonly
 * @type {String}
 */
UBCache.SESSION = 'session'
/**
 * PERMANENT store name
 * @readonly
 * @type {String}
 */
UBCache.PERMANENT = 'permanent'

/**
 * Possible cache types for businnes logic data
 * @readonly
 * @enum
 */
UBCache.cacheTypes = {
  /**
   * No cache performed
   * @type String
   */
  None: 'None',

  /**
   * Client validate data version on server for each request*
   * @type String
   */
  Entity: 'Entity',

  /**
   * First request to data in the current session ALWAYS retrieve data from server. All other requests got a local copy
   * @type String
   */
  Session: 'Session',

  /**
   * Client validate data version on server ONLY for first request in the current session*
   * @type String
   */
  SessionEntity: 'SessionEntity'
}

/**
 * Predefined callback functions, called when indexedDB transaction complete.
 * Can be customized after UBCache is created.
 * Default implementation will do nothing
 * @type {function}
 */
UBCache.prototype.onTransactionComplete = function (e) {
  // if (e.target.mode !== 'readonly'){
  //   UB.logDebug('IDB ' + e.target.mode + ' transaction complete');
  // }
}

/**
 * Predefined callback functions, called when indexedDB transaction aborted.
 * Can be customized after UBCache is created.
 * Default implementation will put error to log
 * @type {function}
 */
UBCache.prototype.onTransactionAbort = function (e) {
  if (window.console) {
    window.console.error('IDB transaction aborted: ' + (e.target.error.message || e.target.errorCode))
  }
}
/**
 * Predefined callback functions, called when error occurred during indexedDB transaction.
 * Can be customized after UBCache is created.
 * Default implementation will put error to log
 * @type {function}
 */
UBCache.prototype.onTransactionError = function (e) {
  if (window.console) {
    window.console.error('IDB transaction failed: ' + e.target.errorCode)
  }
}

/**
 * Retrieve data from store by key. If key not found - resolve result to `undefined`
 * @method
 * @param {String} key
 * @param {String} [storeName] default to 'userData'
 * @returns {Promise} resolved to key value.
 */
UBCache.prototype.get = function (key, storeName = 'userData') {
  if (!iDB) {
    let store = this.__inMemoryCache[storeName]
    return Promise.resolve(store ? store[key] : undefined)
  }

  let me = this
  return this.ready().then(function (db) {
    let trans = db.transaction([storeName], 'readwrite')
    trans.oncomplete = me.onTransactionComplete
    trans.onabort = me.onTransactionAbort
    trans.onerror = me.onTransactionError
    return new Promise((resolve, reject) => {
      let req = trans.objectStore(storeName).get(key)
      req.onsuccess = function getItemOnSuccess () {
        resolve(req.result)
      }
      req.onerror = function getItemOnError () {
        reject({errMsg: req.error.name})
      }
    })
  })
}

/**
 * Retrieves all values from store. **This is slow operation - try to avoid it**
 * @param {String} [storeName] default to 'userData'
 * @returns {Promise} resolved to Array of store keys
 */
UBCache.prototype.getAllKeys = function (storeName = 'userData') {
  if (!iDB) {
    let store = this.__inMemoryCache[storeName]
    let res = []
    if (store) {
      for (let prop in store) {
        // noinspection JSUnfilteredForInLoop
        res.push(store[prop])
      }
    }
    return Promise.resolve(res)
  }

  let me = this
  return this.ready().then(function (db) {
    let trans = db.transaction([storeName], 'readwrite')
    trans.oncomplete = me.onTransactionComplete
    trans.onabort = me.onTransactionAbort
    trans.onerror = me.onTransactionError
    return new Promise((resolve, reject) => {
      let results = []
      let req = trans.objectStore(storeName).openCursor()
      req.onsuccess = function (e) {
        let cursor = e.target.result
        if (cursor) {
          results.push(cursor.key)
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      req.onerror = function (e) {
        reject(e.target.result)
      }
    })
  })
}

/**
 * Put one or several values to store (in single transaction).
 * Modifies existing values or inserts as new value if nonexistent.
 *
 * **If value === `undefined` we put null instead, to understand in future get this is null value or key not exist**
 * @param {{key: string, value}|Array<{key: string, value}>} data
 * @param [storeName] default to 'userData'
 * @returns {Promise}
 */
UBCache.prototype.put = function (data, storeName = 'userData') {
  if (!iDB) {
    let store = this.__inMemoryCache[storeName]
    if (!store) {
      store = this.__inMemoryCache[storeName] = {}
    }
    if (!Array.isArray(data)) data = [data]
    data.forEach(function (item) {
      store[item.key] = item.value === undefined ? null : item.value
    })
    return Promise.resolve(true)
  }

  let me = this
  return this.ready().then(function (db) {
    let trans = db.transaction([storeName], 'readwrite')
    trans.oncomplete = me.onTransactionComplete
    trans.onabort = me.onTransactionAbort
    trans.onerror = me.onTransactionError

    return new Promise((resolve, reject) => {
      let req
      if (Array.isArray(data)) {
        data.forEach(function (item, i) {
          req = trans.objectStore(storeName).put(item.value === undefined ? null : item.value, item.key)
          req.onerror = function (e) {
            reject(e.target.result)
          }
          req.onsuccess = function (e) {
            if (i === data.length - 1) {
              resolve(e.target.result)
            }
          }
        })
      } else {
        req = trans.objectStore(storeName).put(data.value === undefined ? null : data.value, data.key)
        req.onsuccess = req.onerror = function (e) {
          resolve(e.target.result)
        }
      }
    })
  })
}

/**
 * Removes all data from the store
 * @param {String} [storeName] default to 'userData'
 * @returns {Promise}
 */
UBCache.prototype.clear = function (storeName = 'userData') {
  if (!iDB) {
    this.__inMemoryCache[storeName] = {}
    return Promise.resolve(true)
  }

  let me = this
  return this.ready().then(function (db) {
    let trans = db.transaction([storeName], 'readwrite')
    trans.oncomplete = me.onTransactionComplete
    trans.onabort = me.onTransactionAbort
    trans.onerror = me.onTransactionError
    return new Promise((resolve, reject) => {
      let req = trans.objectStore(storeName).clear()
      req.onsuccess = function (e) {
        resolve(e.target.result)
      }
      req.onerror = function (e) {
        reject(e.target.result)
      }
    })
  })
}

/**
 * Remove data from store.
 *
 * - If key is *String* - we delete one key;
 * - If key is *Array*  - we delete all keys in array;
 *
 * @method
 * @example

//remove data with key = 'key1' from userData store
$App.cache.remove('key1').then();

//remove 2 rows: with key = 'key1' and 'key2'  from session store
$App.cache.remove(['key1', 'key2'], UBCache.SESSION).then();

 * @param {String|Array<String>|RegExp} key
 * @param [storeName] default to 'userData'
 * @returns {Promise}
 */
UBCache.prototype.remove = function (key, storeName = 'userData') {
  if (!iDB) {
    let store = this.__inMemoryCache[storeName]
    if (store) {
      if (Array.isArray(key)) {
        delete store[key]
      } else {
        key.forEach(function (item) {
          delete store[item]
        })
      }
    }
    return Promise.resolve(true)
  }

  let me = this
  return this.ready().then(function (db) {
    let trans = db.transaction([storeName], 'readwrite')
    trans.oncomplete = me.onTransactionComplete
    trans.onabort = me.onTransactionAbort
    trans.onerror = me.onTransactionError
    return new Promise((resolve, reject) => {
      let req
      if (typeof key === 'string') {
        req = trans.objectStore(storeName).delete(key)
        req.onsuccess = req.onerror = function (e) {
          resolve(e.target.result)
        }
      } else if (Array.isArray(key)) { // non empty array
        if (key.length) {
          key.forEach(function (item, i) {
            req = trans.objectStore(storeName).delete(item)
            req.onerror = function (e) {
              reject(e.target.result)
            }
            req.onsuccess = function (e) {
              if (i === key.length - 1) {
                resolve(e.target.result)
              }
            }
          })
        } else {
          resolve(true) // empty array passed - nothing to delete
        }
      } else {
        reject({errMsg: 'invalid key for UBCache.remove call'})
      }
    })
  })
}

/**
 * Remove data from store where keys match regExp.
 * Internally use {@link UBCache#getAllKeys} so is slow.
 * Better to use `remove([key1, ..keyN])`
 * @method
 *
 * @example

console.time('removeIfMach');
$App.cache.removeIfMach(/^admin:ru:cdn_/, 'permanent').then(function(){
   console.timeEnd('removeIfMach');
})

 * @param {RegExp} regExp
 * @param [storeName] default to 'userData'
 * @returns {Promise}
 */
UBCache.prototype.removeIfMach = function (regExp, storeName) {
  let me = this
  return me.getAllKeys(storeName).then(function (allKeys) {
    let machKeys = allKeys.filter((item) => regExp.test(item))
    return me.remove(machKeys, storeName)
  })
}

module.exports = UBCache
