require('../core/UBStoreManager')
require('../core/UBEnumManager')
require('../ux/Multifilter')
require('./PagingToolbar')
require('../../ux/exporter/Exporter')
require('./GridSummary')
require('./ColumnFavorites')
require('./ColumnCategories')
require('./Table')
require('./InputDateWindow')
require('../core/UBPanelMixin')

const _ = require('lodash')

/* global saveAs */
/**
 * Display a grid based on entity content. Usually created as a result of `showList` command.
 * In case of master-detail relation use {@link UB.ux.UBDetailGrid UBDetailGrid} descendant.
 *
 * Configuration sample:
 *
 {
   xtype: "entitygridpanel",
   entityConfig: {
       entity: "uba_userrole",
       method: "select",
       fieldList: ['ID', {name: 'docID', visibility: false}, {name: 'name', description: 'ShowThisAsCaption}, "code", "actionType"]
   }
 }
 *
 * @author  Unity base core team, Nozhenko Igor
 */
Ext.define('UB.view.EntityGridPanel', {
  extend: 'Ext.grid.Panel',
  alias: 'widget.entitygridpanel',
  cls: 'ub-entity-grid',
  selModel: {
    mode: 'MULTI',
    pruneRemoved: false
  },
  selType: 'cellmodel',
  disableSearchBar: false,
  rowHeight: 28,

  uses: [
    'UB.core.UBCommand',
    'UB.view.BaseWindow',
    'UB.view.InputDateWindow',
    'UB.core.UBFormLoader',
    'UB.ux.UBPreFilter'
  ],
  statics: {
    /**
     * List of possible actions in "All actions" list menu
     */
    actionId: {
      addNew: 'addNew',
      addNewByCurrent: 'addNewByCurrent',
      prefilter: 'prefilter',
      edit: 'edit',
      del: 'del',
      newVersion: 'newVersion',
      refresh: 'refresh',
      history: 'history',
      accessRight: 'accessRight',
      audit: 'audit',
      itemSelect: 'itemSelect',
      exportXls: 'exportXls',
      exportCsv: 'exportCsv',
      exportHtml: 'exportHtml',
      showPreview: 'showPreview',
      lock: 'lock',
      unLock: 'unLock',
      itemLink: 'itemLink',
      optimizeWidth: 'optimizeWidth'
    },

    eventId: {
      addnew: 'addnew',
      addnewbycurrent: 'addnewbycurrent',
      prefilter: 'prefilter',
      edit: 'edit',
      del: 'del',
      filtered: 'filtered',
      newversion: 'newversion',
      accessRight: 'accessRight',
      audit: 'audit',
      refresh: 'refresh',
      history: 'history',
      itemselect: 'itemselect',
      exportXls: 'exportXls',
      exportCsv: 'exportCsv',
      exportHtml: 'exportHtml',
      showPreview: 'showPreview',
      lock: 'lock',
      unLock: 'unLock',
      itemLink: 'itemLink',
      optimizeWidth: 'optimizeWidth'
    },

    comboBoxAttributesStoreField: {
      idProperty: 'id',
      dataIndex: 'dataIndex',
      header: 'header'
    },
    hotKeys: {
      edit: {
        key: Ext.EventObject.E,
        ctrl: true,
        shift: false,
        text: ' (Ctrl+E)'
      },
      del: {
        key: Ext.EventObject.DELETE,
        ctrl: true,
        shift: false,
        text: ' (Ctrl+Delete)'
      },
      addNew: {
        key: Ext.EventObject.INSERT,
        ctrl: true,
        shift: false,
        text: ' (Ctrl+Ins)'
      },
      refresh: {
        ctrl: true,
        key: Ext.EventObject.R,
        shift: false,
        text: ' (Ctrl+R)'
      },
      itemSelect: {
        key: Ext.EventObject.ENTER,
        shift: false,
        ctrl: false,
        text: ' (ENTER)'
      },
      prefilter: {
        ctrl: true,
        key: Ext.EventObject.F,
        shift: true,
        text: ' (Ctrl+Shift+F)'
      }
    },

    /**
     * default parameters for columns view
     */
    columnParams: {
      String: {
        minSize: 20,
        maxSize: 80
      },
      Text: {
        minSize: 20,
        maxSize: 80
      },
      Date: {
        minSize: 13,
        maxSize: 20
      },
      DateTime: {
        minSize: 17,
        maxSize: 20
      },
      Int: {
        minSize: 13,
        maxSize: 20
      },
      Enum: {
        minSize: 20,
        maxSize: 30
      },
      Float: {
        minSize: 16,
        maxSize: 20
      },
      Currency: {
        minSize: 16,
        maxSize: 20
      },
      Boolean: {
        minSize: 8,
        maxSize: 20
      }
    },

    /**
     * Calc one char width for cell
     * @returns {Number}
     */
    getGridCharWidth: function () {
      if (!this.gridCharWidth) {
        let eDiv = document.createElement('div')
        eDiv.style.width = 'auto'
        eDiv.style.height = 'auto'
        eDiv.style.border = 0
        eDiv.style.padding = 0
        eDiv.style.margin = 0
        eDiv.className = 'x-grid-cell'
        eDiv.innerHTML = 'pppppppppp'
        eDiv.style.position = 'absolute'
        eDiv.style['float'] = 'left'
        eDiv.style.whiteSpace = 'nowrap'
        eDiv.style.visibility = 'hidden'
        document.body.appendChild(eDiv)
        this.gridCharWidth = eDiv.clientWidth / 10
        document.body.removeChild(eDiv)
      }
      return this.gridCharWidth
    },
    /**
     * Calc one char width for header cell
     * @returns {number}
     */
    getGridHeaderCharWidth: function () {
      if (!this.gridHeaderCharWidth) {
        let eDiv = document.createElement('div')
        eDiv.style.width = 'auto'
        eDiv.style.height = 'auto'
        eDiv.style.border = 0
        eDiv.style.padding = 0
        eDiv.style.margin = 0
        eDiv.className = 'x-column-header'
        eDiv.innerHTML = 'pppppppppp'
        eDiv.style.position = 'absolute'
        eDiv.style['float'] = 'left'
        eDiv.style.whiteSpace = 'nowrap'
        eDiv.style.visibility = 'hidden'
        document.body.appendChild(eDiv)
        this.gridHeaderCharWidth = eDiv.clientWidth / 10
        document.body.removeChild(eDiv)
      }
      return this.gridHeaderCharWidth
    },

    /**
     * @param {String} entityName
     * @param {String[]} fieldList
     * @param {Object} stores
     * @param {Boolean} rowEditing
     * @param {Boolean} sortableColumns
     * @return {Object[]}
     */
    getEntityColumns: function (entityName, fieldList, stores, rowEditing, sortableColumns) {
      let columns = []
      let entity = $App.domainInfo.get(entityName)
      fieldList = fieldList || UB.Utils.convertFieldListToExtended(entity.filterAttribute({defaultView: true}))
      // UIGridColumnClass
      for (let i = 0, len = fieldList.length; i < len; ++i) {
        let metaColumn = entity.getEntityAttributeInfo(fieldList[i].name, -1)
        if (metaColumn.attribute && metaColumn.attribute.customSettings && metaColumn.attribute.customSettings.UIGridColumnClass) { // === 'Favorites'
          columns.push({
            xtype: 'column' + metaColumn.attribute.customSettings.UIGridColumnClass.toLowerCase(), // columnfavorites
            header: '',
            menuText: UB.i18n(metaColumn.attribute.customSettings.UIGridColumnClass.toLowerCase()),
            dataIndex: fieldList[i].name,
            stateId: metaColumn.attribute.customSettings.UIGridColumnClass.toLowerCase() + fieldList[i].name,
            // stateful: true,
            fieldName: fieldList[i].name
          })
          continue
        }
        let col = UB.view.EntityGridPanel.getEntityColumn(entityName, fieldList[i], stores, sortableColumns)

        if (col) {
          if (rowEditing) {
            let attributeName = (fieldList[i].name.indexOf('.') + 1 ? fieldList[i].name.substring(0, fieldList[i].name.indexOf('.')) : fieldList[i].name)
            let entityAttribute = entity.attributes[attributeName]
            let attributeDefinition = {}

            if (_.includes([UBDomain.ubDataTypes.Entity], entityAttribute.dataType)) {
              if (fieldList[i].editor && fieldList[i].editor.fieldList) {
                attributeDefinition.fieldList = fieldList[i].editor.fieldList
              } else {
                if (fieldList[i].name.indexOf('.') + 1) {
                  attributeDefinition.fieldList = ['ID', fieldList[i].name.substring(fieldList[i].name.indexOf('.') + 1)]
                } else {
                  attributeDefinition.fieldList = ['ID', $App.domainInfo.get(entityAttribute.associatedEntity).getDescriptionAttribute()]
                }
              }

              col.editor = UB.core.UBUtil.ubDt2Ext(entityAttribute, attributeDefinition)
              col.editor.valueField = col.editor.displayField
              col.editor.storeAttributeValueField = attributeName
              if (entityAttribute.allowNull === false) {
                col.editor.allowBlank = false
              }
            } else {
              col.editor = UB.core.UBUtil.ubDt2Ext(entityAttribute, attributeDefinition)
              if (entityAttribute.allowNull === false) {
                col.editor.allowBlank = false
              }
            }
            col.editor.margin = '0 1 0 1'
            if (fieldList[i].editor) {
              _.extend(col.editor, fieldList[i].editor)
            }
          }

          columns.push(col)
        }
      }

      // auto fit columns in case count 1 or 2
      if (columns.length < 3) {
        columns.forEach(function (column) {
          if (!column.flex) {
            column.flex = 1
            delete column.stateId
          }
        })
      }
      return columns
    },

    /**
     *
     * @param {String} entityName
     * @param {Object} field
     * @param {String|function} [field.format]
     * @param {Boolean} [field.visibility]
     * @param {String} [field.description]
     * @param {String} [field.tooltip]
     * @param {Object} [field.config]
     * @param {Object} [field.editor]
     * @param {Boolean} [field.sortable] For disable sorting in column set false. By default true.
     * @param {Boolean} [field.filterable] When true than allow filter by this column. By default true
     * @param {Boolean} [field.simpleFilter] When true than disable creating filter by base dictionary.
     * For Example you have two field "userID.name" and "userID". In this case filter for attribute "userID.name" created
     * like filter by attribute "userID". When simpleFilter is true, filter will be created by "name" attribute of "userID" entity.
     * @param {String} [field.filterCaption]
     * @param {String} [field.summaryType]
     * @param {Object} stores
     * @param {Object} [sortableColumns]
     * @return {Object}
     */
    getEntityColumn: function (entityName, field, stores, sortableColumns) {
      let domain = $App.domainInfo
      let fieldName = field.name
      let formatC = field.format && !_.isFunction(field.format) ? field.format : null
      let domainEntity = domain.get(entityName)

      let metaAttribute = domainEntity.getEntityAttributeInfo(fieldName)
      if (!domainEntity || !metaAttribute || !metaAttribute.attribute) {
        return null
      }
      metaAttribute = metaAttribute.attribute

      let fieldNameParts = fieldName.split('.')
      // create column caption
      let entityNameInn = entityName
      let columnCaption = ''
      _.forEach(fieldNameParts, function (partName, idx) {
        let entityInn = domain.get(entityNameInn)
        if (!entityInn) return
        let attr = entityInn.attributes[partName]
        if (!attr) return
        entityNameInn = attr.associatedEntity
        columnCaption += (columnCaption ? '.' : '') + attr.caption
      })

      if ((fieldNameParts.length === 1) && (field.visibility === false)) {
        return null
      }

      let column = {stateId: fieldName, fieldName: fieldName}
      column.dataIndex = fieldName
      column.header = field.description || columnCaption || UB.i18n(metaAttribute.code)
      column.tooltip = field.tooltip || field.description || columnCaption
      column.sortable = sortableColumns === false ? sortableColumns
        : (field.hasOwnProperty('sortable')
          ? field.sortable && (metaAttribute.dataType !== 'Text')
          : (metaAttribute.dataType !== 'Text') && metaAttribute.allowSort)

      column.simpleFilter = field.simpleFilter
      column.filterCaption = field.filterCaption

      let ubDataTypes = domain.ubDataTypes
      switch (metaAttribute.dataType) {
        case ubDataTypes.Enum:
          let enumDict = UB.core.UBEnumManager.getDictionary(metaAttribute.enumGroup, 'name')
          column.renderer = function (value) {
            return enumDict[value]
          }
          break
        case ubDataTypes.Entity:
          let associatedEntityDisplayField = domain.get(metaAttribute.associatedEntity).descriptionAttribute || 'caption'
          let associatedEntityStore = stores[UB.core.UBUtil.getNameMd5(metaAttribute.associatedEntity, [ 'ID', associatedEntityDisplayField ])]

          column.renderer = function (value /*, metaData, record, rowIndex, colIndex, store, view */) {
            let item = associatedEntityStore.getById(value)
            return item ? item.get(associatedEntityDisplayField) : ''
          }
          break
        case ubDataTypes.Date :
          column.renderer = Ext.util.Format.dateRenderer(formatC || Ext.util.Format.dateFormat || 'd.m.Y')
          column.filter = { type: 'date', dataIndex: column.dataIndex, dateFormat: Ext.util.Format.dateFormat }
          break
        case ubDataTypes.DateTime :
          column.renderer = Ext.util.Format.dateRenderer(formatC || Ext.util.Format.datetimeFormat || 'd.m.Y G:i')
          column.filter = { type: 'date', dataIndex: column.dataIndex, dateFormat: Ext.util.Format.dateFormat }
          break
        case ubDataTypes.Float :
          column.align = 'right'
          column.renderer = Ext.util.Format.numberRenderer(formatC || '0,000.0000')
          break
        case ubDataTypes.Currency :
          column.align = 'right'
          column.renderer = Ext.util.Format.numberRenderer(formatC || '0.00')
          break
        case ubDataTypes.Int :
          column.renderer = Ext.util.Format.numberRenderer(formatC || '0,000')
          column.align = 'right'
          break
        case ubDataTypes.Boolean :
          column.xtype = 'booleancolumn'
          column.trueText = UB.i18n('da')
          column.falseText = UB.i18n('net')
          break
        case ubDataTypes.String:
        case ubDataTypes.Text:
          column.renderer = function (value, metadata) {
            // we must check metadata - Ext.ux.exporter.Formatter descendant call render w/o metadata
            let val = Ext.String.htmlEncode(value)
            if (metadata && Ext.isString(value) && (value.length > 15)) {
              metadata.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(val) + '"'
            }
            return val
          }
          break
      }

      column.filterable = field.filterable !== false

      if (field.format && _.isFunction(field.format)) {
        column.renderer = field.format
      }
      if (field.summaryType) {
        column.summaryType = field.summaryType
      }
      if (field.config) {
        return _.defaults(_.clone(field.config), column)
      }
      return column
    },

    /**
     * @param {Object} params
     * @return {Object}  {store1_md5: {UB.ux.data.UBStore}, store2_md5: ...}
     */
    loadRunListParamsRequirementsStores: function (params) {
      let stores = {}

      let requirements = $App.domainInfo.get(params.entity).getEntityRequirements(
        UB.core.UBUtil.convertFieldListToNameList(params.fieldList, true)
      )
      for (let j = 0, len = requirements.length; j < len; ++j) {
        let entity = $App.domainInfo.get(requirements[j])
        let descriptionAttr = entity.descriptionAttribute
        let fieldList = ['ID']
        if (descriptionAttr !== 'ID') {
          fieldList.push(descriptionAttr)
        }
        let storeMd5 = UB.core.UBUtil.getNameMd5(requirements[j], fieldList)
        if (!stores[storeMd5]) {
          let store = Ext.create('UB.ux.data.UBStore', {
            ubRequest: {
              entity: requirements[j],
              method: 'select',
              fieldList: fieldList
            },
            autoLoad: false,
            disablePaging: true,
            autoDestroy: true,
            createIndexByID: true
          })
          store.lookUpEntity = params.entity
          store.lookUpField = requirements[j]
          store.on('load', function (st, records, success) {
            if (success && records && records.length > 1000) {
              console.error('Too large look up field for entity "' +
                st.lookUpField + '". Look up entity ' + st.ubRequest.entity + ' Record count =' + records.length)
            }
          }, store, { single: true })
          stores[storeMd5] = store
        }
      }
      return stores
    }
  },

  mixins: {
    ubPanelMixin: 'UB.core.UBPanelMixin'
  },
  selectedRecordID: null,

  viewType: 'ubtableview',
  /**
   * @cfg {Array} customActions
   * Add action on toolbar. Default value [].
   *
   customActions: [{
        text: 'new Action...',
        glyph: 0xf040,
        handler: function (btn) {}
      }]

   */
  customActions: [],

  hidePagingBar: false,

  /**
   * @cfg {Boolean} hideMenuAllActions
   * Hide button AllActions. Default value is false.
   */
  hideMenuAllActions: false,

  /**
   * @cfg {Number} minRowsPagingBarVisibled
   * The pagingBar is visible if  rows is more than value. Default value is 11
   */
  minRowsPagingBarVisibled: 11,

  /**
   * @cfg {Boolean} hideActionToolbar
   * To hide action toolbar set it "true".
   */
  hideActionToolbar: false,

  /**
   * @cfg {Object} toolbarActionList
   * Set of action buttons that will be displayed in the topToolbar of a grid.
   *
   *  - null — default value, only Refresh and AddNew will be present
   *  - [] — empty array to hide tBar
   *  - ['addNew',...] — array of actions name (see {@link UB.view.EntityGridPanel.statics#actionId}) to show in tBar
   */
  toolbarActionList: null,

  /**
   * @cfg {Boolean} readOnly
   * Read only grid do not show actions: addNew,  addNewByCurrent, del, edit, newVersion.
   */
  readOnly: false,
  /**
   * @cfg {Boolean} notWriteChanges
   * Do not write changes to the database
   */
  notWriteChanges: false,
  /**
   * @cfg {Boolean} rowEditing
   * Allow editing at a row level for a Grid
   */
  rowEditing: false,
  /**
   * @cfg {Boolean} summaryDataOnClient
   * Calculate sum on client (GridSummary)
   */
  summaryDataOnClient: false,
  /**
   * @cfg {Object} menuAllActionsActionList
   * Set of action buttons that will be displayed in the menuAllActions of a grid.
   * See <a href="https://enviance.softline.kiev.ua/confluence/pages/viewpage.action?pageId=66978487"> this BLOG article</a>
   *
   *  - null — default value, all buttons will be added to the menuAllActions
   *  - [] — empty array
   *  - ['addNew',...] — array of actions name (see {@link UB.view.EntityGridPanel.statics#actionId}) to show in menuAllActions
   */
  menuAllActionsActionList: null,

  /**
   * In case store configuration is not defined directly, this config will be used
   * to create grid store. Configuration transmitted directly to {@link UB.ux.data.UBStore#ubRequest UBStore.ubRequest} during store creation.
   *
   * Can optionally configure grid columns caption and visibility. In this case pass to `fieldList` item object:
   *
   *      {name: 'attributeName', visibility: false, description: 'grid column caption'}
   *
   * @cfg {Object} entityConfig
   * @cfg {String} entityConfig.entity Entity name we create store for
   * @cfg {Array.<String>|Array.<Object>} entityConfig.fieldList Attributes for store. If exist complex attribute and its base column in field list context filter for complex attribute work by base column.
   * For example you have attribute userID.name. By default filter for it work by "name" attribute of "userID" aggregate.
   * If field list contains attribute userID filter for column "userID.name" work same as filer by "userID" attribute.
   * For disable this behavior you can add simpleFilter: false for column config {@link UB.view.EntityGridPanel#getEntityColumn}
   * @cfg {Object} [entityConfig.whereList] Conditions to restrict store content
   */

  /**
   * @cfg {Boolean} disableAutoLoadStore
   * If true store will not load automatically.
   */

  /**
   * @cfg {String[]} hideActions List of action names to make them hidden.
   *
   */

  applyState: function () {
    this.callParent(arguments)
    this.stateLoadedFromStore = true
  },

  onOptimizeWidth: function () {
    this.optimizeColumnWidth(true)
  },

  getData: function () {
    let me = this
    let result = []
    me.getStore().data.items.forEach(function (item) {
      result.push(item.getData())
    })
    return result
  },

  getAttributeData: function () {
    let me = this
    let result = {
      insert: [],
      update: [],
      del: []
    }
    me.getStore().data.items.forEach(function (item) {
      let data = item.getData()
      Object.keys(data).forEach(function (name) {
        if (name.indexOf('.') + 1) {
          delete data[name]
        }
      })
      if (!data.ID) {
        result.insert.push(data)
      } else if (item.dirty) {
        let change = item.getChanges()
        let updateData = {ID: data.ID}
        if (data.mi_modifyDate) {
          updateData.mi_modifyDate = data.mi_modifyDate
        }

        Object.keys(change).forEach(function (name) {
          if (!(name.indexOf('.') + 1)) {
            updateData[name] = data[name]
          }
        })
        result.update.push(updateData)
      }
    })
    me.getStore().getRemovedRecords().forEach(function (item) {
      let data = item.getData()
      if (data.ID) {
        result.del.push(item.getData())
      }
    })
    return result
  },

  /**
   * Set optimal width for grid columnsbased on current gerin width & attribute types
   * @param {Boolean} [force=false] If false column width already loaded from local store -  do nothing.
   */
  optimizeColumnWidth: function (force) {
    let me = this
    let fields = {}
    let fullSize = 0
    let delta = 0
    let allDelta = 0
    let columnNew = {}
    let minSize = 0
    let charWidth, columnParam, headerCharWidth, maxChars, columnLeft
    let columnParams = UB.view.EntityGridPanel.columnParams

    let boxWidth = me.getEl().getWidth()
    if (me.stateLoadedFromStore && !force) {
      return
    }
    _.forEach(me.store.model.getFields(), function (item) {
      fields[item.name] = item
    })

    let entity = $App.domainInfo.get(me.entityName)
    _.forEach(me.columns, function (column) {
      columnParam = {}
      if (!column.dataIndex) return

      let attr = entity.attr(column.dataIndex)
      if (!attr && !fields[column.dataIndex]) return

      if (attr) {
        columnParam.type = attr.dataType
        columnParam.size = attr.size
      } else {
        columnParam.type = fields[column.dataIndex].type.type
        switch (columnParam.type) {
          case 'string': columnParam.type = 'String'; break
          case 'int': columnParam.type = 'Int'; break
          case 'float': columnParam.type = 'Float'; break
          case 'boolean': columnParam.type = 'Boolean'; break
          case 'date': columnParam.type = 'Date'; break
        }
        columnParam.size = columnParams[columnParam.type] ? columnParams[columnParam.type].minSize || 20 : 20
      }
      columnParam.minSize = column.minWidthChar || (columnParams[columnParam.type] ? columnParams[columnParam.type].minSize || 20 : 20)
      columnParam.maxSize = column.maxWidthChar || (columnParams[columnParam.type] ? columnParams[columnParam.type].maxSize || 80 : 80)
      if (columnParam.size && columnParam.size < columnParam.maxSize) {
        columnParam.maxSize = columnParam.size < 20 ? 20 : columnParam.size
      }
      if (!columnParam.size) {
        columnParam.size = columnParam.minSize
      }
      if (columnParam.size > columnParam.maxSize) {
        columnParam.size = columnParam.maxSize
      }
      fullSize += columnParam.size
      minSize += columnParam.size < columnParam.minWidth ? columnParam.size : columnParam.minSize

      columnParam.column = column
      columnNew[column.dataIndex] = columnParam
    })
    function getAllWidth () {
      let result = 0
      _.forEach(columnNew, function (col) {
        result += col.size || col.minSize
      })
      return result
    }
    charWidth = UB.view.EntityGridPanel.getGridCharWidth()
    boxWidth -= me.columns.length + 1 // border
    boxWidth -= me.columns.length * 8 // padding
    boxWidth -= 12 // scrollBar
    maxChars = boxWidth / charWidth
    // minimize as far as possible
    if (fullSize > maxChars) {
      allDelta = 0
      if (maxChars > minSize) {
        allDelta = maxChars - minSize
      }
      columnLeft = me.columns.length
      _.forEachRight(me.columns, function (column) {
        columnParam = columnNew[column.dataIndex]
        if (!columnParam) {
          return
        }
        delta = allDelta > 0 ? Math.round(allDelta / columnLeft) || 1 : 0
        if (columnParam.size > columnParam.minSize) {
          if (columnParam.minSize + delta > columnParam.maxSize) {
            columnParam.size = columnParam.maxSize
            allDelta -= columnParam.maxSize - columnParam.minSize
          } else {
            columnParam.size = columnParam.minSize + delta
            allDelta -= delta
          }
        }
        columnLeft -= 1
      })
    }

    fullSize = getAllWidth()
    // extend to maximum
    if (fullSize < maxChars) {
      headerCharWidth = UB.view.EntityGridPanel.getGridHeaderCharWidth()
      allDelta = maxChars - fullSize
      columnLeft = me.columns.length
      _.forEach(me.columns, function (column) {
        columnParam = columnNew[column.dataIndex]
        if (!columnParam) {
          return
        }
        delta = Math.round(allDelta / columnLeft) || 1
        columnParam.headerWidth = (column.text.length > 20 ? 20 : column.text.length) * headerCharWidth / charWidth
        if (columnParam.headerWidth > columnParam.size + delta) {
          allDelta -= columnParam.headerWidth - columnParam.size
          columnParam.size = columnParam.headerWidth
        } else {
          if (columnParam.size + delta > columnParam.maxSize) {
            allDelta -= columnParam.maxSize - columnParam.size
            columnParam.size = columnParam.maxSize
          } else {
            allDelta -= delta
            columnParam.size += delta
          }
        }
        columnLeft -= 1
      })
    }

    fullSize = 0
    _.forEach(columnNew, function (column) {
      fullSize += column.size * charWidth
      column.column.setWidth(column.size * charWidth + 8/* padding */)
    })
  },

  /**
   * Create main store
   * @private
   */
  createStoreByConfig: function () {
    let me = this
    let cfg = Ext.clone(me.entityConfig)
    let linkedItemsLoadList

    me.stores = linkedItemsLoadList = UB.view.EntityGridPanel.loadRunListParamsRequirementsStores(cfg)

    cfg.fieldList = UB.core.UBUtil.convertFieldListToNameList(cfg.fieldList)

    if (me.rowEditing) {
      cfg.fieldList.forEach(function (item) {
        let entity = $App.domainInfo.get(cfg.entity)
        let attributeName = (item.indexOf('.') + 1 ? item.substring(0, item.indexOf('.')) : item)
        let entityAttribute = entity.attributes[attributeName]
        if (_.includes([UBDomain.ubDataTypes.Entity], entityAttribute.dataType)) {
          if (item.indexOf('.') + 1) {
            cfg.fieldList.push(attributeName)
          }
        }
      })
    }
    me.store = Ext.create('UB.ux.data.UBStore', {
      ubRequest: cfg,
      autoLoad: false,
      linkedItemsLoadList: linkedItemsLoadList,
      /**
       * @cfg {Number} pageSize
       * Pagination page size. Default is UB.appConfig#storeDefaultPageSize
       */
      pageSize: me.pageSize || UB.appConfig.storeDefaultPageSize,
      autoDestroy: true
    })
    me.store.on('load', me.onLoadStore, me)
    if (me.filters) {
      if (me.filters instanceof Ext.util.MixedCollection) {
        me.filters = me.filters.items
      }
      me.store.filters.addAll(me.filters)
      // important to use filters.addAll instead of
      // me.store.addFilter(me.filters);
      // to prevent sending a query twice
    }

    me.entityName = cfg.entity
    if (me.loadStoreImmediately && (!me.autoFilter || (me.autoFilter && me.autoFilter.notShowBefore)) &&
      !me.disableAutoLoadStore) {
      me.store.load()
    }
  },

  createAutoFilter: function () {
    let me = this
    me.autoFilterActive = true
    me.disableAutoShow = true
    me.preFilterForm = UB.ux.UBPreFilter.makeFilters({
      options: me.autoFilter,
      entityCode: me.entityName,
      filters: me.baseFilters,
      onFilterReady: function (newFilters, filterFormId) {
        me.preFilterForm = null
        if (newFilters && newFilters.length > 0) {
          me.store.addFilter(newFilters, false)
        }
        if (filterFormId) {
          me.store.filterFormId = filterFormId
        }
        me.autoFilterActive = false
        if (me.rendered || me.store.isLoading()) {
          me.store.load()
        }
        let win = me.up('window')
        if (win) win.show()
      },
      onCancel: function () {
        me.preFilterForm = null
        me.close()
      },
      scope: me
    })
  },

  createSystemConditions: function () {
    let me = this
    if (!me.entityConfig || !me.entityConfig.fieldList) return

    _.forEach(me.entityConfig.fieldList, function (attributeName) {
      let attrName = typeof (attributeName) === 'object' ? attributeName.name : attributeName
      let metaColumn = $App.domainInfo.get(me.entityConfig.entity).getEntityAttributeInfo(attrName, -1)
      let cls = metaColumn.attribute && metaColumn.attribute.customSettings && metaColumn.attribute.customSettings.UIGridColumnClass
        ? metaColumn.attribute.customSettings.UIGridColumnClass
        : null

      if (cls && UB.view['Column' + cls] && UB.view['Column' + cls].prepareConditions) { // === 'Favorites'
        UB.view['Column' + cls].prepareConditions(me.entityConfig, attrName, metaColumn)
      }
    })
  },

  onLoadStore: function (store, records, success) {
    if (!success || records.length === 0) {
      this.disableAction('edit')
      this.disableAction('del')
      this.disableAction('showPreview')
      this.disableAction('lock')
      this.disableAction('unLock')
      this.disableAction('itemLink')
    } else {
      this.enableAction('edit')
      this.enableAction('del')
      this.enableAction('showPreview')
      this.enableAction('lock')
      this.enableAction('unLock')
      this.enableAction('itemLink')
    }
  },

  createPopupMenu: function () {
    let me = this
    let actions = UB.view.EntityGridPanel.actionId

    let popupMenuItems = [
      me.actions[actions.edit],
      me.actions[actions.addNewByCurrent],
      me.actions[actions.del]
    ]

    if (me.hasDataHistoryMixin && !me.isHistory) {
      popupMenuItems.push('-')
      popupMenuItems.push(me.actions[actions.newVersion])
      popupMenuItems.push(me.actions[actions.history])
    }

    if (me.hasAuditMixin) {
      popupMenuItems.push('-')
      popupMenuItems.push(me.actions[actions.audit])
    }

    if (me.hasHardSecurityMixin) {
      popupMenuItems.push('-')
      popupMenuItems.push(me.actions[actions.accessRight])
    }

    if (me.entityDetails.length && !me.disableMenuItemDetails) {
      popupMenuItems.push('-')
      popupMenuItems.push(me.createMenuItemDetails())
    }

    popupMenuItems.push('-')
    popupMenuItems.push(me.actions[actions.itemLink])

    me.menu = Ext.create('Ext.menu.Menu', {
      items: popupMenuItems
    })
    me.popupMenuItems = popupMenuItems
  },

  initComponent: function () {
    let me = this

    if (!me.extendedFieldList && me.entityConfig) {
      me.extendedFieldList = UB.core.UBUtil.convertFieldListToExtended(me.entityConfig.fieldList)
    }
    me.createSystemConditions()

    if (!me.store && me.entityConfig) {
      me.createStoreByConfig()
    } else {
      if (me.entityConfig) {
        me.entityName = me.entityConfig.entity
      }
      if (me.store) {
        me.store.on('load', me.onLoadStore, me)
        if (me.store.ubRequest && me.store.ubRequest.entity) {
          me.entityName = me.store.ubRequest.entity
        }
      }
      if (me.store && me.loadStoreImmediately &&
        (!me.autoFilter || (me.autoFilter && me.autoFilter.notShowBefore)) && !me.disableAutoLoadStore) {
        me.store.load()
      }
    }
    me.entity = $App.domainInfo.get(me.entityName)
    if (!me.entity) {
      throw new Error('You must specify entity')
    }

    me.isHistory = me.store && me.store.ubRequest && me.store.ubRequest.__mip_recordhistory
    if (me.isHistory) {
      me.miDataID = me.store.ubRequest.id || me.store.ubRequest.ID
    }

    if (me.autoFilter && !me.autoFilter.notShowBefore) {
      me.createAutoFilter()
    }

    me.columns = me.columns || UB.view.EntityGridPanel.getEntityColumns(me.entityName, me.getVisibleColumns(), me.stores,
      me.rowEditing, me.hasOwnProperty('sortableColumns') ? me.sortableColumns : undefined)

    /**
     * @cfg {[]} extendedColumns Extended column configuration. If column with fieldName exists in default column config
     * then extended config merged with default column configuration otherwise it is added to column list.
     */
    if (me.extendedColumns) {
      let colCfg = {}
      _.forEach(me.columns, function (col) {
        if (col.dataIndex) {
          colCfg[col.dataIndex] = col
        }
      })
      _.forEach(me.extendedColumns, function (extCol) {
        if (extCol.dataIndex && colCfg[extCol.dataIndex]) {
          _.merge(colCfg[extCol.dataIndex], extCol)
        } else {
          me.columns.push(extCol)
        }
      })
    }

    me.getRowClass = me.getRowClass || Ext.emptyFn
    Ext.apply(me, {
      viewConfig: {
        enableTextSelection: true, // new in 1.7
        blockRefresh: false,
        listeners: {
          itemcontextmenu: { fn: me.onItemContextMenu, scope: me },
          refresh: {fn: me.onViewRefreshed, scope: me}
        },
        getRowClass: me.getRowClass
      }
      // plugins: []
      // plugins: [{
      //     rowHeight: 28,
      //     variableRowHeight: true,
      //     ptype: 'bufferedrenderer'
      /*  Grouping works incorrect now
      features: [{
          id: 'group',
          ftype: 'groupingsummary',
//                groupHeaderTpl: '', //'{name}',
          hideGroupedHeader: false,
          enableGroupingMenu: true
      }]
      */
    })

    /* RowEditing */
    if (me.rowEditing) {
      let rowEditing = Ext.create('Ext.grid.plugin.RowEditing', {
        clicksToEdit: 1,
        clicksToMoveEditor: 2,
        saveBtnText: UB.i18n('save'),
        cancelBtnText: UB.i18n('actionCancel'),
        autoCancel: false,
        errorSummary: false
      })
      rowEditing.on('canceledit', function (editor, context) {
        if ((!context.record.get('ID') && !me.notWriteChanges) || (me.notWriteChanges && context.record.phantom && context.record.dirtySave !== null)) {
          context.store.remove(context.record)
        }
      })
      rowEditing.on('beforeedit', function (editor, context) {
        if (me.editingPlugin.editing || me.readOnly || !me.entity.haveAccessToMethod(UB.core.UBCommand.methodName.UPDATE)) {
          return false
        }
        context.grid.columns.forEach((column) => {
          if (column.field) {
            column.field.setWidth(column.width - 2)
          }
          if (me.GridSummary) {
            let item = _.find(me.GridSummary.items.items, {baseColumn: column})
            item.setWidth(column.width - 2)
          }
          if (column.field) {
            if (_.has(column.field, 'events.change')) {
              if (typeof column.field.events.change.clearListeners === 'function') {
                column.field.events.change.clearListeners()
              }
            }
            if (column.field.xtype.indexOf('combobox') + 1) {
              column.field.setValue()
            }
          }
        })
        if (me.lineNumberColumn) {
          if (!context.record.get(me.lineNumberColumn)) {
            let numberColumn = _.find(context.grid.columns, {dataIndex: me.lineNumberColumn})
            if (numberColumn) {
              numberColumn.field.setValue()
              context.record.set(me.lineNumberColumn, context.grid.getStore().max(me.lineNumberColumn) + 1)
            }
          }
        }
        if (_.isFunction(me.onBeforeEdit)) {
          let result = me.onBeforeEdit(editor, context)
          if (result === false) {
            return false
          }
        }
        let columnCombobox = _.filter(context.grid.columns, function (item) {
          return item.getEditor() && item.getEditor().xtype.indexOf('combobox') >= 0
        })
        columnCombobox.forEach(function (item) {
          if (!item.field.gridFieldList) {
            let displayFields = $App.domainInfo.get(item.field.getStore().entityName).getAttributeNames({defaultView: true})
            if (!_.includes(displayFields, item.field.displayField)) {
              displayFields.push(item.field.displayField)
            }
            if (!_.includes(displayFields, item.field.valueField)) {
              displayFields.push(item.field.valueField)
            }
            item.field.gridFieldList = displayFields
          }
          item.field.disableModifyEntity = true
          item.field.useForGridEdit = true
        })
      })
      rowEditing.on('validateedit', function (editor, context) {
        if (_.isFunction(me.onValidateEdit)) {
          let result = me.onValidateEdit(editor, context)
          if (result === false) {
            return false
          }
        }
      })
      if (!me.plugins) {
        me.plugins = [rowEditing]
      } else {
        me.plugins.push(rowEditing)
      }
    }
    if (!me.plugins) {
      me.plugins = [] // we can push to plugins later
    }

    if (!me.dockedItems) {
      me.dockedItems = []
    }

    /**
     * @cfg {Object}  summary
     * Associative array where key is field name and value is aggregate function name.
     * Details in {@link UB.view.GridSummary 'UB.view.GridSummary}.
     */
    if (me.summary) {
      if (Ext.isObject(me.summary)) {
        _.forEach(me.summary, function (summaryType, fieldName) {
          _.forEach(me.columns, function (column) {
            if (column.fieldName === fieldName) {
              column.summaryType = summaryType
              return false
            }
          })
        })
      }
      me.GridSummary = new UB.view.GridSummary({grid: me})
      me.dockedItems.push(me.GridSummary)
      if (me.store) {
        me.store.on('clear', function () {
          if (me.GridSummary) {
            me.GridSummary.dataBind()
          }
        })
      }
    }

    if (!me.disableSearchBar) {
      me.plugins.push({
        ptype: 'multifilter'
      })
    }
    if (me.isDetail) {
      me.target.ownerCt.mainEntityGridPanel.on('parentchange', me.onParentChange, me)
      me.mainEntityGridPanel = me.target.ownerCt.mainEntityGridPanel
      me.on('close', function () {
        let tabPanel = me.up('tabpanel')

        if (tabPanel && tabPanel.items.getCount() === 1) {
          tabPanel.relatedSplitter.hide()
          tabPanel.hide()
          tabPanel.ownerCt.doLayout()
        }
        tabPanel.mainPanel.mainEntityGridPanel.onDetailClose(me.entityName)
      }, me)
    }

    me.hasDataHistoryMixin = me.entity.hasMixin('dataHistory')
    me.hasAuditMixin = me.entity.hasMixin('audit')
    me.hasHardSecurityMixin = me.entity.hasMixin('aclRls')
    me.isEntityLockable = me.entity.hasMixin('softLock')

    me.createComboBoxAttributesStore()

    me.preprocessPanel()

    if (me.hideActions && me.hideActions.length) {
      _.forEach(me.hideActions, function (actionName) {
        if (actionName === 'showDetail') {
          me.disableMenuItemDetails = true
        }
      })
    }

    me.createPopupMenu()

    me.on({
      selectionchange: me.onSelectionChange,
      viewready: me.onViewReady,
      boxready: function () {
        me.optimizeColumnWidth()
        /**
         * @cfg {Boolean} disableAutoSelectRow If value is true grid does not automatically select first row
         */
        if (!me.disableAutoSelectRow || me.selectedRecordID) {
          me.selectDefaultRow()
        }
        me.setupActions()
        me.initPagingToolbar()

        if (!me.store.isLoading() && !me.autoFilterActive) {
          me.store.load()
        }
        if (me.notWriteChanges && me.GridSummary) {
          me.GridSummary.dataBind()
        }
        let win = me.getFormWin()
        if (win) {
          me.mon(win, 'close', me.onPanelClose, me)
        }
      },
      deselect: function (grid, record, index) {
        me.getView().removeRowCls(index, 'ub-grid-row-selected')
      },
      select: function (grid, record, index) {
        me.getView().addRowCls(index, 'ub-grid-row-selected')
      },
      scope: me
    })

    /**
     * @event beforeClose
     * Fires before close panel.
     */
    /**
     * @event parentchange
     * Fires when grid in detail mode and parent selection change.
     */
    me.addEvents('parentchange')

    me.on('afterlayout', function () {
      me.realignFloatPanel()
    }, me)

    me.on('sortchange', function () {
      me.store.currentPage = 1
    })

    me.bBar = Ext.widget('toolbar', {
      dock: 'top', // bottom
      border: '1 0 0 0',
      cls: 'ub-grid-info-panel',
      style: 'border-top-width: 1px !important;',
      hidden: true,
      items: [
        me.filterBar = Ext.create('Ext.toolbar.Toolbar', {
          cls: 'ub-grid-info-panel',
          border: 0,
          margin: 0,
          padding: 0,
          flex: 1
        })
      ]
    })

    me.store.on({
      load: function () {
        me.updateVisibleBBar()
      }
    })
    /**
     * @cfg {Array.<{entityName: String, property: String, [command]: Object, [autoShow]: Boolean, caption: string}>} details
     * Array of detail config object:
     *  {String} entityName
     *  {String} property
     *  {Object} [command] params for UB.core.UBApp.doCommand
     *  {Boolean} [autoShow] if true detail automatically show when form show
     *  {String} [caption]
     */
    if (me.details) {
      me.store.on('load', function () {
        me.details.forEach(function (detail) {
          if (detail && detail.autoShow) {
            me.doShowDetail(detail)
          }
        })
      }, me, {single: true})
    }

    me.on('close', me.onPanelClose, me)
    me.dockedItems.push(me.bBar) // unshift
    me.callParent(arguments)

    /**
     * @cfg {Function} [afterInit] Will be called when initComponent done.
     */
    if (_.isFunction(this.afterInit)) {
      this.afterInit()
    }
  },

  initPagingToolbar: function () {
    let me = this
    let el = me.getEl()
    let size = el.getSize()

    me.floatToolbarEl = Ext.DomHelper.append(el, {
      tag: 'div',
      cls: 'ub-float-toolbar',
      style: 'top: ' + (size.height - 30 - 20) + 'px; left: ' + (size.width - 300 - 20) + 'px; ' // width: 300px; height: 30px;
    }, true)
    if (!me.hidePagingBar) {
      me.pagingBar = Ext.create('UB.view.PagingToolbar', {
        renderTo: me.floatToolbarEl,
        isPagingBar: true,
        cls: 'ub-grid-info-panel-tb',
        padding: '0 0 0 5',
        /**
         * @cfg {Boolean} autoCalcTotal default false
         * If it is true show total row count in paging toolbar.
         *
         * To set this parameter in  {@link UB.core.UBCommand command} config use:
         *
         *       cmpInitConfig: {
       *                      autoCalcTotal: true
       *       }
         *
         */
        autoCalcTotal: me.autoCalcTotal,
        store: me.store // same store GridPanel is using
      })

      me.on('activate', function () {
        me.on('afterlayout', function () {
          if (!me.isDestroyed && me.pagingBar) {
            me.pagingBar.updateTotal()
            me.realignFloatPanel()
          }
        }, me, {single: true})
      })

      me.store.on('refresh', function () {
        if (me.store.currentPage === 1 && me.store.getCount() < me.minRowsPagingBarVisibled) {
          me.floatToolbarEl.hide()
        } else {
          if (!me.floatToolbarEl.isVisible()) {
            me.floatToolbarEl.show()
          }
        }
      })
      me.pagingBar.on('totalChanged', function () {
        me.realignFloatPanel()
      })
      me.realignFloatPanel()
    }
  },

  getFormWin: function () {
    if (!this.formWin) {
      this.formWin = this.up('window')
    }
    return this.formWin
  },

  onPanelClose: function () {
    let me = this
    if (me.onClose && typeof me.onClose === 'function') {
      if (me.isDeleted) {
        me.onClose(null, me.store)
      } else {
        me.onClose(me.isNewInstance ? null : me.instanceID, me.store)
      }
    }
    me.fireEvent('beforeClose', me)
  },

  realignFloatPanel: function () {
    if (!this.floatToolbarEl) {
      return
    }
    let size = this.floatToolbarEl.getSize()
    let gridView = this.down(this.viewType)
    let pos = gridView.getXY()
    let posMe = this.getXY()

    this.floatToolbarEl.dom.style.left = (gridView.el.dom.clientWidth + (pos[0] - posMe[0]) - size.width) + 'px'
    this.floatToolbarEl.dom.style.top = (gridView.el.dom.clientHeight + (pos[1] - posMe[1]) - size.height) + 'px'
  },

  /**
   * Show or hide bBar
   */
  updateVisibleBBar: function () {
    let barVisible = this.bBar.isVisible()
    let canHide = (this.filterBar.items.length === 0 || !this.filterBar.items.getAt(0).mustBeVisibled)
    if (canHide && barVisible) {
      this.bBar.setVisible(false)
    } else {
      if (!barVisible && !canHide) {
        this.bBar.setVisible(true)
      }
    }
  },

  /**
   * @param view
   */
  onViewRefreshed: function (view) {
    let store = this.getStore()
    let focusOnUpdate = (this.focusOnUpdate === null || this.focusOnUpdate === undefined)
      ? true
      : this.focusOnUpdate

    if (focusOnUpdate && store.getCount() > 0 && !this.disableAutoSelectRow) {
      view.focusRow(store.getAt(0))
    }
    if (this.mainEntityGridPanel) {
      let parentView = this.mainEntityGridPanel.getView()
      if (parentView) {
        parentView.focus()
      }
    }
  },

  clearBBar: function () {
    for (let i = this.bBar.items.getCount() - 1; i >= 0; i--) {
      let item = this.bBar.items.getAt(i)
      this.bBar.remove(item, !item.isPagingBar)
    }
  },

  /**
   * @return {String[]}
   */
  getVisibleColumns: function () {
    let me = this
    return this.extendedFieldList.filter(function (field) {
      return (field.name !== me.detailAttribute && field.visibility !== false)
    })
  },

  initState: function () {
    let id = this.stateful && this.getStateId()
    let state

    if (id && (state = Ext.state.Manager.get(id))) {
      delete state.sort
      delete state.storeState
      Ext.state.Manager.set(id, state)
    }
    this.callParent(arguments)
  },

  /**
   * Create sore with all columns
   * @private
   */
  createComboBoxAttributesStore: function () {
    let comboProperties = UB.view.EntityGridPanel.comboBoxAttributesStoreField
    let idProperty = comboProperties.idProperty
    let header = comboProperties.header
    let dataIndex = comboProperties.dataIndex
    let data = []

    for (let i = 0, len = this.columns.length; i < len; ++i) {
      let column = this.columns[i]
      let rec = {}

      rec[idProperty] = column[dataIndex]
      rec[header] = column[header]
      data.push(rec)
    }

    this.comboBoxAttributesStore = Ext.create('Ext.data.Store', {
      fields: [
        idProperty, header
      ],
      data: data
    })
  },

  addBaseActions: function () {
    let me = this
    let actions = UB.view.EntityGridPanel.actionId
    let events = UB.view.EntityGridPanel.eventId
    let hotKeys = UB.view.EntityGridPanel.hotKeys
    let methodNames = UB.core.UBCommand.methodName

    me.actions[actions.addNew] = new Ext.Action({
      actionId: actions.addNew,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faPlusCircle,
      cls: 'add-new-action',

      text: UB.i18n('dobavit') + hotKeys[actions.addNew].text,
      eventId: events.addnew,
      handler: me.onAction,
      disabled: !me.entity.haveAccessToMethods([methodNames.ADDNEW, methodNames.INSERT]),
      scope: me
    })

    me.actions[actions.addNewByCurrent] = new Ext.Action({
      actionId: actions.addNewByCurrent,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faPlusCircle,
      cls: 'add-currect-action',

      text: UB.i18n('dobavitKak'),
      eventId: events.addnewbycurrent,
      handler: me.onAction,
      disabled: !me.entity.haveAccessToMethod(methodNames.ADDNEW),
      scope: me
    })
    if (!me.rowEditing) {
      me.actions[actions.edit] = new Ext.Action({
        actionId: actions.edit,
        scale: 'medium',
        glyph: UB.core.UBUtil.glyphs.faEdit,
        cls: 'edit-action',
        text: UB.i18n('redaktirovat') + hotKeys[actions.edit].text,
        eventId: events.edit,
        handler: me.onAction,
        disabled: !me.entity.haveAccessToMethod(methodNames.UPDATE),
        scope: me
      })
    }
    me.actions[actions.del] = new Ext.Action({
      actionId: actions.del,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faTrashO,
      cls: 'delete-action',

      text: UB.i18n('Delete') + hotKeys[actions.del].text,
      eventId: events.del,
      handler: me.onAction,
      disabled: !me.entity.haveAccessToMethod(methodNames.DELETE),
      scope: me
    })
    me.actions[actions.showPreview] = new Ext.Action({
      actionId: actions.showPreview,
      // iconCls: 'iconView',
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faEye,

      text: UB.i18n('pokazatPrevu'),
      eventId: events.showPreview,
      handler: me.onAction,
      disabled: false,
      scope: me
    })
    if (me.hasDataHistoryMixin) {
      me.actions[actions.newVersion] = new Ext.Action({
        actionId: actions.newVersion,
        iconCls: 'iconNewVersion',
        text: UB.i18n('novajaVersija'),
        eventId: events.newversion,
        handler: me.onAction,
        disabled: !me.entity.haveAccessToMethod(methodNames.NEWVERSION),
        scope: me
      })

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
        text: UB.i18n('showAudit'),
        eventId: events.audit,
        handler: me.onAction,
        disabled: !$App.domainInfo.isEntityMethodsAccessible('uba_auditTrail', 'select'),
        scope: me
      })
    }

    if (me.hasHardSecurityMixin) {
      me.actions[actions.accessRight] = new Ext.Action({
        actionId: actions.accessRight,
        // iconCls: 'iconNewVersion',
        text: UB.i18n('accessRight'),
        eventId: events.accessRight,
        handler: me.onAction,
        disabled: !me.entity.haveAccessToMethod('select'),
        scope: me
      })
    }

    me.actions[actions.refresh] = new Ext.Action({
      actionId: actions.refresh,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faRefresh,
      cls: 'refresh-action',
      text: UB.i18n('obnovit') + hotKeys[actions.refresh].text,
      eventId: events.refresh,
      handler: me.onAction,
      scope: me
    })

    if (me.isModal) {
      me.actions[actions.itemSelect] = new Ext.Action({
        actionId: actions.itemSelect,
        scale: 'medium',
        glyph: UB.core.UBUtil.glyphs.faCheck,
        text: UB.i18n('vybrat'),
        eventId: events.itemselect,
        handler: me.onAction,
        scope: me
      })
    }

    if (me.autoFilter) {
      me.actions[actions.prefilter] = new Ext.Action({
        actionId: actions.prefilter,
        scale: 'medium',
        glyph: UB.core.UBUtil.glyphs.faFilter,
        text: UB.i18n('showPreFilter') + hotKeys[actions.prefilter].text,
        eventId: events.prefilter,
        handler: me.onAction,
        scope: me
      })
    }

    me.actions[actions.lock] = new Ext.Action({
      actionId: actions.lock,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faLock,
      text: UB.i18n('lockBtn'),
      eventId: events.lock,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.unLock] = new Ext.Action({
      actionId: actions.unLock,
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faUnLock,
      text: UB.i18n('unLockBtn'),
      eventId: events.unLock,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.exportXls] = new Ext.Action({
      actionId: actions.exportXls,
      glyph: UB.core.UBUtil.glyphs.faFileExcelO,
      text: UB.i18n('exportXls'),
      eventId: events.exportXls,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.exportCsv] = new Ext.Action({
      actionId: actions.exportCsv,
      text: UB.i18n('exportCsv'),
      eventId: events.exportCsv,
      handler: me.onAction,
      scope: me
    })
    me.actions[actions.exportHtml] = new Ext.Action({
      actionId: actions.exportHtml,
      glyph: UB.core.UBUtil.glyphs.faTable,
      text: UB.i18n('exportHtml'),
      eventId: events.exportHtml,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.itemLink] = new Ext.Action({
      actionId: actions.itemLink,
      text: UB.i18n('gridItemLink'),
      eventId: events.itemLink,
      handler: me.onAction,
      scope: me
    })

    me.actions[actions.optimizeWidth] = new Ext.Action({
      actionId: actions.optimizeWidth,
      text: UB.i18n('gridPptimizeWidth'),
      eventId: events.optimizeWidth,
      handler: me.onAction,
      scope: me
    })
  },

  addBaseDockedItems: function () {
    let me = this
    let actions = UB.view.EntityGridPanel.actionId
    let hasCustomAction = Ext.isArray(me.customActions) && me.customActions.length
    let hideToolbar = Ext.isArray(me.toolbarActionList) && me.toolbarActionList.length === 0 && !hasCustomAction
    let hideMenuAllActions = me.hideMenuAllActions
    // get items from menuAllActionsActionList property. If it is not defined - get from standard config
    let menuAllActionsItems = me.menuAllActionsActionList || [
      actions.itemSelect,
      actions.refresh,
      actions.edit,
      actions.addNew,
      actions.addNewByCurrent,
      actions.del,
      actions.showPreview,
      actions.prefilter,
      '-',
      me.createMenuItemLink()
    ]
    let menuAllActions = []

    // add to menuAllActions actions from menuAllActionsItems
    Ext.Array.each(menuAllActionsItems, function (val) {
      let action = me.actions[val]
      if (action) {
        menuAllActions.push(action)
      }
    })

    // add link's block
    menuAllActions.push('-')
    menuAllActions.push(me.createMenuItemLink())

    menuAllActions.push(me.actions[actions.itemLink])

    if (this.hasDataHistoryMixin && !this.isHistory) {
      menuAllActions.push('-')
      menuAllActions.push(me.actions[actions.newVersion])
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

    menuAllActions.push(me.actions[actions.optimizeWidth])

    if (hasCustomAction) {
      menuAllActions.push('-')

      let arr = me.customActions
      for (let i = 0, len = arr.length; i < len; ++i) {
        menuAllActions.push(new Ext.Action(arr[i]))
      }
    }
    if (!me.hideActions || !_.includes(me.hideActions, actions.exportXls) ||
      !_.includes(me.hideActions, actions.exportCsv) || !_.includes(me.hideActions, actions.exportCsv)) {
      menuAllActions.push('-')
      menuAllActions.push(me.createMenuExport())
    }

    if (me.entityDetails.length && !me.disableMenuItemDetails) {
      menuAllActions.push('-')
      me.menuItemDetails = me.createMenuItemDetails()
      menuAllActions.push(me.menuItemDetails)
    }
    let toolItems = me.toolbarActionList || [
      actions.refresh,
      actions.addNew
    ]
    let items = []
    Ext.Array.each(toolItems, function (val) {
      items.push(me.createButtonWOText(me.actions[val]))
    })

    Ext.Array.each(me.customActions, function (actionConfig) {
      items.push(me.createButtonWOText(new Ext.Action(actionConfig)))
    })

    if (me.isModal) {
      items.push(me.createButtonWOText(me.actions[actions.itemSelect]))
    }

    items.push('->', {
      menuId: 'AllActions',
      scale: 'medium',
      glyph: UB.core.UBUtil.glyphs.faCog,
      arrowCls: '',
      tooltip: UB.i18n('vseDeystviya'),
      menu: menuAllActions,
      hidden: hideMenuAllActions
    })

    if (!me.dockedItems) {
      me.dockedItems = []
    }
    me.dockedItems.unshift({
      xtype: 'toolbar',
      dock: 'top',
      items: items,
      hidden: hideToolbar || me.hideActionToolbar
    })
    me.menuAllActions = menuAllActions
  },

  createMenuExport: function () {
    let items = []
    let actions = UB.view.EntityGridPanel.actionId

    items.push(this.actions[actions.exportXls])
    items.push(this.actions[actions.exportCsv])
    items.push(this.actions[actions.exportHtml])

    return Ext.create('Ext.menu.Item', {
      text: UB.i18n('export'),
      hideOnClick: false,
      glyph: UB.core.UBUtil.glyphs.faShareSquare,
      menu: {
        items: items
      }
    })
  },

  addBaseListeners: function () {
    let me = this
    let events = UB.view.EntityGridPanel.eventId

    me.on(events.exportXls, me.onExportXls, me)
    me.on(events.exportCsv, me.onExportCsv, me)
    me.on(events.exportHtml, me.onExportHtml, me)
    if (!me.rowEditing) {
      me.on('itemdblclick', me.onItemDblClick, me)
    }
    me.on(events.addnew, me.onAddNew, me)
    me.on(events.addnewbycurrent, me.onAddNewByCurrent, me)
    me.on(events.edit, me.onEdit, me)
    me.on(events.del, me.onDel, me)
    me.on(events.showPreview, me.onShowPreview, me)
    me.on(events.filtered, me.onFiltered, me)
    me.on(events.lock, me.onLock, me)
    me.on(events.unLock, me.onUnLock, me)
    me.on(events.itemLink, me.onItemLink, me)
    me.on(events.optimizeWidth, me.onOptimizeWidth, me)

    if (me.autoFilter) {
      me.on(events.prefilter, me.onPrefilter, me)
    }

    if (me.hasDataHistoryMixin) {
      me.on(events.newversion, me.onNewVersionDataRequest, me)
      me.on(events.history, me.onHistory, me)
    }

    if (me.hasAuditMixin) {
      me.on(events.audit, me.onAudit, me)
    }

    if (me.hasHardSecurityMixin) {
      me.on(events.accessRight, me.onAccessRight, me)
    }

    if (me.isModal) {
      me.on(events.itemselect, me.onItemSelect, me)
    }

    me.on(events.refresh, me.onRefresh, me)

    if (me.entityDetails.length) {
      me.on(UB.core.UBPanelMixin.eventId.showdetail, me.onShowDetail, me)
    }
  },

  /**
   * @private
   * @param {String} actionName
   * @param {Boolean} [force]
   */
  hideAction: function (actionName, force) {
    let action = this.actions[actionName]

    if (action) {
      action.blocked = true
      action.disable()
      action.hide()
      action.forceHidden = action.forceHidden || !!force
    }
    if (!this.actionsKeyMap) {
      return
    }
    action = this.actionsKeyMap[actionName]
    if (action) {
      action.disable()
    }
  },

  /**
   * @private
   * @param {String} actionName
   * @param {Boolean} [force]
   */
  showAction: function (actionName, force) {
    let action = this.actions[actionName]
    if (action) {
      if (action.forceHidden && !force) {
        return
      }
      action.blocked = false
      action.setDisabled(false)
      action.show()
      action.forceHidden = false
    }
    if (!this.actionsKeyMap) {
      return
    }
    action = this.actionsKeyMap[actionName]
    if (action) {
      action.setDisabled(false)
    }
  },

  /**
   * @param actionName
   */
  disableAction: function (actionName) {
    let action = this.actions[actionName]
    if (action) {
      if (action.forceHidden) return
      action.disable()
    }
    if (!this.actionsKeyMap) return
    action = this.actionsKeyMap[actionName]
    if (action) action.disable()
  },

  /**
   *
   * @param actionName
   */
  enableAction: function (actionName) {
    let me = this
    let action = me.actions[actionName]

    if (action) {
      if (action.forceHidden) return
      action.setDisabled(false)
      action.forceHidden = false
    }
    if (!me.actionsKeyMap) return
    action = me.actionsKeyMap[actionName]
    if (action) {
      action.setDisabled(false)
    }
  },

  /**
   * @cfg  {Boolean} readOnly
   * When true disable all action which potentially change data
   */

  /**
   * @param {Boolean} value
   * Disable or enable all action which potentially change data.
   */
  setReadOnly: function (value) {
    this.readOnly = value
    if (this.rendered) {
      this.setReadOnlyInner(value)
    }
  },
  /**
   * @private
   * @param {Boolean} value
   */
  setReadOnlyInner: function (value) {
    if (value) {
      this.hideAction('addNew')
      this.hideAction('addNewByCurrent')
      this.hideAction('del')
      this.hideAction('edit')
      this.hideAction('newVersion')
    } else {
      this.showAction('addNew')
      this.showAction('addNewByCurrent')
      this.showAction('del')
      this.showAction('edit')
      this.showAction('newVersion')
    }
  },

  afterRender: function () {
    this.callParent()
    this.bindHotkeys()
    if (this.readOnly) {
      this.setReadOnlyInner(true)
    }
  },

  openForm: function (eOpts) {
    let me = this
    let savePromise
    let parentForm = me.up('basepanel')
    if (parentForm) {
      savePromise = parentForm.saveForm()
      if (!savePromise) {
        return
      }
    } else {
      savePromise = Promise.resolve(0)
    }
    savePromise.done(function (saveStatus) {
      if (saveStatus === -1) return

      let context = me.parentContext ? Ext.clone(me.parentContext) : {}
      if (me.detailAttribute && me.parentID) {
        context[me.detailAttribute] = me.parentID
      }
      let store = me.getStore()
      let wnd = me.up('window')
      let modal = wnd ? wnd.modal : false
      let formParam = me.getFormParam()
      let config = {
        cmdType: 'showForm',
        formCode: formParam ? formParam.formCode : formParam,
        description: formParam ? formParam.description : formParam,
        entity: formParam && formParam.entityName ? formParam.entityName : me.entityName,
        instanceID: formParam && formParam.instanceID ? formParam.instanceID : (eOpts && eOpts.instanceID),
        isModal: !!(parentForm || me.isModal),
        store: store,
        isModalDialog: modal,
        addByCurrent: eOpts && eOpts.addByCurrent,
        __mip_ondate: eOpts && eOpts.__mip_ondate,
        parentContext: context,
        detailAttribute: me.detailAttribute,
        parentID: me.parentID,
        sender: me.getView() || me
      }
      // open form in modal mode only if grid is in modal mode
      if (!config.isModal && !modal) {
        config.target = $App.viewport.centralPanel
        config.tabId = ((formParam ? formParam.entityName : null) || me.entityName) + (config.instanceID || ('ext' + Ext.id(null, 'addNew')))
      }

      if (formParam && formParam.cmpInitConfig) {
        config.cmpInitConfig = formParam.cmpInitConfig
      }

      $App.doCommand(config)
    })
  },

  onItemDblClick: function (grid, record, item, index, e, eOpts) {
    if (this.isModal) {
      this.onItemSelect()
    } else {
      this.doOnEdit(eOpts)
    }
  },
  insertRecord: function (context) {
    let me = this
    let fieldList = []
    context.grid.columns.forEach(function (col) {
      if (col.field && col.field.storeAttributeValueField) {
        context.record.set(col.field.storeAttributeValueField, col.field.getValue() && col.field.lastSelection ? col.field.lastSelection[0].get('ID') : null)
      }
      if (col.field && _.includes(['textareafield', 'ubtextfield', 'ubtextareafield'], col.field.xtype) &&
        context.record.modified[col.dataIndex] !== undefined && context.record.get(col.dataIndex) === '') {
        context.record.set(col.dataIndex, null)
      }
    })
    let execParams = context.record.getData()

    Object.keys(execParams).forEach(function (name) {
      if ((name.indexOf('.') + 1) || _.includes(['ID', 'mi_modifyDate'], name)) {
        delete execParams[name]
      } else {
        fieldList.push(name)
      }
    })
    if (context.grid.detailFields && context.grid.detailFields.length) {
      context.grid.detailFields.forEach(function (fieldName) {
        fieldList.push(fieldName)
        execParams[fieldName] = context.grid.parentContext[fieldName]
      })
    }
    if (!me.notWriteChanges) {
      $App.connection.run({
        entity: this.entityName,
        method: 'insert',
        fieldList: fieldList,
        execParams: execParams
      }).then(function (response) {
        context.record.set('ID', response.execParams.ID)
        if (response.execParams.mi_modifyDate) {
          context.record.set('mi_modifyDate', new Date(response.execParams.mi_modifyDate))
        }
        context.record.commit()
        if (me.GridSummary) {
          me.GridSummary.dataBind()
        }
        me.fireEvent('changeData', me, 'insert')
      })
    } else {
      if (!_.includes(me.hideActions, 'del') && me.entity.haveAccessToMethod(UB.core.UBCommand.methodName.DELETE)) {
        me.enableAction('del')
      }
      if (me.GridSummary) {
        me.GridSummary.dataBind()
      }
      me.fireEvent('changeData', me, 'insert')
    }
  },
  updateRecord: function (context) {
    let me = this
    let fieldList = []
    context.grid.columns.forEach(function (col) {
      if (col.field && col.field.storeAttributeValueField &&
        (!col.field.getValue() || _.get(col.field, 'lastSelection[0]'))) {
        context.record.set(col.field.storeAttributeValueField, col.field.getValue() && col.field.lastSelection
          ? col.field.lastSelection[0].get('ID') : null)
      }
      if (col.field && _.includes(['textareafield', 'ubtextfield', 'ubtextareafield'], col.field.xtype) &&
        context.record.modified[col.dataIndex] !== undefined && context.record.get(col.dataIndex) === '') {
        context.record.set(col.dataIndex, null)
      }
    })
    let execParams = context.record.getData()

    Object.keys(execParams).forEach(function (name) {
      if (((name.indexOf('.') + 1) || context.record.modified[name] === undefined) &&
        !_.includes(['ID', 'mi_modifyDate'], name)) {
        delete execParams[name]
      } else {
        fieldList.push(name)
      }
    })

    if (!me.notWriteChanges) {
      $App.connection.run({
        entity: me.entityName,
        method: 'update',
        fieldList: fieldList,
        execParams: execParams
      }).then(function (response) {
        if (response.execParams.mi_modifyDate) {
          context.record.set('mi_modifyDate', new Date(response.execParams.mi_modifyDate))
        }
        context.record.commit()
        if (me.GridSummary) {
          me.GridSummary.dataBind()
        }
        me.fireEvent('changeData', me, 'update')
      })
    } else {
      if (me.GridSummary) {
        me.GridSummary.dataBind()
      }
      me.fireEvent('changeData', me, 'update')
    }
  },
  addNewRecord: function (data, edit) {
    let recordData = {}
    let index = this.store.data.length
    this.store.ubRequest.fieldList.forEach(function (field) {
      recordData[field] = null
    })
    this.store.insert(index, recordData)
    if (data) {
      delete data.ID
      delete data.mi_modifyDate
      if (this.lineNumberColumn && edit) {
        delete data[this.lineNumberColumn]
      }
      let record = this.store.getAt(index)
      Object.keys(data).forEach(function (key) {
        record.set(key, data[key])
      })
    }
    if (edit) {
      this.editingPlugin.startEdit(index, 0)
    } else {
      let record = this.store.getAt(index)
      record.dirtySave = null
      this.enableAction('del')
    }
  },
  /**
   *
   * @return {Object}
   */
  getFormParam: function () {
    let me = this

    if (_.isFunction(me.onDeterminateForm)) {
      me.formParam = me.onDeterminateForm(me)
      return me.formParam
    }

    if (me.formParam) return me.formParam

    if (Ext.isDefined(me.commandData)) {
      me.formParam = me.getFormParamFromCommandData(me.commandData)
      if (Ext.isDefined(me.formParam)) {
        return me.formParam
      }
    }

    let form = UB.core.UBFormLoader.getFormByEntity(me.entityName)
    if (form) {
      me.formParam = {
        formCode: form.get('code'),
        description: UB.i18n(form.get('description'))
      }
      return me.formParam
    }
  },

  getFormParamFromCommandData: function (commandData) {
    let formParam

    if (Ext.isObject(commandData)) {
      if (Ext.isDefined(commandData.formCode)) {
        formParam = {
          formCode: commandData.formCode
        }
      }
      if (Ext.isDefined(commandData.formTitle)) {
        if (!Ext.isObject(formParam)) {
          formParam = {}
        }
        formParam.description = commandData.formTitle
      }
    }
    return formParam
  },

  onAddNew: function () {
    let me = this
    if (!me.rowEditing) {
      if (this.isHistory) {
        // this.onHistory();
        Ext.create('UB.view.InputDateWindow', {
          callback: function (date) {
            me.openForm({__mip_ondate: date, instanceID: me.miDataID})
          },
          scope: me
        })
      } else {
        me.openForm()
      }
    } else {
      if (!me.editingPlugin.editing) {
        let parentForm = me.up('basepanel')
        if (parentForm && (parentForm.isDirty() || parentForm.isNewInstance) && !me.notWriteChanges) {
          parentForm.saveForm().then(function (result) {
            if (result !== -1) {
              me.addNewRecord(null, true)
            }
          })
        } else {
          me.addNewRecord(null, true)
        }
      } else {
        $App.dialogInfo('rowEditing')
      }
    }
  },

  onAddNewByCurrent: function () {
    let me = this
    let selection = me.getSelectionModel().getSelection()
    if (selection.length < 1) {
      $App.dialogInfo('selectRowFirst')
      return
    }
    if (!me.rowEditing) {
      let eOpt = {
        addByCurrent: true,
        instanceID: selection[0].get('ID')
      }
      me.openForm(eOpt)
    } else {
      if (!me.editingPlugin.editing) {
        let parentForm = me.up('basepanel')
        if (parentForm && (parentForm.isDirty() || parentForm.isNewInstance) && !me.notWriteChanges) {
          parentForm.saveForm().then(function (result) {
            if (result !== -1) {
              me.addNewRecord(selection[0].getData(), true)
            }
          })
        } else {
          me.addNewRecord(selection[0].getData(), true)
        }
      } else {
        $App.dialogInfo('rowEditing')
      }
    }
  },

  onEdit: function (editor, context) {
    if (!this.rowEditing) {
      this.doOnEdit()
    } else {
      if (context.record.get('ID')) {
        this.updateRecord(context)
      } else {
        this.insertRecord(context)
      }
    }
  },
  doOnEdit: function (eOpt) {
    let selection = this.getSelectionModel().getSelection()
    if (selection.length < 1) return

    eOpt = eOpt || {}
    eOpt.instanceID = selection[0].get('ID')
    this.openForm(eOpt)
  },

  getFormTitle: function () {
    let placeholder = this.placeholder
    return this.title ||
      (placeholder ? placeholder.title : null) ||
      ((placeholder = this.up('')) ? placeholder.title : null) ||
      this.entity.caption
  },

  onDel: function () {
    let gridSelection = this.getSelectionModel().getSelection()
    if (gridSelection.length < 1) return

    let me = this
    let entityCaptionsToDelete = ''

    if (me.rowEditing && me.editingPlugin.editing) {
      $App.dialogInfo('rowEditing')
      return
    }
    if (gridSelection.length === 1) {
      if (me.entity.descriptionAttribute) {
        try {
          entityCaptionsToDelete = gridSelection[0].get(me.entity.descriptionAttribute)
        } catch (e) {}
        entityCaptionsToDelete = (entityCaptionsToDelete ? '[' + entityCaptionsToDelete + ']' : '')
      }
    }
    $App.dialogYesNo('deletionDialogConfirmCaption',
      UB.format(UB.i18n('deleteConfirmationWithCaption'), me.getFormTitle(), entityCaptionsToDelete)
    ).then(function (res) {
      if (!res) return
      let commandList = []
      let hasUnity = gridSelection.length && gridSelection[0].get('mi_unityEntity')
      let entityName
      if (!me.notWriteChanges) {
        for (let i = 0, len = gridSelection.length; i < len; ++i) {
          entityName = hasUnity ? gridSelection[i].get('mi_unityEntity') : me.entityName
          commandList.push({
            entity: entityName,
            method: 'delete',
            execParams: {ID: gridSelection[i].get('ID')}
          })
        }

        $App.connection.runTrans(commandList).then(function (transResult) {
          let waitList = []
          _.forEach(transResult, function (resp) {
            waitList.push($App.connection.invalidateCache(resp))
          })
          return Q.all(waitList).then(function () {
            return transResult
          })
        }).done(function (transResult) {
          let store = me.store
          let idx = null
          _.forEach(transResult, function (resp) {
            let rRow = store.getById(resp.ID)
            idx = store.indexOf(rRow)
            // nRow = store.getAt(idx);
            store.remove(rRow)
            if (UB.core.UBAppConfig.systemEntities.hasOwnProperty(entityName)) {
              let systemEntityStore = UB.core.UBStoreManager.getSystemEntityStore(UB.core.UBAppConfig.systemEntities[entityName].name)
              systemEntityStore.remove(systemEntityStore.getById(resp.ID))
            }
          })
          if (me.store && me.store.fireModifyEvent) {
            me.store.fireModifyEvent(commandList, transResult)
          }

          if (idx !== null) {
            me.getView().on('itemremove', function () {
              if (store.getCount() <= idx) {
                idx = store.getCount() - 1
              }
              me.getSelectionModel().select(store.getAt(idx))
            }, me, {single: true})
          }
          if (me.GridSummary) {
            me.GridSummary.dataBind()
          }
          me.fireEvent('afterdel')
          me.fireEvent('changeData', me, 'delete')
          if (me.pagingBar) {
            me.pagingBar.decreaseTotal()
          }
        })
      } else {
        let store = me.store
        let idx = null
        for (let i = 0, len = gridSelection.length; i < len; ++i) {
          idx = store.indexOf(gridSelection[i])
          store.remove(gridSelection[i])
        }
        if (idx !== null) {
          me.getView().on('itemremove', function () {
            if (me.GridSummary) {
              me.GridSummary.dataBind()
            }
            me.fireEvent('afterdel')
            me.fireEvent('changeData', me, 'delete')
            if (me.pagingBar) {
              me.pagingBar.decreaseTotal()
            }
            if (store.getCount() <= idx) {
              idx = store.getCount() - 1
            }
            me.getSelectionModel().select(store.getAt(idx))
          }, me, {single: true})
        }
      }
    })
  },

  /**
   * show auto filter form
   */
  onPrefilter: function () {
    let me = this
    if (me.autoFilter) {
      UB.ux.UBPreFilter.makeFilters({
        options: me.autoFilter,
        entityCode: me.entityName,
        store: me.getStore(),
        onFilterReady: function () {
          if (me.filtersDescription) {
            me.filtersDescription()
          }
        }
      })
    }
  },

  showFilter: function (options) {
    let me = this
    UB.ux.UBPreFilter.makeFilters({
      options: me.autoFilter || options || {},
      entityCode: me.entityName,
      store: me.getStore(),
      onFilterReady: function () {
        if (me.filtersDescription) {
          me.filtersDescription()
        }
      }
    })
  },

  onItemContextMenu: function (grid, record, item, index, event) {
    event.stopEvent()
    if (!grid || !record) return

    let sm = grid.getSelectionModel()
    if (!sm) return
    if (this.rowEditing && this.editingPlugin.editing) {
      return
    }
    /**
     * forbid row selecting when fire event contextMenu
     * @cfg {Boolean} forbidSelectOnContextMenu
     */
    if (!this.forbidSelectOnContextMenu) {
      sm.select(record)
    }
    this.menu.showAt(event.xy)
  },

  onNewVersionDataRequest: function () {
    let me = this
    let sel = me.getSelectionModel().getSelection()
    if (sel.length < 1) return

    Ext.create('UB.view.InputDateWindow', {
      callback: function (date) {
        me.onItemDblClick(me, sel[0], null, null, null, { __mip_ondate: date })
      },
      scope: this
    })
  },

  onToolsClick: function () {
    $App.dialogError('Not Implemented')
  },

  onRefresh: function () {
    let me = this
    let actionRefresh = me.actions[UB.view.EntityGridPanel.actionId.refresh]
    let mainStore = me.store
    let cmdRefresh = []

    actionRefresh.disable()
    Ext.iterate(me.stores, function (item, store) {
      if (store !== mainStore && store.ubRequest) {
        cmdRefresh.push(store.reload())
      }
    })
    Q.all(cmdRefresh).then(function () {
      return mainStore.reload()
    }).fin(function () {
      actionRefresh.enable()
      me.down(me.viewType).focus() // 'gridview'
    })
  },

  onHistory: function () {
    let me = this
    let fieldList = me.entityConfig.fieldList.concat()
    let extendedFieldList = me.extendedFieldList.concat()

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

    let sel = this.getSelectionModel().getSelection()
    if (!me.isInHistory && sel.length < 1) {
      return
    }

    $App.connection.select({
      entity: me.entityName,
      fieldList: ['ID', 'mi_data_id'],
      ID: me.isInHistory ? me.miDataID : sel[0].get('ID')
    }).done(function (response) {
      let rows = UB.core.UBCommand.resultDataRow2Object(response)
      $App.doCommand({
        cmdType: 'showList',
        cmdData: { params: [{
          entity: me.entityName, method: UB.core.UBCommand.methodName.SELECT, fieldList: fieldList
        }]},
        cmpInitConfig: {
          extendedFieldList: extendedFieldList
        },
        isModalDialog: true,
        instanceID: rows.mi_data_id,
        __mip_recordhistory: true
      })
    })
  },

  onAccessRight: function () {
    let sel = this.getSelectionModel().getSelection()
    if (sel.length < 1) return

    let me = this
    let aclEntityName = me.entityName + '_acl'
    let entityM = me.entity
    if (!entityM || !entityM.mixins || !entityM.mixins.aclRls) {
      return
    }
    if (entityM.mixins.aclRls.useUnityName) {
      aclEntityName = entityM.mixins.unity.entity + '_acl'
    }
    let aclFields = []
    _.forEach(entityM.mixins.aclRls.onEntities, function (attrEntity) {
      let e = $App.domainInfo.get(attrEntity)
      aclFields.push(e.sqlAlias + 'ID' + (e.descriptionAttribute ? '.' + e.descriptionAttribute : ''))
    })

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
                'instanceID': sel[0].get('ID')
              }
            }
          }
        }
      ]},
      isModalDialog: true,
      parentContext: { instanceID: sel[0].get('ID') },
      hideActions: ['addNewByCurrent']
    })
  },

  onAudit: function () {
    var me = this
    var sel = this.getSelectionModel().getSelection()
    var fieldList = ['actionTime', 'actionType', 'actionUser', 'remoteIP']

    if (sel.length < 1) {
      return
    }

    var whereList = {
      entityExpr: {
        expression: '[entity]',
        condition: 'equal',
        values: {
          entity: me.entityName
        }
      },
      parentExpr: {
        expression: '[entityinfo_id]',
        condition: 'equal',
        values: {
          entityinfo_id: sel[0].get('ID')
        }
      }
    }

    $App.doCommand({
      cmdType: 'showList',
      isModalDialog: true,
      hideActions: ['addNew', 'addNewByCurrent', 'edit', 'del', 'newVersion'],
      cmdData: {
        params: [
          {
            entity: 'uba_auditTrail',
            method: UB.core.UBCommand.methodName.SELECT,
            fieldList: fieldList,
            whereList: whereList
          }
        ]
      },
      cmpInitConfig: {
        onItemDblClick: function (grid, record, item, index, e, eOpts) {
          this.doOnEdit(eOpts)
        },
        afterInit: function () {
          let grid = this
          let grouper
          grid.store.sort('actionTime', 'DESC')
          grid.store.oldGroup = grid.store.group
          grid.store.group = function (groupers, direction, suppressEvent) {
            let me = this
            if (!me.groupOptions) {
              me.oldGroup(groupers, direction, suppressEvent)
            }

            var newGroupers
            if (Ext.isArray(groupers)) {
              newGroupers = groupers
            } else if (Ext.isObject(groupers)) {
              newGroupers = [groupers]
            } else if (Ext.isString(groupers)) {
              grouper = me.groupers.get(groupers)

              if (!grouper) {
                grouper = {
                  property: groupers,
                  direction: direction || 'ASC'
                }
                newGroupers = [grouper]
              } else if (direction === undefined) {
                grouper.toggle()
              } else {
                grouper.setDirection(direction)
              }
            }

            _.forEeach(newGroupers, function (item) {
              var gc = me.groupOptions[item.property]
              if (gc) {
                item.getGroupString = gc.getGroupString
              }
            })
            me.oldGroup(newGroupers, direction, suppressEvent)
          }

          var dateTimeColumnInGrid = function (grid, columnName, format, formatGroup) {
            if (grid && grid.columns && columnName && format) {
              _.forEach(grid.columns, function (col) {
                if (col.dataIndex === columnName) {
                  col.format = format
                  col.renderer = Ext.util.Format.dateRenderer(format)

                  var store = grid.store
                  if (!store.groupOptions) {
                    store.groupOptions = {}
                  }

                  if (!store.groupOptions[columnName]) {
                    store.groupOptions[columnName] = {}
                  }

                  var gc = store.groupOptions[columnName]
                  gc.getGroupString = function (instance) {
                    return Ext.Date.format(instance.get(columnName), formatGroup)
                  }
                }
              })
            }
          }
          dateTimeColumnInGrid(grid, 'actionTime', 'd.m.Y H:i:s', 'd.m.Y')
        }
      }
    })
  },

  getPreviewForm: function () {
    let me = this
    let result = null
    let forms = UB.core.UBFormLoader.getFormByEntity(me.entityName, true)
    _.forEach(forms, function (item) {
      if (item.get('code').toLowerCase().indexOf('preview') !== -1) {
        result = item
        return false
      }
    })
    return result || forms[0]
  },

  onShowPreview: function (action) {
    let form = this.getPreviewForm()
    if (!form) {
      UB.logError('No preview form')
      return
    }

    let sel = this.getSelectionModel().getSelection()
    if (sel.length < 1) {
      $App.dialogInfo('selectRowFirst')
      return
    }
    let eOpts = {
      instanceID: sel[0].get('ID')
    }
    let formParam = {
      formCode: form.get('code'),
      description: UB.i18n(form.get(UB.core.UBAppConfig.systemEntities.form.fields.description))
    }
    let regEx = new RegExp('(.*?)(_grid_UI)')
    let stateId = this.stateId
      ? this.stateId.replace(regEx, UB.format('$1_{0}_{0}$2', this.entityName))
      : undefined
    this.setMainPanel(stateId)
    let config = {
      cmdType: 'showForm',
      formCode: formParam ? formParam.formCode : formParam,
      description: formParam ? formParam.description : formParam,
      entity: this.entityName,
      instanceID: eOpts && eOpts.instanceID,
      store: this.getStore(),
      addByCurrent: false,
      __mip_ondate: false, // eOpts && eOpts.__mip_ondate,
      detailAttribute: this.detailAttribute,
      parentID: this.parentID,
      sender: this.getView() || this,
      target: this.detailTabPanel,
      tabId: Ext.id(),
      isDetail: true
    }
    UB.core.UBApp.doCommand(config)
    /* if(wnd){
        wnd.doLayout();
    } */
    action.disable()
  },

  /**
   * Return main container for the grid.
   * @returns {Ext.Component}
   */
  getMainContainer: function () {
    return this.mainPanel || this
  },

  /**
   * @callback activateByCommand It is called when user again presses shortcut
   */
  activateByCommand: function (commandConfig) {
    if (this.autoFilter && !this.autoFilter.notShowBefore) {
      this.onPrefilter()
    }
  },

  setMainPanel: function (stateId) {
    let me = this

    if (!me.mainPanel) {
      let splitter = Ext.create('Ext.resizer.Splitter')
      let tabPanel = Ext.create('Ext.tab.Panel', {
        stateful: true,
        border: false,
        layout: 'fit',
        stateId: stateId
      })

      let owner = me.ownerCt
      let closable = !!me.closable
      owner.remove(me, false)
      me.mainPanel = Ext.create('Ext.panel.Panel', {
        xtype: 'panel',
        flex: 1,
        border: false,
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          {
            xtype: 'panel',
            layout: 'fit',
            border: false,
            flex: 1,
            items: me
          },
          splitter,
          tabPanel
        ]
      })
      me.mainPanel.closable = closable
      owner.add(me.mainPanel)
      if (owner.setActiveTab) {
        owner.setActiveTab(me.mainPanel)
      }
      me.mainPanel.mainEntityGridPanel = me
      tabPanel.mainPanel = me.mainPanel
      tabPanel.relatedSplitter = splitter
      me.detailTabPanel = tabPanel
      if (!me.up('window')) {
        me.mainPanel.setTitle(me.title)
      }
    }
    me.detailTabPanel.relatedSplitter.show()
    me.detailTabPanel.show()
    me.mainPanel.show()
    me.show()
    if (me.ownerCt) {
      me.ownerCt.doLayout()
    }
  },

  onShowDetail: function (action) {
    let showListCommand = UB.core.UBCommand.commandType.showList
    let cmd = UB.core.UBCommand.getCommandByEntityAndType(action.entityName, showListCommand, true)

    if (this.getSelectionModel().getSelection().length < 1) {
      $App.dialogInfo('selectRowFirst')
      return
    }

    if (!cmd) {
      throw new Error(UB.format('Can\'t get command with type "{0}" for entity "{1}"', showListCommand, action.entityName))
    }

    this.doShowDetail(action)
    action.disable()
  },

  /**
   * Show detail panel.
   * @param {Object} config
   * @param {String} config.entityName
   * @param {String} config.attribute
   * @param {Object} [config.command] params for UB.core.UBApp.doCommand
   */
  doShowDetail: function (config) {
    let me = this
    let wnd = me.up('window')
    let showListCommand = UB.core.UBCommand.commandType.showList
    let cmd = UB.core.UBCommand.getCommandByEntityAndType(config.entityName, showListCommand, true)

    let regEx = new RegExp('(.*?)(_grid_UI)')
    let stateId = me.stateId.replace(regEx, UB.format('$1_{0}_{1}$2', config.entityName, config.attribute))

    me.setMainPanel(stateId)

    let sel = this.getSelectionModel().getSelection()
    let parentID = sel.length > 0 ? sel[0].get('ID') : null
    let coll = new Ext.util.MixedCollection()
    coll.add(UB.core.UBCommand.whereListParentID, new Ext.util.Filter({
      id: UB.core.UBCommand.whereListParentID,
      property: config.attribute,
      exactMatch: true,
      root: 'data',
      value: parentID
    }))
    UB.core.UBApp.doCommand(_.assign({
      cmdType: UB.core.UBCommand.commandType.showList,
      cmdData: cmd,
      entity: config.entityName,
      detailAttribute: config.attribute,
      parentID: parentID,
      target: me.detailTabPanel,
      isDetail: true,
      filters: coll,
      tabId: Ext.id(),
      title: (wnd || me).title + '->' + $App.domainInfo.get(config.entityName).caption
    }, (config.command || {})))
    if (wnd) {
      wnd.doLayout()
    }
  },

  /**
   *
   * @param {Ext.selection.Model} selectionModel
   * @param {Ext.data.Model[]} selected
   * @param {Object} eOpts
   */
  onSelectionChange: function (selectionModel, selected, eOpts) {
    var me = this
    var parentID
    if (selected.length === 0) {
      return
    }

    parentID = selected[0].get('ID')

    if (me.selectedRecordID !== parentID) {
      me.selectedRecordID = parentID
      if (this.timeoutID) {
        clearTimeout(this.timeoutID)
        this.timeoutID = null
      }

      this.timeoutID = setTimeout(function () {
        me.fireEvent('parentchange', parentID)
      }, UB.appConfig.gridParentChangeEventTimeout)
    }
  },

  /**
   *
   * @param {Number} parentID
   */
  onParentChange: function (parentID) {
    this.parentID = parentID

    this.store.filters.removeAtKey(UB.core.UBCommand.whereListParentID)

    this.store.filter(new Ext.util.Filter({
      id: UB.core.UBCommand.whereListParentID,
      root: 'data',
      property: this.detailAttribute,
      exactMatch: true,
      value: parentID
    }))
  },

  onViewReady: function () {
    let view = this.getView()
    let store = view ? view.getStore() : null
    if (store && view && view.storeListeners && view.storeListeners.update) {
      store.on('update', view.storeListeners.update, view)
    }
  },

  setupActions: function () {
    let me = this
    let form = me.up('form')
    let readOnly = _.isFunction(me.isEditable)
      ? !me.isEditable()
      : form && _.isFunction(form.isEditable) ? !form.isEditable() : false
    if (readOnly) {
      me.actions[UB.view.EntityGridPanel.actionId.addNew].setDisabled(true)
      me.actions[UB.view.EntityGridPanel.actionId.addNewByCurrent].setDisabled(true)
      me.actions[UB.view.EntityGridPanel.actionId.del].setDisabled(true)
    }
    if (me.hideActions && me.hideActions.length) {
      _.forEach(me.hideActions, function (actionName) {
        me.hideAction(actionName, true)
        if (actionName === 'showDetail') {
          me.disableMenuItemDetails = true
          if (me.menuItemDetails) {
            me.menuItemDetails.disable()
            me.menuItemDetails.hide()
          }
        }
      })
    }
    if (me.readOnly) {
      me.setReadOnly(me.readOnly)
    }
  },

  bindHotkeys: function () {
    let me = this
    let actions = UB.view.EntityGridPanel.actionId
    let hotKeys = UB.view.EntityGridPanel.hotKeys
    me.actionsKeyMap = {}
    me.actionsKeyMap[actions.edit] = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        key: hotKeys[actions.edit].key,
        ctrl: hotKeys[actions.edit].ctrl,
        shift: hotKeys[actions.edit].shift,
        fn: function (keyCode, e) {
          e.stopEvent()
          me.onEdit()
        }
      }]})
    me.actionsKeyMap[actions.del] = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        key: hotKeys[actions.del].key,
        ctrl: hotKeys[actions.del].ctrl,
        shift: hotKeys[actions.del].shift,
        fn: function (keyCode, e) {
          e.stopEvent()
          me.onDel()
        }
      }]})
    me.actionsKeyMap[actions.addNew] = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        key: hotKeys[actions.addNew].key,
        ctrl: hotKeys[actions.addNew].ctrl,
        shift: hotKeys[actions.addNew].shift,
        fn: function (keyCode, e) {
          e.stopEvent()
          me.onAddNew()
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
    me.actionsKeyMap[actions.itemSelect] = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        key: hotKeys[actions.itemSelect].key,
        ctrl: hotKeys[actions.itemSelect].ctrl,
        shift: hotKeys[actions.itemSelect].shift,
        fn: function (keyCode, e) {
          e.stopEvent()
          if (me.isModal) {
            me.onItemSelect()
          } else {
            me.onEdit()
          }
        }
      }]})
    me.actionsKeyMap[actions.prefilter] = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        key: hotKeys[actions.prefilter].key,
        ctrl: hotKeys[actions.prefilter].ctrl,
        shift: hotKeys[actions.prefilter].shift,
        fn: function (keyCode, e) {
          e.stopEvent()
          me.onPrefilter()
        }
      }]})
    me.actionsKeyMap['ctrl+0'] = new Ext.util.KeyMap({
      target: me.getEl(),
      binding: [{
        ctrl: true,
        key: Ext.EventObject.Q,
        fn: function (keyCode, e) {
          e.stopEvent()

          let tabpanel = me.up('tabpanel')
          if (e.shiftKey) {
            if (tabpanel) {
              let form = tabpanel.up('form')
              form.frameControl(form.focusFirst(form))
            }
            return
          }
          if (tabpanel) {
            let tab = tabpanel.getActiveTab()
            let index = tabpanel.items.indexOf(tab) + 1
            if (index >= tabpanel.items.length) {
              index = 0
            }
            tabpanel.setActiveTab(index)
            tab = tabpanel.getActiveTab()
            if (tab) {
              let form = tab.up('form')
              form.frameControl(form.focusFirst(tab) || tab)
            }
          }
        }
      }]
    })
  },

  selectDefaultRow: function () {
    if (!this.getStore().getCount()) {
      return
    }

    let me = this
    let record

    if (me.selectedRecordID) {
      record = me.store.getById(me.selectedRecordID)
    } else {
      record = me.store.getAt(0)
    }
    try {
      let selModel = me.getSelectionModel()
      let view = me.getView()
      view.focus()
      if (selModel.setCurrentPosition) {
        selModel.setCurrentPosition({
          view: view,
          row: record.index,
          column: 0
        })
      } else {
        selModel.select(record)
      }
      view.focusRow(record.index)
    } catch (e) {}
  },

  getExportTitle: function (defaultTitle) {
    let fTitle
    let mobj = this.entity
    if (Ext.isDefined(mobj)) {
      fTitle = mobj.description || mobj.caption
    }
    if (!Ext.isDefined(fTitle)) {
      let v = this.up('window')
      if (Ext.isDefined(v)) {
        fTitle = v.title
      }
    }
    fTitle = fTitle || this.title || defaultTitle
    return fTitle + ' ' + Ext.Date.format((new Date()), 'Y m d  H:i:s')
  },

  onExportXls: function () {
    let me = this
    let fTitle = this.getExportTitle('export to excel')
    Ext.ux.exporter.Exporter.exportAny(this, 'xlsx', {
      stripeRows: true,
      title: fTitle,
      entityName: this.entityName,
      metaobject: me.entity,
      scope: me,
      callback: function (rData) {
        let dBlob = new Blob([rData], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}) // data:  ;base64
        saveAs(dBlob, fTitle + '.xlsx')
      }
    })
  },

  onExportCsv: function () {
    let me = this
    let fTitle = this.getExportTitle('export to CSV')
    Ext.ux.exporter.Exporter.exportAny(this, 'csv', {
      stripeRows: true,
      title: fTitle,
      entityName: this.entityName,
      metaobject: me.entity,
      scope: me,
      callback: function (rData) {
        let dBlob = new Blob([rData], {type: 'text/csv'})
        saveAs(dBlob, fTitle + '.csv')
      }
    })
  },

  onExportHtml: function () {
    let me = this
    let fTitle = this.getExportTitle('export to html')

    Ext.ux.exporter.Exporter.exportAny(this, 'html', {
      stripeRows: true,
      title: fTitle,
      entityName: this.entityName,
      metaobject: me.entity,
      scope: me,
      callback: function (rData) {
        let dBlob = new Blob([rData], {type: 'text/html'})
        saveAs(dBlob, fTitle + '.html')
      }
    })
  },
  /**
   *
   * @param {Ext.Component} grid
   * @param {Object} eOpts
   */
  beforeDestroy: function (grid, eOpts) {
    let me = this
    if (me.mainEntityGridPanel) {
      me.mainEntityGridPanel.un('parentchange', me.onParentChange, me)
    }

    let store = me.getStore()
    if (store) {
      store.un('load', me.onLoadStore, me)
      if (store.groupers && store.groupers.length > 0) {
        store.clearGrouping()
      }
      store.clearListeners()
    }
    me.callParent(arguments)
  },

  onItemSelect: function () {
    let selection = this.getSelectionModel().getSelection()
    if (selection.length < 1) return

    this.onItemSelected(selection[0])
    this.up('window').close()
  },

  onDetailClose: function (entityName) {
    let me = this
    let showDetail = UB.core.UBPanelMixin.actionId.showDetail
    function enableShowDetailMenuItem (item) {
      if (item && item.actionId === showDetail) {
        item.menu.items.each(function (action) {
          if (action.actionId === showDetail && action.entityName === entityName) {
            action.enable()
          }
        })
      }
    }
    Ext.Array.each(me.popupMenuItems, enableShowDetailMenuItem)
    Ext.Array.each(me.menuAllActions, enableShowDetailMenuItem)
  },

  onLock: function () {
    if (!this.isEntityLockable) return

    let selection = this.getSelectionModel().getSelection()
    let baseID
    if (selection.length && selection[0]) {
      baseID = selection[0].get('ID')
    }
    if (!baseID) return

    let baseEntity = this.entityName
    $App.connection.query({
      method: 'isLocked',
      entity: baseEntity,
      ID: baseID
    }).then(function (lockInfo) {
      if (lockInfo.lockInfo.lockType === 'Temp') {
        if (lockInfo.lockInfo.lockUser !== $App.connection.userLogin()) {
          throw new UB.UBError('recordLockedByTempLock')
        } else {
          throw new UB.UBError('recordLockedThisUserByTempLock')
        }
      }
      if (lockInfo.lockInfo.lockType === 'Persist') {
        if (lockInfo.lockInfo.lockUser !== $App.connection.userLogin()) {
          throw new UB.UBError('recordLockedOtherUser')
        } else {
          throw new UB.UBError('recordLockedThisUser')
        }
      }
      return $App.connection.query({
        method: 'lock',
        lockType: 'ltPersist',
        entity: baseEntity,
        ID: baseID
      })
    }).done(function (result) {
      if (result.resultLock && result.resultLock.success) {
        $App.dialogInfo('lockSuccessCreated')
      }
    })
  },

  onItemLink: function () {
    let selection = this.getSelectionModel().getSelection()
    if (selection.length < 1) {
      $App.dialogInfo('gridEmptySelection')
      return
    }
    let me = this
    let formParam = me.getFormParam()
    // in case form instance ID is passed in formParam - use it
    let instanceID = (formParam && formParam.instanceID) || selection[0].get('ID')

    let prm = ['cmdType=showForm']
    prm.push('entity=' + (formParam && formParam.entityName ? formParam.entityName : me.entityName))
    let formCode = (formParam && formParam.formCode ? formParam.formCode : formParam)
    if (formCode) {
      prm.push('formCode=' + formCode)
    }
    prm.push('instanceID=' + instanceID)

    let prmDet = []
    _.forEach(me.parentContext, function (value, param) {
      if (value) {
        prmDet.push(param + '=' + value)
      }
    })
    if (prmDet.length > 0) {
      prm.push('parentContext=' + window.encodeURIComponent(prmDet.join('&')))
    }

    if (me.detailAttribute && me.parentID) {
      prm.push('detailAttribute=' + me.detailAttribute)
      prm.push('parentID=' + me.parentID)
    }

    let url = prm.join('&')
    let win = Ext.Msg.show({
      prompt: true,
      minWidth: 400,
      msg: UB.i18n('gridItemLink'),
      buttons: Ext.Msg.OK,
      multiline: false,
      value: window.location.origin + window.location.pathname + '#' + url // $App.connection.serverUrl
    })

    win.textField.selectOnFocus = true
  },

  onUnLock: function () {
    if (!this.isEntityLockable) {
      return
    }
    let selection = this.getSelectionModel().getSelection()
    let baseID
    if (selection.length && selection[0]) {
      baseID = selection[0].get('ID')
    }
    if (!baseID) return

    let baseEntity = this.entityName
    $App.connection.query({
      method: 'isLocked',
      entity: baseEntity,
      ID: baseID
    }).then(function (lockInfo) {
      if (lockInfo.lockInfo.lockType !== 'None') {
        if (lockInfo.lockInfo.lockUser !== $App.connection.userLogin()) {
          throw new UB.UBError('recordLockedOtherUser')
        }
        if (lockInfo.lockInfo.lockType === 'Temp') {
          throw new UB.UBError('recordLockedByTempLock')
        }
      } else {
        throw new UB.UBError('recordNotLocked')
      }
      return $App.connection.query({
        method: 'unlock',
        lockType: 'ltPersist',
        entity: baseEntity,
        ID: baseID
      })
    }).done(function (result) {
      if (result.resultLock && result.resultLock.success) {
        $App.dialogInfo('lockSuccessDeleted')
      }
    })
  }
})
