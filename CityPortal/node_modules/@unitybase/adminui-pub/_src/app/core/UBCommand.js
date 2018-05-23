require('./UBAppConfig')
require('./UBStoreManager')
require('./UBUtil')
require('../view/BaseWindow')
require('../view/BasePanel')
require('../ux/UBPreFilter')
require('../view/EntityGridPanel')
var _ = require('lodash')
/**
 * @author UnityBase team
 *
 * Execute a comand (showForm, showList, shoeReport)
 */
Ext.define('UB.core.UBCommand', {
  uses: [
    'UB.core.UBApp',
    'UB.view.ErrorWindow',
    'UB.core.UBFormLoader',
    'UB.view.BasePanel',
    'UB.view.EntityGridPanel'
  ],

  statics: {
    ubComponentNamePrefix: 'attr',
    whereListParentID: '__parent',
    whereListInstanceID: '__parent',
    allPublicAttributesMask: '*',

    commandType: {
      showList: 'showList',
      showForm: 'showForm',
      showReport: 'showReport'
    },

    errCode: {
      MODIFIED_BY_ANOTHER_USER: 25
    },

    methodName: {
      SELECT: 'select',
      INSERT: 'insert',
      UPDATE: 'update',
      DELETE: 'delete',
      ADDNEW: 'addnew',
      UNLOCK: 'unlock',
      NEWVERSION: 'newversion'
    },

    condition: {
      sqlecEqual: 'equal',
      sqlecNotEqual: 'notEqual',
      sqlecMore: 'more',
      sqlecMoreEqual: 'moreEqual',
      sqlecLess: 'less',
      sqlecLessEqual: 'lessEqual',
      sqlecIn: 'in',
      sqlecNotIn: 'notIn',
      sqlecIsNull: 'isNull',
      sqlecNotIsNull: 'notIsNull',
      sqlecLike: 'like',
      sqlecNotLike: 'notLike',
      sqlecStartWith: 'startWith',
      sqlecNotStartWith: 'notStartWith',
      sqlecCustom: 'custom'
    },

    order: {
      sqlotAsc: 'asc',
      sqlotDesc: 'desc'
    },

    /**
     * Create default form items for automatically generated form
     * @param {String} entityName
     * @param {Object} parentContext
     * @return {Object}
     */
    createDefaultItems: function (entityName, parentContext) {
      var items = []
      var privateRe
      var entity = $App.domainInfo.get(entityName)

      privateRe = /^ID|^mi_/
      if (!entity) {
        throw new Error('invalid entity ' + entityName)
      }
      _.forEach(entity.attributes, function (attribute, attrName) {
        if (attribute.defaultView !== false && !privateRe.test(attrName) && (!parentContext || !parentContext.hasOwnProperty(attrName))) {
          items.push({ attributeName: attrName, anchor: '100%' })
        }
      })
      return { items: items }
    },

    /**
     *
     * @param {String} attributeName
     * @return {String}
     */
    getUBCmpUBName: function (attributeName) {
      return UB.core.UBCommand.ubComponentNamePrefix + Ext.String.capitalize(attributeName)
    },

    /**
     *
     * @param {String} entity
     * @param {String} commandType
     * @param {Boolean} createIfNotFound
     * @return {Object}
     */
    getCommandByEntityAndType: function (entity, commandType, createIfNotFound) {
      if (createIfNotFound && commandType === UB.core.UBCommand.commandType.showList) {
        return {
          params: [{
            entity: entity,
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: '*'
          }]
        }
      }
      return null
    },

    /**
     *
     * @param {Object} whereList
     * @param {String} attributeName
     * @param {String/Number/Date/Boolean/Array} attributeValue
     * @param {String} [itemName] (optional)
     * @param {String} [condition] (optional)
     * @return {Object}
     */
    addWhereListItemSelect: function (whereList, attributeName, attributeValue, itemName, condition) {
      whereList = whereList || {}
      itemName = itemName || 'c' + (Ext.Object.getSize(whereList) + 1)
      condition = condition || UB.core.UBCommand.condition.sqlecEqual
      whereList[itemName] = { expression: '[' + attributeName + ']', condition: condition, values: {} }
      whereList[itemName].values[attributeName] = attributeValue

      return whereList
    },

    /**
     * return result data as associative array.
     * @param {Object} response
     * @param {Number} [rowNum]    (optional) default 0
     * @param {Array} [fieldList]    (optional)
     * @return {Object}
     */
    resultDataRow2Object: function (response, rowNum, fieldList) {
      var i = -1
      var len
      var data
      var responseFieldList
      var result = {}

      data = response.resultData.data[rowNum || 0]
      responseFieldList = response.resultData.fields

      len = responseFieldList.length
      while (++i < len) {
        if (!fieldList || fieldList.indexOf(responseFieldList[i]) >= 0) {
          result[responseFieldList[i]] = data[i]
        }
      }
      return result
    },

    /**
     * Add master-detail relation filter to whereList.
     * Consider whereList items name for master-detail relation is start from __MD
     * @param {Object} whereListTo
     * @param {String[]} masterFields
     * @param {String[]} detailFields
     * @param {Ext.data.Model} [record] if not passed - set 0 as master value (for design mode)
     * @returns {Object} whereList with added master-detail condition
     */
    addMasterDetailRelation: function (whereListTo, masterFields, detailFields, record) {
      var result = whereListTo || {}
      var i, l, item, filterVal, detailField

      // drop all where expression started from __MD
      Object.keys(result).forEach(function (item) {
        if (item.substring(0, 4) === '__MD') {
          delete result[item]
        }
      })
      if (masterFields && detailFields) {
        for (i = 0, l = Math.min(masterFields.length, detailFields.length); i < l; ++i) {
          detailField = detailFields[i]
          if (detailField && detailField.indexOf('[') < 0) {
            detailField = '[' + detailField + ']'
          }
          item = result['__MD' + i] = {
            expression: detailField,
            condition: 'equal',
            values: {}
          }
          filterVal = record ? record.get(masterFields[i]) : 0
          item.values[detailFields[i]] = filterVal
        }
      }
      return result
    },

    /**
     * parse Url and create command config object.
     * @param url
     * @param [target] default to {@link UB.code.UBpp.getViewport().getCenterPanel()}
     * @returns {Object}
     */
    getCommandByUrl: function (url, target) {
      var throwI = function () {
        throw new Error('Incorect parametr for getCommandByUrl')
      }
      var command

      if (!url || (url.indexOf('#') < 0)) {
        throwI()
      }

      url = url.split('#')[1]
      if (!url) { // Bug in EXT when hidden grid column add to url symbol #
        return
      }

      function parseParam (prm) {
        var result = {}
        _.forEach(prm, function (item) {
          var pair, name, value
          if (!item) {
            throwI()
          }
          pair = item.split('=')
          if (pair.length !== 2) {
            throwI()
          }
          name = pair[0]
          value = window.decodeURIComponent(pair[1])
          if (value && (value.indexOf('&') >= 0)) {
            value = parseParam(value.split('&'))
          } else if (value && (value.indexOf('=') >= 0)) {
            value = parseParam([value])
          }
          result[name] = value
        })
        return result
      }
      command = parseParam(url.split('&'))

      if (command.params) {
        command.cmdData = {
          params: [JSON.parse(command.params)]
        }
        delete command.params
      }
      if (target && !command.tabId) {
        command.target = target
        command.tabId = Ext.id()
      }
      return command
    }
  },

  /**
   * initial values for fields of new instance entity in form. {Object}
   * for Example initialFieldValues = {fieldName1: = value1, fieldName1: = value1, ...}
   */
  initialFieldValues: {},

  /**
   * custom parameters
   */
  customParams: {},

  constructor: function (config) {
    var errMsg
    var me = this

    me.commandConfig = config
    me.commandType = config.cmdType || me.commandType
    /**
     * @cfg {Object} commandData
     * If cmdType is 'showReport' must have value
     * { reportCode: {String}, reportType: {String}, reportParams: {Object} }
     * @cfg {String} commandData.reportCode
     * @cfg {String} commandData.reportType  Possible values: 'html', 'pdf'
     * @cfg {Object} commandData.reportParams
     * @cfg {Object} commandData.reportOptions
     */
    me.commandData = config.cmdData
    me.commandCode = config.cmdCode
    me.formCode = config.formCode
    /**
     * @cfg  entity Entity code
     * @type {String}
     */
    me.entity = config.entity
    /**
     * When command started from NavigationPanel the commandContext is {menuButton: HTMLElement, event: eventObject }.
     * @cfg {Object} [commandContext]
     */
    me.commandContext = config.commandContext
    me.instanceID = config.instanceID
    if (Ext.isDefined(me.instanceID) && Ext.isString(me.instanceID)) {
      try {
        me.instanceID = parseFloat(me.instanceID)
      } catch (err) {}
    }
    me.callback = config.callback
    me.eventHandler = config.eventHandler
    me.scope = config.scope
    me.store = config.store
    /**
     * @cfg [requestStore] Store for showList. If this property is not defined store will be created automatically.
     * @type {Ext.data.Store}
     */
    me.requestStore = config.requestStore
    me.addByCurrent = config.addByCurrent
    me.__mip_ondate = config.__mip_ondate
    me.target = config.target
    me.openInBackgroundTab = config.openInBackgroundTab
    me.__mip_recordhistory = config.__mip_recordhistory
    me.detailAttribute = config.detailAttribute
    me.parentID = config.parentID
    me.description = config.description
    me.title = config.title
    me.stateId = config.stateId
    me.createOnly = config.createOnly
    me.columns = config.columns
    me.scriptCode = config.scriptCode
    me.hideHeaders = config.hideHeaders || false
    /**
     * @cfg {summary} Show footer panel with value of aggregation function by columns.
     * Example.
     *      {
     *         "summary": {"regNumber": "count","regDate": "max","docKindID.name" : "count", "docType": "count","regKey": "min","regCounterValue": "avg"},
     *         ...
     *      }
     */
    me.summary = config.summary
    // select item in list
    me.isModal = config.isModal || false
    // modal window if command show in window
    me.isModalDialog = config.isModalDialog || false
    me.isResizable = (config.isResizable !== undefined) ? config.isResizable : true
    me.isMaximizable = (config.isMaximizable !== undefined) ? config.isMaximizable : true
    // me.isMinimizable = (config.isMinimizable !== undefined) ? config.isMinimizable : true;
    me.isClosable = (config.isClosable !== undefined) ? config.isClosable : true
    me.onItemSelected = config.onItemSelected || Ext.emptyFn
    me.initValue = config.initValue
    me.applyValues = config.applyValues
    me.initialFieldValues = config.initialFieldValues
    me.customParams = config.customParams || {}
    me.isDetail = config.isDetail
    // Context values for form when form is for detail entity
    me.parentContext = config.parentContext
    me.filters = config.filters
    me.autoFilter = config.autoFilter
    me.details = config.details
    me.selectedInstanceID = config.selectedInstanceID
    me.tabId = config.tabId
    me.customActions = config.customActions
    me.sender = config.sender
    me.onClose = config.onClose
    me.pageSize = config.pageSize || UB.appConfig.storeDefaultPageSize
    if (_.isFunction(config.cmpInitConfig)) {
      config.cmpInitConfig = config.cmpInitConfig()
    }
    me.cmpInitConfig = Ext.clone(config.cmpInitConfig || {})
    me.focusOnUpdate = config.focusOnUpdate// to scroll to inserted element
    /**
     * @cfg {String[]} hideActions Array of action name that required to be hidden when show form
     */
    me.hideActions = config.hideActions

    if (Ext.isDefined(me.commandData)) {
      if (Ext.isString(me.commandData)) {
        me.commandData = Ext.JSON.decode(me.commandData)
      }
      me.entity = me.entity || me.commandData.entity || (me.commandData.params ? me.commandData.params[0].entity : null)
      me.commandConfig.entity = me.entity
    } else {
      me.commandData = { params: [
                { entity: me.entity, method: UB.core.UBCommand.methodName.SELECT, fieldList: '*' }
      ]}
    }

    switch (me.commandType) {
      case 'showList':
        me.showList()
        break
      case 'showForm':
        me.showForm()
        break
      case 'showReport':
        me.showReport()
        break
      default:
        errMsg = UB.format('{0}: "{1}"', UB.i18n('unknownCommandType'), me.commandType)
        throw new Error(errMsg)
    }
  },

  getFormParamFromCommandData: function (commandData) {
    var formParam = {}

    if (commandData) {
      if (commandData.formCode) {
        formParam.formCode = commandData.formCode
      }
      if (commandData.formTitle) {
        formParam.description = commandData.formTitle
      }
    }
    return Object.keys(formParam).length === 0 ? null : formParam
  },

  /**
   * @return {Object}
   */
  getFormParam: function () {
    var me = this
    var form, record, store

    if (this.formParam) {
      return this.formParam
    }

    if (this.commandData && (this.formParam = this.getFormParamFromCommandData(this.commandData))) {
      return this.formParam
    }
    if (me.formCode) {
      store = UB.core.UBStoreManager.getFormStore()
      record = store.findRecord('code', me.formCode, 0, false, true, true)
      if (!record) {
        throw new Error('Unknown form code "' + me.formCode + '"')
      }

      this.formParam = {
        formCode: me.formCode,
        caption: record.get('caption') ? UB.i18n(record.get('caption').toString()) : '',
        description: record.get('description') ? UB.i18n(record.get('description').toString()) : ''
      }
      return this.formParam
    }
    form = UB.core.UBFormLoader.getFormByEntity(this.entity)
    if (form) {
      this.formCode = form.get('code')
      this.formParam = {
        formCode: this.formCode,
        caption: form.get('caption') ? UB.i18n(form.get('caption').toString()) : '',
        description: form.get('description') ? UB.i18n(form.get('description').toString()) : ''
      }
      return this.formParam
    }
  },

  showList: function () {
    var me = this
    var showListParam = _.find(me.commandData.params, ['entity', me.entity])
    var errMsg, config

    me.showListParam = showListParam

    if (!showListParam) {
      errMsg = UB.format(UB.i18n('neizvestnnajaSushhnost'), 'showList', me.entity)
      throw new UB.UBError(errMsg)
    }
    if ((showListParam.fieldList === '*') ||
        (Array.isArray(showListParam.fieldList) && (showListParam.fieldList.length === 1) && (showListParam.fieldList[0] === '*'))
    ) {
      showListParam.fieldList = $App.domainInfo.get(me.entity).getAttributeNames({defaultView: true})
    }

    me.windowCommandCode = me.commandCode || UB.core.UBUtil.getNameMd5(me.entity + Ext.String.capitalize(me.commandType), showListParam.fieldList)

    if (this.detailAttribute && this.parentID && showListParam.fieldList.indexOf(this.detailAttribute) === -1) {
      showListParam.fieldList.push(this.detailAttribute)
    }
    if (me.instanceID) {
      showListParam.ID = me.instanceID
      showListParam.whereList = showListParam.whereList || {}
      UB.core.UBCommand.addWhereListItemSelect(showListParam.whereList, 'ID', me.instanceID, UB.core.UBCommand.whereListInstanceID)
    }

    showListParam.__mip_recordhistory = me.__mip_recordhistory

    config = me.cmpInitConfig || {}

    Ext.applyIf(config, {
      entityConfig: showListParam,
      loadStoreImmediately: true,
      filters: me.filters,
      store: me.requestStore,
      summary: me.summary,
      commandContext: me.commandContext,
      commandConfig: me.commandConfig,
      commandCode: me.commandCode,
      commandData: me.commandData,
      openInBackgroundTab: me.openInBackgroundTab,
      autoFilter: me.autoFilter,
      details: me.details,
      target: me.target,
      parentContext: me.parentContext,
      detailAttribute: me.detailAttribute,
      parentID: me.parentID,
      stateful: true,
      stateId: me.stateId || UB.core.UBLocalStorageManager.getKeyUI(UB.core.UBUtil.gatherStr(me.windowCommandCode, '_', 'grid')),
      columns: me.columns,
      hideHeaders: me.hideHeaders,
      isModal: me.isModal,
      isModalDialog: me.isModalDialog,
      onClose: me.onClose,
      onItemSelected: me.onItemSelected,
      isDetail: me.isDetail,
      customActions: me.customActions,
      selectedRecordID: me.selectedInstanceID,
      focusOnUpdate: me.focusOnUpdate,
      hideActions: me.hideActions
    })
    if (me.isDetail) {
      config.height = UB.appConfig.gridDefaultDetailViewHeight
    }

    if (me.tabId) {
      var tab = Ext.getCmp(me.tabId)
      if (tab && tab.activateByCommand) {
        tab.activateByCommand(config)
      }
      tab = tab && tab.getMainContainer ? tab.getMainContainer() : tab
      if (tab) {
        tab.ownerCt.setActiveTab(tab)
        return
      }
      config.id = me.tabId
      config.closable = true
    }
    var grid = Ext.create('UB.view.EntityGridPanel', config)
    me.bindFocus(grid)

    if (_.isFunction(grid.customInit)) {
      console.error('Function customInit is deprecated. You should use callback function initComponentStart in script file.')
      grid.customInit()
    }
    me.showCommandResult(grid, { isGrid: true })
  },

  showForm: function () {
    var me = this
    var defaultItems

    // form code can be function - in this case execute it. {cmdType: "showForm", formCode: function(){...}
    me.formCode = me.formCode || (me.formParam ? me.formParam.formCode : undefined)
    if (_.isFunction(me.formCode)) {
      me.windowCommandCode = UB.core.UBUtil.getNameMd5(me.entity + Ext.String.capitalize(me.commandType), me.formCode.toString())
      me.formCode(me.entity, me.instanceID, me.onFormCodeRun, me)
    } else {
      me.formParam = me.getFormParam()
      // me.description = me.description || (me.formParam ? me.formParam.description : undefined)
      me.caption = me.caption || (me.formParam ? me.formParam.caption : undefined)
      if (!Ext.isDefined(me.formCode)) {
        me.windowCommandCode = UB.core.UBUtil.getNameMd5(me.entity + Ext.String.capitalize(me.commandType), defaultItems = UB.core.UBCommand.createDefaultItems(me.entity, me.parentContext))
        me.description = $App.domainInfo.get(me.entity).caption
        me.isDefaultForm = true
        me.onShowFormRun(defaultItems)
      } else {
        me.windowCommandCode = me.formCode

        UB.core.UBFormLoader.getFormViewAndController({formCode: me.formCode}).then(function (formDefinition) {
          // TODO - MPV temporary
          // if (formDefinition.formType === 'vue') {
          //   UB.inject('vue.js').then(function () {
          //     var clearAttrReg = /^\/\/@(.+) "(.*)"[ \t]*\r?\n/gm // seek for //@ "bla bla" CRLF
          //     if (!formDefinition.formController.el) {
          //       formDefinition.formController.el = $App.viewport.centralPanel.getEl().dom
          //     }
          //     formDefinition.formController.template = formDefinition.formView.replace(clearAttrReg, '')
          //     new Vue(formDefinition.formController)
          //   })
          // } else {
          me.onShowFormRun(formDefinition.formView, formDefinition.formController)
          // }
        })
      }
    }
  },

  onFormCodeRun: function () {
    var me = this
    UB.core.UBFormLoader.getFormViewAndController({formCode: me.formCode}).then(function (form) {
      me.onShowFormRun(form.formView, form.formController)
    })
  },

  showReport: function () {
    var me = this
    var reportParams, report, options
    reportParams = me.commandData
    options = me.reportOptions || reportParams.reportOptions || {}

    report = Ext.create('UBS.UBReport', _.defaults(options, {
      code: reportParams.reportCode,
      type: reportParams.reportType,
      params: reportParams.reportParams,
      language: $App.connection.userLang()
    }))
    report.init().then(function () {
      var viewer = Ext.create('UBS.ReportViewer', {
        report: report
      })
      viewer.target = me.target

      me.showCommandResult(viewer, {
        stateId: reportParams.code + (reportParams.params ? JSON.stringify(reportParams.params) : ''),
        title: report.reportRW.name
      })
    })
  },

  onShowFormRun: function (dfm, functions) {
    var me = this
    var formConfig = me.cmpInitConfig || {}
    var form

    me.entity = me.entity || dfm.entity
    Ext.apply(formConfig, {
      formCode: me.formCode,
      entityName: me.entity,
      instanceID: me.instanceID,
      commandContext: me.commandContext,
      commandConfig: me.commandConfig,
      sender: me.sender,
      store: me.store,
      addByCurrent: me.addByCurrent,
      __mip_ondate: me.__mip_ondate,
      commandCode: me.commandCode,
      commandData: me.commandData,
      target: me.target,
      openInBackgroundTab: me.openInBackgroundTab,
      parentContext: me.parentContext,
      /* xmax - it is for detail grid
      detailAttribute: me.detailAttribute,
      parentID: me.parentID,
      */
      isDetail: me.isDetail,
      initValue: me.initValue,
      applyValues: me.applyValues,
      initialFieldValues: me.initialFieldValues,
      customParams: me.customParams,
      eventHandler: me.eventHandler,
      isModal: me.isModal,
      onClose: me.onClose,
      tabID: me.tabId,
      hideActions: me.hideActions
    })

// BVV add for preview form------------------------------------------------25-09-2013
    if (me.isDetail) {
      formConfig.height = UB.appConfig.gridDefaultDetailViewHeight
    }
    if (me.tabId) {
      var tab = Ext.getCmp(me.tabId)
      if (!tab && me.instanceID) { // специально для тестировщиков которые открывают из реестра еще раз только чтосохраненный документ
        tab = $App.viewport.centralPanel.down('basepanel[instanceID=' + me.instanceID + ']')
      }
      if (tab) {
        tab.ownerCt.setActiveTab(tab)
        return
      }
      formConfig.id = me.tabId
      formConfig.closable = true
    }
// BVV add for preview form------------------------------------------------25-09-2013
    if (typeof dfm !== 'function') {
      formConfig.dfm = dfm
      formConfig.functions = functions
      form = Ext.create('UB.view.BasePanel', formConfig)
    } else {
      form = Ext.create(dfm, formConfig)
    }

    me.bindFocus(form)
    me.showCommandResult(form)
  },

  bindFocus: function (target) {
    var me = this
    if (me.sender) {
      target.on('destroy', function () {
        if (me.sender) {
          Ext.callback(me.sender.focus, me.sender, [], 10)
        }
      })
    }
  },

  /**
   * @param {Ext.Control} result
   * @param {Object} [options]
   * @param {Boolean} options.isGrid
   * @param {String} options.stateId
   * @param {String} options.title
   */
  showCommandResult: function (result, options) {
    var me = this
    var parentName = me.detailAttribute
      ? UB.format(' ({0}: {1})', UB.i18n('filtr'), $App.domainInfo.get(me.entity).attr(me.detailAttribute).caption)
      : ''
    var history = me.__mip_recordhistory ? ' (' + UB.i18n('istorijaIzmenenij') + ')' : ''
    var title
    var config
    var disableAutoShow = result.disableAutoShow

    options = options || {}

    title = options.title ||
       (me.caption || (me.formParam
         ? (me.formParam.caption || me.formParam.description)
         : null) ||
       $App.domainInfo.get(me.entity).caption) +
       parentName + history

    if (!me.createOnly) {
      if (!result.target) {
        config = {
          title: title,
          autoScroll: true,
          border: 0,
          layout: 'fit',
          autoDestroy: true,
          items: [result],
          dfm: result.dfm,
          isGrid: options.isGrid,
          stateful: true,
          stateId: options.stateId || UB.core.UBLocalStorageManager.getKeyUI(UB.core.UBUtil.gatherStr(me.windowCommandCode, '_', 'window'))
        }

        if (!options.isGrid /* && me.instanceID && !me.addByCurrent */) {
          var entity = me.entity
          var last = me.instanceID || 'new-' + (new Date()).getTime()
          var wndId = UB.format('ub-wnd-{0}-{1}', me.entity, last)
          var wnd = Ext.WindowManager.get(wndId)

          if (wnd) {
            Ext.WindowManager.each(function (item) {
              if (item.entity === entity && item.newInstance) {
                wnd = item
                return false
              }
              return true
            })
          }
          if (wnd && wnd.destroying) {
            wnd.destroy()
            wnd = null
          }
          if (wnd) {
            Ext.WindowManager.bringToFront(wnd)
            wnd.getHeader().body.highlight('#FF9933')
            return
          }
          if (!me.instanceID) {
            config.newInstance = true
            config.entity = me.entity
          }
          config.id = wndId
        }
        if (me.isDefaultForm) {
          config.width = UB.appConfig.formDefaultAutoFormWidth
        }
        config.modal = true
        config.resizable = me.isResizable
        config.maximizable = me.isMaximizable
        config.closable = me.isClosable
        if (!config.minWidth) {
          config.minWidth = 300
        }
        if (!config.minHeight) {
          config.minHeight = 200
        }

        result.window = Ext.create('UB.view.BaseWindow', config)
        if (me.isModal) {
          result.window.onItemSelect = config.onItemSelect
        }
      } else { //  have result.target
        if (result.target instanceof Ext.grid.Panel) {
          result.dock = 'bottom'

          if (!result.height) {
            result.height = Math.round(result.target.getHeight() / 3)
          }

          if (me.title) {
            result.title = me.title
          }
          result.target.addDocked(result)
        } else {
          result.title = me.title || title
          result.tooltip = result.title

          if (result.isBasePanel) {
            result.setTitle(result.title)
          }

          if (!Ext.isDefined(me.tabId)) {
            result.target.removeAll()
          }

          if (result.target.setActiveTab) {
            result.closable = true
            if (this.checkTabsCount(result.target)) {
              result.target.add(result)
              if (!me.openInBackgroundTab) {
                result.target.setActiveTab(result)
              }
            } else {
              result.destroy()
            }
          } else {
            result.target.add(result)
          }
        }
      }
    }
    if (result.window && !disableAutoShow) {
      result.window.show()
    }
    Ext.callback(me.callback, me.scope || me, [result])
  },

  checkTabsCount: function (tabPanel) {
    var count = tabPanel.items.getCount()
    if (count >= UB.appConfig.maxMainWindowTabOpened) {
      Ext.create('widget.uxNotification', {
        title: UB.i18n('error'),
        position: 't',
        slideInDuration: 800,
        slideBackDuration: 1500,
        slideInAnimation: 'elasticIn',
        slideBackAnimation: 'elasticIn',
        useXAxis: true,
        autoShow: true,
        cls: 'ux-notification-light',
        iconCls: 'ux-notification-icon-error',
        bodyPadding: 5,
        items: [{
          html: UB.i18n('tabsCountLimitExceeded')
        }]
      })
      return false
    }
    return true
  }
})
