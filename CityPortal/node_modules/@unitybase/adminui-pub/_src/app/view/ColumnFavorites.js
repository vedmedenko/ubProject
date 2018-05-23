/**
 * Favorites grid column. See {@link https://dev.intecracy.com/confluence/pages/viewpage.action?pageId=90148338 this WiKi article} for usage samples.
 * Can store both "favorites" and "is viewed" marks - in this case first char contains favorite code, and second - 0/1 viewed mark
 *
 * @author xmax 23.02.15
 */
Ext.define('UB.view.ColumnFavorites', {
  extend: 'Ext.grid.column.Action',
  alias: 'widget.columnfavorites',
  width: 40,
  align: 'center',
  minWidthChar: 6,
  maxWidthChar: 7,
  sortable: true,
  header: '', // UB.i18n('gridFavoritesHeader'),
  cls: 'ub-favorites-header',
  tdCls: 'ub-favorites-td',

  disableExport: true,
    /**
     * @cfg {String} allowedCategoryCount favorites categories count (1-4)
     */
  allowedCategoryCount: 2,
    /**
     * @cfg {String} filterCaption Caption for ub filters
     */
    /**
     * @cfg {Number} updateDelay Delay before start server method in ms. Default 300 ms
     */
  updateDelay: 1,
  defaultRenderer: function (v, meta, record, rowIdx, colIdx, store, view) {
    let me = this
    let prefix = Ext.baseCSSPrefix
    let scope = me.origScope || me

    let items = me.items
    items[0].iconCls = 'ub-favorites-img ' + me.getCls(v)
    record.baseValue = v

    let ret = _.isFunction(me.origRenderer) ? me.origRenderer.apply(scope, arguments) || '' : ''

    for (let i = 0, len = items.length; i < len; i++) {
      let item = items[i]

      let disabled = item.disabled || (item.isDisabled ? item.isDisabled.call(item.scope || scope, view, rowIdx, colIdx, item, record) : false)
      let tooltip = disabled ? null : (item.tooltip || (item.getTip ? item.getTip.apply(item.scope || scope, arguments) : null))

            // Only process the item action setup once.
      if (!item.hasActionConfiguration) {
                // Apply our documented default to all items
        item.stopSelection = me.stopSelection
        item.disable = Ext.Function.bind(me.disableAction, me, [i], 0)
        item.enable = Ext.Function.bind(me.enableAction, me, [i], 0)
        item.hasActionConfiguration = true
      }

      ret += '<div role="button" alt="' + (item.altText || me.altText) +
            '" class="' + prefix + 'action-col-icon ' + prefix + 'action-col-' + String(i) + ' ' + (disabled ? prefix + 'item-disabled' : ' ') +
            ' ' + (_.isFunction(item.getClass) ? item.getClass.apply(item.scope || scope, arguments) : (item.iconCls || me.iconCls || '')) + '"' +
            (tooltip ? ' data-qtip="' + tooltip + '"' : '') + ' ></div>'
    }

    return ret
        // me.callParent(arguments);
  },

  constructor: function (config) {
    let me = this
    if (!config) {
      config = {}
    }
    config.items = [{
      tagName: 'div',
      autoEl: 'div',
      iconCls: 'ub-favorites-img',
            // tooltip: UB.i18n('FavoritesToolTip'),
      handler: function () {
        me.onFavoritesClick.apply(me, arguments)
      }
    }]
    me.filterCaption = UB.i18n('gridFavoritesCaption')
    me.callParent([config])
  },

  initComponent: function () {
    this.timers = {}
    let favCnt = $App.connection.appConfig.uiSettings.adminUI.favoriteCategoryCount
    if (favCnt) this.allowedCategoryCount = favCnt
    this.callParent(arguments)
  },

  onFavoritesClick: function (grid, rowIndex, colIndex, cfg, event) {
    let me = this
    let store = grid.getStore()
    let rec = store.getAt(rowIndex)

    let value = rec.baseValue // rec.get(this.dataIndex); cfg.baseValue

    let entityCode = store.ubRequest.entity
    let metaColumn = $App.domainInfo.get(entityCode).getEntityAttributeInfo(this.dataIndex, -1)

    let idColumn = this.dataIndex.split('.')
    if (metaColumn.attributeCode === idColumn[0]) {
      idColumn = 'ID'
    } else {
      idColumn = idColumn.slice(0, idColumn.length - 2).join('.')
    }
    let itemID = rec.get(idColumn)
    if (!itemID) {
      throw new Error('You must add column "' + idColumn + '" to fieldList')
    }

    let val0 = parseInt(value && value[0], 10) || 0
    let val1 = (value && value[1]) || '0'
    let newVal0 = (val0 + 1) % me.allowedCategoryCount
    let newValue = newVal0 + val1

    if (me.timers[itemID]) {
      clearTimeout(me.timers[itemID])
    }
        // event.target.src = me.getImage(newValue);
    me.updateCls(event.target, value, newValue)

    rec.baseValue = newValue

    me.timers[itemID] = setTimeout(function () {
      delete me.timers[itemID]
      me.startUpdateFavorites(itemID, value, newValue, event.target, metaColumn, rec)
    }, me.updateDelay || 300)
  },

  updateCls: function (domEl, oldValue, newValue) {
    let elFly = Ext.fly(domEl)
    elFly.removeCls(this.getCls(oldValue))
    elFly.addCls(this.getCls(newValue))
  },

  getCls: function (value) {
    switch (value && value[0]) {
      case '1': return 'ub-favorites-img-yellow'
      case '2': return 'ub-favorites-img-green'
      case '3': return 'ub-favorites-img-red'
      default: return 'ub-favorites-img-empty'
    }
  },

  startUpdateFavorites: function (itemID, value, newValue, target, metaColumn, cfg) {
    let me = this
    let associatedEntity = metaColumn.attribute.associatedEntity
    let associationAttr = metaColumn.attribute.associationAttr   // instanceID

    let promise
    if (value) {
      promise = UB.Repository(associatedEntity)
        .attrs(['ID', associationAttr, 'ubUser', 'code'])
        .where(associationAttr, '=', itemID)
        .where('ubUser', '=', $App.connection.userData('userID'))
        .select()
    } else {
      promise = $App.connection.addNew({
        entity: associatedEntity,
        fieldList: ['ID', associationAttr, 'ubUser', 'code']
      }).then(function (responce) {
        return UB.LocalDataStore.selectResultToArrayOfObjects(responce)
      })
    }
    promise.then(function (responce) {
      let execParams = responce[0] || {}
      execParams.code = newValue
      execParams.instanceID = itemID
      execParams.ubUser = $App.connection.userData('userID') //  $App.userID;  $App.connection.userData()

      let request = {
        entity: associatedEntity,
        method: (execParams.code === '00' ? 'delete' : (value && execParams.ID ? 'update' : 'insert')),
        execParams: execParams
      }
      return $App.connection.query(request).catch(function () {
        me.updateCls(target, value, cfg.baseValue)
        cfg.baseValue = value
      })
    })
  },

  statics: {
    /**
     *
     * @param ubRequest
     * @param attributeName
     */
    prepareConditions: function (ubRequest, attributeName, metaColumn) {
      let attrPart = attributeName.split('.')
      let exprName = 'favFtrUsr' + attrPart[0]

      let idColumn = attributeName.split('.')
      if (metaColumn.attributeCode === idColumn[0]) {
        idColumn = 'ID'
      } else {
        idColumn = idColumn.slice(0, idColumn.length - 2).join('.')
      }

      let colExist = false
      for (let colNum = 0; colNum < ubRequest.fieldList.length; colNum++) {
        let col = ubRequest.fieldList[colNum]
        if (col.name === idColumn || (typeof (col) === 'object' && col.name === idColumn)) {
          colExist = true
          break
        }
      }

      if (!colExist) {
        ubRequest.fieldList.push({name: idColumn, visibility: false})
      }

      let wExpr = attrPart.slice(0, attrPart.length - 1).join('.') + '.' + 'ubUser'
      if (!ubRequest.whereList) {
        ubRequest.whereList = {}
      }
      if (!ubRequest.joinAs) {
        ubRequest.joinAs = []
      }
      let values = {}
      values[wExpr] = $App.connection.userData('userID')
      ubRequest.whereList[exprName] = {
        expression: '[' + wExpr + ']',
        condition: 'equal',
        values: values
      }
      ubRequest.joinAs.push(exprName)
    }
  }
})
