/* eslint-disable new-cap,no-new */
/* global Ext, $App, UB */
/* global Q */
/* global DocsAPI */
/**
 * Control to show document using OnlyOffice document server
 *
  {....
    layout: {
    type: 'vbox',
    align: 'stretch'
  },
  items: [{
    attributeName: 'resume', // in *.meta has to be of 'Document' type
    expanded: true, // or will be collapsed to link
    readOnly: true, // true|false
    documentMIME: 'application/word', // 'application/word'|'application/excel'
    height: 500,
    width: 800
    }]
  }
 *
 */

Ext.define('UB.ux.UBOnlyOffice', {
  extend: 'Ext.Panel',
  alias: 'widget.UBOnlyOffice',
  width: '100%',
  height: '100%',
  layout: 'fit',
  autoEl: 'div',
  contentTypeMap: { // 'text' | 'spreadsheet' | 'presentation',
    'application/word': 'text',
    'application/excel': 'spreadsheet'
  },

  _documentKey: null,
  _onlyOfficeObject: null,
  _onlyOfficeGetValueDefer: null,
  _onlyOfficeGetValuePromise: null,
  _initializationPromise: null,
  _placeholderID: null,

  _isModified: false,
  readOnly: true,

  // region Inherited from Ext control
  /**
   * Component initialization
   * Tries to find configuration section $App.connection.userData('onlyOfficeServer')
   * Generates markup for onlyOffice component starts loading client side script
   */
  initComponent: function () {
    const me = this
    const configuration = me._getServerConfiguration()
    if (!configuration.isConfigured) {
      console.warn('OnlyOffice configuration is missed. Yet control were tried to bootstrap')
      me.callParent(arguments)
      return
    }

    me._placeholderID = me.id + '_placeholder'
    me.html = ['<div style="width: 100%; height: 100%;" id="' + me._placeholderID + '"></div>']

    const url = 'http://' + configuration.serverIP + '/web-apps/apps/api/documents/api.js'
    me._initializationPromise = me._loadScript(url)
    me.callParent(arguments)
  },
  // endregion

  // region Inherited from UBDocument.js
  /**
   * Used by UBDocument to get value from component
   * @param {any} requestedValue - ignored
   * @return {Promise<string>} - resolves to an URL on onlyOffice server with modified document
   */
  getValue: function (requestedValue) {
    const me = this
    me._onlyOfficeGetValueDefer = Q.defer()
    me._onlyOfficeObject.downloadAs()
    return me._onlyOfficeGetValueDefer.promise
  },

  /**
   * Used by UBDocument to modify readOnly property
   * @param readOnly
   */
  setReadOnly: function (readOnly) {
    const me = this
    me.readOnly = readOnly
    if (readOnly) {
      console.log('UB.ux.UBOnlyOffice control set to readonly state')
    }
  },

  /**
   * Used by UBDocument to check for modifications
   * @return {boolean}
   */
  isDirty: function () {
    const me = this
    return !me.readOnly && me._isModified
  },

  /**
   * Used by UBDocument to check for modifications
   * @return {boolean}
   */
  checkDirty: function () {
    const me = this
    return !me.readOnly && me._isModified
  },

  /**
   * Used by UBDocument to set value to component.
   * @param {Object} cfg
   * @param {Blob|File} [cfg.blobData]
   * @param {String} [cfg.contentType]
   * @param {String} [cfg.url]
   * @param {String} [cfg.html]
   * @param {String} [cfg.rawValue]
   * @param {Boolean} [cfg.resetOriginalValue=false] Reset original value if true.
   * @param {Object} [cfg.params] The parameters necessary to obtain the document
   * @returns {Promise}
   */
  setSrc: function (cfg) {
    const me = this
    return me._initializationPromise
      .then(() => {
        const documentType = me._mapContentTypeToDocumentType(cfg.contentType)
        const configuration = me._getControlConfiguration(documentType, cfg.url, cfg.html)
        me._documentKey = configuration.document.key
        me._onlyOfficeObject = new DocsAPI.DocEditor(me._placeholderID, configuration)
      })
  },
  // endregion

  // region Control protected methods
  /**
   * For onlyOffice client component to work, we need to load it's client script from it's server
   * @param {string} url - onlyOffice client bootstrap script
   * @return {Promise}
   * @private
   */
  _loadScript: function (url) {
    return Q.Promise((resolve, reject) => {
      Ext.Loader.loadScript({url: url, onLoad: resolve, onError: reject})
    })
  },

  /**
   * Reads onlyOffice configuration stored in userData.
   * Filled in ubjs\packages\ub\modules\onlyOfficeEndpoints.js
   * @return {{isConfigured: boolean, serverIP: (*|string)}}
   * @private
   */
  _getServerConfiguration: function () {
    const serverAddress = $App.connection.userData('onlyOfficeServer')
    const configuration = {
      isConfigured: _.isString(serverAddress),
      serverIP: serverAddress || ''
    }
    return configuration
  },

  /**
   * Generates configuration for DocsAPI.DocEditor object
   * @param fileType
   * @param fileUrl
   * @param title
   * @return {{document: {key: (string|*), title: (*|string), url: *}, documentType: (*|string), editorConfig: {mode: string, lang: string, callbackUrl: string, customization: {autosave: boolean, forcesave: boolean}}, events: {onDocumentStateChange: events.onDocumentStateChange, onDownloadAs: events.onDownloadAs, onCollaborativeChanges: events.onCollaborativeChanges, onOutdatedVersion: events.onOutdatedVersion, onError: events.onError, onReady: events.onReady, onSaveEnd: events.onSaveEnd, onRequestEditRights: events.onRequestEditRights, onRequestHistory: events.onRequestHistory, onRequestHistoryData: events.onRequestHistoryData, onRequestHistoryClose: events.onRequestHistoryClose}}}
   * @private
   */
  _getControlConfiguration: function (fileType, fileUrl, title) {
    const me = this
    const serverFileUrl = $App.connection.serverUrl + (!fileUrl ? 'getDocumentOffice' : fileUrl.replace('/getDocument', 'getDocumentOffice'))
    // Server remembers keys and urls.
    // So if document with "key" were saved then "key" can't be reused - "onOutdatedVersion" will be called
    const key = UB.MD5((new Date()).toString() + '||' + serverFileUrl).toString().substr(20)
    const lang = 'UK' // ToDo: find out how to set language (variants with 'uk-UA'|'UA' looks not working)
    const callbackUrl = $App.connection.serverUrl + 'notifyDocumentSaved'
    const editorMode = me.readOnly ? 'view' : 'edit'
    return {
      'document': {
        'key': key,
        'title': title || '',
        'url': serverFileUrl
      },
      'documentType': fileType || 'text',
      'editorConfig': {
        'mode': editorMode,
        'lang': lang,
        'callbackUrl': callbackUrl,
        'customization': {
          'autosave': true,
          'forcesave': true
        }
      },
      'events': {
        'onDocumentStateChange': function onDocumentStateChange (e) {
          // fires instantly, currently only usefull variant "e.data === true" - document content changed
          if (e.data === true) {
            me._isModified = true
            console.log('Changes in document detected. Current document marked as dirty')
            me.fireEvent('change', me)
          }
        },
        'onDownloadAs': function onDownloadAs (e) {
          // fired after call to DocsAPI.DocEditor.downloadAs
          // e.data - url of the modified document
          me._onlyOfficeGetValueDefer.resolve(e.data)
        },
        'onCollaborativeChanges': function onCollaborativeChanges (e) {
          console.log('onCollaborativeChanges')
        },
        'onOutdatedVersion': function onOutdatedVersion (e) {
          // fires when "document.key" found on onlyOffice server, but it's version is different from stored on URL
          console.log('onOutdatedVersion')
        },
        'onError': function onError (e) {
          console.log('onError')
        },
        'onReady': function onReady (e) {
          console.log('onReady')
        },
        'onSaveEnd': function onSaveEnd (e) {
          console.log('onSaveEnd')
        },
        'onRequestEditRights': function onRequestEditRights (e) {
          console.log('onRequestEditRights')
        },
        'onRequestHistory': function onRequestHistory (e) {
          console.log('onRequestHistory')
        },
        'onRequestHistoryData': function onRequestHistoryData (e) {
          console.log('onRequestHistoryData')
        },
        'onRequestHistoryClose': function onRequestHistoryClose (e) {
          console.log('onRequestHistoryClose')
        }
      }
    }
  },

  _mapContentTypeToDocumentType: function (contentType) {
    const me = this
    const documentType = me.contentTypeMap[contentType]
    if (!documentType) {
      console.warn('"UBOnlyOffice.js" - contentType passed in control is "' + contentType + '" and don\'t have corresponding mapping to onlyOffice type. So default type "text" will be used')
      return 'text'
    }
    return documentType
  }
  // endregion

})

/**
 * @typedef {object} UB.ux.UBOnlyOffice Integration with OnlyOffice document server
 * @property {bool} [_isModified=false] tracks changes to document. Calculated as result of DocsAPI.DocEditor "onDocumentStateChange" event
 * @property {object} _onlyOfficeObject DocsAPI.DocEditor. Client side onlyOffice object
 * @property {Promise} _initializationPromise - resolves when loading of onlyOffice client side script competed and '_onlyOfficeObject' initialized
 * @property {string} _placeholderID - id of html element to place onlyOffice documentViewer
 * @property {Deferred} _onlyOfficeGetValueDefer - used during the call to getValue. To get url of the modified document from onlyOffice server
 * @property {Promise} _onlyOfficeGetValuePromise - returned from getValue. Resolves to url of the modified document from onlyOffice server
 */
