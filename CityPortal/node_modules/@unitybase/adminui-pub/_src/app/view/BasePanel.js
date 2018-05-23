require('../ux/form/field/UBText')
require('../ux/form/field/UBTextArea')
require('../ux/form/field/UBBoxSelect')
require('../ux/form/field/ComboExtraButtons')
require('./FormDataBinder')
require('../ux/UBDocument')
require('../ux/UBDetailGrid')
require('../ux/UBDetailTree')
require('../ux/UBBadge')
require('../ux/form/field/UBDictComboBox')
require('../ux/form/field/UBComboBox')
require('../ux/form/field/UBDate')
require('../ux/form/field/UBDateTime')
require('../ux/form/field/UBBoolBox')
require('../ux/form/UBFieldSet')
require('../core/UBDataLoader')
require('./ErrorWindow')
require('./DocumentVersions')
require('../ux/LockManager')
require('./UBForm')
require('../ux/form/HtmlEditor')
require('./UploadFileAjax')
require('../ux/UBTinyMCETextArea')
require('../core/UBPanelMixin')
require('../ux/form/UBPlanFactContainer')
// TODO - move CommandBuilder requires to shortcut editor (after adding forms parsing via SystemJS)
require('./CommandBuilder/EntitiesComboBox')
require('./CommandBuilder/CommandTypeComboBox')
require('./CommandBuilder/FormsComboBox')
require('./CommandBuilder/EntityTreePanel')
require('./CommandBuilder/AttributesGridPanel')
require('../ux/form/field/AdvancedTextArea')
const _ = require('lodash')

/* global saveAs */
/**
 * BasePanel provides a standard container for Entity-based forms. It is essentially a standard {@link Ext.form.Panel} which
 * creates his inner layout based on form definition file (`formCode`-fm.def) - a form View, and add behaviors based on
 * form logic description (`formCode`-fm.js) - a form Controller.
 *
 * # View
 *
 * From BasePanel POV `View` is a content of corresponding *.def file. Actually this is a collection of {@link Ext.Component} assigned to
 * BasePanel {@link Ext.form.Panel#items items} configuration property. So, caller can pass here any {@link Ext.Component} descendants configuration.
 *
 * But UnityBase also provide ability to specify component config based on entity metadata. In this case pass {attributeName: 'nameOfYourEntityAttribute'}
 * as a part of configuration, and UnityBase replace such definition by actual Component, based on attribute type.
 * See {@link UB.core.UBUtil#ubDt2Ext UBUtil.ubDt2Ext} for details.
 *
 * #Controller
 *
 * Controller code is used to specify form behaviors. By default BasePanel add his own behaviors based on knowledge about Entity it created for.
 *
 *  - since Domain know all accessible {@link UBEntity#entityMethods entityMethods} base panel can enable/disable CRUD actions
 *  - using knowledge about available `Document` type attributes BasePanel add document-related actions for `Scan`, `Attach`, `Clear` documnet attibute content
 *  - based on knowledge about Entity `Mixins` ({@link UBEntity#hasMixin}) Base panel can add additional mixin-specific actions,
 *  such as `History`, `Audit`, `Security` e.t.c.
 *
 * Custom behaviors is added in user-defined controlled methods inside form *.js part. BasePanel evaluate form *.js script by wrapping it into closure and
 * apply `exports.formCode` variable content to BasePanel. If applied action already exists in BasPanel we memorize it to `$previous` variable.
 * The three main entry point is:
 *
 *  - `initComponentStart`: Called just before form initialization. Here is possible to change form config
 *  - `initComponentDone`: On this stage all controls is already created, but not rendered. Here is a good place to add
 *  event handlers to controls or change some control properties that affect the rendering
 *  - `initUBComponent`: Called after two-way binding between record and controls is established, but before {@link UB.view.BasePanel#formDataReady} event.
 *
 * #Data binding
 *
 * All data for form are stored in {@link UB.view.BasePanel#record} - instance of {@link Ext.data.Model model} created by BasePanel based on attributes,
 * placed into form in View definition (`def` file) plus attributes, passed to {@link BasePanel#requiredFields} configuration parameter.
 *
 * If you need to change/read form data, it is better to deal with {@link UB.view.BasePanel#record} instead of working with form {@link Ext.Component components} directly.
 * For example, to check user modify something on form check {@link UB.view.BasePanel#record} state:
 *
 *     initUBComponent: function(){
 *         var me = this;
 *         me.on('beforeClose', function(){
 *            var me = this;
 *            if (me.record.dirty) {
 *                // if form changed do anything
 *             }
 *         }, me);
 *     }
 *
 * BasePanel provide two way data binding between {@link UB.view.BasePanel#record} and form controls.
 * See <a href="https://enviance.softline.kiev.ua/confluence/pages/viewpage.action?pageId=77201665">this article</link> for details.
 *
 *     initUBComponent: function(){
 *         var me = this;
 *
 *         // After bind data, you can change value in interface control by changing value in record.
 *         me.record.set('name', 'Ivan Ivanov');
 *
 *         // Also you can change data in interface control and data immediately fall into store record.
 *        me.getField('name').setValue('Andre Galushkin');
 *
 *        // You can also monitor user changes in data.
 *        me.on('controlChanged', function(control, newValue, oldValue){
 *           me.record.set('firstName', newValue.split(' ')[0]);
 *        }, me );
 *     }
 *
 *
 * #Events
 *
 * Base panel inherit all {@link Ext.form.Panel Ext.form.Panel} events, but also add some hi-level event, such as {@link UB.view.BasePanel#recordloaded} e.t.c.
 * See <a href="https://enviance.softline.kiev.ua/confluence/pages/viewpage.action?pageId=87229917">this article</a> for detailed explanation
 * and events section in this documentation.
 *
 * TODO - SAMPLES!!!
 * @author UnityBase core team
 */
Ext.define('UB.view.BasePanel', {
  extend: 'Ext.form.Panel',
  alias: 'widget.basepanel',
  border: false,

  uses: [
    'UB.core.UBAppConfig',
    'UB.core.UBStoreManager',
    'UB.core.UBUtil',
    'UB.core.UBService',
    'UB.core.UBCommand',
    'UB.core.UBApp',
    'UB.view.StatusWindow'
  ],

  bodyPadding: 0,
  isBasePanel: true,
  statics: {
    defaultUBName: 'ubName',
    /**
     * List of actions aviable in "All actions" form menu
     */
    actionId: {
      save: 'save',
      saveAndClose: 'saveAndClose',
      fDelete: 'fDelete',
      refresh: 'refresh',
      scan: 'scan',
      attach: 'attach',
      showOriginal: 'showOriginal',
      deleteAttachment: 'deleteAttachment',
      showVersions: 'showVersions',
      accessRight: 'accessRight',
      audit: 'audit',
      history: 'history',
      formConstructor: 'formConstructor',
      downloadAttach: 'downloadAttach',
      lock: 'lock',
      unLock: 'unLock'
    },

    eventId: {
      save: 'save',
      fDelete: 'fDelete',
      refresh: 'refresh',
      scan: 'scan',
      attach: 'attach',
      showOriginal: 'showOriginal',
      deleteattachment: 'deleteattachment',
      showVersions: 'showVersions',
      accessRight: 'accessRight',
      audit: 'audit',
      history: 'history',
      formConstructor: 'formConstructor',
      downloadAttach: 'downloadAttach',
      lock: 'lock',
      unLock: 'unLock'
    },

    hotKeys: {
      saveAndClose: {
        key: Ext.EventObject.ENTER,
        shift: false,
        ctrl: true,
        text: ' (Ctrl+Enter)'
      },
      save: {
        key: Ext.EventObject.S,
        ctrl: true,
        shift: false,
        text: ' (Ctrl+S)'
      },
      fDelete: {
        key: Ext.EventObject.DELETE,
        ctrl: true,
        shift: false,
        text: ' (Ctrl+DELETE)'
      },
      refresh: {
        ctrl: true,
        shift: false,
        key: Ext.EventObject.R,
        text: ' (Ctrl+R)'
      }
    },

    markFieldLabelAsMandatory: function (label) {
      return label + '<span class="ub-view-marked-field-label">*</span>'
    }
  },

  mixins: {
    ubPanelMixin: 'UB.core.UBPanelMixin'
  },

  overflowX: true,
  overflowY: true,
  bodyStyle: 'padding: 5px 0 0 0',
  cls: 'ub-basepanel',
  switchSaveButtonsAction: false,

  /**
   * Is form opened in "Add new" or "Add by current" mode
   * @property {boolean} isNewInstance
   * @readonly
   */
  isNewInstance: true,

  /**
   * Record, form created for.
   *
   * Record fields is union of all attributes defined via `attributeName` in form *def* file
   * and config `requiredFields` property.
   *
   * During save(update) operation BasePanel check which of the fields in the record changed
   * and send only changed fields to `update` server method (via `execParams`).
   *
   * @property {Ext.data.Model} record
   */
  record: null,

  /**
   * @cfg {Boolean} [postOnlySimpleAttributes=false]
   * If `true` form will post only values of modified attributes
   * which do not contain a dot.
   * Exapmle: if form def is
   *    items:[
   *      { attributeName: "nullDict_ID"},
   *      { attributeName: "nullDict_ID.code", readOnly: true},
   *      { attributeName: "nullDict_ID.caption", readOnly: true}
   *    ]
   *
   *  Values of nullDict_ID.code &  nullDict_ID.caption will not be send to update/insert execParams
   */
  postOnlySimpleAttributes: false,

  /**
   * Is open form was saved
   * @property {boolean} formWasSaved
   * @readonly
   */
  formWasSaved: false,

  initComponent: function () {
    var
            me = this
    if (me.dfm && me.dfm.parentConfig) {
      Ext.apply(me, me.dfm.parentConfig)
    }
    /**
     * true when all data loaded and rendered
     * @property {boolean} formDataReady
     * @readonly
     */
    me.formDataReady = false

    /**
     * Entity BasePanel created for
     * @property {UBEntity} domainEntity
     */
    me.domainEntity = $App.domainInfo.get(me.entityName)
    me.entityMethods = me.domainEntity.entityMethods

    me.isNewInstance = !(me.instanceID && !me.addByCurrent)
    /**
     * Is form opened for editing, equal to !me.isNewInstance
     * @property {boolean} isEditMode
     * @readonly
     */
    me.isEditMode = !me.isNewInstance
    if (me.addByCurrent) {
      me.addByCurrentInstanceID = me.instanceID
    }

    /**
     * Collection of document-type attribute definition. Key is attribute name, value is attribute definition.
     * @property {Object} documents
     */
    me.documents = {}
    _.forEach(me.domainEntity.filterAttribute({dataType: 'Document'}), function (attr) {
      me.documents[attr.code] = attr
    })
        // domain.getEntityAttributesWithDataTypeAdtDocument(me.entityName);
    me.documentsCount = Ext.Object.getSize(me.documents)

    me.hasDataHistoryMixin = me.domainEntity.hasMixin('dataHistory')
        // since by default audit is enabled, we do not write it in the domainInfo. So mixin present only if in meta: audit: {enabled: false}
    me.hasAuditMixin = me.domainEntity.hasMixin('audit')
    me.hasHardSecurityMixin = me.domainEntity.hasMixin('aclRls')
    me.isEntityLockable = me.domainEntity.hasMixin('softLock')
    me.hasEntityALS = me.domainEntity.hasMixin('als')

    me.addItems()
    me.fieldList = me.getFieldList()

    me.startLoadFormData()

    me.preprocessPanel()

    if (me.tabID) {  // opened in tab
      if (!me.dockedItems) me.dockedItems = []

      me.headerPanel = Ext.create('Ext.panel.Header', {
        border: 0,
        padding: '3 3 3 8',
        isHeader: true,
        layout: 'hbox',
        height: 25,
        dock: 'top',
        cls: 'ub-toolbar-header',
        bodyCls: 'ub-toolbar-header',
        title: me.title || ''
      })
      me.dockedItems.splice(0, 0, me.headerPanel)
    }

    /**
     * @cfg {function} initComponentStart
     * Called when initComponent start.
     * You can extend form config here.
     */
    if (me.initComponentStart && _.isFunction(me.initComponentStart)) {
      Ext.callback(me.initComponentStart, me)
    }

    me.callParent(arguments)

    me.initUBControlMap()
    me.fields.forEach(function (field) {
      if (field.getFieldLabel) {
        field.originalFieldLabel = field.getFieldLabel()
      }
    })

    me.details = me.getDetails()
    /**
     * @event recordloaded
     * Fires when form record load is finish.
     * Use {@link UB.view.BasePanel#formDataReady} to do something when all related structures loaded.
     * @param {Ext.data.Model} rec Loaded record
     */
    /**
     * @event manualsaving
     * Fires just **after** USER call `save` action (press save button or Ctrl+S shortcut)
     * but **before** data passed to a server for update/insert
     * @param {UB.view.BasePanel} sender BasePanel where save was happened
     * @param {Object} request  Update/insert ubql (can be modified)
     */
    /**
     * @event beforesave
     * Fires just before data passed to a server for update/insert
     * @param {UB.view.BasePanel} sender BasePanel where save was happened
     * @param {Object} request  Update/insert ubql (can be modified)
     */
    /**
     * @event aftersave
     * Fires when record saved with 2 parameters: (me, result) where result is a record state AFTER server side updating
     * @param {UB.view.BasePanel} sender BasePanel where save was happened
     */
    /**
     * @event afterdelete
     * Fires when record deleted
     */
    /**
     * @event formDataReady
     * Fires when data bonded and all form required data loaded (combobox data, details data e.t.c.)
     */
    /**
     * @event beforeDelete
     * @param {Promise[]}
     * To return Promise put it into income array
     * Fires before delete.
     *
     */
    /**
     * @event beforeRefresh
     * Fires before refresh panel.
     */
    /**
     * @event beforeClose
     * Fires before close panel.
     */
    /**
     * @event updateFields
     * Fires after form fields are updated. Updated fields start after: load form data, refresh form data, save form data
     */
    /**
     * @event beforeSaveForm
     * @param {[Number, function][]}
     * You can put into this array your array where first element is orderNumber and second id function.
     * Function will be called to order specified in orderNumber. Each function can return promise. when run for last promise form start savind.
     */
    /**
     * @event controlChanged
     * Fires when any binded control changed by user. When data changed from dataBinder then this event do not fired.
     * If you want to interrupt the data binding then return false from function.
     * @param {Ext.form.field.Field} this
     * @param {Object} newValue The new value
     * @param {Object} oldValue The original value
     */
    /**
    * @event initComponentDone
    * Fires on component was initialized.
    */
    /**
     * @event dataBind
     * @param {Ext.data.Model} record
     * Fired when data is bound.
     */
    me.addEvents('recordloaded', 'beforesave', 'manualsaving', 'aftersave', 'afterdelete', 'formDataReady',
      'beforeSaveForm', 'beforeDelete', 'beforeClose', 'updateFields',
      'controlChanged', 'initComponentDone', 'dataBind', 'beforeRefresh')

    me.on('destroy', me.onFormDestroy, me)
    me.on('close', me.onPanelClose, me)
    me.on('boxready', function () {
      var win = me.getFormWin()
      if (win) {
        me.mon(win, 'close', me.onPanelClose, me)
      }
      if (!me.formDataReady) {
        me.getEl().mask(UB.i18n('loadingData'))
      }
    })

    me.record = UB.ux.data.UBStore.createRecord(me.entityName, me.fieldList)
    me.record.store.on('update', me.onRecordUpdate, me)

    function doCompleteReady () {
      Ext.suspendLayouts()
      try {
        me.enableBinder() // для случая когда нет задержки в загрузке
        if (!me.initUBComponentFired) {
          Ext.callback(me.initUBComponent, me)
        }
        me.initUBComponentFired = true
        if (!me.isDestroyed) {
          me.fireEvent('formDataReady')
        }
      } finally {
        Ext.resumeLayouts(true)
      }
      me.unmaskForm()
    }

    function showItems () {
      if (me.startHideDone) {
        return
      }
      me.items.each(function (item) {
        if (!item.oldHidden) {
          item.setVisible(true)
        }
        item.hideMode = item.oldHideMode
        delete item.oldHidden
        delete item.oldHideMode
      })
      me.startHideDone = true
    }

    /**
     * @property {UB.view.FormDataBinder} binder
     * Bind record and controls of form.
     */
    me.binder = Ext.create('UB.view.FormDataBinder', {panel: me })
    me.binder.on('controlChanged', me.controlChanged, me)
    me.binder.on('formDataReady', function () {
      me.formDataReady = true

      Ext.suspendLayouts()
      try {
        if (me.rendered) {
          doCompleteReady()
        } else {
          me.on('afterrender', doCompleteReady, me, {single: true})
        }
        showItems()
      } finally {
        Ext.resumeLayouts(true)
      }

      if (!me.isDestroyed) {
        var el = me.getEl()
        el && el.unmask()
      }
    })

    me.binder.on('dataBind', function () {
      me.fireEvent('dataBind', me.record)
    }, me)
    this.updateActions('init')

    /**
     * @cfg {function} initComponentDone
     * Called when initComponent done.
     * You can add your event handlers here.
     */
    if (me.initComponentDone && _.isFunction(me.initComponentDone)) {
      Ext.callback(me.initComponentDone, me)
    }

    me.fireEvent('initComponentDone', me)
  },

  /**
   * @private
   * Do not delete this function. Ext.form.Basic form do not correct find form controls.
   * @returns {UB.view.UBForm}
   */
  createForm: function () {
    var cfg = {},
      props = this.basicFormConfigs,
      len = props.length,
      i = 0,
      prop

    for (; i < len; ++i) {
      prop = props[i]
      cfg[prop] = this[prop]
    }
    return new UB.view.UBForm(this, cfg)
  },

  /**
   * @private
   * Set instance id
   * @param {Number|null} newInstanceID
   */
  setInstanceID: function (newInstanceID) {
    var me = this
    me.instanceID = newInstanceID
    me.isEditMode = !!me.instanceID
    me.addByCurrent = false
  },

  getInstanceID: function () {
    var me = this
    return me.instanceID || me.record.get('ID')
  },

  /**
   * @param {Boolean} [ignoreNewInstance=false] if true check only changes maked by user.
   * Return true if form is dirty.
   * @returns {boolean}
   */
  isFormDirty: function (ignoreNewInstance) {
    return this.record.dirty ||
      (this.extendedDataForSave && Object.keys(this.extendedDataForSave).length > 0)
  },

  onRecordUpdate: function (store, record) {
    var me = this, dirty
    if (me.record !== record) {
      return
    }
    if (me.isInnerChangingRecord) {
      return
    }

    dirty = me.isFormDirty()
    if ((!me.fireDirty && dirty) || (me.fireDirty && !dirty)) {
      me.fireDirty = !me.fireDirty
      this.updateActions()
    }
  },

  /**
   * Disable data binder
   */
  disableBinder: function () {
    this.isInnerChangingRecord = true
    this.binder.isInnerChangingRecord = true
  },

  /**
   * Enable data binder
   */
  enableBinder: function () {
    this.isInnerChangingRecord = false
    this.binder.isInnerChangingRecord = false
  },

  /**
   * @cfg {Function} onClose
   * Called when form is closing
   * @param {Number|null} instanceID
   * @param {Ext.Data.Store} store
   */

  /**
   * @cfg {Object.<string, *>} parentContext
   * Key value pair for default field values
   */

  /**
   *  @private
   */
  onPanelClose: function () {
    let me = this
    if (me.onClose && typeof me.onClose === 'function') {
      if (me.isDeleted) {
        me.onClose(null, me.store, me.formWasSaved)
      } else {
        me.onClose(me.isNewInstance ? null : me.instanceID, me.store, me.formWasSaved)
      }
    }
    me.fireEvent('beforeClose', me)
  },

  getFormWin: function () {
    if (!this.formWin) {
      this.formWin = this.up('window')
    }
    return this.formWin
  },

  onFormDestroy: function () {
    if (this.entityLocked) {
      this.deleteLock()
    }
    this.deleteInstanceID()
    if (UB.view.UBDropZone) {
      UB.view.UBDropZone.un('configureDropZone', this.onFileDragDropConfigure, this)
    }
    if (this.binder) {
      this.binder.destroy()
    }
  },

  controlChanged: function (field, newValue, oldValue) {
    var me = this
    if (!me.entityLocked && !me.isNewInstance && me.formDataReady && !me.isSaveProcess && !me.hasPersistLock) {
      me.setEntityLocked()
    }
    me.fireEvent('controlChanged', field, newValue, oldValue)
  },

  /**
   * Add persist lock
   * @returns {Promise}
   */
  addPersistLock: function () {
    var me = this, baseProperty,
      baseID = me.getInstanceID(), baseEntity = me.entityName

    if (!me.isEntityLockable) {
      return Promise.resolve(false)
    }

    if (me.domainEntity.mixins.softLock.lockIdentifier !== 'ID') {
      baseProperty = me.domainEntity.mixins.softLock.lockIdentifier.split('.')
      if (baseProperty.length > 0) {
        baseProperty = baseProperty[0]
      }
      baseEntity = me.domainEntity.attr(baseProperty).associatedEntity
      baseID = me.record.get(baseProperty)
    }

    return $App.connection.run({
      method: 'isLocked',
      entity: baseEntity,
      ID: baseID
    }).then(function (lockInfo) {
      me.onGetLockInfo(lockInfo)
      if (lockInfo.lockInfo.isLocked && lockInfo.lockInfo.lockType === 'Temp' && (!me.lockCtx || !me.entityLocked)) {
        throw new UB.UBError(UB.i18n('tempLockExistForThisUser'))
      }
      return $App.connection.run({
        method: 'lock',
        lockType: 'ltPersist',
        entity: baseEntity,
        ID: baseID
      })
    }).then(function (result) {
      if (result.resultLock && result.resultLock.success) {
              // if exists temp lock this function clear it context
        me.clearLockCtx()
        me.onGetLockInfo({
          lockInfo: result.resultLock.lockInfo
        })
      }
    })
  },

  /**
   * Remove persist lock
   * @returns {Promise}
   */
  removePersistLock: function () {
    var me = this, baseProperty,
      baseID = me.getInstanceID(), baseEntity = me.entityName

    if (!me.isEntityLockable) {
      return Q.resolve(false)
    }

    if (me.domainEntity.mixins.softLock.lockIdentifier !== 'ID') {
      baseProperty = me.domainEntity.mixins.softLock.lockIdentifier.split('.')
      if (baseProperty.length > 0) {
        baseProperty = baseProperty[0]
      }
      baseEntity = me.domainEntity.attr(baseProperty).associatedEntity
      baseID = me.record.get(baseProperty)
    }

    return $App.connection.run({
      method: 'isLocked',
      entity: baseEntity,
      ID: baseID
    }).then(function (lockInfo) {
      if (lockInfo.lockInfo.isLocked && lockInfo.lockInfo.lockType === 'Temp' && (!me.lockCtx || !me.entityLocked)) {
        throw new UB.UBError(UB.i18n('tempLockExistForThisUser'))
      }
      if (lockInfo.lockInfo.isLocked && lockInfo.lockInfo.lockType === 'Temp') {
        throw new Error('Can not delete temporary lock')
      }
      return $App.connection.run({
        method: 'unlock',
        lockType: 'ltPersist',
        entity: baseEntity,
        ID: baseID
      })
    }).then(function (result) {
      if (result.resultLock && result.resultLock.success) {
        me.onGetLockInfo()
      }
    })
  },

  /**
   * @property {Boolean} hasPersistLock
   * Indicates the record was locked by persist lock.
   * @readonly
   * @returns {*}
   */
  onGetLockInfo: function (result) {
    var me = this
    me.record.lockInfo = result ? (result.lockInfo || {}) : {}
    me.hasPersistLock =
            (me.record.lockInfo.isLocked || me.record.lockInfo.lockExists) &&
            me.record.lockInfo.lockType === 'Persist' &&
            me.record.lockInfo.lockUser === $App.connection.userLogin()
    me.updateLockButton()
  },

  /**
   * @property {Boolean} entityLocked
   * Indicates the record was locked by temp lock.
   * @readonly
   * @returns {*}
   */

  /**
   * Set temp lock for instance
   * @returns {Promise}
   */
  setEntityLocked: function () {
    var me = this, ubRequest, execParams, promise, baseProperty,
      baseID = me.getInstanceID(), baseEntity = me.entityName
    if (!me.isEntityLockable || me.lockingProcessStarted) {
      return Promise.resolve(true)
    }
    me.lockingProcessStarted = true

    if (me.hasPersistLock) {
      return Promise.resolve(false)
    }

    if (me.domainEntity.mixins.softLock.lockIdentifier !== 'ID') {
      baseProperty = me.domainEntity.mixins.softLock.lockIdentifier.split('.')
      if (baseProperty.length > 0) {
        baseProperty = baseProperty[0]
      }
      baseEntity = me.domainEntity.attr(baseProperty).associatedEntity
      baseID = me.record.get(baseProperty)
    }

    return $App.connection.run({
      method: 'isLocked',
      entity: baseEntity,
      ID: baseID
    }).then(function (lockInfo) {
      me.onGetLockInfo(lockInfo)
      if (me.hasPersistLock) {
        return false
      }

      if (me.isNewInstance) {
        execParams = {} // ID: me.instanceID
        if (me.initValue) {
          Ext.applyIf(execParams, me.initValue)
        }
        if (me.parentContext) {
          Ext.applyIf(execParams, me.parentContext)
        }

        ubRequest = {
          method: 'addnew',
          entity: me.entityName,
          execParams: execParams,
          fieldList: me.fieldList,
          // alsNeed: me.hasEntityALS,
          lockType: 'ltTemp'
        }
        promise = $App.connection.addNew(ubRequest)
      } else {
        ubRequest = {
          entity: me.entityName,
          fieldList: ['ID', 'mi_modifyDate'],
          // alsNeed: me.hasEntityALS,
          lockType: 'ltTemp',
          ID: me.instanceID
        }
        me.formRequestConfig('select', ubRequest)
        promise = $App.connection.select(ubRequest)
      }
      return promise.catch(function (error) {
        me.entityLocked = false
        throw error
      }).then(function (result) {
        if (!result.resultLock.success) {
          me.entityLocked = false
          throw new UB.UBError(UB.format(UB.i18n('doNotGetLock'), result.resultLock.lockUser, Math.floor((new Date() - result.resultLock.lockTime) / 1000)))
        }
        if (!me.isNewInstance &&
              me.record.get('mi_modifyDate').getTime() !==
              (result.resultData.data[0][result.resultData.fields.indexOf('mi_modifyDate')]).getTime()) {
          me.entityLocked = true // only for deleteLock
          return me.deleteLock(true).then(function (result) {
            throw new UB.UBError('changedByAnotherUserForLock')
          })
        }

        me.lockCtx = UB.ux.LockManager.addLock({
          lockIdentifier: result.resultLock.lockID,
          entity: me.entityName,
          instance: (result.resultLock.lockValue ? result.resultLock.lockValue : me.record),
          onLockLoss: function () {
            if (me.lockCtx) {
              UB.ux.LockManager.deleteLock(me.lockCtx)
            }
            me.removeEntityLock()
            me.lockCtx = null
            me.updateLockButton()
          },
          scope: me
        })
        if (!me.entityLocked) {
          me.record.resultLock = result.resultLock
          me.entityLocked = true
        }
        me.updateLockButton()
        me.updateActions('entityRequiredLock', false)
        return true
      })
      .fin(function () {
        me.lockingProcessStarted = false
      })
    })
  },

  updateLockButton: function () {
    var me = this, win, header
    if (me.isDestroyed) {
      return
    }
    if (!me.entityLocked && !me.hasPersistLock && !me.record.lockInfo) {
      if (me.lockButton && me.lockButton.isVisible()) {
        me.lockButton.setVisible(false)
      }
      return
    }
    if (!me.lockButton) {
      header = me.getHeader()
      if (!header) {
        win = me.getFormWin()
        if (win) header = win.getHeader()
      }
      if (me.headerPanel) header = me.headerPanel
      if (header) {
        me.lockButton = header.insert(1, { xtype: 'label', style: {fontWeight: 'bold'}, text: UB.i18n('entityLockedOwn') })
      }
    }
    me.lockButton.removeCls('ub-persistlockinfo')
    if (me.hasPersistLock) {
      me.lockButton.addCls('ub-persistlockinfo')
      me.lockButton.setText(UB.format(UB.i18n('persistLockInfo'),
      me.record.lockInfo.lockUser, Ext.Date.format(new Date(me.record.lockInfo.lockTime), 'd.m.Y H:i:s')))
      me.lockButton.show()
    } else if (me.entityLocked) {
      me.lockButton.setText(UB.i18n('entityLockedOwn'))
      me.lockButton.show()
    } else if (me.record.lockInfo && me.record.lockInfo.lockExists && me.record.lockInfo.lockType === 'Temp') {
      // show message only if not in this session
      if (!UB.ux.LockManager.existLock(me.entityName, me.record.lockInfo.lockValue)) {
        me.lockButton.setText(UB.format(UB.i18n('tempSoftLockInfo'),
        me.record.lockInfo.lockUser, Ext.Date.format(new Date(me.record.lockInfo.lockTime), 'd.m.Y H:i:s')))
        me.lockButton.show()
      }
    } else if (me.record.lockInfo && me.record.lockInfo.lockExists && me.record.lockInfo.lockType === 'Persist') {
      me.lockButton.setText(UB.format(UB.i18n('softLockInfo'),
      me.record.lockInfo.lockUser, Ext.Date.format(new Date(me.record.lockInfo.lockTime), 'd.m.Y H:i:s')))
      me.lockButton.show()
    } else {
      if (me.lockButton.isVisible()) {
        me.lockButton.hide()
      }
    }

    if (me.hasPersistLock) {
      me.actions.unLock.show()
      me.actions.lock.hide()
    } else {
      me.actions.unLock.hide()
      if (!me.entityLocked) {
        me.actions.lock.show()
      }
    }
  },

  /**
   * @private
   */
  removeEntityLock: function () {
    var me = this
    if (!me.isEntityLockable) return
    me.entityLocked = false
    me.updateLockButton()
    me.updateActions('entityRequiredLock', true)
  },

  /**
   * Remove only lock context
   * @private
   */
  clearLockCtx: function () {
    var me = this
    if (me.isEntityLockable && me.entityLocked && me.lockCtx) {
      me.entityLocked = false
      UB.ux.LockManager.deleteLock(me.lockCtx)
      me.lockCtx = null
    }
  },

  /**
   * Delete temp lock. //setEntityLocked
   * @param {Boolean} [force]
   * @returns {Promise}
   */
  deleteLock: function (force) {
    var
      removeLock = false,
      me = this,
      promise = Promise.resolve(me.isEntityLockable && me.entityLocked),
      baseProperty, baseID = me.getInstanceID(), baseEntity = me.entityName

    if (me.hasPersistLock || me.startDeleteLock || !me.isEntityLockable || !me.entityLocked) {
      return Promise.resolve(false)
    }

    if (me.domainEntity.mixins.softLock.lockIdentifier !== 'ID') {
      baseProperty = me.domainEntity.mixins.softLock.lockIdentifier.split('.')
      if (baseProperty.length > 0) {
        baseProperty = baseProperty[0]
      }
      baseEntity = me.domainEntity.attr(baseProperty).associatedEntity
      baseID = me.record.get(baseProperty)
    }

    me.startDeleteLock = true
    return $App.connection.run({
      method: 'isLocked',
      entity: baseEntity,
      ID: baseID
    }).then(function (lockInfo) {
      me.onGetLockInfo(lockInfo)
      if (me.hasPersistLock) {
        return false
      }

      if (me.isEntityLockable && me.entityLocked) {
        if (me.lockCtx) {
          me.entityLocked = true
          removeLock = UB.ux.LockManager.deleteLock(me.lockCtx)
          me.lockCtx = null
        }

        if (me.entityLocked && (removeLock || force)) {
          promise = promise.then(function () {
            return $App.connection.run({
              entity: baseEntity,
              method: 'unlock',
              ID: baseID
            }).then(function (result) {
              me.record.lockInfo = (result && result.resultLock && result.resultLock.lockInfo)
                                    ? result.resultLock.lockInfo : {}
              return result && result.resultLock ? result.resultLock.success : false
            })
          })
        }
      }
      delete me.startDeleteLock
      return promise.then(function (result) {
        me.removeEntityLock()
        return result
      })
    })
  },

  setTitle: function (aTitle, fullTitle) {
    var me = this,
      wnd = me.getFormWin(),
      placeholder = me.placeholder
    me._formFullTitle = fullTitle
    me._formTitle = aTitle
    if (wnd) {
      wnd.setTitle(fullTitle || aTitle)
    } else {
      if (me.headerPanel) {
        me.headerPanel.setTitle(fullTitle || aTitle) // setText(fullTitle ? fullTitle : aTitle, false);
        if (placeholder && placeholder.setTooltip) {
          placeholder.setTooltip(aTitle)
        }
      }
      me.callParent(arguments)
    }
  },

  getFormTitle: function () {
    var me = this,
      wnd = me.getFormWin(),
      placeholder = me.placeholder
    return me._formFullTitle || me._formTitle || me.title || (wnd ? wnd.title : null) ||
            (placeholder ? placeholder.title : null)
  },

  addNewVersionToTitle: function () {
    var me = this

    me.on('afterrender', function () {
      me.setTitle(me._formTitle,
          UB.format('{0} ({1} {2})',
              me._formFullTitle || me._formTitle,
              UB.i18n('novajaVersija'),
              Ext.Date.format(me.__mip_ondate, 'd.m.Y')))
    }, me, {single: true})
  },

  /**
   * Set all editable form controls to `edit allowed` state
   */
  enableEdit: function () {
    var
      me = this,
      fields = me.fields,
      len = fields.length
    for (var i = 0; i < len; ++i) {
      if (fields[i].setReadOnly) {
        if (Ext.isDefined(fields[i].initialReadOnly) && !fields[i].initialReadOnly) {
          fields[i].setReadOnly(false)
        }
      }
    }
  },

  /**
   * Set all editable form controls to readOnly state
   */
  disableEdit: function () {
    var
      me = this,
      fields = me.fields,
      len = fields.length
    for (var i = 0; i < len; ++i) {
      if (fields[i].setReadOnly) {
        fields[i].setReadOnly(true)
      }
    }
  },
  getCanEdit: function () {
    var me = this
    return Ext.isDefined(me.isEditable) ? me.isEditable() : (!Ext.isDefined(me.canEdit) || me.canEdit)
  },

  /* ******************** Begin of method's block *********************
   * Below is a methods block is responsible for the behavior of the panel
   * if parent container is  different from  BaseWindow (preview, for example )
   */

  setupParentContainer: function () {
    var me = this
    if (me.isDetail) {
      me.target.ownerCt.mainEntityGridPanel.on('parentchange', me.onParentChange, me)
      me.mainEntityGridPanel = me.target.ownerCt.mainEntityGridPanel
      me.on('close', function () {
        var tabPanel = me.up('tabpanel')

        if (tabPanel && tabPanel.isMainTabPanel) return

        if (tabPanel && tabPanel.items.getCount() === 1) {
          tabPanel.relatedSplitter.hide()
          tabPanel.hide()
          tabPanel.ownerCt.doLayout()
        }
        tabPanel.mainPanel.mainEntityGridPanel.onDetailClose(me.entityName)
      }, me)
    }
  },

  onParentChange: function (parentID) {
    var me = this
    var reloadRecord

    reloadRecord = function () {
      if (me.oldParentID === me.newParentID) {
        return
      }
      me.refreshInProgress = true
      me.setInstanceID(me.newParentID)
      me.loadInstance()
    }
    if (me.reloadTimeoutID) {
      clearTimeout(me.reloadTimeoutID)
      me.reloadTimeoutID = null
    }
    me.newParentID = parentID
    me.oldParentID = me.instanceID
    me.isNewInstance = false
    me.reloadTimeoutID = setTimeout(reloadRecord, 700)
  },
    /* ******************************** end of method's block ************************/

  /**
   * @private
   */
  initFields: function () {
    var
      me = this,
      focusables = Ext.ComponentQuery.query(':focusable', me),
      fields = me.fields,
      len = fields.length,
      editable = me.getCanEdit(),
      first = null,
      i,
      cmp,
      idValue

    cmp = fields[0] // Поле по кторому идет связь с мастером, Должно быть первым полем в DFM-ке
    if (cmp && cmp.isMasterLink) {
      // Если для не формы определена функция isEditable(), то редактируемость наследуетсся с иастер-формы
      me.masterForm = me.getMasterForm(cmp)
      if (me.masterForm) {
        if (!Ext.isDefined(me.isEditable)) {
          editable = me.masterForm.getCanEdit()
        } else {
          editable = me.isEditable()
        }
      }
    }

    me.canEdit = editable

    for (i = 0; i < len; ++i) {
      cmp = fields[i]
      cmp.initialReadOnly = cmp.readOnly
      if (!editable) {
        if (cmp.setReadOnly) cmp.setReadOnly(true)
      }
      if (me.canFocus(cmp = fields[i]) && focusables.indexOf(cmp) !== -1 && !Ext.isDefined(cmp.checked)) {
        cmp.addListener('keydown', me.preventDefaultKeys, me)
        cmp.enableKeyEvents = true
      }
      if (!first) first = cmp

      if (cmp.minVal) {
        cmp.minValue = _.isFunction(cmp.minVal) ? cmp.minVal(me, cmp) : cmp.minVal
      }
      if (cmp.maxVal) {
        cmp.maxValue = _.isFunction(cmp.maxVal) ? cmp.maxVal(me, cmp) : cmp.maxVal
      }
      if (!me.isEditMode && editable) {
        if (Ext.isDefined(cmp.defaultValue)) {
          idValue = cmp.defaultValue
          me.setFieldValue(cmp, _.isFunction(idValue) ? idValue(me, cmp) : idValue)
        }
      }
    }
    me.firstControl = first
    cmp = me.down('tabpanel')
    if (cmp) {
      cmp.addListener('tabchange', me.onTabChange, me)
    }

    if (first && document.activeElement !== first.getEl()) { // check it for situation, when form doesn't have any enabled controls -> doesn't have 'first' control
      me.focusControl(first)
    }
    if (me.instanceID) {
      if (!UB.view.activeForm) {
        UB.view.activeForm = []
      }
      UB.view.activeForm[me.instanceID] = me
    }
    me.setupParentContainer()
  },

  getMasterForm: function (masterLinkFieldControl) {
    return UB.view.activeForm ? UB.view.activeForm[this.record.get(masterLinkFieldControl.attributeName)] : null
  },

  getEntityGridPanel: function (gridPanelOrContainer) {
    return (gridPanelOrContainer instanceof UB.view.EntityGridPanel)
      ? gridPanelOrContainer
      : gridPanelOrContainer.down('entitygridpanel')
  },

  setFieldValue: function (field, idValue) {
    if (Ext.isArray(field.fieldList)) {
      field.setValueById(idValue)
    } else {
      field.setValue(idValue)
      if (this.isEditMode) field.resetOriginalValue()
    }
  },

  makeGridReadonly: function (grid, isReadOnly) {
    var gridPanel, action

    if (!(gridPanel = this.getEntityGridPanel(grid))) return false

    action = gridPanel.actions[UB.view.EntityGridPanel.actionId.addNew]
    action.setDisabled(isReadOnly)
    action = gridPanel.actions[UB.view.EntityGridPanel.actionId.addNewByCurrent]
    action.setDisabled(isReadOnly)
    action = gridPanel.actions[UB.view.EntityGridPanel.actionId.del]
    action.setDisabled(isReadOnly)
    return true
  },

  makeGridEditable: function (grid, isEditable) {
    var gridPanel, action

    if (!(gridPanel = this.getEntityGridPanel(grid))) return false

    action = gridPanel.actions[UB.view.EntityGridPanel.actionId.edit]
    action.setDisabled(!isEditable)
    if (!isEditable) gridPanel.suspendEvent('itemdblclick')
    return true
  },

  getGrids: function () {
    var me = this,
      panelsCnt,
      tabPanels,
      result,
      i
    result = me.query('ubdetailgrid') || []
    tabPanels = me.query('tabpanel')
    if (tabPanels) {
      for (i = 0, panelsCnt = tabPanels.length; i < panelsCnt; ++i) {
        result.concat(tabPanels[i].query('ubdetailgrid'))
      }
    }
    return result
  },

  onControlFocused: function (ctrl) {
    var me = this
    if (!ctrl.enableKeyEvents) {
      ctrl.addListener('keydown', me.preventDefaultKeys, me)
      ctrl.enableKeyEvents = true
    }
  },

  canFocus: function (ctrl) {
    var result = (ctrl.xtype === 'gridview')
    result = result || (ctrl && (!ctrl.readOnly || !this.canEdit) && (ctrl.componentCls === 'x-field' || ctrl.isFocusableField) &&
            ctrl.container && !ctrl.ownerCt.gridOwner)
    if (result && !ctrl.myFocusHandlerActive && !Ext.isDefined(ctrl.checked) && !ctrl.ownerCt.gridOwner) {
      ctrl.addListener('focus', this.onControlFocused, this)
      ctrl.myFocusHandlerActive = true
    }
    return result
  },

  /**
   * Set focus on first control in list or first control in parent panel
   * @param parentOrArray
   * @returns {*}
   */
  focusFirst: function (parentOrArray) {
    var
      me = this,
      focusables,
      len,
      tabPanel,
      grid,
      i = -1
    if (!parentOrArray) return false

    focusables = Ext.isArray(parentOrArray) ? parentOrArray : Ext.ComponentQuery.query(':focusable', parentOrArray)

    len = focusables.length
    while (++i < len) {
      if (me.canFocus(focusables[i])) {
        me.focusControl(focusables[i])
        return focusables[i]
      }
    }
    if (len > 0) {
      tabPanel = focusables[0].up('tabpanel')
      if (tabPanel) {
        grid = tabPanel.getActiveTab().down('gridview')
        if (grid) {
          me.focusControl(grid, 500)
          return grid
        }
      }
    }
    return null
  },

  activateNextTab: function (tabPanel, goBack) {
    var aTab = tabPanel.getActiveTab(),
      tabs = tabPanel.items.items,
      tabIndex = tabs.indexOf(aTab) + (goBack ? -1 : 1)
    if (tabIndex === tabs.length) {
      tabIndex = 0
    } else if (tabIndex === -1) {
      tabIndex = tabs.length - 1
    }
    tabPanel.setActiveTab(tabIndex)
    return tabs[tabIndex]
  },

  /**
   *
   * @param tabPanel
   * @param newCard
   */
  onTabChange: function (tabPanel, newCard) {
    this.focusFirst(newCard)
  },

  collapseControl: function (ctrl) {
    if (ctrl && _.isFunction(ctrl.collapse)) {
      ctrl.collapse()
    }
  },

  frameControl: function (ctrl) {
    if (ctrl && ctrl.el) {
      ctrl.el.frame('#668AB8', 1, { duration: 500 })
    }
  },

  // Ctrl+BACKSPACE - clear field in case it not a readOnly
  // Ctrl+Q - если фокус на поле которое на форме - переход на панель закладок, если есть
  //         если фокус на контроле(или на гриде), который находится на панели закладок - переход на следующую закладку
  // Ctrl+Shift+Q - если фокус на поле которое на форме - переход на панель закладок, если есть
  //               если фокус на контроле(или на гриде), который находится на панели закладок - переход на первое поле формы
  // Alt+X          close form without confirmation

  preventDefaultKeys: function (ctrl, e) {
    var me = this,
      shift = e.shiftKey,
      first = null,
      last = null,
      cmp,
      focusables,
      key = e.getKey(),
      i = 0, len, incBy
    switch (key) {
      case Ext.EventObject.TAB : // 8: // TAB
        e.stopEvent()
        focusables = Ext.ComponentQuery.query(':focusable', this)
        len = focusables.length
        do {
          if (this.canFocus(cmp = focusables[i])) {
            if (!first) first = cmp
            last = cmp
          }
        } while (++i < len)
        if (ctrl === (shift ? first : last)) {
          if (ctrl.ownerCt.gridOwner) {
            cmp = ctrl.ownerCt.gridOwner.down('gridview')
            if (cmp) {
              me.focusControl(cmp, 500)
              break
            }
          }
          me.focusControl(shift ? last : first)
        } else {
          i = focusables.indexOf(ctrl) + (incBy = shift ? -1 : 1)
          while (i >= 0 && i < len) {
            if (this.canFocus(cmp = focusables[i])) {
              this.focusControl(cmp)
              break
            }
            i += incBy
          }
        }
        break
      case Ext.EventObject.DELETE : //
        if (ctrl.readOnly) {
          e.stopEvent()
        }
        break
      case Ext.EventObject.BACKSPACE : // 7: //BACKSPACE, если поле readOnly, работает как Back
        if (ctrl.readOnly) {
          e.stopEvent()
          break
        }
        if (e.ctrlKey) {
          e.stopEvent()
          if (_.isFunction(ctrl.clearValue)) {
            ctrl.clearValue()
          } else {
            ctrl.setValue('')
          }
        }
        break
      case Ext.EventObject.F5 : // 115: // F5, по ошибке нажмет и пререзагрузится страница
        e.stopEvent()
        break
      case Ext.EventObject.X : // 87: //X
        if (e.altKey) { // alt+X
          e.stopEvent()
          me.closeWindow(true)
        }
        break
      case Ext.EventObject.Q :
        if (e.ctrlKey) {
          e.stopEvent()
          me.switchTabs(ctrl, e.shiftKey)
        }
        break
      default : // do nothing
    }
  },

  switchTabs: function (ctrl, isShiftKey) {
    var tabPanel,
      me = this

    tabPanel = ctrl.up('tabpanel')
    if (isShiftKey && tabPanel) return
    if (!tabPanel) {
      if (!(tabPanel = me.down('tabpanel'))) {
        return
      }
      tabPanel.getActiveTab()
    } else {
      me.activateNextTab(tabPanel, false)
    }
  },

  focusControl: function (ctrl, timeout) {
    var focusEl, selectText = false, store
    if (ctrl && this.canFocus(ctrl) && _.isFunction(ctrl.focus)) {
      focusEl = ctrl.getFocusEl()
      selectText = focusEl && focusEl.dom && focusEl.dom.select
      if (timeout) {
        setTimeout(function () {
          ctrl.focus(selectText, false)
        }, timeout)
      } else {
        ctrl.focus(true, true)
      }
      if (ctrl.xtype === 'gridview') {
        ctrl.focus(selectText, false)
        var grid = ctrl.up('entitygridpanel')
        if (grid) {
          var selModel = grid.getSelectionModel()
          store = grid.getStore()
          if (selModel && selModel.getSelection().length < 1 && store && store.getCount() && !store.isDestroyed) {
            selModel.select(0, true)
          }
        }
      }
    }
  },

  /**
   * Disable or enable action and assigned hot key
   * @param {String} actionName
   * @param {Boolean} disabled true - disable false - enable
   */
  setActionDisabled: function (actionName, disabled) {
    var me = this,
      action = this.actions[actionName],
      km
    if (me.actionsKeyMap) {
      km = me.actionsKeyMap[actionName]
    }
    if (action) {
      action.setDisabled(disabled)
    }
    if (km) {
      km.setDisabled(disabled)
    }
  },

  /**
   *
   * @param {String} [command='onDirtychange']
   * @param  {Boolean} [commandPrm] optional
   */
  updateActions: function (command, commandPrm) {
    var me = this,
      aSave = this.actions[UB.view.BasePanel.actionId.save],
      aSaveAndClose = this.actions[UB.view.BasePanel.actionId.saveAndClose],
      aDelete = this.actions[UB.view.BasePanel.actionId.fDelete],
      aRefresh = this.actions[UB.view.BasePanel.actionId.refresh],
      kmSave, kmSaveAndClose, kmDelete, kmRefresh

    if (me.actionsKeyMap) {
      kmSave = me.actionsKeyMap[UB.view.BasePanel.actionId.save]
      kmSaveAndClose = me.actionsKeyMap[UB.view.BasePanel.actionId.saveAndClose]
      kmDelete = me.actionsKeyMap[UB.view.BasePanel.actionId.fDelete]
      kmRefresh = me.actionsKeyMap[UB.view.BasePanel.actionId.refresh]
    }

    function syncKeyMap (actionName, disabled) {
      switch (actionName) {
        case 'aSave':
          if (kmSave) kmSave.setDisabled(disabled)
          break
        case 'aSaveAndClose':
          if (kmSaveAndClose) kmSaveAndClose.setDisabled(disabled)
          break
        case 'aDelete':
          if (kmDelete) kmDelete.setDisabled(disabled)
          break
        case 'aRefresh':
          if (kmRefresh) kmRefresh.setDisabled(disabled)
          break
      }
    }

    if (!command) {
      command = 'onDirtychange'
      commandPrm = !me.isFormDirty()
    }

    switch (command) {
      case 'onDirtychange':
        if (aSave && !aSave.initialConfig.blocked) {
          aSave.setDisabled(commandPrm)
          syncKeyMap('aSave', commandPrm)
        }
        if (aSaveAndClose && !aSaveAndClose.initialConfig.blocked) {
          aSaveAndClose.setDisabled(commandPrm)
          syncKeyMap('aSaveAndClose', commandPrm)
        }
        break
      case 'init':
        if (!me.isEditMode) {
          aRefresh.setDisabled(true)
          aDelete.setDisabled(true)
          aSave.setDisabled(true)
          aSaveAndClose.setDisabled(true)
          syncKeyMap('aRefresh', true)
          syncKeyMap('aDelete', true)
          syncKeyMap('aSave', true)
          syncKeyMap('aSaveAndClose', true)
        } else {
          if (!aRefresh.initialConfig.blocked) {
            aRefresh.setDisabled(false)
            syncKeyMap('aRefresh', false)
          }
          if (!aDelete.initialConfig.blocked) {
            aDelete.setDisabled(false)
            syncKeyMap('aDelete', false)
          }
        }
        break
      case 'entityRequiredLock':
        aSave.setDisabled(commandPrm)
        aSaveAndClose.setDisabled(commandPrm)
        syncKeyMap('aSave', commandPrm)
        syncKeyMap('aSaveAndClose', commandPrm)
        break
      case 'onSave':
        aRefresh.show()
        aRefresh.setDisabled(false)
        syncKeyMap('aRefresh', false)

        if (!aDelete.initialConfig.blocked) {
          aDelete.setDisabled(false)
          syncKeyMap('aDelete', false)
        }
        if (!aSave.initialConfig.blocked) {
          aSave.setDisabled(false)
          syncKeyMap('aSave', false)
        }
        if (!aSaveAndClose.initialConfig.blocked) {
          aSaveAndClose.setDisabled(false)
          syncKeyMap('aSaveAndClose', false)
        }
        break
    }
  },

  /**
   * Return array of UBDetailGrid instances placed on the current form
   * @return {Ext.container.Container[]}
   */
  getDetails: function (items) {
    var
      result = [],
      item

    items = items || this.items

    for (var i = 0, len = items.length; i < len; ++i) {
      item = items.items[i]
      if (item instanceof UB.ux.UBDetailGrid || item.isDetail) {
        result.push(item)
      } else if (item.isContainer || item.isPanel) {
        result = result.concat(this.getDetails(item.items))
      }
    }

    return result
  },

  /**
   *
   * @param {Ext.data.Model} record
   * @param {Boolean} [isRefresh] default False
   */
  setDetails: function (record, isRefresh) {
    var
      details = this.details,
      i, len
    if (record) {
      for (i = 0, len = details.length; i < len; ++i) {
        if (isRefresh) {
          details[i].onRefreshDetail(record, this.entityName)
        } else {
          details[i].setValue(record, this.entityName)
        }
      }
    }
  },

  getLoadMask: function () {
    this.lm = this.lm || new Ext.LoadMask(this.getEl())
    return this.lm
  },

  /**
   * @param {Ext.Component} panel
   * @param {Object} eOpts
   */
  onAfterRender: function (panel, eOpts) {
    var
      wnd,
      me = this

    if (!me.formDataReady) {
      me.maskForm()
    }

    wnd = me.getFormWin() // me.up('window');
    if (wnd) {
      me.mon(wnd, 'beforeclose', me.beforeClose, me)
    }
    me.on({
      beforeclose: me.beforeClose,
      scope: me
    })
  },

  startLoadFormData: function () {
    var me = this
    if (me.entityName) {
      if (me.__mip_ondate) me.addNewVersionToTitle()

      if (!me.isEditMode && !me.addByCurrent) {
        me.initEmptyFormData()
      } else {
        me.initEditOrByCurrentFormData()
      }
    } else {
      // todo не понятено для каких целей.
      Ext.suspendLayouts()
      try {
        Ext.callback(me.initUBComponent, me)
      } finally {
        Ext.resumeLayouts(true)
      }
    }
  },

  /**
   * load inital data for new instance
   */
  initEmptyFormData: function () {
    var me = this,
      params,
      execParams

    me.addCreatingToTitle()
    params = {
      entity: me.entityName,
      alsNeed: me.hasEntityALS,
      fieldList: me.fieldList
    }

    if (me.parentContext) {
      execParams = me.parentContext
    }

    if (me.initValue) {
      execParams = execParams || {}
      Ext.applyIf(execParams, me.initValue)
    }

    if (Ext.Object.getSize(execParams)) {
      params.execParams = execParams
    }
    $App.connection.addNew(params).then(function (result) {
      me.initFormData(result)
    }).catch(function (err) {
      me.unmaskForm()
      UB.showErrorWindow(err)
      me.closeWindow(true)
    })
  },

  /**
   * @cfg {String} [selectMethod=select]
   * Name of method to select form data.
   */
  /**
   * @cfg {String} [insertMethod=insert]
   * Name of method to insert form data.
   */
  /**
   * @cfg {String} [updateMethod=update]
   * Name of method to update form data.
   */
  /**
   * @cfg {String} [deleteMethod=delete]
   * Name of method to delete form data.
   */
  formRequestConfig: function (type, cfg) {
    var me = this
    if (me.selectMethod && type === 'select') {
      cfg.method = me.selectMethod
    }
    if (me.insertMethod && cfg.method === 'insert' && type === 'save') {
      cfg.method = me.insertMethod
    }
    if (me.updateMethod && cfg.method === 'update' && type === 'save') {
      cfg.method = me.updateMethod
    }
    if (me.deleteMethod && type === 'delete') {
      cfg.method = me.deleteMethod
    }
    return cfg
  },

  /**
   * load data for exist instance
   */
  initEditOrByCurrentFormData: function () {
    var me = this,
      requests = []

    requests.push($App.connection.select(me.formRequestConfig('select', {
      entity: me.entityName,
      fieldList: me.fieldList,
      ID: me.instanceID,
      alsNeed: me.hasEntityALS
    })))

    if (me.isEntityLockable) {
      requests.push(
        $App.connection.query({
          method: 'isLocked',
          entity: me.entityName,
          ID: me.getInstanceID()
        })
      )
    }

    Promise.all(requests).done(function (res) {
      var result = res[0], lockInfo = res[1]

      if (me.isDestroyed) {
        return
      }
      if (result && result.resultData.data.length) {
        if (me.addByCurrent) {
          // create record based on grin selection
          me.addCreatingToTitle()
          $App.connection.addNew({
            entity: me.entityName,
            fieldList: me.fieldList,
            alsNeed: me.hasEntityALS,
            execParams: UB.core.UBCommand.resultDataRow2Object(result, 0,
              me.getFieldListWithoutAdtDocument(me.fieldList)
            )
          }).done(me.initFormData.bind(me))
        } else {
          me.disableBinder()
          UB.ux.data.UBStore.resultDataRow2Record(result, me.record)
          me.record.resultData = result.resultData
          me.record.resultAls = result.resultAls
          UB.ux.data.UBStore.resetRecord(me.record)
          if (me.isEntityLockable && lockInfo && lockInfo.lockInfo) {
            me.onGetLockInfo(lockInfo)
          }
          me.enableBinder()
          me.isNewInstance = false
          me.initFormData()
        }
        me.fireEvent('recordloaded', me.record, result)
      } else {
        me.closeWindow(true)
        $App.dialogError('recordNotExistsOrDontHaveRights')
      }
    })
  },

  /**
   * @private
   * set fields values for for the newly created form
   * @param {Object} [result]
   */
  initFormData: function (result) {
    let me = this
    let resultAls

    if (me.isDestroyed) return

    if (result) {
      resultAls = result.resultAls
      me.isNewInstance = result.method === UB.core.UBCommand.methodName.ADDNEW
      me.disableBinder()
      UB.ux.data.UBStore.resultDataRow2Record(result, me.record)
      me.instanceID = me.record.get('ID') || me.instanceID
      if (result.method === UB.core.UBCommand.methodName.ADDNEW) {
        let dateAttrs = _.filter($App.domainInfo.entities[result.entity].attributes, {dataType: 'Date'})
        dateAttrs.forEach(function (item) {
          if (me.record.get(item.name) && _.isDate(me.record.get(item.name))) {
            let date = me.record.get(item.name)
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
            me.record.set(item.name, date)
          }
        })
      }
      if (!me.isNewInstance) {
        UB.ux.data.UBStore.resetRecord(me.record)
      }
      me.enableBinder()
      me.fireEvent('recordloaded', me.record, result)
    }

    function doInit () {
      if (resultAls && me.record) {
        me.record.resultAls = resultAls
      }
      Ext.suspendLayouts()
      try {
        me.addInitialFieldValues()
        me.setFields(me.record)
        me.setDetails(me.record)
        me.initFields()

        me.updateActions()
      } finally {
        Ext.resumeLayouts(true)
      }
    }

    if (me.record && me.isEntityLockable && me.isNewInstance &&
       (me.domainEntity.mixins.softLock.lockIdentifier !== 'ID')
    ) {
      me.setEntityLocked()
        .done(function onSuccess () {
          doInit()
        }, function onError (error) {
          me.closeForce = true
          me.closeWindow(true)
          throw error
        })
    } else {
      doInit()
    }
  },

  bindHotKeys: function () {
    var
      me = this,
      wnd = me.getFormWin(),
      actions = UB.view.BasePanel.actionId,
      hotKeys = UB.view.BasePanel.hotKeys,
      target = wnd ? wnd.getEl() : me.getEl()

    me.actionsKeyMap = {}
    if (target) {
      me.actionsKeyMap[actions.saveAndClose] = new Ext.util.KeyMap({
        target: target,
        binding: [
          {
            key: hotKeys[actions.saveAndClose].key,
            ctrl: hotKeys[actions.saveAndClose].ctrl,
            shift: hotKeys[actions.saveAndClose].shift,
            // Ctrl+Enter
            fn: function () {
              me.onAction(me.actions[UB.view.BasePanel.actionId.saveAndClose].initialConfig)
            }
          }]})
      me.actionsKeyMap[actions.save] = new Ext.util.KeyMap({
        target: me.getEl(),
        binding: [{
          key: hotKeys[actions.save].key,
          ctrl: hotKeys[actions.save].ctrl,
          shift: hotKeys[actions.save].shift,
          fn: function (keyCode, e) {
            e.stopEvent()
            me.onAction(me.actions[UB.view.BasePanel.actionId.save].initialConfig) // .items[0]
          }
        }]})
      me.actionsKeyMap[actions.refresh] = new Ext.util.KeyMap({
        target: me.getEl(),
        binding: [{
          key: hotKeys[actions.refresh].key,
          ctrl: hotKeys[actions.refresh].ctrl,
          shift: hotKeys[actions.refresh].shift,
          fn: function (keyCode, e) {
            e.stopEvent()
            me.onRefresh()
          }
        }]})
      me.actionsKeyMap[actions.fDelete] = new Ext.util.KeyMap({
        target: me.getEl(),
        binding: [{
          key: hotKeys[actions.fDelete].key,
          ctrl: hotKeys[actions.fDelete].ctrl,
          shift: hotKeys[actions.fDelete].shift,
          fn: function (keyCode, e) {
            e.stopEvent()
            me.onAction(me.actions[UB.view.BasePanel.actionId.fDelete].initialConfig)
          }
        }]
      })

      if (me.hideActions && me.hideActions.length) {
        _.forEach(me.hideActions, function (actionName) {
          var actionKM = me.actionsKeyMap[actionName]
          if (actionKM) {
            actionKM.disable()
          }
        })
      }
      me.updateActions('init')
    }
  },

  addCreatingToTitle: function () {
    var me = this

    me.on('afterrender', function () {
      me.setTitle(me.getFormTitle() + UB.format(' ({0})', UB.i18n('dobavlenie')))
    }, me, {single: true})
  },

  /**
   * Set initial fieldValues for new instance entity
   */
  addInitialFieldValues: function () {
    var me = this
    if (!me.initialFieldValues || !me.isNewInstance) return

    Ext.Object.each(me.initialFieldValues, function (fieldName, fieldValue) {
      if (me.record.fields.containsKey(fieldName)) {
        me.record.set(fieldName, fieldValue)
      }
    }, me)
  },

  /**
   * @deprecated Use getField
   * @param {String} ubName
   * @return {Ext.Component}
   */
  getUBCmp: function (ubName) {
    return this.ubNameMap[ubName]
  },

  /**
   *
   * @param {string} attributeCode
   * @returns {Ext.Component}
   */
  getField: function (attributeCode) {
    var me = this
    return me.ubAttributeMap[attributeCode] || this.binder.getFields()[attributeCode]
  },

  initUBControlMap: function () {
    var
      me = this,
      ubAttributeName = UB.view.BasePanel.defaultUBName,
      formFields

    formFields = me.getForm().getFields().items
    /**
     * @property {Object.<string, control>} ubNameMap
     * Associative array of form fields.
     */
    me.ubNameMap = {}
    /**
     * @property {Object.<string, control>} ubAttributeMap
     * Associative array of form fields. Where key
     */
    me.ubAttributeMap = {}
    /**
     * @property {Ext.form.field.Field[]} fields
     * Array of form field controls.
     */
    me.fields = []

    _.forEach(formFields, function (field) {
      var ubName = field[ubAttributeName]
      if (field.attributeName) {
        me.ubAttributeMap[field.attributeName] = field
      }
      if (ubName && !field.oneWayBinding) {
        me.ubNameMap[ubName] = field
        me.fields.push(field)
      }
    })

    _.each(me.documents, function (val, name) {
      var cmp = me.ubNameMap[me.attrName(name)]
      if (cmp) {
        cmp.isUBDocumentCtrl = true
      }
    })
  },
  /**
   * @deptecated this method is deprecated use property this.binder.connectedFields
   * @return {Ext.Component[]}
   */
  getUBCmps: function () {
    return this.fields
  },

  /**
   * Checks that 'ubdocument' attribute is complex (has '.' in attributeName)
   * If attribute is complex - adds associating attribute to fieldList ('attributeNames' array)
   * For examample: for complex attribute 'recStageID.docID.document' it adds 'recStageID.docID' attribute to fieldList
   * @param {Array} componentList
   * @param {Array} attributeNames
   * @param {int} len length of 'componentList' array
   * @param {int} i index of current attr in 'componentList' array
   */
  addDocumentAttrForComplexUBDocumentAttr: function (componentList, attributeNames, len, i) {
    var fieldNameParts = componentList[i].attributeName.split('.')
    if (fieldNameParts.length > 1) { // check, that attr complex (has '.' in attributeName)
      var associationFieldName = componentList[i].attributeName.substring(0, componentList[i].attributeName.lastIndexOf('.'))
      // before the last '.'.
      // ex: recStageID.docID.document -> recStageID.docID
      var findFlag = false
      for (var k = 0; k < len; ++k) {
        if (componentList[k].attributeName === associationFieldName) {
          findFlag = true
          break
        }
      }
      if (!findFlag) {
        attributeNames.push(associationFieldName)
      }
    }
  },

  /**
   * @cfg {String[]} requiredFields
   * This fields will be applied to field list for form record.
   */

  /**
   * Fill form field values from record. For non-simple fields (i.e. combobox) fill
   * @param {Ext.data.Model} record
   */
  setFields: function (record) {
    var
      me = this,
      field,
      fields = me.fields

    if (!record) return
    if (!me.binder.record || (me.binder.record !== record)) {
      me.binder.setRecord(record)
    }

    if (me.isEntityLockable) {
      me.updateActions('entityRequiredLock', true)
    }

    me.formDataReady = false

    Ext.suspendLayouts() // suspend auto layout, because in cycle we use setFieldLabel, each of them start rebuilding layouts
    try {
      me.disableBinder()
      me.binder.bind(true)
      me.enableBinder()

      for (var i = 0, len = fields.length; i < len; ++i) {
        field = fields[i]
// add link between action and field, becase when we need to disable field
        // we need to disable action menu items
        if (field.xtype === 'ubdocument') {
          for (var j = 0; j < this.docActions.length; j++) {
            if (this.docActions[j].initialConfig.key === field.attributeName) {
              field.action = this.docActions[j]
              break
            }
          }
        }
        me.updateAls(field, field.attributeName)
      }
      me.fireEvent('updateFields', record)
    } finally {
      Ext.resumeLayouts(true)
    }
  },

  /**
   *
   * @param {Ext.form.field.Base} field
   * @param {String} attributeName
   */
  updateAls: function (field, attributeName) {
    var me = this, allowBlank, als, isLockedByAls, attrInfo
    als = me.record.resultAls ? (me.record.resultAls[attributeName] || '') : 'SUM'
    isLockedByAls = als.indexOf('U') === -1
    attrInfo = me.domainEntity.attr(attributeName)
    if (isLockedByAls && !field.readOnly && field.setReadOnly) { // isDisabled()
      field.setReadOnly(true)
      field.wasLockedByMixin = true
    } else if (!isLockedByAls && field.readOnly && field.setReadOnly && field.wasLockedByMixin) { // field.isDisabled()
      field.setReadOnly(false)
      field.wasLockedByMixin = false
    }
    if ((me.isNewInstance && !me.entityMethods.insert) || (!me.isNewInstance && !me.entityMethods.update)) {
      field.setReadOnly(true)
    }
    allowBlank = field.allowBlank
    if (me.record.resultAls && als) {
      allowBlank = als.indexOf('M') === -1
    }
    allowBlank = allowBlank && attrInfo.allowNull && !field.isRequired
    if (allowBlank !== field.allowBlank) {
      field.setAllowBlank(allowBlank)
    }
  },

  /**
   *
   * @param {Ext.data.Model} record
   * @param {String[]} fieldList
   * @param {Boolean} withoutAdtDocument (optional)
   * @return {Object}
   */
  getFieldValues: function (record, fieldList, withoutAdtDocument) {
    var
      result = {},
      ADT_DOC = UBDomain.ubDataTypes.Document

    for (var i = 0, len = fieldList.length; i < len; ++i) {
      if (withoutAdtDocument && this.domainEntity.attr(fieldList[i]).dataType === ADT_DOC) continue
      result[fieldList[i]] = record.get(fieldList[i])
    }
    return result
  },

  getFieldListWithoutAdtDocument: function (fieldList) {
    var
      result = [],
      ADT_DOC = UBDomain.ubDataTypes.Document

    for (var i = 0, len = fieldList.length; i < len; ++i) {
      if (this.domainEntity.attr(fieldList[i]).dataType === ADT_DOC) {
        continue
      }
      result.push(fieldList[i])
    }
    return result
  },

  addBaseActions: function () {
    var
      me = this,
      actions = UB.view.BasePanel.actionId,
      hotKeys = UB.view.BasePanel.hotKeys,
      events = UB.view.BasePanel.eventId,
      methodNames = UB.core.UBCommand.methodName,
      disabled

    var saveAndCloseAction = new Ext.Action({
        actionId: actions.saveAndClose,
        scale: 'medium',
        glyph: UB.core.UBUtil.glyphs.faShareSquare,
        text: UB.i18n('saveAndClose') + hotKeys[actions.saveAndClose].text,
        eventId: events.save,
        cls: 'save-and-close-action',
        handler: me.onAction,
        blocked: !me.domainEntity.haveAccessToAnyMethods([methodNames.INSERT, methodNames.UPDATE]),
        disabled: true,
        scope: me
      }),
      saveAction = new Ext.Action({
        actionId: actions.save,
        scale: 'medium',
        glyph: UB.core.UBUtil.glyphs.faFloppy,
        text: UB.i18n('sohranit') + hotKeys[actions.save].text,
        cls: 'save-action',
        eventId: events.save,
        handler: me.onAction,
        blocked: !me.domainEntity.haveAccessToAnyMethods([methodNames.INSERT, methodNames.UPDATE]),
        disabled: true,
        scope: me
      })

    if (me.switchSaveButtonsAction) {
      me.actions[actions.save] = saveAndCloseAction
      me.actions[actions.saveAndClose] = saveAction
    } else {
      me.actions[actions.save] = saveAction
      me.actions[actions.saveAndClose] = saveAndCloseAction
    }

    if (me.hasDataHistoryMixin) {
      me.actions[actions.history] = new Ext.Action({
        actionId: actions.history,
        iconCls: 'iconHistory',
        text: UB.i18n('istorijaIzmenenij'),
        eventId: events.history,
        handler: me.onAction,
        scope: me
      })
    }

    if (me.hasAuditMixin) {
      me.actions[actions.audit] = new Ext.Action({
        actionId: actions.audit,
        iconCls: 'iconAudit',
        text: UB.i18n('showAudit'),
        eventId: events.audit,
        handler: me.onAction,
        disabled: !$App.domainInfo.isEntityMethodsAccessible('uba_auditTrail', 'select'),
        scope: me
      })
    }

    if (me.hasHardSecurityMixin) {
      var aclEntityName = me.entityName + '_acl'
      var entityM = me.domainEntity
      if (entityM.mixins && entityM.mixins.aclRls && entityM.mixins.aclRls.useUnityName) {
        aclEntityName = entityM.mixins.unity.entity + '_acl'
      }

      me.actions[actions.accessRight] = new Ext.Action({
        actionId: actions.accessRight,
        text: UB.i18n('accessRight'),
        eventId: events.accessRight,
        handler: me.onAction,
        disabled: !$App.domainInfo.isEntityMethodsAccessible(aclEntityName, 'select'),
        scope: me
      })
    }

    me.actions[actions.refresh] = new Ext.Action({
      actionId: actions.refresh,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faRefresh,
      text: UB.i18n('obnovit') + hotKeys[actions.refresh].text,
      cls: 'refresh-action',
      eventId: events.refresh,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.lock] = new Ext.Action({
      actionId: actions.lock,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faLock,
      text: UB.i18n('lockBtn'),
      hidden: !me.isEntityLockable || me.isNewInstance,
      eventId: events.lock,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.unLock] = new Ext.Action({
      actionId: actions.unLock,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faUnLock,
      hidden: !me.isEntityLockable || me.isNewInstance,
      text: UB.i18n('unLockBtn'),
      eventId: events.unLock,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.fDelete] = new Ext.Action({
      actionId: actions.fDelete,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faTrashO,
      text: UB.i18n('Delete') + hotKeys[actions.fDelete].text,
      cls: 'delete-action',
      eventId: events.fDelete,
      handler: me.onAction,
      blocked: disabled = !me.domainEntity.haveAccessToMethod(methodNames.DELETE),
      disabled: disabled || me.isNewInstance,
      scope: me
    })

    if ($App.domainInfo.isEntityMethodsAccessible('ubm_form', methodNames.UPDATE)) {
      me.actions[actions.formConstructor] = new Ext.Action({
        actionId: actions.formConstructor,
        scale: 'medium',
        glyph: UB.core.UBUtil.glyphs.faWrench,
        text: UB.i18n('formConstructor'),
        eventId: events.formConstructor,
        handler: me.onAction,
        scope: me
      })
    }

    me.createDocActions()
  },

  /**
   * Handler for file drop. Called by UB.view.UBDropZone
   * @param {String} attributeName
   * @param {Event} e
   */
  onFileDragDrop: function (attributeName, e) {
    var me = this,
      ctrl = me.getField(attributeName), // me.getUBCmp(UB.core.UBCommand.getUBCmpUBName(attributeName))
      file,
      id = me.getInstanceID(),
      waitBox, progressStarted = false, waiterStarted = false, waitProgress = 0, waitIntervalID
    e.preventDefault()
    if (e.dataTransfer.files.length === 1) {
      file = e.dataTransfer.files[0]
    } else {
      $App.dialogError('dropZoneOneFileRequired')
      return
    }
    ctrl.fireEvent('change')
    waitBox = Ext.MessageBox.progress(UB.i18n('loadingData'), '')

    var doOnProgress = function (progress) {
      // We get notified of the upload's progress
      if (progress.loaded < progress.total) {
        if (progressStarted) {
          waitBox.updateProgress(progress.loaded / progress.total, UB.i18n('loadingData'))
        } else {
          progressStarted = (progress.loaded / progress.total < 0.3) // if in first progress event loaded more then 30% do not show progress at all
        }
      } else {
        if (!waiterStarted) {
          waiterStarted = true
          waitBox.updateProgress(0, UB.i18n('Transformation'))
          waitIntervalID = setInterval(function () {
            waitProgress = (waitProgress >= 1) ? 0 : waitProgress + 0.1
            waitBox.updateProgress(waitProgress, UB.i18n('Transformation'))
          }, 1000)
        }
      }
    }
    $App.connection.post('setDocument', file, {
      params: {
        entity: me.entityName,
        attribute: attributeName,
        id: id,
        origName: file.name,
        filename: file.name
      },
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      onProgress: doOnProgress
    }).fin(function () {
      clearInterval(waitIntervalID)
      waitBox.close()
    }).done(function (serverResponse) {
      ctrl.setValue(serverResponse.data.result, id)
      $App.dialogInfo('dropZoneOperationComplete')
    })
  },

  /**
   * {@link UB.view.UBDropZone#configureDropZone} event handler.
   * Add Drop configuration for all form Document type attributes.
   * Ignore attributes which corresponding component is disabled
   *
   * @param {Array} config
   */
  onFileDragDropConfigure: function (config) {
    var me = this
    if (me.isVisible()) {
      _.forEach(me.documents, function (attrConfig, attrName) {
        var ctrl = me.getField(attrName),
          docValue

        if (ctrl && !ctrl.isDisabled() && !ctrl.readOnly) {
          docValue = ctrl.getValue()
          config.push({
            message: UB.i18n(docValue ? 'dropZoneReplace' : 'dropZoneAdd') + ' ' + attrConfig.caption,
            dropHandler: me.onFileDragDrop.bind(me, attrName) // bind attribute name as 1th parameter and me as this
          })
        }
      })
    }
  },

  createDocActions: function () {
    var
      me = this,
      actions = UB.view.BasePanel.actionId,
      events = UB.view.BasePanel.eventId,
      docActions = []

    me.docActions = docActions
    if (me.documentsCount === 0) {
      return
    }

    if (UB.view.UBDropZone) {
      UB.view.UBDropZone.on('configureDropZone', me.onFileDragDropConfigure, me)
    }

    Ext.Object.each(me.documents, function (key, doc) {
      docActions.push(new Ext.Action({
        text: doc.caption,
        iconCls: 'iconDocument',
        key: key,
        menu: [{
          actionId: actions.scan + '_' + key,
                    // disabled: UB.npDesktopServicePluginDownloadMessage(),
          iconCls: 'iconScanner',
          text: UB.i18n('skanirovat'),
          eventId: events.scan,
          handler: me.onAction,
          attribute: key,
          scope: me
        }, {
          actionId: actions.attach + '_' + key,
          iconCls: 'iconAttach', // 'fa fa-folder-open',
          text: UB.i18n('izFayla'), // '<i class="fa fa-folder-open"></i>&nbsp' +
          eventId: events.attach,
          handler: me.onAction,
          attribute: key,
          scope: me
        }, {
          actionId: actions.deleteAttachment + '_' + key,
          iconCls: 'iconClear',
          text: UB.i18n('ochistit'),
          eventId: events.deleteattachment,
          handler: me.onAction,
          attribute: key,
          scope: me
        }, {
          xtype: 'menucheckitem',
          actionId: actions.showOriginal + '_' + key,
          eventId: events.showOriginal,
          iconCls: 'icon-list',
          text: UB.i18n('original'),
          handler: me.onAction,
          attribute: key,
          scope: me
        }, {
          actionId: actions.showVersions + '_' + key,
          iconCls: 'iconVersions',
          text: UB.i18n('showDocVersions'),
          eventId: events.showVersions,
          handler: me.onAction,
          attribute: key,
          scope: me
        }, {
          actionId: actions.downloadAttach + '_' + key,
          scale: 'medium',
          glyph: UB.core.UBUtil.glyphs.faDownload,
          text: UB.i18n('downloadAttach'),
          eventId: events.downloadAttach,
          handler: me.onAction,
          attribute: key,
          scope: me
        }]
      }))
    })
  },

  addBaseDockedItems: function () {
    var
      me = this,
      actions = UB.view.BasePanel.actionId,
      menuAllActions = [
        me.actions[actions.refresh],
        me.actions[actions.save],
        me.actions[actions.saveAndClose],
        me.actions[actions.fDelete],
        '-',
        me.createMenuItemLink()
      ],

      toolbarActions = [
        me.createButtonWOText(me.actions[actions.refresh]),
        me.createButtonWOText(me.actions[actions.saveAndClose]),
        me.createButtonWOText(me.actions[actions.save]),
        me.createButtonWOText(me.actions[actions.fDelete]),
        '->',
        {
          menuId: 'AllActions',
          scale: 'medium',
          glyph: UB.core.UBUtil.glyphs.faCog,
          arrowCls: '', // remove dropdown arrow
          tooltip: UB.i18n('vseDeystviya'),
          menu: menuAllActions
        }]

    if (me.actions[actions.formConstructor]) {
      menuAllActions.splice(3, 0, me.actions[actions.formConstructor])
    }

    if (me.hasDataHistoryMixin) {
      menuAllActions.push('-')
      menuAllActions.push(me.actions[actions.history])
    }

    if (me.hasAuditMixin) {
      menuAllActions.push('-')
      menuAllActions.push(me.actions[actions.audit])
    }

    if (me.hasHardSecurityMixin) {
      menuAllActions.push('-')
      menuAllActions.push(me.actions[actions.accessRight])
    }

    if (me.isEntityLockable) {
      menuAllActions.push('-')
      menuAllActions.push(me.actions[actions.lock])
      menuAllActions.push(me.actions[actions.unLock])
    }

    if (me.documentsCount > 0) {
      menuAllActions.push('-')
      Ext.Array.insert(menuAllActions, menuAllActions.length, me.docActions)
      Ext.Array.insert(toolbarActions, 2, ['-'].concat(me.docActions))
    }

    me.dockedItems = [{
      xtype: 'toolbar',
      dock: 'top',
      items: toolbarActions,
      ubID: 'mainToolbar',
      enableOverflow: true
    }]
  },

  /**
   * Create fieldList for future server request.
   * Add all component attribute names + ID and (optionaly) mi_modifyDate
   * @return {String[]}
   */
  getFieldList: function () {
    var
      me = this,
      attributeNames = [],
      requiredFields, fields

    fields = me.baseFieldList.map(function (field) {
      if (typeof (field) === 'string') {
        return field
      } else {
        return field.attributeName
      }
    })
    fields = _.uniq(fields)
    attributeNames = UB.ux.data.UBStore.normalizeFieldList(this.entityName, fields || [])
    if (me.parentContext) {
      _.forEach(me.parentContext, function (value, name) {
        if (attributeNames.indexOf(name) < 0) {
          attributeNames.push(name)
        }
      })
    }
    requiredFields = me.dfm && me.dfm.requiredFields ? me.dfm.requiredFields : me.requiredFields

    if (requiredFields) {
      _.forEach(requiredFields, function (name) {
        if (attributeNames.indexOf(name) < 0) {
          attributeNames.push(name)
        }
      })
    }

    if (me.isEntityLockable && me.domainEntity.mixins.softLock.lockIdentifier !== 'ID') {
      var baseProperty = me.domainEntity.mixins.softLock.lockIdentifier.split('.')
      if (baseProperty.length > 0) {
        baseProperty = baseProperty[0]
      } else {
        baseProperty = null
      }
      if (baseProperty && attributeNames.indexOf(baseProperty) < 0) {
        attributeNames.push(baseProperty)
        UB.logError('Attribute', baseProperty, 'implicitly added to form fieldlist (it present in softLock.lockIdentifier)')
      }
    }

    return attributeNames
  },

  /**
   * @param {Array} items
   * @param {Boolean} isMainForm
   */
  prepareDfmItems: function (items, isMainForm) {
    var me = this,
      entity = me.domainEntity,
      ubCommand = UB.core.UBCommand,
      item, currentIsMainForm = false

    function isForm (xtype) {
      var comp,
        isFormResult = false,
        cName = Ext.ClassManager.getNameByAlias('widget.' + xtype)
      if (cName) {
        comp = Ext.ClassManager.get(cName)
      }
      if (comp && comp.prototype) {
        comp = comp.prototype
        _.forEachRight(comp.xtypesChain, function (item) {
          if (item === 'form') {
            isFormResult = true
            return false
          }
        })
      }
      return isFormResult
    }

    if (!Ext.isArray(items)) {
      return
    }

    for (var i = 0, len = items.length; i < len; ++i) {
      item = items[i]
      if (isMainForm) {
        currentIsMainForm = !isForm(item.xtype)
      }
      if (Ext.isString(item.attributeName)) {
        // here we check, that attribute exists in entity. works only for simple attributes
        if (entity.attr(item.attributeName)) {
          me.baseFieldList.push(item.isMultilang ? { isMultilang: true, attributeName: item.attributeName } : item.attributeName)
          Ext.applyIf(item, Ext.applyIf(UB.core.UBUtil.attribute2cmpConfig(entity, item), { ubName: ubCommand.getUBCmpUBName(item.attributeName) }))
        }
        // here we check, that complex attribute exists in entity
        // and all attributes in attributeNameParts (attributeName.split('.')) are also exist in their's entities
        // (ex: toDocumentID.caption)
        else if (entity.attr(item.attributeName)) {
          me.baseFieldList.push(item.isMultilang ? { isMultilang: true, attributeName: item.attributeName } : item.attributeName)
          var cmpConfig = UB.core.UBUtil.attribute2cmpConfig(entity, item)
          Ext.applyIf(item, Ext.applyIf(cmpConfig, {ubName: ubCommand.getUBCmpUBName(item.attributeName)}))
        } else {
          Ext.apply(item, {
            xtype: 'label',
            text: '!' + item.attributeName,
            style: {
              color: 'white',
              backgroundColor: 'red'
            }
          })
        }
      }

      if (Ext.isArray(item.items)) {
        this.prepareDfmItems(item.items, currentIsMainForm)
      } else if (Ext.isObject(item.items)) { // Ext allow to for 1 element pass a items: {attributeName: 'caption'}
        this.prepareDfmItems([item.items], currentIsMainForm)
      }
    }
  },

  addItems: function () {
    var me = this

    me.items = me.items || []

    if (!me.dfm) {
      return
    }

    if (Ext.isString(me.dfm)) {
      me.dfm = Ext.decode(me.dfm)
    } else {
      me.dfm = _.cloneDeep(me.dfm)
    }
    me.baseFieldList = []
    me.prepareDfmItems(me.dfm.items, true)

    if (me.dfm && me.dfm.items) {
      me.items = me.items.concat(me.dfm.items)
    }

    _.forEach(me.items, function (item) {
      item.oldHideMode = item.hideMode
      item.oldHidden = item.hidden
      item.hideMode = 'visibility'
      item.hidden = true
    })
  },

  callBase: function (args) {
    return this.callBase.caller.$previous.apply(this, arguments)
  },

  addBaseListeners: function () {
    var
      me = this,
      events = UB.view.BasePanel.eventId
    me.on('afterrender', me.onAfterRender, me)
    me.on('boxready', function () {
      this.bindHotKeys()
    }, me)
    me.on(events.save, function () {
      // fire event for manually saving form
      me.fireEvent('manualsaving', me, arguments)
      me.onSave.apply(me, arguments)
    }, me)
    me.on(events.refresh, me.onRefresh, me)
    me.on(events.fDelete, me.onDelete, me)
    me.on(events.history, me.onHistory, me)
    me.on(events.lock, me.onLock, me)
    me.on(events.unLock, me.onUnLock, me)

    if (me.actions.formConstructor) {
      me.on(events.formConstructor, me.onConstructor, me)
    }

    if (me.instanceID && me.entityDetails.length) {
      me.on(events.showdetail, me.onShowDetail, me)
    }

    if (me.documentsCount > 0) {
      me.on(events.scan, me.onScan, me)
      me.on(events.attach, me.onAttach, me)
      me.on(events.deleteattachment, me.onDeleteAttachment, me)
      me.on(events.showOriginal, me.onShowOriginal, me)
      me.on(events.showVersions, me.onshowVersions, me)
      me.on(events.downloadAttach, me.ondownloadAttach, me)
    }

    if (me.hideActions && me.hideActions.length) {
      _.forEach(me.hideActions, function (actionName) {
        var action = me.actions[actionName]
        if (!action && actionName.substr(0, 9) === 'docAction') {
          _.forEach(me.docActions, function (act) {
            if (act.initialConfig && act.initialConfig.key) {
              if (actionName === ('docAction' + act.initialConfig.key)) {
                action = act
                return false
              }
            }
          })
        }
        if (action) {
          action.initialConfig.blocked = true
          action.disable()
          action.hide()
        }
      })
    }
    if (me.hasAuditMixin) {
      me.on(events.audit, me.onAudit, me)
    }

    if (me.hasHardSecurityMixin) {
      me.on(events.accessRight, me.onAccessRight, me)
    }
  },

  onConstructor: function () {
    var me = this,
      formEntity = $App.domainInfo.get('ubm_form')

    if (!formEntity.haveAccessToMethod('update')) {
      return
    }
    if (!me.formCode) {
      throw new UB.UBError('isAutoGeneratedForm')
    }

    UB.Repository('ubm_form').attrs(['ID', 'code'])
    .where('code', '=', me.formCode).select()
    .done(function (result) {
      var wnd = me.up('window'),
        modal = wnd ? wnd.modal : false
      if (!result || result.length < 1) {
        throw new UB.UBError('formNotFound')
      }
      var config = {
        cmdType: 'showForm',
        description: '',
        entity: 'ubm_form',
        instanceID: result[0].ID,
        isModal: modal,
        isModalDialog: modal,
        sender: me
      }

      if (!config.isModal) {
        config.target = UB.core.UBApp.getViewport().getCenterPanel()
        config.tabId = 'ubm_form' + result[0].ID
      }

      $App.doCommand(config)
    })
  },

  onShowOriginal: function (action) {
    var ctrl = this.getField(action.attribute)
    if (action && action.checked) {
      ctrl._forceMIME = ctrl.forceMIME
      ctrl.setMIME(ctrl.originalMIME)
    } else {
      ctrl.setMIME(ctrl._forceMIME || ctrl.originalMIME)
    }
  },

  onshowVersions: function (action) {
    if (this.record.get(action.attribute)) {
      var docVer = Ext.create('UB.view.DocumentVersions', {
        docRecord: this.record,
        docAttribute: action.attribute,
        instanceID: this.getInstanceID(),
        docContainerBase: this.getField(action.attribute)
      })
      docVer.show()
    } else {
      throw new UB.UBError('emptyContent')
    }
  },

  ondownloadAttach: function (action) {
    var me = this, docSrc, params, url
    docSrc = me.record.get(action.attribute)
    if (docSrc) {
      docSrc = JSON.parse(docSrc)
      params = {
        entity: me.entityName,
        attribute: action.attribute,
        ID: me.getInstanceID()
      }
      if (docSrc.store) {
        params.store = docSrc.store
      }
      if (docSrc.filename) {
        params.filename = docSrc.filename
      }
      if (docSrc.origName) {
        params.origName = docSrc.origName
      }
      if (docSrc.isDirty === true || docSrc.isDirty === false) {
        params.isDirty = docSrc.isDirty
      }

      url = Ext.String.urlAppend(
          $App.connection.baseURL + 'getDocument',
          Ext.Object.toQueryString(params)
      )

      $App.connection.get(url, {responseType: 'arraybuffer'})
      .then(function (response) {
        var blobData,
          byteArray = response.data
        blobData = new Blob(
              [byteArray],
              {type: docSrc.ct}
          )
        saveAs(blobData, docSrc.origName || docSrc.filename || me.getInstanceID() + '_' + docSrc.ct)
      }).catch(function (reason) {
        if (reason.status === 404) {
          throw new UB.UBError(UB.i18n('documentNotFound'))
        }
      })
    } else {
      throw new UB.UBError('emptyContent')
    }
  },

  onDelete: function () {
    var me = this, deletePromise = [], request
    me.lockInterface()
    try {
      me.fireEvent('beforeDelete', deletePromise)
    } catch (err) {
      me.unmaskForm()
      throw err
    }
    Promise.all(deletePromise).then(function () {
      return $App.dialogYesNo('deletionDialogConfirmCaption', UB.format(UB.i18n('deleteFormConfirmCaption'), me.getFormTitle()))
    }).then(function (res) {
      if (!res) { return }
      me.maskForm(2000)

      request = me.formRequestConfig('delete', {
        entity: me.entityName,
        method: 'delete',
        execParams: {
          ID: me.instanceID
        }
      })
      return $App.connection.doDelete(request).then(function (responce) {
        if (me.store && !me.store.isDestroyed) {
          var record = me.store.findRecord('ID', me.instanceID)
          if (record) {
            me.store.remove(record)
          }
        }
        if (me.store && me.store.fireModifyEvent) {
          me.store.fireModifyEvent(request, responce)
        }

        me.isDeleted = true
        me.fireEvent('afterdelete')
                /**
                * todo remove this call
                */
        Ext.callback(me.eventHandler, me, [me, 'afterdelete'])
      }).fin(function () {
        me.unmaskForm()
      }).then(function () {
        me.closeWindow(true)
      })
    }).fin(function () {
      me.unmaskForm()
    })
  },

  onRefresh: function () {
    var me = this, promise
    promise = me.isFormDirty() ? $App.dialogYesNo('areYouSure', 'formWasChanged') : Q.resolve(true)
    promise.done(function (res) {
      if (res) {
        me.fireEvent('beforeRefresh', me)
        let details = me.details
        if (details && details.length) {
          details.forEach((detail) => {
            if (detail.rowEditing && detail.editingPlugin.editing) {
              detail.editingPlugin.cancelEdit()
            }
          })
        }
        me.deleteLock().then(function () {
          me.loadInstance()
        })
      }
    })
  },

  /**
   * user press button lock
   */
  onLock: function () {
    if (!this.hasPersistLock) {
      this.addPersistLock()
    }
  },

  onUnLock: function () {
    if (this.hasPersistLock) {
      this.removePersistLock()
    }
  },

  onShowDetail: function (action) {
    $App.runLink({
      cmdData: UB.core.UBCommand.getCommandByEntityAndType(action.entityName, UB.core.UBCommand.commandType.showList),
      parent: action.attribute, // TODO - detailAttribute ?
      parentid: this.getInstanceID()
    })
  },

  loadInstance: function () {
    var me = this, request

    request = [$App.connection.select(me.formRequestConfig('select', {
      entity: me.entityName,
      fieldList: me.fieldList,
      ID: me.instanceID,
      alsNeed: me.hasEntityALS
    }))]

    if (me.isEntityLockable) {
      request.push($App.connection.query({
        method: 'isLocked',
        entity: me.entityName,
        ID: me.getInstanceID()
      }))
    }

    me.formDataReady = false
    Promise.all(request).done(function (res) {
      var result = res[0],
        lockInfo = res[1]
      me.disableBinder()
      UB.ux.data.UBStore.resultDataRow2Record(result, me.record)
      me.record.resultData = result.resultData
      me.record.resultAls = result.resultAls
      UB.ux.data.UBStore.resetRecord(me.record)
      if (me.isEntityLockable && lockInfo && lockInfo.lockInfo) {
        me.onGetLockInfo(lockInfo)
      }
      me.enableBinder()

      me.setFields(me.record)
      me.setDetails(me.record, true)
      me.fireDirty = false
      me.updateActions()
      me.fireEvent('recordloaded', me.record, result)
    })
  },

  /**
   *
   * @param {Ext.Action} action
   */
  onSave: function (action) {
    let me = this
    if (action && action.length) {
      // some form use basepanel.callBase(array)
      // throw new Error('Invalid parameters. You must call onSave with on parameter Ext.Action!');
      action = action[0]
    }

    let close = (action && action.actionId === UB.view.BasePanel.actionId.saveAndClose) || false
    me.lockInterface()
    me.saveForm().fin(function () {
      me.unmaskForm()
    }).then(function (saveStatus) {
      if (close && (saveStatus >= 0)) {
        me.closeWindow(true)
      }
    })
  },

  /**
   * Save form data to server WITH form validation. Return promise, resolved to:
   *
   *   - -1 in case of invalid form state
   *   -  0 in case no changes detected
   *   -  1 if successfully saved
   *
   *   To save data without form validation use {@link UB.view.BasePanel#saveInstance}
   *
   * @returns {Promise}
   */
  saveForm: function () {
    var
      me = this,
      form = me.getForm(),
      promise, functionList = []

    me.fireEvent('beforeSaveForm', functionList)
    functionList.sort(function (a, b) {
      return (a[0] - b[0])
    })
    promise = Q.resolve(true)
    _.forEach(functionList, function (item) {
      promise = promise.then(function () {
        return item[1]()
      })
    })

    // promise : Promise, orderNumber: Number
    return promise.then(function (res) {
      if (res === -1 || res === 0) {
        return res
      }
      if (!form.isValid()) {
        form.getFields().each(function (item) {
          if (!item.isValid()) {
            UB.toast({
              entityTitle: me.domainEntity.caption,
              fieldLabel: item.fieldLabel,
              callback: function () {
                if (me) {
                  let wnd = me.getFormWin()
                  if (wnd) wnd.toFront()
                  Ext.callback(item.focus, item, [], 100)
                }
              }
            })
            item.focus()
          }
        }, me)
        return Q.resolve(-1)
      }
      if (!form.isValid()) {
        return Q.resolve(-1)
      }
      /**
       * @deprecated  Use event beforeSaveForm instead
       * @cfg {Callback} onBeforeSave
       * Called before save form. To cancel save form return false.
       */
      if (_.isFunction(me.onBeforeSave)) {
        return Q.resolve(me.onBeforeSave())
          .then(function (onBeforeSaveResult) {
            if (onBeforeSaveResult !== false) {
              return me.saveInstance()
            }
            return Q.resolve(-1)
          })
      } else {
        return me.saveInstance()
      }
    })
  },

  /**
   * Return control attribute name by entity attribute code
   * @param code
   * @returns {string}
   */
  attrName: function (code) {
    return 'attr' + Ext.String.capitalize(code)
  },

  /**
   * Save form data to server WITHOUT form validation. Return promise, resolved to 0 in case no changes detected or 1 if successfully saved
   * @param {Boolean} [force]
   * @returns {Promise}
   */
  saveInstance: function (force) {
    var
      me = this,
      editedDocuments = [], existsDocs = [],
      values,
      params

    // Check attributes of 'document' type.
    // We must save content of such attributes before update main record
    _.forEach(me.documents, function (documentAttribute, attributeCode) {
      var cmp = me.getField(attributeCode) // ubNameMap[me.attrName(attributeCode)];
      if (cmp && cmp.isEditor() && cmp.isContentDirty() && !me.__mip_ondate) {
        editedDocuments.push(cmp)
      }
      if (me.__mip_ondate) {
        if (me.record.get(attributeCode)) {
          existsDocs.push(attributeCode)
        }
        me.record.set(attributeCode, null)
      }
    })

    if ((editedDocuments.length === 0) && !me.isFormDirty() && !me.__mip_ondate && !force) {
      return Q.resolve(0)
    }
    me.maskForm(UB.appConfig.formSaveMaskDelay)

    // save form documents
    return Q.all(editedDocuments.map(function (cmp) {
      return cmp.save(!!me.__mip_ondate)
    })).then(function () {
      // add document type attributes
      me.binder.suspendAutoBind()
      me.disableBinder()
      _.forEach(me.documents, function (docAttribute, attributeCode) {
        let cmp = me.getField(attributeCode) // me.getUBCmp(me.attrName(attributeCode));
        if (cmp && cmp.isDirty()) {
          let fVal = cmp.getValue()
          me.record.set(attributeCode, fVal)
        }
      })
      me.enableBinder()
      me.binder.releaseAutoBind()
      values = me.record.getChanges()

      // remove complex attributes like `countryID.name`
      if (me.postOnlySimpleAttributes) {
        let attrs = Object.keys(values)
        attrs.forEach((attrName) => {
          if (attrName.indexOf('.') !== -1) {
            delete values[attrName]
          }
        })
      }

      // fill necessary values
      if (typeof values.ID === 'undefined') {
        values.ID = me.instanceID ? me.instanceID : me.record.get('ID')
      }

      if (me.record.get('mi_modifyDate')) {
        values.mi_modifyDate = me.record.get('mi_modifyDate')
      }

      let langFields = []
      if (me.extendedDataForSave) {
        _.forEach(me.extendedDataForSave, function (value, property) {
          var matchRes = property.match(/(\w+)_\w\w\^/)
          if (matchRes && matchRes.length > 1) {
            if (langFields.indexOf(matchRes[1]) < 0) {
              langFields.push(matchRes[1])
            }
          }
        })
        _.forEach(langFields, function (langField) {
          if (values && values.hasOwnProperty(langField)) {
            values[langField + '_' + $App.connection.userLang() + '^'] = values[langField]
            delete values[langField]
          }
        })
        _.defaults(values, me.extendedDataForSave)
      }

      params = {
        fieldList: me.fieldList,
        entity: me.entityName,
        method: me.__mip_ondate && !me.addByCurrent ? 'newversion' : (me.isEditMode ? 'update' : 'insert'),
        alsNeed: me.hasEntityALS,
        execParams: values
      }
      params.__mip_ondate = me.__mip_ondate
      params = me.formRequestConfig('save', params)
      me.fireEvent('beforesave', me, params)

      return $App.connection.update(params)
        .then(function (result) {
          return me.deleteLock().then(function () {
            if (me.isEntityLockable) {
              return $App.connection.query({
                method: 'isLocked',
                entity: me.entityName,
                ID: me.getInstanceID()
              }).then(function (isLockedRes) {
                return [result, isLockedRes]
              })
            } else {
              return [result]
            }
          })
        }).then(function (res) {
          var result = res[0],
            lockInfo = res[1],
            updateDocument = !!me.__mip_ondate
          if (me.store && me.store.fireModifyEvent) {
            me.store.fireModifyEvent(params, res)
          }
          delete me.extendedDataForSave
          me.isNewInstance = result.method === 'addnew'
          me.isEditMode = true
          delete me.__mip_ondate
          me.updateActions('onSave')
          me.disableBinder()
          UB.ux.data.UBStore.resultDataRow2Record(result, me.record)
          UB.ux.data.UBStore.resetRecord(me.record)
          me.setInstanceID(me.record.get('ID'))

          me.enableBinder()
          me.record.resultLock = result.resultLock
          me.record.resultAls = result.resultAls

          me.setFields(me.record)

          if (me.store && !me.store.isDestroyed) {
            me.store.clearCache() // TODO - do anything below inside done
          }
          me.updateStoreRecord(result)

          if (me.isEntityLockable && lockInfo && lockInfo.lockInfo) {
            me.onGetLockInfo(lockInfo)
          }

          var wnd = me.getFormWin()
          if (wnd) delete wnd.newInstance
          me.formWasSaved = true
          me.fireEvent('aftersave', me, result)

          /* todo remove this call */
          Ext.callback(me.eventHandler, me, [me, 'aftersave'])
          Ext.callback(me.onAfterSave, me)

          me.fireDirty = false
          me.updateActions()

          if (updateDocument && existsDocs.length > 0) {
            // Repeat save
            editedDocuments = []
            _.forEach(me.documents, function (documentAttribute, attributeCode) {
              var cmp = me.getField(attributeCode)
              cmp.instanceID = me.record.get('ID')
            })

            _.forEach(existsDocs, function (attributeCode) {
              var cmp = me.getField(attributeCode)
              editedDocuments.push(cmp)
            })

            return Q.all(editedDocuments.map(function (cmp) {
              if (cmp.existData()) {
                return cmp.save(true)
              } else {
                return Q.resolve(null)
              }
            })).then(function () {
              _.forEach(me.documents, function (docAttribute, attributeCode) {
                var cmp = me.getField(attributeCode)
                me.record.set(attributeCode, cmp.getValue())
              })
              return me.saveInstance()
            })
          }
          return 1
        }).catch(function (error) {
          me.unmaskForm()
          throw error
        }).fin(function () {
          me.isSaveProcess = false
          // me.unmaskForm(); UBDF-1073
        })
    })
  },

  /**
   * Data that must be preserved while saving the form. You should not use name of fields as property name this object.
   * @param {Object} data
   */
  addExtendedDataForSave: function (data) {
    var me = this
    if (!data) {
      return
    }
    if (!me.extendedDataForSave) {
      me.extendedDataForSave = data
    } else {
      _.forEach(data, function (value, field) {
        if ((value === '' || value === null || value === undefined) &&
                    (me.extendedDataForSave[field] !== '' || me.extendedDataForSave[field] !== null || me.extendedDataForSave[field] !== undefined)
                    ) {
          delete me.extendedDataForSave[field]
        } else {
          me.extendedDataForSave[field] = value
        }
      })
    }

    this.updateActions('onDirtychange', Object.keys(me.extendedDataForSave).length === 0)
  },

  getExtendedDataForSave: function () {
    return this.extendedDataForSave || {}
  },

  updateStoreRecord: function () {
    var me = this, systemEntityStore
    if (!this.store || this.store.isDestroyed) {
      return
    }
    me.updateOrInsertStoreRecord(me.store, me.record)

    if (UB.core.UBAppConfig.systemEntities.hasOwnProperty(me.entityName)) {
      systemEntityStore = UB.core.UBStoreManager.getSystemEntityStore(UB.core.UBAppConfig.systemEntities[me.entityName].name)
      if (me.store !== systemEntityStore) {
        me.updateOrInsertStoreRecord(systemEntityStore, me.record)
      }
    }
  },

  /**
   *
   * @param {UB.ux.data.UBStore} store
   * @param {Ext.data.Model} record
   */
  updateOrInsertStoreRecord: function (store, record) {
    if (!store || store.isDestroyed) return

    var
      storeRecord = store.getById(record.get('ID')),
      recordFields = record.fields.items,
      isNewRecord = storeRecord === null || storeRecord === undefined,
      storeRecordField,
      fieldName,
      value,
      i, len,
      isChange

    if (isNewRecord) {
      store.reload()
      return
    }

    storeRecordField = storeRecord.fields

    for (i = 0, len = recordFields.length; i < len; ++i) {
      fieldName = recordFields[i].name || recordFields[i]
      if (storeRecordField.get(fieldName) && !storeRecord.isEqual(storeRecord.get(fieldName), value = record.get(fieldName))) {
        isChange = true
        storeRecord.set(fieldName, value)
      }
    }

    store.clearCache()

    if (isChange) {
      storeRecord.commit()
      store.fireEvent('childwasmodified')
    }
  },

    /**
     * Perform documet scan & post result to server
     * @param {Ext.Action} action
     */
  onScan: function (action) {
    var
      me = this,
      entityName = me.entityName,
      instanceID = me.getInstanceID(),
      attribute = action.attribute,
      title = UB.format('{0}: "{1}"', UB.i18n('skanirovanieAtributa'), this.documents[action.attribute].caption),
      ctrl = me.getField(attribute), // me.getUBCmp(UB.core.UBCommand.getUBCmpUBName(attribute)),
      id = instanceID

    function prepareFileName () {
      var dateString = (new Date()).toLocaleString().replace(/[/\:.]/g, '-')
      return 'Scaned at ' + dateString + '.' + $App.__scanService.lastScanedFormat
    }
    ctrl.fireEvent('change')

    $App.scan(
      title, {}, this.documents[action.attribute].documentMIME
    ).then(function (result) {
      var fName = prepareFileName()
      return $App.connection.post('setDocument', UB.base64toArrayBuffer(result), {
        params: {
          entity: entityName,
          attribute: attribute,
          id: id,
          origName: fName,
          filename: fName
        },
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      })
    }).then(function (serverResponse) {
      ctrl.setValue(serverResponse.data.result, id)
    })
  },

  onAttach: function (action) {
    var me = this, ctrl = me.getField(action.attribute),
      uploadData = !(ctrl.isEditor && ctrl.isEditor() && ctrl.documentMIME),
      id = this.getInstanceID()
    ctrl.fireEvent('change')
    Ext.create('UB.view.UploadFileAjax', {
      entityName: this.entityName,
      instanceID: id,
      attribute: action.attribute,
      scope: this,
      uploadData: uploadData,
      callback: function (result) {
        var newValue
        if (!uploadData) {
          ctrl.setContent(result, false).done(function () {
            newValue = null
          })
        } else if (result.success) {
          newValue = result.result
          ctrl.setValue(newValue, id).done(function () {
            newValue = null
          })
        } else {
          UB.showResponseError(result)
        }
      }
    })
  },

  onDeleteAttachment: function (action) {
    var me = this,
      ctrl = me.getField(action.attribute)

    ctrl.fireEvent('change')
    $App.dialogYesNo('ochistit', 'vyHotiteUdalitSoderzhimoeDocumenta').done(function (res) {
      var oldValue, newValue
      if (!res) { return }

      oldValue = ctrl.getValue()
      if (Ext.isString(oldValue) && oldValue.length) {
        oldValue = Ext.JSON.decode(oldValue, true)
      }

      if (!Ext.Object.getSize(oldValue)) {
        return
      }
      newValue = Ext.apply(oldValue, { deleting: true, size: 0})
      ctrl.setValue(newValue, me.getInstanceID())
    })
  },

  /**
   * Create invisible mask to lock interface. To delete mask use method unmaskForm.
   */
  lockInterface: function () {
    var maskEl, el = this.getEl()
    if (el) {
      maskEl = el.mask()
      maskEl.addCls('ub-invisible-mask')
    }
  },

  /**
   * Create mask with delay to lock interface. To delete mask use method unmaskForm.
   */
  maskForm: function (delay) {
    var me = this, el
    clearTimeout(me.maskTimeout || 0)
    delay = delay || 1

    me.maskTimeout = setTimeout(function () {
      el = me.getEl()
      if (el) {
        el.mask(UB.i18n('loadingData'))
      }
    }, delay)
  },

  /**
   * Delete mask created by lockInterface or maskForm methods.
   */
  unmaskForm: function () {
    var me = this, el
    clearTimeout(me.maskTimeout || 0)
    el = me.getEl()
    if (el) {
      el.unmask()
    }
  },

  beforeDestroy: function () {
    var me = this
    if (this.mainEntityGridPanel) {
      this.mainEntityGridPanel.un('parentchange', this.onParentChange, this)
      this.mainEntityGridPanel.actions[UB.view.EntityGridPanel.actionId.showPreview].setDisabled(false)
    }
    clearTimeout(this.maskTimeout || 0)

    me.callParent()

    if (me.sender && me.sender.up) {
      var parentForm = me.sender.up('form')
      if (parentForm) {
        if (parentForm.focusControl) {
          parentForm.focusControl(me.sender, 300)
        } else {
          me.sender.focus()
        }
      }
    }
  },

  deleteInstanceID: function () {
    if (this.instanceID && UB.view.activeForm) {
      delete UB.view.activeForm[this.instanceID]
    }
    return true
  },

  beforeClose: function () {
    var
      me = this,
      wnd = me.getFormWin() || {}

    if (!wnd.closeForce && !me.closeForce && me.isFormDirty(true) && me.getCanEdit()) {
      Ext.Msg.confirm({
        buttons: Ext.MessageBox.YESNOCANCEL,
        icon: Ext.MessageBox.WARNING,
        buttonText: {
          yes: UB.i18n('save'),
          no: UB.i18n('doNotSave'),
          cancel: UB.i18n('cancel')
        },
        minWidth: 320, // wrong layout when button protrudes beyond form
        title: UB.i18n('unsavedData'),
        msg: UB.i18n('confirmSave'),
        fn: function (btn) {
          if (btn === 'yes') {
            me.saveForm().done(function (saveStatus) {
              if (saveStatus >= 0) me.closeWindow(true)
            })
          }
          if (btn === 'no') {
            me.closeForce = true
            wnd.closeForce = true
            me.closeWindow(true)
          }
          me.deleteInstanceID()
        }
      })
      return false
    }
    return true
  },

  /**
   * Close self.
   * Because we do non know, we born inside window or as a child panel
   * `me.un('window').close()` is incorrect behavior. use this method to close self.
   *
   * @method
   * @param {Boolean} [closeForce] Force close window even if there is dirty data inside
   */
  closeWindow: function (closeForce) {
    var
      me = this,
      wnd = this.getFormWin()

    me.deleteLock()

    me.closeForce = closeForce
    if (wnd && !me.target) {
      wnd.closeForce = closeForce
      wnd.close()
      return
    }
    if (me) me.close()
  },

  onHistory: function () {
    var
      me = this,
      fieldList = me.fieldList.concat(),
      extendedFieldList = UB.core.UBUtil.convertFieldListToExtended(me.fieldList)

    if (!me.instanceID) {
      return
    }

    function configureMixinAttribute (attributeCode) {
      if (_.findIndex(extendedFieldList, {name: attributeCode}) < 0) {
        fieldList = [attributeCode].concat(fieldList)
        extendedFieldList = [{
          name: attributeCode,
          visibility: true,
          description: UB.i18n(attributeCode)
        }].concat(extendedFieldList)
      }
    }
    configureMixinAttribute('mi_dateTo')
    configureMixinAttribute('mi_dateFrom')

    $App.doCommand({
      cmdType: 'showList',
      isModal: true,
      cmdData: { params: [{
        entity: me.entityName, method: UB.core.UBCommand.methodName.SELECT, fieldList: fieldList
      }]},
      cmpInitConfig: {
        extendedFieldList: extendedFieldList
      },
      instanceID: me.instanceID,
      __mip_recordhistory: true
    })
  },

  onAccessRight: function () {
    var
      me = this,
      entityM, aclEntityName, aclFields = [], promise, lockCreated = false

    if (!me.instanceID) {
      return
    }

    if (me.isEntityLockable && !me.entityLocked) {
      promise = me.setEntityLocked()
      lockCreated = true
    } else {
      promise = Q.resolve(true)
    }

    aclEntityName = me.entityName + '_acl'
    entityM = me.domainEntity
    if (!entityM || !entityM.mixins || !entityM.mixins.aclRls) {
      return
    }
    if (entityM.mixins.aclRls.useUnityName) {
      aclEntityName = entityM.mixins.unity.entity + '_acl'
    }
    _.forEach(entityM.mixins.aclRls.onEntities, function (attrEntity) {
      var e = $App.domainInfo.get(attrEntity)
      if (e.descriptionAttribute) {
        aclFields.push(e.sqlAlias + 'ID.' + e.descriptionAttribute)
      } else {
        aclFields.push(e.sqlAlias + 'ID')
      }
    })

    promise.done(function () {
      $App.doCommand({
        cmdType: 'showList',
        cmdData: { params: [
          {
            entity: aclEntityName,
            method: 'select',
            fieldList: aclFields, // '*',
            whereList: {
              parentExpr: {
                expression: '[instanceID]',
                condition: 'equal',
                values: {
                  'instanceID': me.instanceID
                }
              }
            }
          }
        ]},
        isModalDialog: true,
        parentContext: { instanceID: me.instanceID },
        hideActions: ['addNewByCurrent'],
        onClose: function () {
          if (lockCreated) {
            me.deleteLock()
          }
        }
      })
    })
  },

  onAudit: function () {
    var me = this

    if (!me.instanceID) return

    $App.doCommand({
      cmdType: 'showList',
      isModalDialog: true,
      hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
      cmdData: {
        params: [
          UB.Repository('uba_auditTrail')
          .attrs(['actionTime', 'actionType', 'actionUser', 'remoteIP'])
          .where('[entity]', '=', me.entityName)
          .where('[entityinfo_id]', '=', me.instanceID)
          .orderByDesc('actionTime')
          .ubRequest()
        ]
      },
      cmpInitConfig: {
        onItemDblClick: function (grid, record, item, index, e, eOpts) {
          this.doOnEdit(eOpts)
        }
      }
    })
  }
})

Ext.onReady(function () {
  Ext.define('Ext.layout.container.AutoUB', {
    override: 'Ext.layout.container.Auto',
    chromeCellMeasureBug: false
  })
})
