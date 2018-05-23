/**
 * Footer summary grid panel.
 *
 * Create separate query to server for retrieve column summary depending on column.summaryType config.
 * Used in {@link UB.view.EntityGridPanel UB.view.EntityGridPanel}.
 * Example:
 *
 *       Ext.create('UB.view.EntityGridPanel', {
 *            entityConfig: {
 *                entity: "uba_userrole",
 *                method: "select",
 *                fieldList: ['ID',
 *                {name: 'userID.name', description: 'name'}, {name: 'roleID.name', summaryType: 'max' }]
 *            },
 *            summary: { 'ID': 'avg', 'userID.name': 'count'},
 *
 *      })
 *
 *  You can set aggregate function in summary config or in column config entityConfig.fieldList.
 *  Available aggregation function: count, max, min, sum, avg/
 *
 * @author xmax  13.08.14
 */
Ext.define('UB.view.GridSummary', {
  extend: 'Ext.container.Container',
  /* requires: [
  ],
  uses: [
  ], */
  // border: false,

  alias: 'widget.gridsummury',

  cls: 'x-grid-row-summary',
  baseCls: Ext.baseCSSPrefix + 'grid-footer-ct',
  defaultType: 'panel',
  dock: 'bottom',
  layout: {
    type: 'hbox',
    align: 'stretch'
  },
  height: 30,
  style: {
    backgroundColor: '#ffffff !important'
  },
  border: '1 0 0 0',
  // weight: 100,
  summaryDataOnClient: false,
  initComponent: function () {
    let me = this

    me.createItems()
    me.callParent(arguments)
  },

  createItems: function () {
    let me = this
    let grid = me.grid
    me.items = []

    grid.on('boxready', function () {
      let items = [], columns = [grid.columns.length]
      _.forEach(grid.columns, function (column) {
        columns[column.getIndex()] = column
      })
      _.forEach(columns, function (column) {
        items.push(Ext.create('Ext.Component', {
          // html: column.renderer ? column.renderer(column.text): column.text,
          baseColumn: column,
          border: '1 1 0 0',
          // padding: 1,
          cls: 'x-grid-cell-summary x-grid-cell x-grid-cell-inner',
          style: {textAlign: column.summaryType === 'count' ? 'right' : (column.align || 'left') },
          width: column.getWidth()
        }))
      })
      me.items.addAll(items)
      me.updateLayout()
    }, me)

    grid.on('columnresize', function (ct, column, width) {
      me.items.each(function (item) {
        if (item.baseColumn === column) {
          item.setWidth(column.getWidth())
          return false
        }
      })
    })

    grid.on('columnhide', function (ct, column, eOpts) {
      me.items.each(function (item) {
        if (item.baseColumn === column) {
          item.hide()
          return false
        }
      })
    })

    grid.on('columnshow', function (ct, column, eOpts) {
      me.items.each(function (item) {
        if (item.baseColumn === column) {
          item.setWidth(column.getWidth())
          item.show()
          return false
        }
      })
    })

    grid.on('columnmove', function (ct, column, fromIdx, toIdx, eOpts) {
      if (me.items.getCount() === 0) {
        return
      }
      me.items.each(function (item, idx) {
        if (item.baseColumn === column) {
          Ext.suspendLayouts()
          try {
            me.items.remove(item)
            me.items.insert((toIdx > fromIdx ? toIdx - 1 : toIdx), item)
          } finally {
            Ext.resumeLayouts()
          }
          me.updateLayout()
          return false
        }
      })
    })

    grid.getStore().on('load', me.dataBind, me)
  },
  /**
   * update summary data
   */
  dataBind: function () {
    let me = this
    let grid = me.grid
    let request
    let fields = []
    let filterWhereList
    let idCountExist = false

    if (!me.items || me.items.length === 0) {
      return
    }
    if (!grid.summaryDataOnClient) {
      request = Ext.clone(grid.getStore().ubRequest)

      request.fieldList = []
      me.items.each(function (item) {
        if (item.baseColumn.summaryType) {
          if (item.baseColumn.summaryType === 'count') {
            if (!idCountExist) {
              request.fieldList.push('count([ID])')
              fields.push('ID')
              idCountExist = true
            }
          } else {
            fields.push(item.baseColumn.fieldName)
            request.fieldList.push(
              (item.baseColumn.summaryType) + '([' + item.baseColumn.fieldName + '])'
            )
          }
        }
      })
      delete request.options
      delete request.orderList

      filterWhereList = UB.ux.data.proxy.UBProxy.ubFilterToWhereList(grid.getStore().filters, request.entity) || {}
      UB.apply(filterWhereList, request.whereList)
      if (Object.keys(filterWhereList).length) {
        request.whereList = filterWhereList
      } else {
        delete request.whereList
      }

      /*
      request.options = request.options || {}
      request.options.start = request.options.start || 0
      request.options.limit = 1
      */
      $App.connection.select(request).done(function (response) {
        let record = {}
        /*
            resultSet = grid.getStore().getProxy().getReader().read({data: response.resultData.data})
        if (resultSet.records.length < 1){
            return
        }
        record =  resultSet.records[0] */
        if (!response.resultData || response.resultData.rowCount < 1) {
          return
        }
        _.forEach(fields, function (fieldName, index) {
          record[fieldName] = response.resultData.data[0][index]
        })

        me.items.each(function (item) {
          let data
          let el
          if (item.baseColumn.summaryType) {
            data = record[item.baseColumn.summaryType === 'count' ? 'ID' : item.baseColumn.fieldName] || 0
            // record.get(item.baseColumn.summaryType === 'count' ? 'ID' : item.baseColumn.fieldName) || 0
            el = item.getEl()
            el.setHTML(
              item.baseColumn.summaryType === 'count' ? Ext.util.Format.numberRenderer('0,000')(data) : (item.baseColumn.renderer ? item.baseColumn.renderer(data) : data)
            )
            if (!item.toolTipe) {
              item.toolTipe = Ext.create('Ext.tip.ToolTip', {
                target: el,
                trackMouse: true,
                html: UB.i18n(item.baseColumn.summaryType + 'ST')
                // + ' ' + item.baseColumn.text
              })
            }
            /* else {
                                  item.toolTipe.getEl().setHTML(item.baseColumn.summaryType + ' ' + item.baseColumn.text)
                                }  */
          }
        })
      })
    } else {
      let store = grid.getStore()
      me.items.each(function (item) {
        let data
        let el
        if (item.baseColumn.summaryType) {
          data = store[item.baseColumn.summaryType](item.baseColumn.fieldName) || 0
          el = item.getEl()
          el.setHTML(
            item.baseColumn.summaryType === 'count' ? Ext.util.Format.numberRenderer('0,000')(data) : (item.baseColumn.renderer ? item.baseColumn.renderer(data) : data)
          )
          if (!item.toolTipe) {
            item.toolTipe = Ext.create('Ext.tip.ToolTip', {
              target: el,
              trackMouse: true,
              html: UB.i18n(item.baseColumn.summaryType + 'ST')
            })
          }
        }
      })
    }
  }

})
