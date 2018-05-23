require('./ComponentInfo')
require('./PropertyGrid')

/**
 * Visual form designer
 */
Ext.define('UB.ux.designer.VisualDesigner', {
  extend: 'Ext.Panel',
  alias: 'widget.UBVDesigner',
  requires: [
    'Ext.tree.Panel',
    'Ext.data.TreeStore'
  ],
  layout: {
    type: 'hbox',
    align: 'stretch'
  },

  initComponent: function () {
    var me = this

    me.addEvents('change')

    me.initUndoHistory()
    me.initComponentTree()
    me.initPropertyGrid()
    me.initBaseComponents()
    me.initEntityTreePanel()

    if (!me.dockedItems) {
      me.dockedItems = []
    }
    me.dockedItems.push({
      xtype: 'toolbar',
      dock: 'top',
      items: [
        {
          text: 'Reset All',
          iconCls: 'icon-reset',
          scope: this,
          handler: function () {
            me.markUndo('Reset All')
            me.resetAll()
          }
        },
        {
          xtype: 'button',
          text: UB.i18n('Undo'),
          iconCls: 'icon-undo',
          handler: function () {
            me.undo()
          },
          scope: me
        }, {
          text: UB.i18n('showResultConfig'),
          scope: this,
          handler: function () {
            var rValue = me.getValue()
            var window = Ext.create('UB.view.BaseWindow', {
              title: UB.i18n('showResultConfig'),
              height: 600,
              width: 800,
              modal: true,
              layout: { type: 'hbox' },
              items: [{
                itemId: 'myEditor',
                xtype: 'ubcodemirror',
                mode: 'application/x-javascript',
                title: UB.i18n('AsJSON'),
                flex: 1,
                height: '100%',
                rawValue: rValue,
                style: {
                  background: 'white'
                },
                hideLabel: false
              }]
            })
            window.show()
          }
        }
      ]
    })

    me.leftPnl = Ext.create('Ext.panel.Panel', {
      flex: 2,
      collapsible: false,
      layout: {
        type: 'vbox',
        align: 'stretch'
      },
      bodyStyle: 'background:white;',
      items: [
        me.componentTree,
        { xtype: 'splitter' },
        {
          xtype: 'tabpanel',
          tabPosition: 'left',
          layout: 'fit',
          flex: 2,
          items: [{
            title: UB.i18n('Entity context'),
            layout: 'fit',
            items: [
              me.entityTreePanel
            ]
          }, {
            title: UB.i18n('Components'),
            layout: 'fit',
            items: [
              me.baseComponents
            ]
          }, {
            title: UB.i18n('Properties'),
            layout: 'fit',
            items: [me.propertyGrid]
          }]
        }
      ]
    })

    me.initBuilder()

    me.pnlForBuilder = Ext.create('Ext.panel.Panel', {
      layout: 'fit',
      flex: 5,
      collapsible: false,
      border: false,
      bodyBorder: false,
      items: [me.builderPanel]
    })

    if (!me.items) {
      me.items = []
    }

    me.items.push(me.leftPnl)
    me.items.push({ xtype: 'splitter' })
    me.items.push(
      me.pnlForBuilder
    )
    me.callParent(arguments)
  },

  initEntityTreePanel: function () {
    this.entityTreePanel = Ext.create('UB.view.CommandBuilder.EntityTreePanel', {
      selModel: Ext.create('Ext.selection.TreeModel'),
      draggable: true,
      viewConfig: {
        plugins: {
          ptype: 'treeviewdragdrop',
          ddGroup: 'main',
          dragGroup: 'main',
          dropGroup: 'main',
          enableDrag: true,
          allowContainerDrops: true,
          enableDrop: false
        }
      }
    })
  },

  setEntityCode: function (entityCode) {
    if (!entityCode) return
    this.entityCode = entityCode
    this.entity = $App.domainInfo.get(entityCode)
    if (!this.entity) {
      Ext.Msg.alert('Error', 'Meta object with code "' + entityCode + '" is not accessible!')
    }
    this.entityTreePanel.setEntity(entityCode)
  },

   /**
   * Set new config from string
   * @param {String} source
   */
  setSource: function (source) {
    var config = Ext.decode(source)
    this.setConfig({items: [config]})
  },

  idCounter: 1,
  autoUpdate: true,

  constructor: function () {
    this.idCounter = 1
    this.autoUpdate = true
    this.callParent(arguments)
  },

    // get a new ID
  getNewId: function () {
    return 'form-gen-' + (this.idCounter++)
  },

  updateDesignerItem: function (config) {
    var me = this, parentPnl = me.pnlForBuilder
    if (parentPnl.items) {
      while (parentPnl.items.first()) {
        parentPnl.remove(parentPnl.items.first(), true)
      }
    }
    me.initBuilder(config.items)
    parentPnl.add(me.builderPanel)
    me.builderPanel.show()
  },

  initBuilder: function () {
    var me = this, root

    me.builderPanel = Ext.create('Ext.panel.Panel', {
      flex: 5,
      collapsible: false,
      border: false,
      bodyBorder: false,
      bodyStyle: 'padding: 10px; background-color: #434343;border:dashed green 1px;background-image: linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent);background-size:10px;',
      layout: {
        type: 'fit'
      },
      listeners: {
        boxready: function () {
          me.initBuilderDD()
        },
        scope: me
      }
    })

    root = me.componentTree.getRootNode()
    root.fEl = me.builderPanel
    root.elConfig = me.builderPanel.initialConfig
    me.builderPanel._nodeID = root.get('id') //  _node = root;
  },

  initBuilderDD: function () {
    var me = this
    me.builderPanel.getEl().on('click', function (e, el) {
      e.preventDefault()

      var node = me.getNodeForEl(el)
      if (!node) { node = me.componentTree.getRootNode() }
      me.highlightElement(node.fEl.getEl())
      me.setCurrentNode(node, true)
      me.dropResizer()
    })

    me.builderPanel.getEl().on('contextmenu', function (e, el) {
      e.preventDefault()
      var node = me.getNodeForEl(el)
      if (!node) { return }
      me.dropResizer()
      me.highlightElement(node.fEl.getEl())
      me.setCurrentNode(node, true)
      me.contextMenu.node = node
      me.contextMenu.showAt(e.getXY())
    }, this)

    me.builderPanel.dropZone = Ext.create('Ext.dd.DropZone', me.builderPanel.getEl(), {
      ddGroup: 'main',
      dragGroup: 'main',
      dropGroup: 'main',
      enableDrag: false,
      enableDrop: true,

      notifyOver: function (src, e, data) {
        var node = me.getNodeForEl(e.getTarget())
        if (node) {
          data.node = node
          me.componentTree.getSelectionModel().select(node)
          me.highlightElement(node.fEl.getEl())
          if (me.canAppend({}, node) === true) {
            return Ext.dd.DropZone.prototype.dropAllowed // true;
          } else {
            data.node = null
            return Ext.dd.DropZone.prototype.dropNotAllowed // false;
          }
        } else {
          data.node = null
          return Ext.dd.DropZone.prototype.dropNotAllowed  // false;
        }
      },

      notifyOut: function (src, e, data) {
        data.node = null
      },

      onContainerDrop: function (dd, e, data) {
        var record, c, comp, config, fnode,
          propertyCode, entityCode, property
        if (data && data.records && Ext.isArray(data.records) && data.records.length > 0) {
          record = data.records[0]
        }

        if (!record) {
          return false
        }

        // Components
        if (record.component && record.component.defConfig) {
          comp = record.component
          c = comp.defConfig
          if (_.isFunction(c)) {
            c.call(
              me,
              function (fconfig) {
                fnode = me.appendConfig(fconfig, data.node, true, true)
                me.setCurrentNode(fnode, true)
              },
              data.node.elConfig
            )
            return true
          } else {
            fnode = me.appendConfig(Ext.clone(c), data.node, true, true)
            me.setCurrentNode(fnode, true)
          }
          return true
        }

        // add new node from UB properties
        propertyCode = record.get('id')
        entityCode = record.get('parentId')
        property = me.entity.attributes[propertyCode]
        if (entityCode === me.entityCode && property) {
          config = { attributeName: propertyCode }
          fnode = me.appendConfig(config, data.node, true, true)
          me.setCurrentNode(fnode, true)
          return true
        }
        return false
      },

      onNodeDrop: function (target, dd, e, data) {
        return this.onContainerDrop(dd, e, data)
      }
    })
  },

  // return the node corresponding to an element (search upward)
  getNodeForEl: function (el) {
    var search = 0
    var target = null
    while (search < 10) {
      target = Ext.ComponentMgr.get(el.id)
      if (target && target._nodeID) {
        return this.getNodeByID(target._nodeID)
      }
      el = el.parentNode
      if (!el) { break }
      search++
    }
    return null
  },
  // hide select layers (e is click event)
  hideHighligt: function (e) {
    var bEl
    if (e) { e.preventDefault() }
    if (this.builderPanel && (bEl = this.builderPanel.getEl())) {
      bEl.select('.selectedElement').removeCls('selectedElement')
      bEl.select('.selectedElementParent').removeCls('selectedElementParent')
    }
  },

  // hilight an element
  highlightElement: function (el) {
    var elParent
    if (el === this.builderPanel.getEl()) { return }
    if (el) {
      elParent = el.findParent('.x-form-element', 5, true)
      this.hideHighligt()
      if (elParent) { elParent.addCls('selectedElementParent') }
      el.addCls('selectedElement')
    }
  },

  initComponentTree: function () {
    var me = this, tree, root, contextMenu

    me.componentTree = tree = Ext.create('Ext.tree.TreePanel', {
      collapsible: false,
      useArrows: true,
      cls: 'no-leaf-icons no-parent-icons',
      flex: 1,
      viewConfig: {
        plugins: {
          ptype: 'treeviewdragdrop',
          ddGroup: 'main',
          dragGroup: 'main',
          dropGroup: 'main',
          enableDrag: true,
          enableDrop: true
        },
        listeners: {
          nodedragover: function (targetNode, position, dragData) {
            var tnode = targetNode
            if (position === 'before' || position === 'after') {
              tnode = tnode.parentNode
            }
            if (!tnode) { return false }
            me.highlightElement(tnode.fEl.getEl())
            return (me.canAppend({}, tnode) === true)
          },
          beforedrop: function (node, data, overModel, dropPosition, dropHandlers) {
            var record, config, fnode, parentNode, beforeNode = null,
              propertyCode, entityCode, property
            if (data.records && Ext.isArray(data.records) && data.records.length === 1) {
              record = data.records[0]
            }
            if (!record) {
              return false
            }

            if (record.fEl) { // move node
              this.markUndo('Moved ' + record.get('text'))
              dropHandlers.processDrop()
              return true
            }

            parentNode = overModel
            if (dropPosition === 'before') {
              beforeNode = overModel
              parentNode = overModel.parentNode
            }
            if (dropPosition === 'after') {
              beforeNode = overModel.nextSibling
              parentNode = overModel.parentNode
            }
            // add new node from components
            if (record.component) {
              config = record.component.defConfig

              if (_.isFunction(config)) {
                config.call(
                  me,
                  function (config) {
                    fnode = me.appendConfig(config, parentNode, true, true, beforeNode)
                    me.setCurrentNode(fnode, true)
                  },
                  parentNode.elConfig // overModel.elConfig
                )
                return true
              } else {
                fnode = me.appendConfig(Ext.clone(config), parentNode, true, true, beforeNode)
                me.setCurrentNode(fnode, true)
              }
              dropHandlers.cancelDrop()
              me.updateForm(false, parentNode)
              return true
            }

            // add new node from UB properties
            propertyCode = record.get('id')
            entityCode = record.get('parentId')
            property = me.entity.attributes[propertyCode]
            if (entityCode === me.entityCode && property) {
              config = { attributeName: propertyCode }
              fnode = me.appendConfig(config, parentNode, true, true, beforeNode)
              me.setCurrentNode(fnode, true)
              dropHandlers.cancelDrop()
              me.updateForm(false, parentNode)
              return true
            }
            return false
          },
          drop: function (node, data, overModel, dropPosition) {
            var record, parentNode
            if (data.records && Ext.isArray(data.records) && data.records.length === 1) {
              record = data.records[0]
            }
            if (!record || !record.fEl) { // only for moving node
              return false
            }
            parentNode = overModel
            if (dropPosition !== 'before' && dropPosition !== 'after') {
              parentNode = parentNode.parentNode || parentNode
            }
            me.updateForm(false, parentNode)
          },
          scope: me
        }
      },
      store: Ext.create('Ext.data.TreeStore'),
      selModel: Ext.create('Ext.selection.TreeModel')
    })

    me.componentTreeStore = me.componentTree.getStore()

    // get first selected node
    tree.getSelectedNode = function () {
      var selected = this.selModel.getSelection()
      if (selected && selected.length) {
        return selected[0]
      }
      return null
    }

    tree.on('itemclick', function (tree, record, item, index, e) {
      var node = record
      e.preventDefault()
      if (!node.fEl || !node.fEl.getEl()) { return }
      me.highlightElement(node.fEl.getEl())
      me.setCurrentNode(node)
      me.dropResizer()
    }, this)

    contextMenu = Ext.create('Ext.menu.Menu', {items: [{
      text: 'Delete this element',
      iconCls: 'icon-deleteEl',
      scope: me,
      handler: function () {
        me.removeNode(contextMenu.node)
      }
    },

    {
      text: 'Visual resize / move',
      tooltip: 'Visual resize the element.<br/>You can move it too if in an <b>absolute</b> layout',
      iconCls: 'icon-resize',
      scope: me,
      handler: function () {
        me.visualResize(contextMenu.node)
      }
    }]})

    tree.on('itemcontextmenu', function (sender, record, item, index, e) {
      var xnode = record
      e.preventDefault()
      if (xnode !== me.componentTree.root) {
        contextMenu.node = xnode
        contextMenu.showAt(e.getXY())
      }
    }, this)

    me.contextMenu = contextMenu

    root = {
      text: 'Designer root',
      id: me.getNewId(),
      draggable: false
    }
    tree.setRootNode(root)
    root.fEl = me.builderPanel
    root.elConfig = {}
  },

    // show the layer to visually resize / move element
  visualResize: function (node) {
    var me = this

    if (!node || node === me.componentTree.getRootNode() || !node.fEl) { return }
    if (node.parentNode && node.parentNode.elConfig && node.parentNode.elConfig.layout === 'fit') {
      Ext.Msg.alert('Error', "You won't be able to resize an element" +
                " contained in a 'fit' layout.<br/>Update the parent element instead.")
    } else {
      me.wrapResizer(node)
    }
  },

  dropResizer: function () {
    var me = this
    if (me.dragger) {
      Ext.destroy(me.dragger)
      me.dragger = null
    }
    if (me.resizer) {
      Ext.destroy(me.resizer)
      me.resizer = null
    }
    if (me.resizerComponent) {
      me.resizerComponent = null
    }
  },

  wrapResizer: function (node) {
    var me = this, resizer, component
    component = node.fEl
    me.dropResizer()
    me.resizer = resizer = Ext.create('Ext.resizer.Resizer', {
      target: component,
      pinned: true,
      dynamic: true,
      handles: 'all', // shorthand for 'n s e w ne nw se sw'
      listeners: {
        beforeresize: function (sender, width, height, e) {
          me.resizer.startWidth = width
          me.resizer.startHeight = height
        },
        resize: function (sender, width, height, e) {
          if (!node || !node.elConfig) { return false }
          me.markUndo('Resize element to ')
                    // var s = node.fEl.getEl().getSize();
          if (me.resizer.startWidth !== width) {
            node.elConfig.width = width
            if (node.parentNode.elConfig.layout === 'column') {
              delete node.elConfig.columnWidth
            }
          }
          if (me.resizer.startHeight !== height) {
            node.elConfig.height = height
            delete node.elConfig.autoHeight
          }
          me.dropResizer()
          me.updateForm(true, node.parentNode)
          me.setCurrentNode(node)
          me.highlightElement(node.fEl.getEl())
          this.wrapResizer(node)
        },
        scope: me
      }
    })
    resizer.node = node

    var dragTarget = new Ext.Component({
      el: resizer.getEl(),
      rendered: true,
      container: component.container
    })

    var ddConfig = {
      el: dragTarget.getEl(),
      constrainTo: me.container,
      listeners: {
        dragend: function (sender, e, eOpts) {
          if (!node || !node.elConfig) { return false }
          var pos = component.getXY()
          var pPos = node.parentNode.fEl.body.getXY()
          var x = pos[0] - pPos[0]
          var y = pos[1] - pPos[1]
          me.markUndo('Move element to ' + x + 'x' + y)
          node.elConfig.x = x
          node.elConfig.y = y
          me.dropResizer()
          me.updateForm(true, node.parentNode)
          me.setCurrentNode(node)
          me.highlightElement(node.fEl.getEl())
          this.wrapResizer(node)
        },
        scope: me
      }
    }
    me.dragger = Ext.create('Ext.util.ComponentDragger', dragTarget, ddConfig)
    me.resizerComponent = dragTarget
  },

  /**
   * getNodeByID
   * @param {String} ID
   * @return {Ext.data.NodeInterface}
   */
  getNodeByID: function (ID) {
    return this.componentTreeStore.getNodeById(ID)
  },

  initBaseComponents: function () {
    var tree, root
    this.baseComponents = tree = Ext.create('Ext.tree.TreePanel', {
      collapsible: false,
      useArrows: true,
      rootVisible: false,
      cls: 'no-leaf-icons no-parent-icons',
      flex: 1,
      store: Ext.create('Ext.data.TreeStore'),
      selModel: Ext.create('Ext.selection.TreeModel'),
      draggable: true,
      viewConfig: {
        plugins: {
          ptype: 'treeviewdragdrop',
          ddGroup: 'main',
          dragGroup: 'main',
          dropGroup: 'main',
          enableDrag: true,
          allowContainerDrops: true,
          enableDrop: false
        }
      }
    })

    // get first selected node
    tree.getSelectedNode = function () {
      var selected = this.selModel.getSelection()
      if (selected && selected.length) {
        return selected[0]
      }
      return null
    }
    root = {
      text: 'root',
      draggable: false
    }
    root = tree.setRootNode(root)
    UB.ux.designer.ComponentInfo.fillComponentsTree(root)
  },

  initPropertyGrid: function () {
    var me = this, grid

    me.propertyGrid = grid = Ext.create('UB.ux.designer.PropertyGrid', {
      convertStringToObject: true,
      height: '100%',
      listeners: {
        propchanged: function (sender, recordId, value, baseConfig) {
          this.markUndo('Set <i>' + recordId + '</i> to "' +
                        Ext.util.Format.ellipsis(value, 20) + '"')
          var node = sender.currentNode
          me.updateNode(sender.currentNode)
          me.updateForm(false, node.parentNode || node)
        },
        scope: me
      }
    })

    var contextMenu = Ext.create('Ext.menu.Menu', {items: [{
      id: 'FBMenuPropertyDelete',
      iconCls: 'icon-delete',
      text: 'Delete this property',
      scope: this,
      handler: function (item, e) {
        me.markUndo('Delete property <i>' + item.record.get('name') + '</i>')
        var ds = grid.getStore()
        var pname = item.record.get('name')
        ds.remove(pname)
        delete item.record
        delete grid.baseConfig[pname]
        me.updateNode(grid.currentNode)
        var node = grid.currentNode.parentNode || grid.currentNode
        me.updateForm(false, node)
      }
    }]})

    // property grid contextMenu
    grid.on('itemcontextmenu', function (sender, record, item, index, e) {    // 'rowcontextmenu', function(g, idx, e) {
      e.stopEvent()
      if (!record) { return false }
      var i = contextMenu.items.get('FBMenuPropertyDelete')
      i.setText('Delete property "' + record.get('name') + '"')
      i.record = record
      contextMenu.showAt(e.getXY())
    }, grid)
  },

  // return true if config can be added to node, or an error message if it cannot
  canAppend: function (config, node) {
    var xtype, root = this.componentTree.getRootNode()
    if (node === root && root.hasChildNodes()) {
      return 'Only one element can be directly under the GUI Builder'
    }
    xtype = (node && node.elConfig) ? node.elConfig.xtype : null

    if (xtype && !UB.ux.designer.ComponentInfo.isContainer(xtype)) {
      return 'You cannot add element under type "' + xtype + '"'
    }
    return true
  },

  /**
   * node text created from config of el
   * @param {Object} c Config object
   * @return {String}
   */
  configToText: function (c) {
    var txt = []
    c = c || {}
    if (c.attributeName) { txt.push(this.entityCode + '.' + c.attributeName) }
    if (c.xtype) { txt.push(c.xtype) }
    if (c.fieldLabel) { txt.push('[' + c.fieldLabel + ']') }
    if (c.boxLabel) { txt.push('[' + c.boxLabel + ']') }
    if (c.layout) { txt.push('<i>' + c.layout + '</i>') }
    if (c.title) { txt.push('<b>' + c.title + '</b>') }
    if (c.text) { txt.push('<b>' + c.text + '</b>') }
    if (c.region) { txt.push('<i>(' + c.region + ')</i>') }

    return (txt.length === 0 ? 'Element' : txt.join(' '))
  },

  /**
   * add a config to the tree
   * @param config
   * @param {Ext.data.NodeInterface} appendTo
   * @param {Boolean} [doUpdate] (Optional) make updateForm
   * @param {Boolean} [markUndo] (Optional)
   * @param {Ext.data.NodeInterface} [beforeNode] (Optional)
   * @return {*}
   */
  appendConfig: function (config, appendTo, doUpdate, markUndo, beforeNode) {
    var me = this, canAppend, items, id, newNode, i
    if (!appendTo) {
      appendTo = me.componentTree.getSelectedNode() || me.componentTree.getRootNode()
    }
    canAppend = me.canAppend(config, appendTo)
    if (canAppend !== true) {
      Ext.Msg.alert('Unable to add element', canAppend)
      return false
    }
    items = config.items
    delete config.items
    id = me.getNewId()
    newNode = {
      id: id,
            // leaf: true,
      draggable: true,
      text: me.configToText(config)
    }
    Ext.Object.each(config, function (propCode, prop) {
      if (prop === null) {
        delete config[propCode]
      }
    })

    if (markUndo === true) {
      me.markUndo('Add ' + newNode.text)
    }

    if (beforeNode) {
      newNode = appendTo.insertBefore(newNode, beforeNode)
    } else {
      newNode = appendTo.appendChild(newNode)
    }
    newNode.elConfig = config
    if (items && items.length) {
      for (i = 0; i < items.length; i++) {
        me.appendConfig(items[i], newNode, false)
      }
    }
    if (doUpdate !== false) {
      me.updateForm(false, newNode)
    }
    me.fireEvent('change', me)
    return newNode
  },

  // remove a node
  removeNode: function (node) {
    var me = this
    if (!node || node === me.componentTree.getRootNode()) { return }
    me.markUndo('Remove ' + node.text)
    var nextNode = node.nextSibling || node.parentNode
    var pNode = node.parentNode
    pNode.removeChild(node)
    me.updateForm(false, pNode)
    me.setCurrentNode(nextNode, true)
  },

  addChildComponent: function (component, config) {
    var items, newCompomemt

    if (config.items) {
      items = config.items
      delete config.items
    }
    newCompomemt = component.add([config])[0]
    if (newCompomemt.doLayout) {
      newCompomemt.doLayout()
    }

    if (items) {
      for (var i = 0; i < items.length; i++) {
        this.addChildComponent(newCompomemt, items[i])
      }
      newCompomemt.doLayout()
    }
  },

  prepareDfmItems: function (items) {
    var
      ubCommand = UB.core.UBCommand,
      entity = this.entity,
      item, attribute

    if (!Ext.isArray(items)) {
      return
    }

    for (var i = 0, len = items.length; i < len; ++i) {
      item = items[i]
      if (Ext.isString(item.attributeName)) {
        attribute = entity.attr(item.attributeName)
        if (attribute) {
          var cmpConfig = UB.core.UBUtil.attribute2cmpConfig(entity, item)
          Ext.applyIf(item,
            Ext.applyIf(cmpConfig,
              {ubName: ubCommand.getUBCmpUBName(item.attributeName)}
            )
          )
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
        this.prepareDfmItems(item.items)
      }
    }
  },

    /**
     *  Convert config for show
     * @param {Object} items
     */
  convertConfigItems: function (items) {
    var item

    if (!Ext.isArray(items)) {
      return
    }

    for (var i = 0, len = items.length; i < len; ++i) {
      item = items[i]
      if (item.parentConfig) {
        Ext.apply(item, item.parentConfig)
      }
      item.isDesignMode = true
      item.isFormField = false
      if (item.items) {
        this.convertConfigItems(item.items)
      }
    }
  },

  // update the form
  setFormConfig: function (configIn, el) {
    var me = this, itmConf, start,
      config = Ext.clone(configIn)

    start = new Date().getTime()
    el = el || me.builderPanel

    if (el === me.builderPanel && config.items && config.items.length === 1) {
      itmConf = config.items[0]
      if (!itmConf.bodyStyle) {
        itmConf.bodyStyle = 'background-color:#dfe9f6'
      }
    }

    // empty the form
    if (el.items) {
      while (el.items.first()) {
        el.remove(el.items.first(), true)
      }
    }

    if (el.doComponentLayout) {
      el.doComponentLayout()
    } else {
      el.update()
    }

    // adding items
    if (config.items) {
      me.prepareDfmItems(config.items)
      me.convertConfigItems(config.items)
      el.add(config.items)
    }
    el.doLayout()

    var time = new Date().getTime() - start
    return time
  },

  // remove all nodes
  removeAll: function () {
    var root = this.componentTree.getRootNode()
    while (root.firstChild) {
      root.removeChild(root.firstChild)
    }
  },

  /**
   * set config (remove then append a whole new config)
   * @param {Object} config
   * @return {Node}
   */
  setConfig: function (config) {
    var me = this, root, node, i
    if (!config || !config.items) { return false }
        // delete all items
    me.removeAll()
        // add all items
    root = me.componentTree.getRootNode()
    node = null
    for (i = 0; i < config.items.length; i++) {
      try {
        node = me.appendConfig(config.items[i], root, false)
      } catch (e) {
        Ext.Msg.alert('Error', 'Error while adding : ' + e.name + '<br/>' + e.message)
      }
    }
    me.updateForm(true, root.firstChild || root)
    return node || root
  },

  // Undo history
  initUndoHistory: function () {
    this.undoHistoryMax = 20
    this.undoHistory = []
  },

  // add current config to undo
  markUndo: function (text) {
    var me = this
    me.undoHistory.push({
      text: text, config: me.getTreeConfig()
    })
    if (me.undoHistory.length > me.undoHistoryMax) {
      me.undoHistory.splice(0, 1)
    }
    me.updateUndoBtn()
  },

  // update undo button according to undo history
  updateUndoBtn: function () {

  },

  // undo last change
  undo: function () {
    var undo = this.undoHistory.pop()
    this.updateUndoBtn()
    if (!undo || !undo.config) { return false }
    this.setConfig(undo.config)
    return true
  },

  // search upwards for a container to update
  searchForContainerToUpdate: function (node) {
     // search for a parent with border or column layout
    var me = this,
      found = null, root, n
    root = me.componentTree.getRootNode()
    n = node
    while (n !== root) {
      if (n && n.elConfig &&
                (n.elConfig.layout === 'border' ||
                    n.elConfig.layout === 'table' ||
                    n.elConfig.layout === 'column')) {
        found = n
      }
      n = n.parentNode
    }
    if (found !== null) { return found.parentNode }

    // no column parent, search for first container with items
    n = node
    while (n !== root) {
      if (!n.fEl || !n.fEl.items) {
        n = n.parentNode
      } else {
        break
      }
    }
    return n
  },

  getValue: function () {
    var config = this.getTreeConfig()
    if (config && config.items && config.items.length > 0) {
      config = config.items[0]
    }

    if (config.xtype) {
      delete config.xtype
    }

    config = JSON.stringify(config, function (key, value) {
      if (typeof value === 'function') {
        return value.toString()
      }
      return value
    }, '  ')
    return this.formPrefix + '\r\nexports.formDef = ' + config
  },

  setValue: function (formDef) {
    var exports = {}, config
    this.formPrefix = formDef.substr(0, formDef.indexOf('exports.formDef'))
    config = formDef.substr(formDef.indexOf('exports.formDef'));
    // eslint-disable-next-line no-new-func
    (new Function('exports', config))(exports)
    config = exports.formDef
    this.setConfig({flex: 1, items: [config]})
  },

  /**
   *  get the tree config at the specified node
   * @param {Ext.data.NodeInterface} node
   * @param {Boolean} [addNodeInfos] (Optional)
   * @return {Ext.data.NodeInterface}
   */
  getTreeConfig: function (node, addNodeInfos) {
    var me = this, items, config
    if (!node) {
      node = me.componentTree.getRootNode()
    }
    config = Ext.apply({}, node.elConfig)

    if (addNodeInfos) {
      config._nodeID = node.get('id')
    }

    items = []
    node.eachChild(function (n) {
      items.push(me.getTreeConfig(n, addNodeInfos))
    }, me)

    if (items.length > 0) {
      config.items = items
    } else if (config.xtype === 'form') {
      config.items = {}
    } else {
      delete config.items
    }
    return config
  },

  // update node.fEl._node associations
  updateTreeEls: function (el, updateLayout) {
    var me = this, node
    if (!el) {
      el = this.builderPanel
    }
    if (el._nodeID) {
      node = me.getNodeByID(el._nodeID)
      node.fEl = el
    }
    if (!el.items) {
      // el.update();
      return
    }
    if (el.items.each) {
      el.items.each(function (itm) {
        try {
          me.updateTreeEls(itm, updateLayout)
        } catch (e) {
        }
      }, me)
    }
  },

  updateNode: function (node) {
    if (!node) { return }
    node.set('text', this.configToText(node.elConfig))
    if (node.elConfig.id && node.elConfig.id !== node.get('id')) {
      node.set('id', node.elConfig.id)
    }
  },

    /**
     * update the form at the specified node (if force or autoUpdate is true)
     * @param {Boolean} force
     * @param {Ext.data.NodeInterface} node
     */
  updateForm: function (force, node) {
    var me = this, updateTime,
      time = null, config,
      root = me.componentTree.getRootNode()
    node = node || root
    updateTime = (node === root)

    // search container to update, upwards
    node = me.searchForContainerToUpdate(node)

    if (force === true || me.autoUpdate) {
      config = me.getTreeConfig(node, true)
      time = me.setFormConfig(config, node.fEl)
      me.updateTreeEls(node.fEl, true)
      me.hideHighligt()
    }
  },

  /**
   * set element for property grid
   * @param node
   * @param select
   */
  setCurrentNode: function (node, select) {
    var me = this,
      p = me.propertyGrid,
      config, fconfig,
      ubCommand = UB.core.UBCommand
    p.enable()
    if (!node || !node.elConfig) {
      p.currentNode = null
      p.setSource({})
      p.disable()
    } else {
      config = node.elConfig
      fconfig = config

      if (config.attributeName) {
        fconfig = Ext.clone(config)
        Ext.applyIf(fconfig,
          Ext.applyIf(
            UB.core.UBUtil.attribute2cmpConfig(me.entity, fconfig), { ubName: ubCommand.getUBCmpUBName(fconfig.attributeName) }
          )
        )
      }

      p.setObject(config, fconfig)
      p.currentNode = node
      if (node.fEl === me.builderPanel) {
        p.disable()
      }
    }
    if (select) {
      me.componentTree.expandPath(node.getPath())
      me.componentTree.getSelectionModel().select(node)
    }
  }
})
