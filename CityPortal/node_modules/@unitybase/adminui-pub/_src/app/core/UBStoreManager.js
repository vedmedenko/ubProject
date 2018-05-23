require('./UBAppConfig')
require('./UBUtil')
/**
 * Файл: UB.core.UBStoreManager.js
 * Автор: Игорь Ноженко
 *
 * Менеджер store'ов уровня приложения
 */
Ext.define('UB.core.UBStoreManager', {
  singleton: true,

  /**
   *
   * @param {String} entityName
   * @param {String[]} fieldList (optional)
   * @param {Object} [whereList] (optional)
   * @return {Ext.data.Store}
   */
  getStore: function (entityName, fieldList, whereList) {
    return Ext.data.StoreManager.lookup(UB.core.UBUtil.getNameMd5(entityName, fieldList, whereList))
  },

  /**
   *
   * @param {String} systemEntity
   * @return {String}
   */
  getSystemEntityStoreGetterName: function (systemEntity) {
    return 'get' + Ext.String.capitalize(systemEntity) + 'Store'
  },

  /**
   *
   * @param {String} systemEntity
   * @return {Ext.data.Store}
   */
  getSystemEntityStore: function (systemEntity) {
    return this[this.getSystemEntityStoreGetterName(systemEntity)]()
  },

  /**
   *
   * @return {Ext.data.Store}
   */
  getDesktopStore: function () {
    var desktopName = 'ubm_desktop'
    return this.getStore(desktopName, $App.domainInfo.get(desktopName).getAttributeNames())
  },

  /**
   * in-memory cache of ubm_navshortcut cmdData values. Key is shortcut ID
   */
  shortcutCommandCache: {},
  shortcutAttributes: ['ID', 'desktopID', 'parentID', 'code', 'isFolder', 'caption', 'inWindow', 'isCollapsed', 'displayOrder', 'iconCls'],
  /**
   * Load a nav. shortcut command text from cache or from server
   * @param {number} shortcutID
   * @return Promise
   */
  getNavshortcutCommandText: function (shortcutID) {
    var cmdCode = UB.core.UBStoreManager.shortcutCommandCache[shortcutID]
    var cmdCodePromise
    if (cmdCode) {
      cmdCodePromise = Promise.resolve(cmdCode)
    } else {
      cmdCodePromise = UB.Repository('ubm_navshortcut').attrs(['ID', 'cmdCode']).where('ID', '=', shortcutID)
        .selectSingle().then(function (cmd) {
          var parsedCmdCode = Ext.JSON.decode(cmd.cmdCode)
          UB.core.UBStoreManager.shortcutCommandCache[shortcutID] = parsedCmdCode
          return parsedCmdCode
        })
    }
    return cmdCodePromise
  },
  /**
   *
   * @return {Ext.data.Store}
   */
  getNavigationShortcutStore: function () {
    return this.getStore('ubm_navshortcut', this.shortcutAttributes)
  },

  /**
   *
   * @return {Ext.data.Store}
   */
  getFormStore: function () {
    return this.getStore('ubm_form', $App.domainInfo.get('ubm_form').getAttributeNames())
  },

  /**
   *
   * @return {Ext.data.Store}
   */
  getEnumStore: function () {
    return this.getStore('ubm_enum', $App.domainInfo.get('ubm_enum').getAttributeNames())
  },
  /**
   *
   * @return {Ext.data.Store}
   */
  get_enum_Store: function () {
    return this.getEnumStore()
  }
})
