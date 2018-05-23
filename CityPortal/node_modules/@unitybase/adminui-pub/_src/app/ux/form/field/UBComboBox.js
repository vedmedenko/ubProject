require('./UBBaseComboBox')
/**
 * Combobox, based on ubRequest. If ubRequest passed - store created automatically.
 * If valueField is missing in cfg - use first attribute from ubRequest.fieldList for value
 * If displayField is missing in cfg - use second attribute from ubRequest.fieldList for displayField
 *
 * Config example:
 *
 *      @example
 *      {
 *       xtype:'ubcombobox',
 *       flex: 1,
 *       fieldLabel: UB.i18n('makerExecutor'),
 *       allowBlank: false,
 *       ubRequest: {
 *           entity: 'org_employeeonstaff',
 *           method: 'select',
 *           fieldList: ['ID','caption']
 *       }
 *      }
 *
 */
Ext.define('UB.ux.form.field.UBComboBox', {
  extend: 'UB.ux.form.field.UBBaseComboBox',
  alias: 'widget.ubcombobox',
    // require:['UB.ux.form.field.ComboExtraButtons'],
  uses: ['Ext.grid.plugin.BufferedRenderer'],
  queryCaching: true,
  editable: true,
    // forceSelection: true,
  minChars: 0,
  grow: false,
  queryMode: 'remote',
  userFilterId: '_userInput',
  matchFieldWidth: true,
  matchCls: 'combo-search-match',
    /**
     * Highlight input value in dropDownList
     * @cfg {Boolean} highlightSearch
     */
  highlightSearch: true,
  disablePaging: false,
    /**
     * Minimum characters to start query
     * @cfg {Number} minCharsForQuery
     */
  minCharsForQuery: 0,
    /**
     * If false - value will always be equal to the value of the store
     * @cfg {Boolean} allowCustomText
     */
  allowCustomText: false,
    /**
     * true - has delay when set value
     */
  dataLoadDelay: true,

    /**
     * If true the user query will sent to the server as parameter. Param name may be set in  queryParamName.
     * If false the user query will sent as filter (whereList). Default false.
     *
     * @cfg {Boolean} sendQueryAsParam
     */
  sendQueryAsParam: false,

    /**
     * In case `sendQueryAsParam`=true name of parameter to sent typed text.
     *
     * @cfg {String} queryParamName
     */
  queryParamName: 'query',

    /**
     * Auto complete combobox text from first value of dropdown. Default - false.
     *
     * @cfg {Boolean} autoCompleteText
     */
  autoCompleteText: false,

    /**
     * Combobox items query. If passed - store is created automatically. Else caller must pass store parameter
     * @cfg {Object} [ubRequest]
     */
  initComponent: function () {
    var me = this, fnReplace, store

        // me.resizable = true;

        /**
         * @event beforeQuerySend
         * Fires before the request sent to the server.
         * @param {Object} queryPlan An object containing details about the query to be executed.
         * @param {Ext.form.field.ComboBox} queryPlan.combo A reference to this ComboBox.
         * @param {String} queryPlan.query The query value to be used to match against the ComboBox's {@link #valueField}.
         * @param {Boolean} queryPlan.forceAll If `true`, causes the query to be executed even if the minChars threshold is not met.
         * @param {Boolean} queryPlan.cancel A boolean value which, if set to `true` upon return, causes the query not to be executed.
         * @param {Boolean} queryPlan.rawQuery If `true` indicates that the raw input field value is being used, and upon store load,         * @param {this}
         */
    me.addEvents('beforeQuerySend')

    if (!me.disablePaging) {
      if (!me.pageSize) {
        me.pageSize = UB.appConfig.comboPageSize
      }
    } else {
      delete me.pageSize
    }
    store = me.getStore()
    if (!store && me.ubRequest) {
      store = me.store = Ext.create('UB.ux.data.UBStore', {
        ubRequest: me.ubRequest,
        autoLoad: false,
        autoDestroy: true
      })
    }
    if (me.displayField === 'text') { // this is default display field Ext apply
      me.displayField = store.ubRequest.fieldList[1]
    }
    if (!me.valueField) {
      me.valueField = store.ubRequest.fieldList[0]
    }
    store.pageSize = me.pageSize

    fnReplace = function (m) {
      return '<span class="' + me.matchCls + '">' + m + '</span>'
    }

    if (!me.tpl) {
      me.tpl = new Ext.XTemplate(
                '<ul class="' + Ext.plainListCls + '"><tpl for=".">',
                '<li role="option" unselectable="on" class="',
                'boundlist-{[xindex % 2 === 0 ? "even" : "odd"]}  ' + Ext.baseCSSPrefix + 'boundlist-item " ', // me.itemCls
                ">{[values['" + this.displayField + "']]}</li>",
                '</tpl></ul>'
            )
    }

    me.listConfig = Ext.apply({
      pageSize: me.pageSize,
      minWidth: me.listMinWidth,
      listeners: {
        refresh: {
          fn: function (view) {
            if (!me.highlightSearch || !me.searchRegExp) {
              return
            }
            var el = view.getEl(), list, itmEl
            if (!el) {
              return
            }
            list = el.down('.x-list-plain')
            if (!list) {
              return
            }

            itmEl = list.down('.x-boundlist-item')
            while (itmEl) {
              if (itmEl.dom.innerHTML) {
                itmEl.dom.innerHTML = itmEl.dom.innerHTML.replace(me.searchRegExp, fnReplace)
              }
              itmEl = itmEl.next()
            }
          }
        }
      },

      getInnerTpl: function (displayField) {
        return "{[values['" + displayField + "']]}"
      },

      createPagingToolbar: function () {
        var pagingToolbar = Ext.create('Ext.toolbar.Toolbar', {
          id: this.id + '-paging-toolbar',
          pageSize: me.pageSize,
          border: false,
          minHeight: 0,
          ownerCt: this,
          cls: 'ub_combo-bound-toolbar',
          ownerLayout: this.getComponentLayout(),
          bindStore: Ext.emptyFn,
          items: [{
            xtype: 'tbspacer',
            flex: 1
          }, {
            xtype: 'tbseparator'
          }, {
            xtype: 'button',
            text: UB.i18n('more'),
            handler: me.readMoreData,
            scope: me
          }]
        })

        me.pagingToolbar = pagingToolbar
        return pagingToolbar
      }
    }, me.listConfig || {})

    if (me.editable) {
      me.on({
        beforequery: me.beforequery,
        scope: me
      })
    }

    me.on({beforedestroy: me.onBeforedestroy, scope: me})
    me.callParent(arguments)

    if (me.getStore()) {
      me.getStore().on('load', me.onDataLoaded, me)
    }
  },

  onBeforedestroy: function () {
    var me = this
    if (me.getStore()) {
      me.getStore().un('load', me.onDataLoaded, me)
    }
  },

  onDataRefreshed: function () {
    var me = this, store = this.getStore(),
      storeLen = store.getCount(),
      picker = me.getPicker(),
      lestRow = me.lastRowIndex
    if (lestRow) {
      me.lastRowIndex = null
      if (storeLen > lestRow + 8) {
        lestRow = lestRow + 8
      }
      lestRow = store.getAt(lestRow)
      if (lestRow) {
        picker.focusNode(lestRow)
      }
    }
  },

  readMoreData: function () {
    var me = this, store = this.getStore(), storeLen
    storeLen = store.getCount()
    me.lastRowIndex = null
    if (storeLen > 0) {
      me.lastRowIndex = storeLen - 1// store.getAt(storeLen - 1);
    }
    me.inputEl.focus()
    store.loadPage((store.currentPage || 0) + 1, {
      params: this.getParams(this.lastQuery),
      addRecords: true
    })
  },

  createPicker: function () {
    var picker = this.callParent(arguments)
    picker.mon({blur: this.onPickerBlur, scope: this})
        // picker.on({refresh: this.onDataRefreshed, scope: this});
    return picker
  },

  onPickerBlur: function (event) {
    var me = this, el = me.inputEl, picker = me.getPicker(),
      i, elP
    if (!event.relatedTarget) {
      me.inputEl.focus()
    } else if (event.relatedTarget !== el.dom) {
             // focus on picker
      if (picker && picker.el) {
        i = 0
        elP = event.relatedTarget
        while (i < 11 && elP) {
          if (picker.el.dom === elP) {
            return
          }
          elP = elP.parentElement
          i++
        }
      }
      me.onExitCombo()
    }
  },

  onBlur: function (event) {
    var me = this, i, el,
      picker = me.getPicker()

    if (me.allowCustomText) {
      return
    }

        // focus on picker
    if (picker && picker.el && event.relatedTarget) {
      i = 0
      el = event.relatedTarget
      while (i < 11 && el) {
        if (picker.el.dom === el) {
          el = Ext.dom.Element.get(event.relatedTarget)
          el.un({blur: this.onPickerBlur, scope: me})
          el.on({blur: this.onPickerBlur, scope: me})
          return
        }
        el = el.parentElement
        i++
      }
    }

    me.onExitCombo()
  },

  onExitCombo: function () {
    var me = this, inputText = me.getRawValue(), i, valItem = null, isEqualVal

    if ((!me.valueModels || me.valueModels.length === 0)) {
      me.setRawValue(null)
            // event.stopEvent();
      return
    }

    isEqualVal = false
    for (i = 0; i < me.valueModels.length; i++) {
      valItem = me.valueModels[i]
      valItem = valItem.get(me.displayField)
      if (valItem === inputText) {
        isEqualVal = true
        break
      }
    }
    if (!isEqualVal) {
      me.setRawValue(valItem)
    }
  },

  onDataLoaded: function (sender, records, successful, eOpts) {
    var me = this, dataLen = me.store.getCount()
    if (me.pagingToolbar) {
      if (me.pageSize > dataLen || (me.lastRowIndex && ((me.lastRowIndex + 1 + me.pageSize) > dataLen))) {
        me.pagingToolbar.setHeight(0)
      } else {
        me.pagingToolbar.setHeight(36)
      }
    }
    me.onDataRefreshed()
  },

  onKeyDown: function (e) { // override
    var me = this
    if (e.ctrlKey && (e.getKey() === Ext.EventObject.Q)) {
      me.stopKeyHandlers = true
    } else if (!e.ctrlKey) {
      me.callParent(arguments)
    }
  },

  onKeyUp: function (e) { // override
    var me = this
    if (e.ctrlKey && (e.getKey() === Ext.EventObject.Q)) {
      me.stopKeyHandlers = false
    } else if (!e.ctrlKey) {
      me.callParent(arguments)
    }
  },

  onKeyPress: function (e) { // override
    var me = this
    if (me.stopKeyHandlers) {
      me.up('form').switchTabs(me, e.shiftKey)
    } else if (!e.ctrlKey) {
      me.callParent(arguments)
    }
  },

    /**
     * Show message when too little chars in query.
     */
  showToolTipMinQuery: function () {
    var me = this, picker = me.getPicker(), targetEl
    me.expand()
    me.pagingToolbar.setHeight(0)
    targetEl = picker.getTargetEl()
    picker.clearViewEl()
    Ext.core.DomHelper.insertHtml('beforeEnd', targetEl.dom,
            UB.format(UB.i18n('startSearchMinCharacters'), me.minCharsForQuery)
        )
  },

  afterQuery: function (queryPlan) {
    var me = this, record, txtUser, txtAll
    if (me.autoCompleteText) {
      if (me.store.getCount()) {
        record = me.store.getAt(0)
        txtUser = me.inputEl.dom.value
        me.userInputText = txtUser
        txtAll = record.get(me.displayField)
        me.inputEl.dom.value = txtAll
        me.inputEl.dom.setSelectionRange(txtUser.length, txtAll.length)
      }
    }
    me.callParent(arguments)
  },

  beforequery: function (queryEvent, eOpts) {
    var
      me = this, escapedQuery,
      store = me.getStore()

    if (me.minCharsForQuery && me.minCharsForQuery > 0 && me.minCharsForQuery > (queryEvent.query || '').length) {
      queryEvent.cancel = true
      me.showToolTipMinQuery()
      return
    }
    escapedQuery = UB.Utils.escapeForRegexp(queryEvent.query)
    me.searchRegExp = null
    if (!Ext.isEmpty(escapedQuery)) {
      me.searchRegExp = new RegExp(escapedQuery, 'gi')
    }

    me.fireEvent('beforeQuerySend', queryEvent)

    if (queryEvent.combo.queryMode !== 'local') {
      var queryString = queryEvent.query || '',
        displayField = me.displayField

      if (me.sendQueryAsParam) {
        if (!store.ubRequest) {
          store.ubRequest = {}
        }
        store.ubRequest[me.queryParamName] = queryString
        return
      }
      if (queryString) {
        store.filters.add(new Ext.util.Filter({
          id: me.userFilterId,
          root: 'data',
          property: displayField,
          caseSensitive: false,
          anyMatch: true,
          value: queryString
        }))
      } else {
        store.filters.removeAtKey(me.userFilterId)
        if (me.useForGridEdit && store.totalCount <= 1) {
          store.reload()
        }
        queryEvent.forceAll = true
      }
    }
  },

  setValue: function (value) {
    var me = this,
      fValue, i, valItem, valIn,
      isEqualVal

    fValue = Ext.Array.from(value)
        // check has changes value
    if (!me.allowCustomText && me.valueModels && me.valueModels.length > 0 && fValue.length === me.valueModels.length) {
      isEqualVal = true
      for (i = 0; i < me.valueModels.length; i++) {
        valItem = me.valueModels[i]
        valItem = valItem.get(me.valueField)
        valIn = fValue[i]
        if (Ext.isObject(valIn) && valIn.isModel) {
          valIn = valIn.get(me.valueField)
        }
        if (valItem !== valIn) {
          isEqualVal = false
          break
        }
      }
      if (isEqualVal) {
        return
      }
    }
    me.clearIsPhantom()
    me.callParent(arguments)
    let store = me.getStore()
    if (me.useForGridEdit && value && !_.isArray(value) && !_.isObject(value) &&
      (!store.filters.get(me.userFilterId) || store.filters.get(me.userFilterId).value !== value)) {
      store.suspendEvent('clear')
      store.filter(new Ext.util.Filter({
        id: me.userFilterId,
        root: 'data',
        property: this.valueField || 'ID',
        condition: value && _.isArray(value) ? 'in' : 'equal',
        value: value
      }))
    }
  },

  getValue: function (field) {
    var me = this, value
    value = me.callParent(arguments)
    return value === me.value ? value : null
  },

  getVal: function (field) {
    var
      me = this, item,
      store = me.getStore(),
      val = me.getValue()

    if (!val || !field) {
      return null
    }
    if (store) {
      item = store.getById(val)
    }
    return item ? item.get(field) : null
  },

  clearValue: function () {
    var
      me = this,
      store = me.store
    me.callParent()
    me.rawValue = null
    if (store) {
      store.filters.removeAtKey(me.userFilterId)
    }
  },

    /**
     * return entity code
     * @pribate
     * @returns {String}
     */
  getEntity: function () {
    var me = this, request
    request = me.ubRequest || (me.store ? me.store.ubRequest : null)
    return request.entity
  },

  getSubTplData: function () {
    var me = this, data
    data = me.callParent(arguments)
    return data
  },

  setRawValue: function (value) {
    var me = this
    me.callParent(arguments)
    me.clearIsPhantom()
  },

    /**
     * @private
     */
  clearIsPhantom: function () {
    var me = this
    if (me.rendered && me.phantomSelectedElement) {
      var input = Ext.get(me.getInputId())
      input.removeCls('ub-combo-deleted')
    }
    me.phantomSelectedElement = false
    if (me.tipPhantomElement) {
      me.tipPhantomElement.setDisabled(true)
      me.tipPhantomElement = null
    }
  },

    /**
     * Set combo value by recordId
     * @param {Number} id  id of chosen value
     * @param {Boolean} [isDefault]  (optional) true - to set initial value of combo. Used in {@link UB.view.BasePanel} Default: false
     * @param {Function} [onLoadValue] (optional) raised when data loaded
     * @param {Object} [scope] (optional) scope to onLoadValue
     *
     */
  setValueById: function (id, isDefault, onLoadValue, scope) {
    var me = this
    if (Ext.isEmpty(id)) {
      me.setValue(id)
            // me.clearValue();
      if (isDefault) {
        me.resetOriginalValue()
      }
      if (onLoadValue) {
        Ext.callback(onLoadValue, scope || me, [me])
      }
      return
    }
    var store = me.getStore()
    function doSetValue (record, setNull) {
      if (setNull || record || me.store.getById(id)) {
        me.setValue(setNull ? null : record || id)
      }
      if (isDefault) {
        me.resetOriginalValue()
      }
      store.resumeEvent('clear')
      me.lastQuery = null // reset cuery caching
      if (onLoadValue) {
        Ext.callback(onLoadValue, scope || me, [me])
      }
    }
    store.on({
      load: {
        fn: function () {
          if (store.getCount() === 0) {
            var entity = $App.domainInfo.get(me.getEntity(), true)
                        // load deleted row or not actual historical
            if (!me.setIsActualValue && ((entity.hasMixin('mStorage') && entity.mixin('mStorage').safeDelete) ||
                entity.hasMixin('dataHistory'))) {
              $App.connection.select({
                entity: me.getEntity(),
                fieldList: store.ubRequest.fieldList, // [me.valueField, me.displayField ],
                __allowSelectSafeDeleted: true,
                ID: id
              }).done(function (result) {
                if (store.isDestroyed) {
                  return
                }
                var record = Ext.create(store.model)
                                // UB.ux.data.UBStore.createRecord(me.getEntity(), [me.valueField, me.displayField ], false);
                if (!UB.ux.data.UBStore.resultDataRow2Record(result, record)) {
                  doSetValue(null, true)
                  return
                }
                UB.ux.data.UBStore.resetRecord(record)
                store.add(record, true) // we MUST save cache here! In other case clearCache works some ms and formDataReady fires BEFORE store was actually loaded
                doSetValue(record)
                me.fieldCls += ' ub-combo-deleted'
                if (me.rendered) {
                  var input = Ext.get(me.getInputId())
                  input.addCls('ub-combo-deleted')
                }
                me.phantomSelectedElement = true
                me.tipPhantomElement = Ext.create('Ext.tip.ToolTip', {
                  target: me.getInputId(),
                  html: UB.i18n('elementIsNotActual')
                })
              })
            } else {
              doSetValue(null, true)
            }
          } else if (store.getCount() === 1) {
            doSetValue(store.getAt(0))
          } else {
            doSetValue()
          }
          me.setIsActualValue = false
        },
        single: true
      }
    })
    store.suspendEvent('clear')
    store.filter(new Ext.util.Filter({
      id: me.userFilterId,
      root: 'data',
      property: this.valueField || 'ID',
      condition: id && _.isArray(id) ? 'in' : 'equal',
      value: id
    }))
  },

  /**
   * Get field value by name from fieldList
   * @param fieldName
   * @returns
   */
  getFieldValue: function (fieldName) {
    return this.getValue() && this.lastSelection.length ? this.lastSelection[0].get(fieldName) : null
  }
})
