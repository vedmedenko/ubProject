require('../../core/UBCommand')
require('./proxy/UBProxy')
const UBDomain = require('@unitybase/base/UBDomain')
/**
 * Extend {@link Ext.data.Store} to easy use with UnityBase server:
 *
 * - add ubRequest & entity properties
 * - automatically create Model from ubRequest
 * - proxy is bounded to {@link UB.ux.data.proxy.UBProxy}
 * - refresh UBCache entry on `add` & `remove` operations
 */

Ext.define('UB.ux.data.UBStore', {
  extend: 'Ext.data.Store',
  alias: 'store.ubstore',
  totalRequired: false,

  uses: [
    'UB.core.UBStoreManager',
    'UB.core.UBEnumManager'
  ],

  statics: {
    /**
     * Copy record dara
     * @param {Ext.data.Model} srcRecord
     * @param {Ext.data.Model} dstRecord
     */
    copyRecord: function (srcRecord, dstRecord) {
      let fields = srcRecord.getFields()
      fields.forEach(function (field) {
        dstRecord.set(field.name, srcRecord.get(field.name))
      })
    },

    /**
     * reset modified
     * @param {Ext.data.Model} record
     */
    resetRecord: function (record) {
      record.modified = []
      record.reject(true)
    },

    /**
     * update values in record from raw data of one entity.
     * @param {Object} response
     * @param {Ext.data.Model} record
     * @param {Number} [rowNum] (optional) default 0
     * @return {Ext.data.Model}
     */
    resultDataRow2Record: function (response, record, rowNum) {
      let data = response.resultData.data[ rowNum || 0 ]
      if (!data) return null

      let responseFieldList = response.resultData.fields

      let len = responseFieldList.length
      let i = -1
      while (++i < len) {
        record.set(responseFieldList[i], data[i])
      }

      return record
    },

    /**
     * create empty record
     * @param {String} entityName
     * @param {String[]} fieldList
     * @param {Boolean} [createStore=true]
     * @returns {*}
     */
    createRecord: function (entityName, fieldList, createStore) {
      let model = UB.ux.data.UBStore.getEntityModel(entityName, fieldList)
      let record = Ext.create(model)

      if (createStore !== false) {
        let store = Ext.create('Ext.data.Store', {
          model: model
        })

        store.add(record)
      }
      record.fields.eachKey(function (field) {
        record.set(field, null)
      })
      UB.ux.data.UBStore.resetRecord(record)
      return record
    },

    /**
     * Add all necessary attributes to field list:
     *
     * - check ID is inside field list. If not - add.
     * - if entity is under simpleAudit and no 'mi_modifyDate' passed - add
     *
     * @param {String,UBEntity} entityName
     * @param {Array<*|String>} fieldList
     * @returns {Array} modified fieldList
     */
    normalizeFieldList: function (entityName, fieldList) {
      let entity
      if (typeof (entityName) === 'string') {
        entity = $App.domainInfo.get(entityName)
      } else {
        entity = entityName
      }

      if (!entity) {
        throw new Error('Invalid entity code =' + entityName)
      }
      let mStorage = entity.mixins.mStorage
      let hasID = false
      let hasMD = false
      let result = []
      fieldList.forEach(function (field) {
        result.push(field)
        hasID = hasID || field === 'ID' || field.name === 'ID'
        hasMD = hasMD || field === 'mi_modifyDate' || field.name === 'mi_modifyDate'
      })
      if (!hasID) {
        result.push('ID')
      }
      if (mStorage && mStorage.simpleAudit && !hasMD) {
        result.push('mi_modifyDate')
      }
      return result
    },

    /**
     * Возвращает "нормализированное" наименование модели
     *
     * @param {String} entityName
     * @return {String}
     */
    entityModelName: function (entityName) {
      return 'UB.model.' + entityName
    },

    /**
     * Возвращает имя модели. Если модель с данным именем не существует - она определяется.
     *
     * @param {String} entityName
     * @param {String[]} [fieldList] (optional)
     * @param {String} [idProperty] Default 'ID'
     * @return {String}
     */
    getEntityModel: function (entityName, fieldList, idProperty) {
      // adjust field list according to metadata
      let modelFields = this.getEntityModelFields(entityName, fieldList)
      let entityModelName = this.entityModelName(UB.core.UBUtil.getNameMd5(entityName, fieldList))

      if (!Ext.ModelManager.getModel(entityModelName)) {
        Ext.define(entityModelName, {
          extend: 'Ext.data.Model',
          entityName: entityName,
          idProperty: idProperty || 'ID',
          fields: modelFields
        })
      }
      return entityModelName
    },

    /**
     * Create model configuration ready for use with {@link Ext.data.Model}
     * The main task is to create converter function for different field types.
     * Usage sample:
     *
     *      Ext.define(entityModelName, {
     *           extend: 'Ext.data.Model',
     *           entityName: entityName,
     *           idProperty: 'ID',
     *           fields: getEntityModelFields(entityName, ['attr1', 'attr2'])
     *       });
     *
     * @param {String} entityName
     * @param {String[]} fieldList
     * @return {Array<Object>}
     */
    getEntityModelFields: function (entityName, fieldList) {
      let domainEntity = $App.domainInfo.get(entityName)

      if (!Ext.isDefined(domainEntity)) {
        throw new Error(UB.format('Entity "{0}" not found in Domain', entityName))
      }

      let fields = []
      fieldList.forEach(function (fieldName, index) {
        let attribute = domainEntity.attr(fieldName)
        if (attribute) {
          fields.push({
            name: fieldName,
            convert: null, // we convert all data just after server response
            type: UBDomain.getPhysicalDataType(attribute.dataType),
            useNull: true,
            mapping: index
          })
        }
      })

      return fields
    }
  },

  /**
   * Create store.
   *
   * **Warning - internally modify fieldList by call {normalizeFieldList}**
   * @param {Object} config Config object
   */
  constructor: function (config) {
    let me = this
    let newConfig = Ext.clone(config)
    let ubRequest = newConfig.ubRequest
    let entity = ubRequest.entity

    /**
     * @cfg {UB.ux.data.UBStore[]} linkedItemsLoadList
     * List of stores that start load with load this store. Method load waiting for all stores will be loaded.
     */

    // MPV - must be here. Better to remove this functionality at all and set correct fieldList by caller
    ubRequest.fieldList = UB.ux.data.UBStore.normalizeFieldList(entity, ubRequest.fieldList)
    Ext.apply(me, {
      /**
       * @cfg {Object} ubRequest
       */
      ubRequest: ubRequest,
      model: ubRequest.model || UB.ux.data.UBStore.getEntityModel(entity, ubRequest.fieldList, newConfig.idProperty),
      proxy: {
        type: 'ubproxy'
      },
      /**
       * @property {String} entity Entity name
       */
      entityName: entity,
      autoLoad: me.autoLoad !== false,
      remoteSort: true,
      remoteFilter: true,
      remoteGroup: true
    })

    /**
     * @cfg {String} [idProperty] Id property for model.
     */

    if (!config.disablePaging) {
      me.pageSize = !me.pageSize ? UB.appConfig.storeDefaultPageSize : me.pageSize
    } else {
      me.pageSize = 0
    }

    /**
     * @event beforereload
     * Fires each times before call reload method
     */
    me.addEvents('beforereload', 'entityModified')

    me.callParent([newConfig])

    me.on({
      beforeload: me.onBeforeLoad,
      beforeprefetch: me.onBeforePrefetch
    })
  },

  fireModifyEvent: function (request, responce) {
    this.fireEvent('entityModified', request, responce)
  },

  /**
   * Remove actual data from store proxy. Refresh cache if need;
   * @returns {Promise}
   */
  clearCache: function () {
    this.clearProxyCache()
    let cacheType = $App.domainInfo.get(this.entityName).cacheType
    return $App.connection.cacheOccurrenceRefresh(this.entityName, cacheType)
  },

  /**
   * @deprecated
   * @param {Object} whereList
   * @param {Boolean} withoutReload
   */
  setWhereList: function (whereList, withoutReload) {
    this.ubRequest.whereList = whereList

    if (!withoutReload) {
      this.reload()
    }
  },

  /**
   * Perform load of store. Return promise resolved to store itself then finish
   * @param {Object|Function} [options]
   * @returns {Promise} resolved to store
   */
  load: function (options) {
    let me = this
    let deferred = Q.defer()
    let optionsIsFunction = typeof options === 'function'
    let myCallback, doneMain
    let rList = []
    let throwLoadError = me.throwLoadError

    if (me.isDestroyed) {
      return Q.resolve(me)
    }

    myCallback = function (records, operation, success) {
      if (success) {
        Q.all(rList).done(function () {
          doneMain(records, operation, success)
        })
      } else {
        doneMain(records, operation, success)
      }
    }

    doneMain = function (records, operation, success) {
      if (success) {
        if (operation.resultSet && operation.resultSet.resultLock) {
          me.resultLock = operation.resultSet.resultLock
        }
        if (operation.resultSet && operation.resultSet.resultAls) {
          me.resultAls = operation.resultSet.resultAls
        }
        deferred.resolve(me)
      } else {
        if (throwLoadError) {
          throw operation.getError()
        }
        deferred.reject(operation.getError())
      }
      if (optionsIsFunction || (options && options.callback)) {
        UB.logDebug('UBStore.load(callback) is DEPRECATED. Use Promise style: UBStore.load().then(...)')
        if (!success) {
          throw new Error(operation.getError())
        }
        if (optionsIsFunction) {
          Ext.callback(options, null, [records, operation, success])
        } else {
          Ext.callback(options.callback, options.scope, [records, operation, success])
        }
      }
    }
    me.indexByID = null
    if (me.linkedItemsLoadList) {
      _.forEach(me.linkedItemsLoadList, function (item) {
        if (item && (item instanceof UB.ux.data.UBStore)) {
          rList.push(item.load())
        } else if (typeof (item) === 'function') {
          rList.push(item())
        } else if (item && Q.isPromise(item)) {
          rList.push(item)
        }
      })
    }
    let newOptions = {}
    if (!optionsIsFunction && options) {
      UB.apply(newOptions, options)
    }
    if (this.disablePaging && !newOptions.limit) {
      newOptions.limit = -1
      newOptions.start = 0
    }
    newOptions.callback = myCallback
    delete newOptions.scope
    this.callParent([newOptions])
    return deferred.promise
  },

  /**
   * Perform reload of store. Return promise resolved to store itself then finish
   * @param [options]
   * @returns {promise|*|Q.promise}
   */
  reload: function (options) {
    let me = this
    let deferred = Q.defer()
    let newOptions = UB.apply({}, options)
    let myCallback = function (records, operation, success) {
      if (success) {
        deferred.resolve(me)
      } else {
        deferred.reject('TODO pass here rejection reason')
      }
      if (options && options.callback) {
        UB.logDebug('UBStore.reload(callback) is DEPRECATED. Use Promise style: UBStore.reload().then(...)')
        Ext.callback(options.callback, options.scope, [records, operation, success])
      }
    }
    me.fireEvent('beforereload')

    me.loading = true
    me.indexByID = null
    me.clearCache().done(function () {
      if (!me.isDestroyed) { // when cache is clear user close form and store is destroyed
        newOptions.callback = myCallback
        delete newOptions.scope
        me.superclass.reload.call(me, newOptions)
      }
    })
    return deferred.promise
  },

  clearProxyCache: function () {
    let proxy = this.getProxy()

    if (proxy) {
      delete proxy.totalRecCount
      delete proxy.data
    }
  },

  filter: function (options) {
    if (this.isDestroyed) return
    this.clearProxyCache()
    try {
      /**
       * @private
       * @type {boolean} throwLoadError
       */
      this.throwLoadError = true
      this.callParent(arguments)
    } finally {
      this.throwLoadError = false
    }
  },

  clearFilter: function () {
    if (this.isDestroyed) return
    this.clearProxyCache()
    this.callParent(arguments)
  },

  /**
   *
   * @param {Ext.data.Store} store
   * @param {Ext.data.Operation} operation
   * @return {Boolean}
   */
  onBeforeLoad: function (store, operation) {
    operation.ubRequest = this.ubRequest
    return true
  },

  /**
   *
   * @param {Ext.data.Store} store
   * @param {Ext.data.Operation} operation
   * @return {Boolean}
   */
  onBeforePrefetch: function (store, operation) {
    operation.ubRequest = this.ubRequest
    return true
  },

  /**
   * @override
   * @param {Ext.data.Model|Ext.data.Model[]|Number|Number[]} records
   */
  remove: function (records) {
    let me = this
    me.clearCache().done(function () {
      if (!me.isDestroyed) { // when cache is clear user close form and store is destroyed
        // me.callParent([records]) is not right way to call callParent from callback
        // right way is below
        me.superclass.remove.call(me, records)
      }
    })
  },
  /**
   * @override
   * @param {Ext.data.Model[]} model
   * @param {Boolean} [saveCache] optional
   */
  add: function (model, saveCache) {
    let me = this
    if (saveCache) {
      return this.callParent(arguments)
    }
    // todo add method must return Ext.data.Model[]
    me.clearCache().done(function () {
      if (!me.isDestroyed) { // when cache is clear user close form and store is destroyed
        me.superclass.add.call(me, model)
      }
    })
  },

  /**
   * @cfg {Boolean} createIndexByID
   * If true will be created index by id. This index used in function getById. It will be created when first call getById method.
   * You should use it if will be often called method getById. For example in lookUp grid column.
   */

  /**
   * Get the Record with the specified id.
   *
   * @param {Number/Ext.data.Model} id The id of the Record to find.
   * @returns {Ext.data.Model}
   */
  getById: function (id) {
    let me = this
    if (id && id.getId) {
      id = id.getId()
    }

    if (!me.indexByID && me.createIndexByID) {
      me.indexByID = {}
      me.each(function (record) {
        me.indexByID[record.getId()] = record
      }, me)
    }
    if (me.indexByID) {
      return me.indexByID[id]
    } else {
      return me.callParent([id])
    }
  }

})

/* dirty hack to add implementation for method ClientRepository.prototype.selectAsStore */
UB.ClientRepository.prototype.selectAsStore = function (storeConfig) {
  storeConfig = storeConfig || {}
  storeConfig.ubRequest = this.ubql()
  return Ext.create('UB.ux.data.UBStore', storeConfig).load()
}
