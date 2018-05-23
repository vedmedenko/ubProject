Ext.define('UB.ux.designer.Properties', {
  extend: 'Ext.data.Model',
  fields: [
    {name: 'name', type: 'string'},
    {name: 'value', type: 'string'},
    {name: 'type', type: 'string'}
  ]
})

Ext.define('UB.ux.designer.objectTextEdit', {
  extend: 'Ext.form.field.Trigger',
  alias: 'widget.objecttextedit',

  initComponent: function () {
    this.addEvents('detailButtonClick')
    this.callParent(arguments)
  },

  onTriggerClick: function () {
    return this.fireEvent('detailButtonClick', this)
  }
})

Ext.define('UB.ux.designer.PropertyGrid', {
  extend: 'Ext.grid.property.Grid',
  alias: 'widget.UBPropertyGrid',

  convertStringToObject: true,

  constructor: function () {
    var me = this

    me.convertStringToObject = true
    me.callParent(arguments)
  },

  initComponent: function () {
    var me = this, newPropertyField

    me.addEvents('propchanged')

    newPropertyField = Ext.create('Ext.form.ComboBox', {
      queryMode: 'local',
      valueField: 'name',
      displayField: 'name',
      store: Ext.create('Ext.data.Store', {
        model: 'UB.ux.designer.Properties',
        sorters: [{
          property: 'name',
          direction: 'ASC'
        }]
      })})
    me.newPropertyField = newPropertyField

    newPropertyField.on('specialkey', function (field, e) {
      var value, ds
      if (e.getKey() === e.ENTER) {
        value = field.getValue()
        ds = me.getStore()
        ds.setValue(value, '', true)
        field.clearValue()
      }
    }, me)

    if (!me.dockedItems) {
      me.dockedItems = []
    }
    me.dockedItems.push({
      xtype: 'toolbar',
      dock: 'bottom',
      items: [
        {
          text: 'Add :'
        },
        newPropertyField
      ]
    }) // = ['Add :', newPropertyField ];

    if (!me.items) {
      me.items = []
    }

    me.on('propertychange', function (source, recordId, value, oldValue) {
      if (me.convertStringToObject && Ext.isString(value)) {
        value = me.stringToObject(value)
      }
      var changed = !me.isEqual(me.baseConfig[recordId], value)
      me.baseConfig[recordId] = value
      if (changed) {
        me.fireEvent('propchanged', me, recordId, value, me.baseConfig)
      }
    }, me)

    me.callParent(arguments)
  },

  isEqual: function (val1, val2) {
    var v1 = val1,
      v2 = val2
    if (Ext.isObject(v1)) {
      v1 = JSON.stringify(v1)
    }
    if (Ext.isObject(v2)) {
      v2 = JSON.stringify(v2)
    }
    // eslint-disable-next-line eqeqeq
    return (v1 == v2)
  },

  setObject: function (config, pConfig, baseType) {
    var me = this,
      cmpInfo = UB.ux.designer.ComponentInfo,
      xtype, typeData, sConfig

    me.baseConfig = config

    xtype = config.xtype || (pConfig ? pConfig.xtype : null) || baseType || 'panel'
    typeData = cmpInfo.getType(xtype)
    if (typeData) {
      me.newPropertyField.getStore().loadData(typeData.configsArray)
    }
    sConfig = me.createConfig(typeData, config)

    config = Ext.clone(config)
    Ext.Object.each(config, function (propertyName, property) {
      if (Ext.isObject(property)) {
        try {
          var ec = JSON.stringify(property)
          config[propertyName] = ec
        } catch (e) {}
      }
    }, me)
    me.setSource(config, sConfig)
  },

  stringToObject: function (val) {
    if (!(/(^[ {2}]*{.*}[ {2}]*$)|(^[ {2}]*\[.*][ {2}]*$)/.test(val))) {
      return val
    }
    try {
      return JSON.parse(val)
    } catch (e) {
      return val
    }
  },

  updatePropToObject: function (config) {
    Ext.Object.each(config, function (propName, prop) {
      if (Ext.isString(prop)) {
        config[propName] = this.stringToObject(prop)
      }
    }, this)
  },

  createComboEditor: function (attrName, attr) {
    var fdata = [], store
    Ext.Array.each(attr.values, function (val) {
      fdata.push({key: val})
    })
    store = Ext.create('Ext.data.Store', {
      fields: ['key'],
      data: fdata
    })

    return Ext.create('Ext.form.field.ComboBox', {
      store: store,
      queryMode: 'local',
      valueField: 'key',
      displayField: 'key'
    })
  },

  createObjEditor: function (attrName, baseType) {
    var me = this, result
    result = Ext.create('UB.ux.designer.objectTextEdit', {
      listeners: {
        detailButtonClick: function (field) {
          var value = me.stringToObject(field.value)
          if (Ext.isObject(value)) {
            me.updatePropToObject(value)
            var pg = Ext.create('UB.ux.designer.PropertyGrid', {
              flex: 5,
              width: '100%'
            })

            var contextMenu = Ext.create('Ext.menu.Menu', {items: [{
              idProp: 'FBMenuPropertyDelete',
              iconCls: 'icon-delete',
              text: 'Delete this property',
              scope: me,
              handler: function (item, e) {
                var ds = pg.getStore()
                ds.remove(item.record.get('name'))
                delete item.record
              }
            }]})

            // property grid contextMenu
            pg.on('itemcontextmenu', function (sender, record, item, index, e) {
              e.stopEvent()
              if (record) {
                var i = contextMenu.down('[idProp=FBMenuPropertyDelete]') // contextMenu.items.get('[idProp=FBMenuPropertyDelete]');
                i.setText('Delete property "' + record.get('name') + '"')
                i.record = record
                delete pg.baseConfig[record.get('name')]
                contextMenu.showAt(e.getXY())
              }
            }, pg)

            var wnd = Ext.create('UB.view.BaseWindow', {
              title: UB.i18n('Edit properties of ' + attrName),
              height: 450,
              width: 250,
                            // autoShow: false,
              modal: true,
              layout: 'vbox',
              items: [
                pg,
                {
                  height: 40,
                  width: '100%',
                  bodyStyle: 'background: transparent;',
                  layout: {type: 'hbox', pack: 'end', align: 'middle'},
                  items: [
                    { xtype: 'button',
                      text: UB.i18n('Cancel'),
                      minWidth: 75,
                      padding: '5',
                      handler: function () {
                        wnd.close()
                      }
                    },
                    { xtype: 'button',
                      text: UB.i18n('ok'),
                      padding: '5',
                      minWidth: 75,
                      handler: function () {
                        // field.setValue(pg.getSource());
                        try {
                          var res = pg.getSource()
                          me.updatePropToObject(res)
                          res = JSON.stringify(res)
                          me.setProperty(attrName, res)
                        } catch (e) {}
                        wnd.close()
                      }
                    }
                  ]
                }
              ]
            })
            pg.setObject(value, null, baseType)
          }
        },
        scope: me
      }
    })
    return result
  },

  createConfig: function (typeData, config) {
    var result = {}, me = this

    if (typeData && typeData.configs) {
      Ext.Object.each(typeData.configs, function (attrName, attr) {
        /*
         editor: Ext.create('Ext.form.field.Time', {selectOnFocus: true}),
         displayName: 'Start Time'
         ---Ext.form.field.Trigger
         */
        switch (attr.type) {
          case 'String':
            result[attrName] = {type: 'string'}
            break
          case 'Number':
            result[attrName] = {type: 'number'}
            break
          case 'Boolean':
            result[attrName] = {type: 'boolean'}
            break
          case 'Date':
            result[attrName] = {type: 'date'}
            break
          default: {
            result[attrName] ={
              editor: me.createObjEditor(attrName, attr.type)
            }
          }
        }

        if (attr.values && ((result[attrName] && !(result[attrName].editor)) || !result[attrName])) {
          result[attrName] =
          {
            editor: me.createComboEditor(attrName, attr)
          }
        }
      })
    }

    if (config && Ext.isObject(config)) {
      Ext.Object.each(config, function (attrName, attr) {
        if (!result[attrName]) {
          var attrType
          if (Ext.isBoolean(attr)) {
            attrType = 'boolean'
          } else if (Ext.isNumber(attr)) {
            attrType = 'number'
          } else if (Ext.isDate(attr)) {
            attrType = 'date'
          } else if (Ext.isObject(attr)) {
            attrType = 'object'
          } else if (Ext.isArray(attr)) {
            attrType = 'array'
          } else {
            attrType = 'string'
          }

          if (attrType === 'array' || attrType === 'string') {
            result[attrName] = {type: 'string'}
          } else if (attrType === 'number') {
            result[attrName] = {type: 'number'}
          } else if (attrType === 'boolean') {
            result[attrName] = {type: 'boolean'}
          } else if (attrType === 'date') {
            result[attrName] = {type: 'date'}
          } else {
            result[attrName] ={
              editor: me.createObjEditor(attrName)
            }
          }
        }
      }, me)
    }

    return result
  }

/*
    getCustomEditors: function() {
        var g = Ext.grid;
        var f = Ext.form;
        var cmEditors = new g.PropertyColumnModel().editors;
        var eds = {};
        var fields = Main.FIELDS;
        for (i in fields) {
            if (fields[i].values) {
                var values = fields[i].values;
                var data = [];
                for (j=0;j<values.length;j++) { data.push([values[j],values[j]]); }
                eds[i] = new g.GridEditor(new f.SimpleCombo({forceSelection:false,data:data,editable:true}));
            } else if (fields[i].type == "boolean") {
                eds[i] = cmEditors['boolean'];
            } else if (fields[i].type == "number") {
                eds[i] = cmEditors['number'];
            } else if (fields[i].type == "string") {
                eds[i] = cmEditors['string'];
            }
        }
        return eds;
    }
*/

})
