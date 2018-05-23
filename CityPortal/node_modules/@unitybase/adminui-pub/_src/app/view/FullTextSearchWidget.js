require('../ux/data/UBStore')
require('../view/SelectPeriodDialog')
require('../view/ToolbarWidget')

/**
 *  Widget for MainToolbar. This widget is showing controls in toolbar for start full text search.
 *
 *  Contains:
 *
 *    - in case of several FTS connection defined - connection selection control
 *    - search period selection control
 *
 *  Usage example:
 *
 *     $App.on('buildMainMenu', function(items){
 *       items.push(
 *           Ext.create('UB.view.FullTextSearchWidget'),
 *       );
 *   });
 *
 */
Ext.define('UB.view.FullTextSearchWidget', {
  extend: 'UB.view.ToolbarWidget',
  alias: 'widget.ubfulltextsearchwidget',
  requires: [
    'Ext.form.field.Text',
        // 'UB.ux.data.UBStore',
    'Ext.data.Store',
    'Ext.button.Button'
        // 'UB.view.SelectPeriodDialog'
  ],
  uses: ['UB.core.UBApp'],

  selectPeriod: function () {
    var me = this
    UB.view.SelectPeriodDialog.getPeriod({
      description: UB.i18n('selectPeriod'),
      dateFrom: me.periodContext.dateFrom,
      dateTo: me.periodContext.dateTo,
      disableDayPanel: true
    }).then(function (result) {
      if (result) {
        me.periodContext = result
        me.periodContext.dateFrom = UB.core.UBUtil.truncTimeToUtcNull(me.periodContext.dateFrom)
        me.periodContext.dateTo = UB.core.UBUtil.truncTimeToUtcNull(me.periodContext.dateTo)
        me.periodBtn.setText(me.periodContext.periodCaption)
      }
    })
  },

  initComponent: function () {
    var me = this,
      connections = { ftsDefault: 1}

    me.ftsConnectionList = [{code: 'ftsDefault', name: UB.i18n('ftsConnectionftsDefault')}]

    me.periodContext = {
      dateFrom: null,
      dateTo: null
    }

    me.periodContext.periodCaption =
            UB.view.SelectPeriodDialog.getPeriodCaption(me.periodContext.dateFrom, me.periodContext.dateTo)

    $App.domainInfo.eachEntity(function (ubEntity) {
      var conName
      if (ubEntity.hasMixin('fts') && (conName = ubEntity.mixins.fts['connectionName'])) {
        if (!connections[conName]) {
          connections[conName] = UB.i18n('ftsConnection' + conName)
          me.ftsConnectionList.push({code: conName, name: connections[conName]})
        }
      }
    })

    me.periodBtn = Ext.create('Ext.button.Button', {
      border: false,
      text: me.periodContext.periodCaption,
      tooltip: UB.i18n('ftsChkFilterPeriod'),
      margin: 0,
      padding: '6 1 6 1',
      style: {backgroundColor: 'white'},
      handler: me.selectPeriod,
      scope: me
    })

    me.ftsConnection = me.ftsConnectionList[0].code

    me.setActiveConnection = function (connCode, connName) {
      me.ftsConnection = connCode
      me.selectConnection.setText(connName)
    }
    if (me.ftsConnectionList.length > 1) {
      var connectionMenuItems = []
      me.ftsConnectionList.forEach(function (conn) {
        connectionMenuItems.push({
          text: conn.name,
          handler: me.setActiveConnection.bind(me, conn.code, conn.name)
        })
      })
      me.selectConnection = Ext.create('Ext.button.Button', {
        border: false,
        text: me.ftsConnectionList[0].name,
        tooltip: UB.i18n('selectFtsConnection'),
        margin: 0,
        padding: '6 1 6 1',
        style: {backgroundColor: 'white'},
        arrowCls: '',
        menu: {
          items: connectionMenuItems
        }
      })
    }

    me.textBox = Ext.create('Ext.form.field.Text', {
      enableKeyEvents: true,
      border: false,
      margin: 0,
      padding: 1,
      width: 60,
      emptyText: UB.i18n('search'),
      style: 'color: black; border-width: 0px;',
      fieldStyle: 'border-width: 0px;',
      listeners: {
        focus: function (sender) {
          sender.setWidth(150)
        },
        blur: function (sender) {
          sender.setWidth(60)
        },
        keyup: function (sender, e) {
          if (e.getKey() === e.ENTER) {
            me.searchButtonClick()
          }
        },
        scope: me
      }
    })

    me.searchButton = Ext.create('Ext.button.Button', {
      border: false,
      padding: '6 1 6 3',
      style: {backgroundColor: 'white'},
      glyph: UB.core.UBUtil.glyphs.faSearch,
      handler: me.searchButtonClick,
      scope: me
    })

    me.items = [{
      xtype: 'panel',
      layout: 'hbox',
      style: {
        background: 'white'
      },
      items: [
        me.searchButton,
        me.textBox
      ]
    }]
    if (me.selectConnection) {
      me.items[0].items.push(me.selectConnection)
    }
    me.items[0].items.push(me.periodBtn)
    me.callParent(arguments)
  },

  updateSnippet: function (value, metaObject) {
    var me = this
    if (!me.snippetRe) {
      me.snippetRe = new RegExp('Z(.*?)Z:', 'gim')
    }
    if (!value) {
      return
    }
        // UB-1255 - complex attributes in snippet. LowerCase, multiline
    function replacer (matched, attrCode) {
      var attr
      attrCode = attrCode.split('.')[0]
      attr = _.find(metaObject.attributes, function (val, key) {
        return key.toLowerCase() === attrCode
      })
      return '<br/><span style="color: blue">' + (attr ? (attr.caption || attr.description) : attrCode) + '</span>&nbsp'
    }
    return value.replace(me.snippetRe, replacer)
  },

  searchButtonClick: function () {
    var
      me = this,
      text = me.textBox.getValue(),
      tab,
      request,
      fieldList

    if (!text) {
      return
    }

    fieldList = [
            {name: 'ID', visibility: false},
            {name: 'entity', visibility: false},
            {name: 'entitydescr', visibility: true, description: UB.i18n('ftsFieldCaption')},
      {name: 'snippet', visibility: true, description: UB.i18n('ftsFieldSnippet'),
        format: function formatFTSResultData (value, metadata, record) {
          var entitySn = record.get('entity')
          value = me.updateSnippet(value, $App.domainInfo.get(entitySn))
          if (metadata && Ext.isString(value) && (value.length > 15)) {
            metadata.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(value) + '"'
          }
          return value
        }
      }
    ]

    request = {
      entity: 'fts_' + me.ftsConnection,
      method: 'fts',
      fieldList: UB.core.UBUtil.convertFieldListToNameList(fieldList),
      whereList: {
        match: {
          condition: 'match',
          values: {any: text}
        }
      }
    }

    if (me.periodContext && me.periodContext.dateFrom && me.periodContext.dateTo) {
      request.whereList.between = {
        condition: 'between',
        values: {
          v1: me.periodContext.dateFrom,
          v2: me.periodContext.dateTo
        }
      }
    }

    request.fieldList = fieldList

    tab = Ext.getCmp('FullTextSearchWidgetResult')
    if (tab) {
      tab.close()
    }

    $App.doCommand({
      cmdType: 'showList',
      tabId: 'FullTextSearchWidgetResult',
      target: $App.viewport.centralPanel,
      hideActions: ['addNewByCurrent', 'addNew', 'prefilter', 'edit', 'del', 'newVersion', 'history', 'accessRight', 'audit', 'itemSelect', 'showPreview', 'commandLink', 'itemLink', 'optimizeWidth'],
      description: UB.format(UB.i18n('fullTextSearchWidgetResultTitle'), text),
      cmpInitConfig: {
        disableSearchBar: true,
        onDeterminateForm: function (grid) {
          var entityCode,
            form, formParam,
            selection = grid.getSelectionModel().getSelection()
          if (selection.length) {
            entityCode = selection[0].get('entity').toString()
            form = UB.core.UBFormLoader.getFormByEntity(entityCode)
            if (form) {
              formParam = {
                formCode: form.get('code'),
                description: form.get('description') ? UB.i18n(form.get('description').toString()) : '',
                entityName: entityCode,
                instanceID: selection[0].get('ID')
              }
              return formParam
            }
          }
        }
      },
      cmdData: {
        params: [request]
      }
    })
  }
})

