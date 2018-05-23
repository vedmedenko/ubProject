require('./ToolbarWidget')
// cyclic require('../core/UBApp')
require('../core/UBStoreManager')
require('../core/UBUtil')
/**
 *  Widget for MainToolbar. Put Desktop(s) as main menu items inside MainToolbar.
 *  Desktop Shortcut(s) a created as a child items for each desktop.
 */
Ext.define('UB.view.ToolbarMenu', {
  // todo add sorting in menu

  extend: 'UB.view.ToolbarWidget',
  alias: 'widget.ubtoolbarmenu',
  requires: [
    // "UB.core.UBApp",
    // "UB.core.UBStoreManager",
    'Ext.menu.Menu'
    // "UB.core.UBUtil"
  ],

  border: 0,
  margin: 0,
  padding: 0,
  flex: 30,
  enableOverflow: true,
  cls: 'ub-header-menu-item',

  initComponent: function () {
    this.items = this.buildMenu()
    this.callParent(arguments)
  },

  /**
   *
   * @returns {Array}
   * @method
   */
  buildMenu: function () {
    var
      me = this,
      result = [],
      storeDS, storeN,
      dsNum,
      dsRow

    storeDS = UB.core.UBStoreManager.getDesktopStore()
    storeN = UB.core.UBStoreManager.getNavigationShortcutStore()
    // storeN.remoteFilter = false;

    for (dsNum = 0; dsNum < storeDS.getCount(); dsNum++) {
      dsRow = storeDS.getAt(dsNum)
      result.push(me.buildMenuItem(dsRow, storeN))
    }
    // storeN.clearFilter();

    return result
  },

  /**
   * @method
   * @param {Ext.data.Model} dsRow
   * @param {Ext.data.Store} storeN
   * @returns {Object}
   */
  dsMenuToTree: function (dsRow, storeN) {
    var
      me = this,
      allItm = {},
      dsID = dsRow.get('ID')

    storeN.each(function (row) {
      if (row.get('desktopID') !== dsID) {
        return
      }
      var id = row.get('ID'),
        pid = row.get('parentID'),
        element,
        parent
      element = allItm[id]
      if (!element) {
        allItm[id] = element = {id: id, items: [], row: row}
      } else {
        element.row = row
      }
      parent = allItm[pid || 'master' ]
      if (!parent) {
        allItm[pid || 'master'] = parent = {id: id, items: [] }
      }
      parent.items.push(element)
    }, me)
    return allItm.master
  },

  /**
   * @method
   * @param {Ext.data.Model} dsRow
   * @param {Ext.data.Store} storeN
   * @returns {Object}
   */
  buildMenuItem: function (dsRow, storeN) {
    var
      me = this,
      processItem,
      root

    root = me.dsMenuToTree(dsRow, storeN)

    processItem = function (element) {
      var itm, nNode, result = []
      if (element) {
        for (itm = 0; itm < element.items.length; itm++) {
          nNode = element.items[itm]
          if (nNode.items.length > 0) {
            result.push({
              text: nNode.row.get('caption'),
	      shortcutCode: nNode.row.get('code'),
              menu: {
                items: processItem(nNode)
              }
            })
          } else {
            result.push({
              text: nNode.row.get('caption'),
              record: nNode.row,
	      shortcutCode: nNode.row.get('code'),
              handler: me.onItemClick
            })
          }
        }
      }
      return result
    }
    return {
      text: dsRow.get('caption'),
      desktopCode: dsRow.get('code'),
      menu: Ext.create('Ext.menu.Menu', {
        style: {
          overflow: 'visible'
        },
        items: processItem(root)
      })
    }
  },

  onItemClick: function (button) {
    var shortcut = button.record
    $App.runShortcutCommand(shortcut.get('ID'), shortcut.get('inWindow'))
  }
})
