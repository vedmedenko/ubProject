/**
 * Text field implementing specific logic of UB
 */
Ext.define('UB.ux.form.field.UBText', {
  extend: 'Ext.form.field.Trigger', // Ext.form.field.Text
  alias: 'widget.ubtextfield',

  triggerCls: 'ub-multilang-trigger',

  initComponent: function () {
    var me = this, menuItems = []

    me.hideTrigger = !me.isMultiLang
    if (me.hideTrigger) {
      me.componentLayout = 'field'
    }
    menuItems.push({
      text: UB.i18n('editMultiLang'),
      handler: me.showMultiLangForm,
      scope: me
    })

    me.contextMenu = Ext.create('Ext.menu.Menu', {items: menuItems })
    me.callParent(arguments)
  },

  getSubTplMarkup: function (values) {
    var me = this

    if (me.hideTrigger) {
      return me.getTpl('fieldSubTpl').apply(this.getSubTplData())
    } else {
      return me.callParent(arguments)
    }
  },

  initTrigger: function () {
    var me = this
    if (me.hideTrigger) {
      return
    } else {
      me.callParent(arguments)
    }
  },

  onTriggerClick: function () {
    this.showMultiLangForm()
  },

    /**
     * This method allow change the allowBlank property dynamically
     * @param allowBlank
     */
  setAllowBlank: function (allowBlank) {
    this.callParent(arguments)
  },

    /**
     * @cfg {Boolean} isMultilang If true the user can edit text in all languages.
     * For this mode, you must:
     *   - Put this field into {@link UB.view.BasePanel}
     *   - Set entity attribute to property "attributeName"
     */

    /**
     * @private
      */
  afterRender: function () {
    var me = this

    me.callParent(arguments)
    if (me.isMultiLang) {
      if (me.triggerEl) {
        me.triggerEl.set({ 'data-qtip': UB.i18n('isMultilangTip')})
      }
      me.getEl().on('contextmenu', me.showContextMenu, me)
    }
  },

  showContextMenu: function (e) {
    e.stopEvent()
    this.contextMenu.showAt(e.getXY())
  },

  showMultiLangForm: function () {
    var me = this,
      basePanel,
      fieldList = ['ID'],
      controls = {},
      items = [], window,
      savedData
    basePanel = me.up('basepanel')
    if (!basePanel || !me.attributeName) {
      return
    }
    _.forEach(UB.appConfig.supportedLanguages, function (lang) {
      if ($App.connection.userLang() === lang) {
        return
      }
      fieldList.push(me.attributeName + '_' + lang + '^')
      controls[lang] = Ext.create(Ext.getClassName(me) /* 'Ext.form.field.Text' */, {
        fieldLabel: UB.i18n(lang), /* + (me.allowBlank ? '': '<span class="ub-view-marked-field-label">*</span>') */
        allowBlank: me.allowBlank,
        readOnly: me.readOnly || me.disabled,
        labelStyle: "word-break: 'break-all'; word-wrap: 'break-word';",
        labelWidth: 120,
        rows: me.rows
      })
      items.push(controls[lang])
    })

    savedData = basePanel.getExtendedDataForSave()
    function setSavedData () {
      _.forEach(UB.appConfig.supportedLanguages, function (lang) {
        if ($App.connection.userLang() === lang) {
          return
        }
        if (savedData.hasOwnProperty(me.attributeName + '_' + lang + '^')) {
          controls[lang].setValue(savedData[me.attributeName + '_' + lang + '^'])
          controls[lang].resetOriginalValue()
        }
      })
    }

    if (basePanel.instanceID /* && !me.nationalFieldEdited */) {
      $App.connection.select({
        entity: basePanel.entityName,
        method: 'select',
        fieldList: fieldList,
        ID: basePanel.instanceID
      })
        .then(UB.LocalDataStore.selectResultToArrayOfObjects)
        .done(function (data) {
          var row = data && data.length > 0 ? data[0] : {}
          _.forEach(UB.appConfig.supportedLanguages, function (lang) {
            if ($App.connection.userLang() === lang) {
              return
            }
            controls[lang].setValue(row[me.attributeName + '_' + lang + '^'])
            controls[lang].resetOriginalValue()
          })
          setSavedData()
        })
    } else {
      setSavedData()
    }

    function saveForm () {
      var saveData = {}
      if (!window.down('form').isValid()) {
        return
      }
      _.forEach(UB.appConfig.supportedLanguages, function (lang) {
        if (($App.connection.userLang() === lang) || !controls[lang].isDirty()) {
          return
        }
        saveData[me.attributeName + '_' + lang + '^'] = controls[lang].getValue()
      })
      basePanel.addExtendedDataForSave(saveData)
      me.nationalFieldEdited = true
      window.close()
    }

    window = Ext.create('UB.view.BaseWindow', {
      title: me.fieldLabel, // UB.i18n('filterForm'),
      height: 250,
      width: 500,
      modal: true,
      stateful: true,
      stateId: 'ubLangForm_' + basePanel.entityCode + '_' + me.attributeName,
      layout: { type: 'fit' },

      items: [{
        overflowX: 'auto',
        overflowY: 'auto',
        xtype: 'form',
        padding: 5,
        layout: { type: 'vbox', align: 'stretch' },
        items: items
      }],
      buttons: [{
        text: UB.i18n('Change'),
        glyph: UB.core.UBUtil.glyphs.faSave,
        hidden: me.readOnly || me.disabled,
        handler: saveForm,
        scope: me
      }, {
        text: UB.i18n('cancel'),
        glyph: UB.core.UBUtil.glyphs.faTimes,
        handler: function () {
          window.close()
        }
      }
      ]
    })

    window.on('boxready', function () {
      window.actionsKeyMap = {}
      window.actionsKeyMap.saveAndClode = new Ext.util.KeyMap({
        target: window.getEl(),
        binding: [{
          key: Ext.EventObject.ENTER,
          ctrl: true,
          shift: false,
                    // Ctrl+Enter
          fn: function () {
            saveForm()
          }
        }]
      })
    })
    window.show()
  }
})

