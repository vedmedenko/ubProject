/**
 * Define information about component properties for visual form designer
 */
Ext.define('UB.ux.designer.ComponentInfo', {
  singleton: true,

  data: {

    layout: {
      isSimple: true, //  только описательно

      configs: {
        type: { type: 'String',
          values: [
            'absolute', 'accordion', 'anchor', 'auto', 'autocomponent',
            'border', 'box', 'card', 'checkboxgroup', 'container', 'column',
            'fit', 'form', 'table', 'ux.center', 'hbox', 'vbox'
          ]
        },
        align: { type: 'String', values: ['left', 'center', 'right', 'stretch', 'stretchmax'] },
        pack: {type: 'String', values: ['start', 'center', 'end']},
        padding: {type: 'String'}
      }
    },

    component: {
      isSimple: true, //  только описательно
      configs: {
        width: { type: 'Number' },
        height: { type: 'Number' },
        flex: {type: 'Number'}
      }
    },

    container: {
      isSimple: true, //  только описательно
      isContainer: true, // передаем по наследованию признак
      extend: 'component',
      configs: {
        layout: {type: 'layout'}
      }
    },
    toolbar: {
      extend: 'container',
      componentGroup: 'toolbar', // передаем по наследованию
      configs: {

      }
    },
    fieldset: {
      extend: 'container',
      componentGroup: 'containers', // передаем по наследованию
      configs: {

      }
    },
    ubfieldset: {
      extend: 'fieldset',
      componentGroup: 'containers', // передаем по наследованию
      configs: {

      }
    },
    panel: {
      extend: 'container',
      componentGroup: 'containers', // передаем по наследованию
      defConfig: {
        width: 200,
        height: 200
      }
    },
    form: {
      extend: 'panel'
    },
    window: {
      extend: 'panel'
    },
    tabpanel: {
      extend: 'panel'
    },
    basePanel: {
      extend: 'panel'
    },
    Labelable: {
      isSimple: true, //  только описательно
      configs: {
        labelAlign: {type: 'String', values: ['left', 'top', 'right']},
        hideLabel: {type: 'boolean'}
      }
    },
    field: {
      isSimple: true,
      extend: 'component',
      mixins: ['Labelable'],
      componentGroup: 'fields',
      configs: {
        readOnly: {type: 'Boolean'},
        tabIndex: {type: 'Number'},
        invalidText: {type: 'String'}
      }
    },
    textfield: {
      extend: 'field',
      allowChild: false,
      defConfig: {},
      configs: {
      }
    },
    numberfield: {
      extend: 'textfield',
      configs: {
        maxValue: {type: 'Number'},
        minValue: {type: 'Number'}
      }
    },
    pickerfield: {
      extend: 'textfield',
      configs: {
        editable: {type: 'Boolean'}
      }
    },
    combobox: {
      extend: 'pickerfield',
      configs: {
        valueField: {type: 'String'},
        displayField: {type: 'String'}
      }
    },
    ubcombobox: {
      extend: 'combobox'
    },
    datefield: {
      extend: 'pickerfield'
    },
    ubdetailgrid: {
      extend: 'component'
    },
    ubdocument: {
      extend: 'component'
    },
    ubdetailtree: {
      extend: 'component'
    },
    ubcodemirror: {
      extend: 'component'
    }
  },

  getType: function (type) {
    var result = this.data[type]
    if (!result) {
      UB.logError('Type "' + type + '" not found')
    }
    return result
  },

  /**
   * @private
   */
  calculateComponent: function (component, type) {
    var me = this, mixinObj, extendObj,
      c = component

    if (c.calculated) {
      return true
    }
    c.calculated = true
    c.type = type
    if (c.extend && c.extend === component) {
      c.extend = null
    }
    if (c.extend) {
      extendObj = me.data[c.extend]
      if (!extendObj) {
        Ext.Error.raise('Base type "' + c.extend + '" not found for type "' + type + '"')
      }
      me.calculateComponent(extendObj, c.extend)
      c.configs = c.configs || extendObj.configs
      Ext.applyIf(c.configs, extendObj.configs)
      if (!c.componentGroup) {
        c.componentGroup = extendObj.componentGroup
      }
      if (!c.isContainer && c.isContainer !== false) {
        c.isContainer = extendObj.isContainer
      }
    }
    if (c.mixins && Ext.isArray(c.mixins)) {
      Ext.Array.each(c.mixins, function (mixin) {
        mixinObj = me.data[mixin]
        if (!mixinObj) {
          Ext.Error.raise('Mixin "' + mixin + '" not found for type "' + type + '"')
        }
        me.calculateComponent(mixinObj, mixin)
        c.configs = c.configs || mixinObj.configs
        Ext.applyIf(c.configs, mixinObj.configs)
      }, me)
    }
    c.configsArray = []
    Ext.Object.each(c.configs, function (attrName, attr) {
      attr.name = attrName
      c.configsArray.push(attr)
    }, me)

    if (!c.isSimple) {
      if (!c.defConfig) {
        c.defConfig = {}
      }
      if (!_.isFunction(c.defConfig)) {
        if (!c.defConfig.xtype) { // && type !== 'panel'
          c.defConfig.xtype = type
        }
      }
    }
    return true
  },
    /**
     * @protected
     */
  initData: function () {
    var me = this
    Ext.Object.each(me.data, function (type, component) {
      me.calculateComponent(component, type)
    }, me)
  },

    /**
    *
    * @param {Ext.data.NodeInterface} rootNode
    */
  fillComponentsTree: function (rootNode) {
    var me = this, group, groups = {}, node
    Ext.Object.each(me.data, function (type, component) {
      if (component.componentGroup && !component.isSimple) {
        group = groups[component.componentGroup]
        if (!group) {
          groups[component.componentGroup] = group = rootNode.appendChild({
            text: component.componentGroup,
            draggable: false
          })
        }
        node = group.appendChild({
          text: type,
          id: type,
          leaf: true,
          draggable: true
        })
        node.component = component
      }
    }, me)
  },

  isContainer: function (type) {
    var component = this.data[type]
    return component ? component.isContainer || false : false
  }

}, function () {
  UB.ux.designer.ComponentInfo.initData()
}
)
