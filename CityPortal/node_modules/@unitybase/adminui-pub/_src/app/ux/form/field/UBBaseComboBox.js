/**
 * Base UnityBase combobox. The main purpose is
 *
 *  - implement popup menu
 *  - notify parent about loaded
 *
 */
Ext.define('UB.ux.form.field.UBBaseComboBox', {
  extend: 'Ext.form.field.ComboBox',
  alias: 'widget.ubbasebox',
  queryCaching: true,

  /**
   * return entity code
   * @pribate
   * @returns {String}
   */
  getEntity: function () {
    let request = this.ubRequest || (this.store ? this.store.ubRequest : null)
    return request.entity
  },

  /**
   * Field list displayed while we show dictionary for this combobox. If omitted - all entity fields will be shown.
   * @cfg {Array<String>} [gridFieldList]
   */
  initComponent: function () {
    var me = this,
      eStore = me.getStore()

    me.callParent(arguments)
    me.on('afterrender', me.onAfterRender, me)
    // me.on('focus', me.onFocus, me);
    me.on('change', me.onValueChange, me)
    if (eStore) { // we can create UBBaseComboBox w/o store (in UB.ux.UBPreFilter for example)
      eStore.on('load', function (owner, record, success) {
        if (success) {
          me.dataLoaded = true
        }
      }, me, {single: true})
    }
    // make default delay short for cached entities. For example user quickly type "Uni" and press Tab to select UnityBase from combo
    if (eStore && eStore.ubRequest && eStore.ubRequest.entity) {
      var eCacheType = $App.domainInfo.get(eStore.ubRequest.entity, true).cacheType
      if ((eCacheType === 'Session') ||
                 (eCacheType === 'SessionEntity')) {
        me.queryDelay = 200 // [UB-1737]
      }
    }
  },

  setRawValue: function (value) {
    var me = this
    me.callParent(arguments)
    if (me.inputEl && me.readOnly && value && value.length > 50) {
      me.inputEl.set({'data-qtip': value})
    }
  },

  onDataLoaded: function (callback, scope) {
    var me = this, eStore = this.getStore()
    if (this.dataLoaded) {
      Ext.callback(callback, scope || me, [me])
    } else {
      eStore.on('load', function (owner, record, success) {
        me.dataLoaded = true
        if (success) {
          Ext.callback(callback, scope || me, [me])
        }
      }, me, {single: true})
    }
  },

  onAfterRender: function () {
    var me = this, val
    if (!me.disableContextMenu) {
      me.initContextMenu()
    }
        /**
         * @cfg disableContextMenu
         */
    me.inputCell.on('contextmenu', function (e, t) {
      e.stopEvent()
      if (!me.disabled && !me.disableContextMenu && me.contextMenu) { // && !me.readOnly
        me.onShowContextMenu()
        me.contextMenu.showAt(e.getXY())
      }
    }, me)
    if (me.inputEl && me.readOnly && (val = me.inputEl.getValue()) && val.length > 50) {
      me.inputEl.set({'data-qtip': val})
    }
        /**
         * @cfg {Boolean} disableLimitSearchLength disable automatic set maximum input length
         */
    if (!me.disableLimitSearchLength && !!UB.appConfig.maxSearchLength) {
      me.inputEl.set({'maxlength': UB.appConfig.maxSearchLength})
    }
  },

  onShowContextMenu: function () {
    var me = this

    if (me.editItemButton) {
      if (!me.getValue()) {
        me.editItemButton.autoDisable = true
        me.editItemButton.setDisabled(true)
      } else if (me.editItemButton.autoDisable) {
        if (!me.disabled && /*! me.readOnly && */ !me.disableModifyEntity) {
          me.editItemButton.setDisabled(false)
        }
      }
    }
  },

  onValueChange: function () {
    var me = this,
      disabled = me.disabled || /* me.readOnly || */ me.disableModifyEntity || !me.getStore().getById(me.getValue())
    if (me.editItemButton) {
      me.editItemButton.setDisabled(disabled)
    }
  },

  onKeyDown: function (e) { // override
    var me = this
    if (!me.editable && (e.getKey() === e.BACKSPACE)) {
      e.stopEvent()
      me.clearValue()
    } else if (!e.ctrlKey) {
      me.callParent(arguments)
    }
  },

  onKeyUp: function (e) { // override
    var me = this

    me.editedByUser = true
    if (!me.editable && e.BACKSPACE) {
      e.stopEvent()
    } else if (!e.ctrlKey) {
      me.callParent(arguments)
    }
  },

  beforeDestroy: function (sender) {
    var me = this
    if (me.contextMenu) {
      Ext.destroy(me.contextMenu)
      me.contextMenu = null
    }
    if (me.keyMap) {
      Ext.destroy(me.keyMap)
      me.keyMap = null
    }
    this.callParent()
  },

  setReadOnly: function (readOnly) {
    var
            me = this, val
    me.callParent(arguments)
    if (me.showLookupButton) {
      me.showLookupButton.setDisabled(readOnly)
    }
    if (me.addItemButton) {
      me.addItemButton.setDisabled(readOnly)
    }
    if (me.clearValueButton) {
      me.clearValueButton.setDisabled(readOnly)
    }
    if (me.inputEl) {
      if (readOnly && (val = me.inputEl.getValue()) && val.length > 50) {
        me.inputEl.set({'data-qtip': val})
      } else {
        me.inputEl.set({'data-qtip': undefined})
      }
    }
  },

    /**
     * @cfg disableModifyEntity If true will be disabled items editInstance and addInstance in context menu.
     */
  disableModifyEntity: false,

    /**
     * @cfg  hideEntityItemInContext If true will be hidden entity actions in context menu.
     */
  hideEntityItemInContext: false,

  initContextMenu: function () {
    var me = this, menuItems,
      store,
      entityName,
      methodNames = UB.core.UBCommand.methodName
    store = me.getStore()
    menuItems = []
    entityName = (store.ubRequest ? store.ubRequest.entity : null) || store.entityName
    if ($App.domainInfo.has(entityName)) {
      menuItems.push({
        text: UB.i18n('editSelItem') + ' (Ctrl+E)',
                // iconCls: 'ub-icon-table-edit',
        glyph: UB.core.UBUtil.glyphs.faEdit,
        itemID: 'editItem',
        handler: me.editItem,
        hidden: !!me.hideEntityItemInContext || me.disableModifyEntity,
        disabled: me.disabled || /* me.readOnly || */ me.disableModifyEntity,
        scope: me
      })
      menuItems.push({
        text: UB.i18n('selectFromDictionary') + ' (F9)',
        glyph: UB.core.UBUtil.glyphs.faTable,
                // iconCls: 'ub-icon-table',
        itemID: 'showLookup',
        handler: me.showLookup,
        hidden: !!me.hideEntityItemInContext,
        disabled: me.disabled || me.readOnly,
        scope: me
      })
      menuItems.push({
        text: UB.i18n('addNewItem'),
        glyph: UB.core.UBUtil.glyphs.faPlusCircle,
                // iconCls: 'iconAdd',
        itemID: 'addItem',
        handler: me.addItem,
        hidden: !!me.hideEntityItemInContext || me.disableModifyEntity,
        disabled: me.disableModifyEntity || me.disabled || me.readOnly || !$App.domainInfo.isEntityMethodsAccessible(entityName, [methodNames.ADDNEW, methodNames.INSERT]),
        scope: me
      })
    }
    menuItems.push({
      text: UB.i18n('clearSelection') + ' (Ctrl+BackSpace)',
      glyph: UB.core.UBUtil.glyphs.faEraser,
            // iconCls: 'iconClear',
      itemID: 'clearValue',
      handler: me.clearValue,
      disabled: me.disabled || me.readOnly,
      scope: me
    })

    me.contextMenu = Ext.create('Ext.menu.Menu', {items: menuItems })

    me.editItemButton = me.contextMenu.items.getAt(0)
    me.showLookupButton = me.contextMenu.items.getAt(1)
    me.addItemButton = me.contextMenu.items.getAt(2)
    me.clearValueButton = me.contextMenu.items.getAt(3)

    me.keyMap = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        ctrl: true,
        shift: false,
        alt: false,
        key: Ext.EventObject.E,
        handler: function (keyCode, e) {
          if (!me.disabled && !me.readOnly && !me.hideEntityItemInContext && !me.disableModifyEntity) {
            e.stopEvent()
            me.editItem()
          }
          return true
        }
      }, {
        ctrl: false,
        shift: false,
        alt: false,
        key: 120,
        handler: function (keyCode, e) {
          if (!me.disabled && !me.readOnly && !me.hideEntityItemInContext) {
            e.stopEvent()
            me.showLookup()
          }
          return true
        }
      }, {
        ctrl: true,
        shift: false,
        alt: false,
        key: 8,
        handler: function (keyCode, e) {
          if (!me.disabled && !me.readOnly) {
            e.stopEvent()
            me.clearValue()
          }
          return true
        }
      }, {
        ctrl: true,
        shift: false,
        alt: false,
        key: 65,
        handler: function (keyCode, e) {
          me.ctrlCDown = true
          return true
        }
      }, {
        ctrl: true,
        shift: false,
        alt: false,
        key: 67,
        handler: function (/* keyCode, e */) {
                    // e.stopEvent();
          me.ctrlCDown = true
          return true
        }
      }]
    })
  },

  doRawQuery: function () {
    var me = this,
      rawValue = this.getRawValue()
    if (!me.ctrlCDown && (rawValue || !me.editedByUser) && (me.getDisplayValue() !== rawValue)) {
      me.callParent(arguments)
    }
    me.deleteWasPressed = false
    me.ctrlCDown = false
  },

  addItem: function () {
    let me = this
    let store = me.getStore()
    let entityName = store.entityName
    let displayField = me.displayField
    let val = me.getValue()
    let rec = store.getById(val)
    let cmdConfig = {
      cmdType: UB.core.UBCommand.commandType.showForm,
      entity: entityName,
      store: store,
      isModal: true,
      sender: me,
      onClose: function (itemId) {
        if (itemId && me.setValueById) {
          me.setIsActualValue = true
          me.setValueById(itemId)
        }
      }
    }
    cmdConfig.initValue = {}
    cmdConfig.initValue[displayField] = rec ? rec.get(displayField) : val

    UB.core.UBApp.doCommand(cmdConfig)
  },

  editItem: function (initValue) {
    var me = this, store, entityName, instanceID, cmdConfig
    store = me.getStore()
    entityName = store.entityName
    if (!entityName) { return }
    instanceID = me.getValue()
    cmdConfig = {
      cmdType: UB.core.UBCommand.commandType.showForm,
      entity: entityName,
      instanceID: instanceID,
      initValue: initValue,
      store: store,
      isModal: true,
      sender: me,
      onClose: function (itemID, store, formWasSaved) {
        if (!me.readOnly && formWasSaved) {
          me.setValue(null)
          me.getStore().clearData()
          me.setValueById(itemID || instanceID)
          me.enable()
        }
      }
    }
    if (instanceID) {
      UB.core.UBApp.doCommand(cmdConfig)
    }
  },

  showLookup: function () {
    var me = this, store, entityName, instanceID, config, fieldList
    store = me.getStore()
    entityName = store.entityName
    if (!entityName) { return }
    instanceID = me.getValue()
    fieldList = me.gridFieldList ? me.gridFieldList : '*'

    config = {
      entity: entityName,
      cmdType: UB.core.UBCommand.commandType.showList,
      description: $App.domainInfo.get(entityName, true).getEntityDescription(),
      isModal: true,
      sender: me,
      selectedInstanceID: instanceID,
      onItemSelected: function (selected) {
        if (me.setValueById) {
          me.getStore().clearData()
          me.setValueById(selected.get(me.valueField || 'ID'))
        }
      },
      cmdData: {
        params: [{
          entity: entityName,
          method: 'select',
          fieldList: fieldList,
          whereList: store.ubRequest.whereList
        }]
      }
    }
    var filters = store.filters.clone()
    filters.removeAtKey(me.userFilterId)
    config.filters = filters

    UB.core.UBApp.doCommand(config)
  },

  onExpand: function () {
    var me = this,
      selectOnTab = me.selectOnTab,
      picker = me.getPicker()

    me.listKeyNav = new Ext.view.BoundListKeyNav(this.inputEl, {
      boundList: picker,
      forceKeyDown: true,
      tab: function (e) {
        if (selectOnTab) {
          this.selectHighlighted(e)
          me.triggerBlur()
        }
                // Tab key event is allowed to propagate to field
        return true
      },
      enter: function (e) {
        var selModel = picker.getSelectionModel(),
          count = selModel.getCount()

        this.selectHighlighted(e)

                // Handle the case where the highlighted item is already selected
                // In this case, the change event won't fire, so just collapse
        if (!me.multiSelect && count === selModel.getCount()) {
          me.collapse()
        }
      },
      home: null,
      end: null
    })
    me.callParent(arguments)
        // keyNav = me.listKeyNav;
        // keyNav.home = function(){};
        // keyNav.end = function(){};
  },

  getErrors: function (value) {
    var me = this, errors, fvalue
    errors = me.callParent(arguments)
    fvalue = me.getValue()
    if (!fvalue && (fvalue !== 0) && !me.allowBlank) {
            // If we are not configured to validate blank values, there cannot be any additional errors
      if (errors.length === 0 || (errors.indexOf(me.blankText) < 0)) {
        errors.push(me.blankText)
      }
    }
    return errors
  },

  onDestroy: function () {
    if (this.contextMenu) {
      this.contextMenu.destroy()
    }
    this.callParent(arguments)
  }

})
