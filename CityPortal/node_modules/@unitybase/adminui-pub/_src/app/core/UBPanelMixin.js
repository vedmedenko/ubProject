require('./UBUtil')
/**
 * Файл: UB.core.UBPanelMixin.js
 * Автор: Игорь Ноженко
 *
 * Mixin для формирования toolbar'а grid'а/form'ы
 *
 * Обеспечивает предподготовку toolbar'а grid'а/form'ы на основе custom'ных dfm'ок
 * Добавляет функции из custom'ных js'ов
 */

Ext.define('UB.core.UBPanelMixin', {
  statics: {
    orderIdAttributeName: 'orderId',
    menuIdAttributeName: 'menuId',
    actionIdAttributeName: 'actionId',
    actionsArrayName: 'actions',
    addBaseActionsMethodName: 'addBaseActions',
    addBaseDockedItemsMethodName: 'addBaseDockedItems',
    addBaseListenersMethodName: 'addBaseListeners',

    actionId: {
      showDetail: 'showDetail'
    },

    eventId: {
      showdetail: 'showdetail'
    }
  },

    /**
     * Find all details for current entity (this.entityName)
     * @return {Array}
     */
  buildDetailList: function () {
    var
      result = [],
      myName = this.entityName,
      details = this.details || [],
      mixinArrtRe = /^ID|mi_/

    if (details.length > 0) {
      result = details
    } else {
      $App.domainInfo.eachEntity(function (curEntity, curEntityName) {
        if (curEntityName !== myName) {
          curEntity.eachAttribute(function (curAttr, curAttrName) {
            if ((curAttr.associatedEntity === myName) && !mixinArrtRe.test(curAttrName)) {
              result.push({
                entityName: curEntityName,
                attribute: curAttrName
              })
            }
          })
        }
      })
    }
    return result
  },

  preprocessPanel: function () {
    var
      me = this,
      panelMixin = UB.core.UBPanelMixin
    me.entityDetails = me.buildDetailList()

    me.addFunctions()

    if (!Ext.isDefined(me[panelMixin.actionsArrayName])) {
      me[panelMixin.actionsArrayName] = []
    }

    Ext.callback(me[panelMixin.addBaseActionsMethodName], me)

    Ext.callback(me[panelMixin.addBaseDockedItemsMethodName], me)

    me.createActions()
    me.mergeDockedItems()

    Ext.callback(me[panelMixin.addBaseListenersMethodName], me)

    me.addAdditionalListeners()
  },

  addFunctions: function () {
    var me = this, functions

    if (me.functions) {
      if (Ext.isString(me.functions)) {
        me.functions = Ext.decode(me.functions)
      }
      functions = me.functions
      for (var f in functions) {
        if (me.functions.hasOwnProperty(f)) {
          if (_.isFunction(me[f])) {
            functions[f].$previous = me[f]
          }
          me[f] = functions[f]
        }
      }
    }
  },

  createActions: function () {
    var
      me = this,
      action,
      item

    if (!me.dfm || !me.dfm.actions) {
      return
    }

    for (var i = 0, len = me.dfm.actions.length; i < len; ++i) {
      item = me.dfm.actions[i]

      action = new Ext.Action({
        actionId: item.actionId,
        eventId: item.eventId,
        handler: me.onAction,
        scope: me
      })

      if (item.iconCls) {
        action.setIconCls(item.iconCls)
      }

      if (item.text) {
        action.setText(item.text)
      }

      me.actions[item.actionId] = action
    }
  },

  getDockedItemsByFilter: function (obj) {
    var
      result = [],
      items

    if (!this.dockedItems) {
      return result
    }

    items = Ext.isArray(this.dockedItems) ? this.dockedItems : this.dockedItems.items

    for (var i = 0, len = items.length; i < len; ++i) {
      if (UB.core.UBUtil.allPropsEqual(items[i], obj)) {
        result.push(items[i])
      }
    }

    return result
  },

  prepareMenu: function (items) {
    var
      me = this,
      mixin = UB.core.UBPanelMixin,
      actionName,
      orderId

    for (var i = 0, len = items.length; i < len; ++i) {
      orderId = items[i][mixin.orderIdAttributeName]
      actionName = items[i][mixin.actionIdAttributeName]
      if (actionName && me.actions[actionName]) {
        items[i] = me.actions[actionName]
        if (orderId !== undefined) {
          items[i][mixin.orderIdAttributeName] = orderId
        }
      }

      if (items[i].menu) {
        me.prepareMenu(items[i].menu)
      }
    }
  },

  getMenu: function (items, menuId, menuIdAttributeName) {
    var m, item

    items = Ext.isArray(items) ? items : (items.menu ? (Ext.isArray(items.menu) ? items.menu : items.menu.items.items) : items.items.items)
    menuIdAttributeName = menuIdAttributeName || UB.core.UBPanelMixin.menuIdAttributeName

    for (var i = 0, len = items.length; i < len; ++i) {
      item = items[i]
      if (item.menu) {
        if (item[menuIdAttributeName] === menuId) {
          m = item
          break
        }
        m = this.getMenu(item, menuId, menuIdAttributeName)
        if (m) break
      }
    }
    return m
  },

  mergeDockedItems: function () {
    var
      di,
      item,
      filter,
      m

    if (!this.dfm || !this.dfm.dockedItems) {
      return
    }

    for (var i = 0, len = this.dfm.dockedItems.length; i < len; ++i) {
      var dockedItem = this.dfm.dockedItems[i]
      filter = {
        xtype: dockedItem.xtype,
        dock: dockedItem.dock
      }

      if (dockedItem.ui) {
        filter.ui = dockedItem.ui
      }

      if ((di = this.getDockedItemsByFilter(filter)).length > 0) {
        for (var ii = 0, lenlen = di.length; ii < lenlen; ++ii) {
          for (var iii = 0, lenlenlen = dockedItem.items.length; iii < lenlenlen; ++iii) {
            if ((item = dockedItem.items[iii]).menu) {
              this.prepareMenu(item.menu)

              if (item[UB.core.UBPanelMixin.menuIdAttributeName]) {
                m = this.getMenu(di[ii].items, item[UB.core.UBPanelMixin.menuIdAttributeName])
                if (m) {
                  if (item.text) {
                    m.text = item.text
                  }

                  for (var iiii = 0, lenlenlenlen = item.menu.length; iiii < lenlenlenlen; ++iiii) {
                    m.menu.splice(item.menu[iiii][UB.core.UBPanelMixin.orderIdAttributeName] < m.menu.length ? item.menu[iiii][UB.core.UBPanelMixin.orderIdAttributeName] : m.menu.length, 0, item.menu[iiii])
                  }
                } else {
                  di[ii].items.push(item)
                }
              } else {
                di[ii].items.push(item)
              }
            } else {
              di[ii].items.splice(item[UB.core.UBPanelMixin.orderIdAttributeName] < di[ii].items.length ? item[UB.core.UBPanelMixin.orderIdAttributeName] : di[ii].items.length, 0, item[UB.core.UBPanelMixin.actionIdAttributeName] && this.actions[item[UB.core.UBPanelMixin.actionIdAttributeName]] ? this.createButtonAction(this.actions[item[UB.core.UBPanelMixin.actionIdAttributeName]]) : item)
            }
          }
        }
      }
    }
  },

  onAction: function (action, e) {
    Ext.callback(this.eventHandler, this, [this, action.eventId])
    this.fireEvent(action.eventId, action)
  },

  addAdditionalListeners: function () {
    var self = this
    if (self.dfm && self.dfm.listeners) {
      Ext.Object.each(self.dfm.listeners, function (lName, lValue) {
        if (typeof lValue === 'function') {
          self.addListener(lName, lValue, self)
        }
      })
    }
  },

  createButtonsWOText: function (actions) {
    var buttons = []

    for (var i = 0, len = actions.length; i < len; ++i) {
      buttons.push(this.createButtonWOText(actions[i]))
    }

    return buttons
  },

  createButtonAction: function (action) {
    return Ext.apply(Ext.create('Ext.button.Button', action), { text: action.initialConfig.actionText || '', tooltip: action.getText() })
  },

  createButtonWOText: function (action) {
    return Ext.apply(Ext.create('Ext.button.Button', action), { text: action.initialConfig.showText ? action.initialConfig.actionText : '', tooltip: action.getText() })
  },

  createMenuItemLink: function () {
    this.actions.commandLink = new Ext.Action({
      actionId: 'commandLink',
      text: UB.i18n('ssylka'),
      hideOnClick: false,
            // iconCls: 'iconLink',
      glyph: UB.core.UBUtil.glyphs.faShare,
      menu: {
        showSeparator: false,
        items: [{
          xtype: 'textfield',
          isFormField: false,
          selectOnFocus: true,
          readOnly: true,
          minWidth: 200,
          fieldLabel: UB.i18n('vneshnaja')
        }]
      },
      listeners: {
        activate: function (item) {
          item.menu.items.getAt(0).setValue(UB.format('{0}//{1}{2}#{3}', location.protocol, location.host, location.pathname, this.createCommandLink()))
        },
        scope: this
      }
    })
    return Ext.create('Ext.menu.Item', this.actions.commandLink)
  },

  createCommandLink: function () {
    var
      me = this,
      prm = [], cc = me.commandConfig,
      param, request

    if (me.commandConfig) {
      prm.push('cmdType' + '=' + me.commandConfig.cmdType)
      if (me.commandConfig.entity) {
        prm.push('entity' + '=' + me.commandConfig.entity)
      }
      if (me.commandConfig.formCode) {
        prm.push('formCode' + '=' + me.commandConfig.formCode)
      }
      if (me.instanceID) {
        prm.push('instanceID' + '=' + me.instanceID)
      }
      if (cc.cmdData && cc.cmdData.params && cc.cmdData.params.length > 0) {
        param = cc.cmdData.params[0]
        request = _.clone(param)
        prm.push('params' + '=' + encodeURIComponent(JSON.stringify(request)))
      }
    }
    return prm.join('&')
  },

  createMenuItemDetails: function () {
    var
      details = [],
      entityDetails = this.entityDetails,
      entity,
      detail

    for (var i = 0, len = entityDetails.length; i < len; ++i) {
      detail = entityDetails[i]
      entity = $App.domainInfo.get(detail.entityName)
      details.push(new Ext.Action({
        actionId: UB.core.UBPanelMixin.actionId.showDetail,
        glyph: UB.core.UBUtil.glyphs.faCaretSquareODown,
        text: detail.caption ||
                  UB.format('{0} ({1})', entity.caption, entity.attr(detail.attribute).caption),
        entityName: detail.entityName,
        attribute: detail.attribute,
        eventId: UB.core.UBPanelMixin.eventId.showdetail,
        handler: this.onAction,
        scope: this
      }))
    }

    return Ext.create('Ext.menu.Item', {
      text: UB.i18n('detali'),
      hideOnClick: false,
      glyph: UB.core.UBUtil.glyphs.faCaretSquareODown,
      actionId: UB.core.UBPanelMixin.actionId.showDetail,
      menu: {
        items: details
      }
    })
  }
})
