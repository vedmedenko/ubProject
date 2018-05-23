require('../core/UBApp')
require('../core/UBAppConfig')
require('../core/UBStoreManager')
require('../core/UBUtilTree')
require('../ux/tree/Column')
/**
 * Navigation panel
 */
Ext.define('UB.view.NavigationPanel', {
  extend: 'Ext.tree.Panel',
  alias: 'widget.navigationpanel',

  uses: [
    'UB.core.UBApp',
    'UB.view.Viewport'
  ],
  cls: 'tree_wrap',

  viewConfig: {
    showTreeLines: false
  },
  hideHeaders: true,
  folderSort: false,

  initComponent: function () {
    var me = this
    if (!me.desktopID) {
      $App.addListener('desktopChanged', me.onDesktopChanged, me)
    }

    me.storeNavigationShortcut = UB.core.UBStoreManager.getNavigationShortcutStore()

    me.viewConfig = {
      toggleOnDblClick: false
    }

    me.columns = [{
      xtype: 'ubtreecolumn',
      text: 'Name',
      width: '100%',
      dataIndex: me.displayField
    }]

    Ext.apply(me, {
      store: Ext.create('Ext.data.TreeStore', {
        root: UB.core.UBUtilTree.arrayToTreeRootNode(me.getData($App.getDesktop())),
        sortOnLoad: false
      }),
      rootVisible: false,
      useArrows: true,
      cls: 'no_expand_icon no-leaf-icons no-parent-icons nav-shortcut leftMenu'
    })

    let storeDS = UB.core.UBStoreManager.getDesktopStore()
    storeDS.each(function (dsItem) {
      me.store.setRootNode(UB.core.UBUtilTree.arrayToTreeRootNode(me.getData(dsItem.get('ID'))))
      _.forEach(me.store.tree.root.childNodes, function (item, index) {
        if (index > 0 && item.isExpanded()) {
          item.collapse(false)
        }
      })
    })

    me.store.on('expand', function (node, opt) {
      if (!node.parentNode) {
        return
      }
      node.parentNode.eachChild(function (child) {
        if (child !== node && child.isExpanded() && child.childNodes.length > 0) {
          child.collapse(false)
        }
      })
    })

    me.callParent(arguments)

    me.addListener('itemclick', me.onItemClick, me)

    me.addEvents('itemclickstart')
    me.initContextMenu()

    me.on('afterrender', function () {
      me.getEl().addListener('contextmenu', function (e, t, eOpts) {
        e.stopEvent()
        me.contextMenu.currentRecord = null
        me.contextMenu.showAt(e.getXY())
        return false
      })
    })


    if (me.desktopID) {
      me.onDesktopChanged(me.desktopID)
    } else {
      me.onDesktopChanged(UB.core.UBApp.getDesktop())
    }
  },

  initContextMenu: function () {
    let me = this
    let entityName = me.storeNavigationShortcut.ubRequest.entity
    let updateStore = function (store, record, operation) {
      if (operation === Ext.data.Model.COMMIT) {
        UB.core.UBStoreManager.shortcutCommandCache[record.get('ID')] = undefined
      }
      if (me.desktopID && (!operation || Ext.data.Model.COMMIT === operation)) {
        me.onDesktopChanged(me.desktopID)
        return
      }
      if (me.currentDesktop && (!operation || Ext.data.Model.COMMIT === operation)) {
        me.onDesktopChanged(me.currentDesktop)
      }
    }

    let navShortcutEntity = $App.domainInfo.get('ubm_navshortcut')

    me.storeNavigationShortcut.on({
      datachanged: updateStore,
      update: updateStore
    })

    var editAction = new Ext.Action({
      glyph: UB.core.UBUtil.glyphs.faEdit,
      actionID: 'Edit',
      text: UB.i18n('Edit'),
      disabled: !navShortcutEntity.haveAccessToMethod('update'),
      handler: function () {
        if (!me.contextMenu.currentRecord) {
          $App.dialogError('Right click on item and when select "Edit"')
          return
        }
        let rec = me.contextMenu.currentRecord
        let cmdConfig = {
          cmdType: UB.core.UBCommand.commandType.showForm,
          entity: me.storeNavigationShortcut.ubRequest.entity,
          instanceID: rec.get('ID'),
          store: me.storeNavigationShortcut
        }
        UB.core.UBApp.doCommand(cmdConfig)
      },
      scope: this
    })

    var addShortcutAction = new Ext.Action({
      glyph: UB.core.UBUtil.glyphs.faLink,
      actionID: 'addShortcut',
      text: UB.i18n('dobavitYarlik'),
      disabled: !navShortcutEntity.haveAccessToMethod('insert'),
      handler: function () {
        let rec = me.contextMenu.currentRecord
        let cmdConfig = {
          cmdType: UB.core.UBCommand.commandType.showForm,
          entity: entityName,
          store: me.storeNavigationShortcut
        }
        if (rec) {
          cmdConfig.parentID = rec.get('isFolder') ? rec.get('ID') : rec.get('parentID')
          cmdConfig.desktopID = rec.get('desktopID')
        }
        UB.core.UBApp.doCommand(cmdConfig)
      },
      scope: this
    })

    var addFolderAction = new Ext.Action({
      glyph: UB.core.UBUtil.glyphs.faFolder,
      actionID: 'addFolder',
      text: UB.i18n('dobavitDirectoriu'),
      disabled: !navShortcutEntity.haveAccessToMethod('insert'),
      handler: function () {
        let rec = me.contextMenu.currentRecord
        let cmdConfig = {
          cmdType: UB.core.UBCommand.commandType.showForm,
          entity: entityName,
          store: me.storeNavigationShortcut,
          isFolder: true
        }
        if (rec) {
          cmdConfig.parentID = rec.get('isFolder') ? rec.get('ID') : rec.get('parentID')
          cmdConfig.desktopID = rec.get('desktopID')
        }
        UB.core.UBApp.doCommand(cmdConfig)
      },
      scope: this
    })

    var deleteShortcutAction = new Ext.Action({
      actionID: 'deleteShortcut',
      text: UB.i18n('Delete'),
      glyph: UB.core.UBUtil.glyphs.faTrashO,
      scope: this,
      disabled: !navShortcutEntity.haveAccessToMethod('delete'),
      handler: function () {
        let rec = me.contextMenu.currentRecord
        if (!me.contextMenu.currentRecord) {
          $App.dialogError('Right click on item and when select "Delete" from popup menu')
          return
        }
        let instanceID = rec.get('ID')
        $App.dialogYesNo('deletionDialogConfirmCaption', 'vyUvereny')
        .then(function (choice) {
          if (choice) {
            $App.connection.doDelete({
              entity: entityName,
              execParams: {ID: instanceID}
            }).then(function () {
              me.storeNavigationShortcut.reload()
            })
          }
        })
      }
    })

    me.contextMenu = Ext.create('Ext.menu.Menu', {
      items: [
        editAction,
        addShortcutAction,
        addFolderAction,
        {xtype: 'menuseparator'},
        deleteShortcutAction
      ]
    })

    me.addListener('itemcontextmenu', function (view, rec, node, index, e) {
      e.stopEvent()
      me.contextMenu.currentRecord = me.storeNavigationShortcut.getById(rec.get('id'))
      me.contextMenu.showAt(e.getXY())
      return false
    }, this)
  },

  onItemClick: function (view, record, item, index, event, eOpts) {
    var
      me = this,
      recordId, navFields, shortcut
    if (me.clickDisabled) {
      return  // Если быстро клацать по папке в навигационной панели, то рендерятся несколько блоков одинаковых ярлыков https://enviance.softline.kiev.ua/jira/browse/UB-361
    }
    me.clickDisabled = true
    setTimeout(function () {
      me.clickDisabled = false
    }, 300)

    if (record.childNodes && record.childNodes.length > 0) {
      event.stopEvent()
      if (record.isExpanded()) {
        record.collapse()
      } else {
        record.expand()
      }
      return
    }

    recordId = parseInt(record.getId(), 10)
    navFields = UB.core.UBAppConfig.systemEntities.navigationShortcut.fields
    shortcut = this.storeNavigationShortcut.getById(recordId)

    me.fireEvent('itemclickstart', shortcut)
    if (shortcut.get('isFolder')) {
      return
    }

    $App.runShortcutCommand(shortcut.get('ID'), shortcut.get('inWindow'))
  },

  /**
   *
   * @param {Number} desktop
   * @return {Object[]}
   */
  getData: function (desktop) {
    var
      data = [],
      navFields = UB.core.UBAppConfig.systemEntities.navigationShortcut.fields,
      getLevel, isFirst = true

    getLevel = function (path) {
      if (!path) {
        return 1
      }
      var mr = path.match(/(\/)/g)
      if (!mr) {
        return 1
      }
      return mr.length - 1
    }

    this.storeNavigationShortcut.each(function (record) {
      var level
      if (record.get(navFields.desktopID) === desktop) {
        level = getLevel(record.get(navFields.ubTreePath))
        data.push({
          id: record.get('ID'),
          code: record.get(navFields.code),
          text: record.get(navFields.caption),
          leaf: !record.get(navFields.isFolder),
          parentId: record.get(navFields.folderID),
          displayOrder: record.get(navFields.displayOrder),
          desktopID: record.get(navFields.desktopID),
          expanded: ((isFirst && level === 1) || level > 1) && !record.get(navFields.isCollapsed),
          iconCls: record.get('iconCls') || 'fa fa-space',
          cls: 'ub_navpnl_item' + (level < 4 ? ' ub_navpnl_item_l' + level : '')
        })
        isFirst = false
      }
    })

    return data
  },

  onDesktopChanged: function (desktop) {
    this.getStore().setRootNode(UB.core.UBUtilTree.arrayToTreeRootNode(this.getData(desktop)))
    this.currentDesktop = desktop
    _.forEach(this.getStore().tree.root.childNodes, function (item, index) {
      if (index > 0 && item.isExpanded()) {
        item.collapse(false)
      }
    })
  }
})
