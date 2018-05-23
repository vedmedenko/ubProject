require('../../../../ux/form/field/BoxSelect')
/**
 * Allows user to select multiple values. This class adds the specific for UB behavior of the user interface.
 */
Ext.define('UB.ux.form.field.UBBoxSelect', {
  extend: 'Ext.ux.form.field.BoxSelect',
  userFilterId: 'userFilterId',
  alias: 'widget.ubboxselect',
  queryCaching: false,
  queryDelay: 300,
  minChars: 1,
  dataLoadDelay: true,
  componentLayout: 'triggerfield',
  cls: 'ub-box-select',
  requires: [
    'UB.core.UBUtil'
  ],
  selectOnFocus: false,
  /**
   * Highlight input value in dropDownList
   * @cfg {Boolean} highlightSearch
   */
  highlightSearch: true,

  /**
   * Minimum characters to start query
   * @cfg {Number} minCharsForQuery
   */
  minCharsForQuery: 0,
  matchCls: 'combo-search-match',
  disableGrow: false,
  growMax: 100,

  /**
  * Combobox items query. If passed - store is created automatically
  * @cfg {Object} [ubRequest]
  */
  initComponent: function () {
    var me = this
    var fnReplace
    var store

    me.grow = !me.disableGrow

    if (!me.tpl) {
      me.tpl = new Ext.XTemplate(
        '<ul class="' + Ext.plainListCls + '"><tpl for=".">',
        '<li role="option" unselectable="on" class="',
        'boundlist-{[xindex % 2 === 0 ? "even" : "odd"]}  ' + Ext.baseCSSPrefix + 'boundlist-item " ', // me.itemCls
        ">{[values['" + me.displayField + "']]}</li>",
        '</tpl></ul>'
      )
    }

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
    store.pageSize = me.pageSize

    fnReplace = function (m) {
      return '<span class="' + me.matchCls + '">' + m + '</span>'
    }

    me.listConfig = {
      pageSize: me.pageSize,
      minWidth: me.listMinWidth,
      selModel: {
        mode: me.multiSelect ? 'SIMPLE' : 'SINGLE',
        preventFocus: true
      },
      listeners: {
        refresh: {
          fn: function (view) {
            if (!me.highlightSearch || !me.searchRegExp) {
              return
            }
            var el = view.getEl()
            if (!el) {
              return
            }
            var list = el.down('.x-list-plain')
            if (!list) {
              return
            }

            var itmEl = list.down('.x-boundlist-item')
            while (itmEl) {
              if (itmEl.dom.innerHTML) {
                itmEl.dom.innerHTML = itmEl.dom.innerHTML.replace(me.searchRegExp, fnReplace)
              }
              itmEl = itmEl.next()
            }
          }
        }
      },

      tpl: me.tpl,

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
    }

    me.on({beforedestroy: me.onBeforedestroy, scope: me})

    me.callParent(arguments)

    if (me.editable) {
      me.on({
        beforequery: me.beforequery,
        scope: me
      })
    }

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

  /**
   * @private
   */
  fieldSubTpl: [
    '<div id="{cmpId}-listWrapper" class="x-boxselect {fieldCls} {typeCls} {requiredCls}',
    '<tpl if="readOnly"> readonly="readonly"</tpl>',
    '">',
    '<ul id="{cmpId}-itemList" class="x-boxselect-list" ',
    '<tpl if="componentHeight">style=" height:"{componentHeight}px;"</tpl>',
    '>',
    '<li id="{cmpId}-inputElCt" class="x-boxselect-input" style="width: 100%;" >',
    '<div id="{cmpId}-emptyEl" class="{emptyCls}">{emptyText}</div>',
    '<input id="{cmpId}-inputEl" type="{type}" ',
    '<tpl if="name">name="{name}" </tpl>',
    '<tpl if="value"> value="{[Ext.util.Format.htmlEncode(values.value)]}"</tpl>',
    '<tpl if="size">size="{size}" </tpl>',
    '<tpl if="tabIdx">tabIndex="{tabIdx}" </tpl>',
    '<tpl if="disabled"> disabled="disabled"</tpl>',
    '<tpl if="readOnly"> readonly="readonly"</tpl>',
    'class="x-boxselect-input-field {inputElCls}" autocomplete="off">',
    '</li>',
    '</ul>',
    '</div>',
    {
      compiled: true,
      disableFormats: true
    }
  ],

  setAllowBlank: function (allowBlank) {
    var el
    this.allowBlank = allowBlank

    el = Ext.get(this.id + '-listWrapper')
    if (!el) {
      return
    }
    if (allowBlank) {
      el.removeCls(this.requiredCls)
    } else {
      el.addCls(this.requiredCls)
    }
  },

  setValue: function (value, doSelect, skipLoad) {
    if (Ext.isString(value)) {
      value = Ext.JSON.decode('[' + value + ']')
    }

    this.callParent([value, doSelect, skipLoad])
    this.updateLayout()
  },

  /**
   *
   * @param {Boolean} [asObject=false]
   * @returns {*}
   */
  getValue: function (asObject) {
    var value = this.callParent(arguments)
    if (asObject) {
      return value
    }
    if (!value) {
      return value
    } else {
      return UB.core.UBUtil.extractfromBrackets(Ext.JSON.encode(value))
    }
  },

  /**
   * Return items as array
   * @returns {Array}
   */
  getValueArray: function () {
    var obj = this.getValue(true)
    var result = []
    _.forEach(obj, function (elm) {
      result.push(elm)
    })
    return result
  },

  isDirty: function () {
    var me = this
    return !me.disabled && (!me.isEqual(me.getValue(), me.originalValue))
  },

  isEqual: function (arg1, arg2) {
    if (!arg1 && !arg2) {
      return true
    } else {
      return this.callParent(arguments)
    }
  },

  /**
   * Set combo value by recordId
   * @param id {String} comma separated ids of chosen values
   * @param isDefault {Boolean} (optional) true - to set initial value of combo. Used in {@link UB.view.BasePanel} Default: false
   * @param {Function} [onLoadValue] (optional) raised when data loaded
   * @param {Object} [scope] (optional) scope to onLoadValue
   *
   */
  setValueById: function (id, isDefault, onLoadValue, scope) {
    var me = this
    var originalReq, ids
    if (!id) {
      me.setValue(id)
      if (isDefault) {
        me.resetOriginalValue()
      }
      if (onLoadValue) {
        Ext.callback(onLoadValue, scope || me, [me])
      }
      return
    }
    originalReq = me.store.ubRequest

    if (typeof (id) !== 'string') {
      id = String(id)
    }
    if (this.valueField === 'ID') {
      ids = id.split(',').map(function (val) { return parseInt(val, 10) })
    } else {
      ids = id.replace(/"/g, '').split(',')
    }

    var repo = UB.Repository(originalReq.entity).attrs(originalReq.fieldList)
    if (ids.length > 1) {
      repo = repo.where('[' + this.valueField + ']', 'in', ids)
    } else {
      repo = repo.where('[' + this.valueField + ']', '=', ids[0])
    }
    if (this.enumGroupFilter) {
      repo = repo.where('[eGroup]', '=', this.enumGroupFilter)
    }
    repo.selectAsStore().then(function (store) {
      var values = []
      store.each(function (record) {
        values.push(record)
      })
      if (me.store) { // in case of Save&close action store can be null here
        me.setValue(values)
        if (isDefault) {
          me.resetOriginalValue()
        }
        if (onLoadValue) {
          Ext.callback(onLoadValue, scope || me, [me])
        }
      }
    })
  },

  beforequery: function (queryEvent) {
    var me = this
    if (me.minCharsForQuery && me.minCharsForQuery > 0 && me.minCharsForQuery > (queryEvent.query || '').length) {
      queryEvent.cancel = true
      me.showToolTipMinQuery()
      return
    }
    var escapedQuery = UB.Utils.escapeForRegexp(queryEvent.query)
    me.searchRegExp = null
    if (!Ext.isEmpty(escapedQuery)) {
      me.searchRegExp = new RegExp(escapedQuery, 'gi')
    }

    if (queryEvent.combo.queryMode !== 'local') {
      var store = me.store
      var queryString = queryEvent.query || ''
      var displayField = me.displayField

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
        queryEvent.forceAll = true
      }
    }
  },

    /**
     * Show message when too little chars in query.
     */
  showToolTipMinQuery: function () {
    var picker = this.getPicker()
    var targetEl
    this.expand()
    this.pagingToolbar.setHeight(0)
    targetEl = picker.getTargetEl()
    picker.clearViewEl()
    Ext.core.DomHelper.insertHtml('beforeEnd', targetEl.dom,
      UB.format(UB.i18n('startSearchMinCharacters'), this.minCharsForQuery)
    )
  },

  /**
   * Delegation control for selecting and removing labelled items or triggering list collapse/expansion
   * @protected
   */
  onItemListClick: function (evt, el, o) {
    var me = this
    var itemEl = evt.getTarget('.x-boxselect-item')
    var closeEl = itemEl ? evt.getTarget('.x-boxselect-item-close') : false

    if (me.readOnly || me.disabled) {
      return
    }

    evt.stopPropagation()

    if (itemEl) {
      if (closeEl) {
        me.removeByListItemNode(itemEl)
        if (me.valueStore.getCount() > 0) {
          me.fireEvent('select', me, me.valueStore.getRange())
        }
      } else {
        me.toggleSelectionByListItemNode(itemEl, evt.shiftKey)
      }
      me.inputEl.focus()
    } else {
      if (me.selectionModel.getCount() > 0) {
        me.selectionModel.setLastFocused(null)
        me.selectionModel.deselectAll()
      }
    }
  },

  alignPicker: function () {
    var me = this
    var picker = me.picker
    var pickerScrollPos = picker.getTargetEl().dom.scrollTop

    me.callSuper(arguments)

    if (me.isExpanded) {
      if (me.matchFieldWidth) {
        // Auto the height (it will be constrained by min and max width) unless there are no records to display.
        // picker.setWidth(me.listWrapper.getWidth());
        picker.setWidth(me.bodyEl.getWidth())
      }

      picker.getTargetEl().dom.scrollTop = pickerScrollPos
    }
  },

  onDataLoaded: function (/* sender, records, successful, eOpts */) {
    var me = this
    var dataLen = me.store.getCount()
    var strLength
    if (me.pagingToolbar) {
      if (me.pageSize > dataLen || (me.lastRowIndex && ((me.lastRowIndex + 1 + me.pageSize) > dataLen))) {
        me.pagingToolbar.setHeight(0)
      } else {
        me.pagingToolbar.setHeight(36)
      }
    }
    me.onDataRefreshed()
    if (me.inputEl) {
      if (me.inputEl.getValue()) {
        strLength = me.inputEl.getValue().length
        me.inputEl.dom.setSelectionRange(strLength, strLength)
      }
    }
  },

  onDataRefreshed: function () {
    var me = this
    var store = this.getStore()
    var storeLen = store.getCount()
    var picker = me.getPicker()
    var lastRow = me.lastRowIndex

    if (lastRow) {
      me.lastRowIndex = null
      if (storeLen > lastRow + 8) {
        lastRow = lastRow + 8
      }
      lastRow = store.getAt(lastRow)
      if (lastRow) {
        picker.focusNode(lastRow)
      }
    }
  },

  readMoreData: function () {
    var me = this
    var store = this.getStore()
    var storeLen = store.getCount()
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

  getMultiSelectItemMarkup: function () {
    var me = this

    if (!me.multiSelectItemTpl) {
      if (!me.labelTpl) {
        me.labelTpl = Ext.create('Ext.XTemplate',
          '{[values["' + me.displayField + '"]]}'
        )
      } else if (Ext.isString(me.labelTpl) || Ext.isArray(me.labelTpl)) {
        me.labelTpl = Ext.create('Ext.XTemplate', me.labelTpl)
      }

      me.multiSelectItemTpl = [
        '<tpl for=".">',
        '<li class="x-tab-default x-boxselect-item ',
        '<tpl if="this.isSelected(values.' + me.valueField + ')">',
        ' selected',
        '</tpl>',
        '" qtip="{[typeof values === "string" ? values : ["' + me.displayField + '"]]}">',
        '<div class="x-boxselect-item-text this.getItemCls(values.' + me.valueField + ')">{[typeof values === "string" ? values : this.getItemLabel(values)]}</div>',
        '<div class="x-tab-close-btn x-boxselect-item-close"></div>',
        '</li>',
        '</tpl>',
        {
          compile: true,
          disableFormats: true,
          getItemCls: function (value) {
            if (me.deletedItems && me.deletedItems.length > 0) {
              if (me.deletedItems.indexof(value) >= 0) {
                return 'boxselect-item-deleted'
              }
            }
            return ''
          },
          isSelected: function (value) {
            var i = me.valueStore.findExact(me.valueField, value)
            if (i >= 0) {
              return me.selectionModel.isSelected(me.valueStore.getAt(i))
            }
            return false
          },
          getItemLabel: function (values) {
            return me.getTpl('labelTpl').apply(values)
          }
        }
      ]
    }

    return this.getTpl('multiSelectItemTpl').apply(Ext.Array.pluck(this.valueStore.getRange(), 'data'))
  }
})
