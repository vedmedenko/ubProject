require('../view/EntityGridPanel')
/**
 * Container for detail grid. Create grid, based on passed `cmdData` (the same as for showList) and add to `whereList`
 * condition `detailFields` values = `masterFields` values.
 *
 * Configuration sample:
 *
    {
        xtype: "ubdetailgrid",
        entityConfig: {
                entity: "uba_userrole",
                method: "select",
                fieldList: ["roleID"]
        },
        masterFields: ["ID"],
        detailFields: ["userID"]
    }
 *
 * @author UnityBase core team
 */

Ext.define('UB.ux.UBDetailGrid', {
  extend: 'UB.view.EntityGridPanel',
  alias: 'widget.ubdetailgrid',
  uses: [
    'UB.core.UBApp',
    'UB.core.UBCommand'
  ],
  layout: 'fit',
  /**
   * @cfg {Boolean} readOnly
   * Read-only grid do not show actions: `addNew`,  `addNewByCurrent`, `del`, `edit`, `newVersion`.
   */
  readOnly: false,
  /**
   * @cfg {Array.<String>} masterFields Master attribute name(s) from parent.record for master-detail
   */
  masterFields: [],
  /**
   * @cfg {Array.<String>} detailFields Detail attribute name(s) for master-detail
   */
  detailFields: [],
  /**
   *  @cfg {Boolean} force If set to true will force grid to create and load underline store even if grin is placed onto inactive tab
   *  Be carefully - by default only first data page if loading. Set `pageSize to 0 to load lo all data (not recommended)
   */
  forceDataLoad: false,
  initComponent: function () {
    let cmdParams

    if (this.cmpInitConfig) {
      console.warn('cmpInitConfig parameter is deprecated. You can set parameters from cmpInitConfig into UBDetailGrid config.')
      Ext.apply(this, this.cmpInitConfig)
    }
    this.disableAutoLoadStore = true
    cmdParams = this.cmdData && this.cmdData.params ? this.cmdData.params[0] : null
    if (cmdParams && !this.entityConfig) { // for backward compatibility
      this.entityConfig = cmdParams
    }
    if (this.cmdData) {
      console.debug('UBDetailGrid: cmdData cfg parameter is deprecated. Use entityConfig')
    }
    if (this.cmdType && this.cmdType !== 'showList') {
      throw new Error('UB.ux.UBDetailGrid show only grid')
    }
    // for backward compatibility
    this.grid = this
    this.gridCreated = true
    this.callParent(arguments)

    // only for Banay Vasily
    if (_.isFunction(this.customInit)) {
      this.customInit()
    }

    $App.domainInfo.get(this.entityConfig.entity).checkAttributeExist(this.detailFields, 'UB.ux.UBDetailGrid, detailFields:')

    /**
     * @deprecated Grid is created immediately
     * @event  gridCreated
     * Fire when grid was created.
     */
    this.addEvents('gridCreated')
    if (this.isDesignMode) { // for visual designer forms
      try {
        this.setValue(null)
      } catch (e) {}
    }
  },

  on: function (ename, fn, scope, options) {
    if (ename === 'gridCreated') {
      console.error('Deprecated. Grid is created immediately')
      fn.bind(scope || this).apply([this])
    } else {
      this.callParent(arguments)
    }
  },

  /**
   *
   * @param {Ext.data.Model} record
   * @param {String} parentEntityName
   */
  setValue: function (record, parentEntityName) {
    let me = this
    if (parentEntityName) {
      $App.domainInfo.get(parentEntityName).checkAttributeExist(me.masterFields, 'UB.ux.UBDetailGrid, masterFields:')
    }
    if (me.masterFields && me.detailFields) {
      me.parentContext = me.parentContext || {}
      _.forEach(me.masterFields, function (masterField, index) {
        if (!record.fields.findBy(function (item) { return item.name === masterField })) {
          throw new Error('Master entity record does not contains field "' + masterField +
             '". This field used as parent field in UBDetailGrid. Detail entity = ' +
             me.entityConfig.entity + ', master entity ' + parentEntityName
          )
        }
        me.parentContext[me.detailFields[index]] = record.get(masterField)
      })
    }
    me.onRefreshDetail(record)
  },

  /**
   * @param {Ext.data.Model} record
   */
  onRefreshDetail: function (record) {
    let req

    if (record && record.isModel) {
      req = this.store.ubRequest
      req.whereList = UB.core.UBCommand.addMasterDetailRelation(
         req.whereList, this.masterFields, this.detailFields, record
      )
      if (this.rendered || this.forceDataLoad) {
        if (this.rowEditing && this.editingPlugin.editing) {
          this.editingPlugin.cancelEdit()
        }
        this.store.reload()
      }
    }
  }
})
