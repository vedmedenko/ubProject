/* global UB, Q, Blob, mxEvent, mxUtils, mxEditor, mxRubberband, mxCodec, mxBasePath, mxVertexHandler, mxCellRenderer, mxCell, mxGeometry, mxPoint, console, isDeveloperMode, mxRubberband */
/* eslint one-var: "off" */
/* eslint new-cap: ["error", { "newIsCap": false }] */
/* eslint no-unused-vars: "off" */

const mxLoader = require('../../ux/form/mxGraph.js')

/**
 * Metadata ER diagram editor.
 */
Ext.define('UB.ux.UBMetaDiagram', {
  extend: 'Ext.Panel',
  alias: 'widget.UBMetaDiagram',
  width: '100%',
  height: '100%',
  layout: 'fit',
  statics: {
    mixinPictures: {
      mStorage: '<i class="fa fa-database"></i>',
      dataHistory: '<i class="fa fa-clock-o"></i>',
      unity: '<i class="fa fa-toggle-off"></i>',
      tree: '<i class="fa fa-sitemap"></i>',
      fts: '<i class="fa fa-search"></i>',
      rls: '<i class="fa fa-tasks"></i>',
      als: '<i class="fa fa-table"></i>',
      aclRls: '<i class="fa fa-tasks">a</i>',
      audit: '<i class="fa fa-pencil-square-o"></i>',
      softLock: '<i class="fa fa-key"></i>',
      clobTruncate: 'ct'
    }
  },
  initComponent: function () {
    var me = this, id, html, toolbarHtml, outlineHtml

    me.addEvents('change')
    me.items = me.items || []
    me.initObjectTree()

    Ext.EventManager.on(document, 'mouseup', me.onmouseUpFunc, me)
    Ext.EventManager.on(document, 'mousemove', me.onmousemoveFunc, me)

    me.idPrefix = Ext.id(null)
    me.containerId = id = me.idPrefix + 'graph'
    html = '<div id="' + id + '" class="graph-editor-holder" style="width: 100%; height: 100%;-moz-user-select: none; -webkit-user-select: none; -ms-user-select:none; user-select:none;" tabindex="0"></div>'

    me.editPnl = Ext.create('Ext.panel.Panel', {
      // layout: 'fit',
      region: 'center',
      cls: 'mx-graph-editor',
      flex: 1,
      html: html,
      listeners: {
        boxready: function (/* sender */) {
          mxLoader.initAndCall().then(function () {
            me.initMXEditor()
          })
        },
        resize: function () {
          if (this.editor && this.editor.graph) {
            this.editor.graph.sizeDidChange()
          }
        },
        scope: me
      }
    })

    me.toolbarId = id = me.idPrefix + 'toolbar'
    toolbarHtml = '<div id="' + id + '" tabindex="0"></div>'
    me.outlineId = id = me.idPrefix + 'outline'
    outlineHtml = '<div id="' + id + '" ></div>'
    me.menuPnl = Ext.create('Ext.panel.Panel', {
      height: '100%',
      region: 'west',
      split: true,
      collapsible: true,
      width: 250,
      layout: {
        type: 'border'
      },
      items: [
        {
          xtype: 'tabpanel',
          region: 'center',
          deferredRender: false,
          split: true,
          height: 'auto',
          bodyStyle: 'background:white;',
          items: [
            me.objectTree,
            {
              xtype: 'panel',
              region: 'center',
              autoRender: true,
              title: UB.i18n('toolbar'),
              html: toolbarHtml,
              listeners: {
                boxready: function (sender) {
                                        // Ext.get(me.toolbarId).dom.appendChild(me.editor.toolbar.toolbar.container);
                },
                scope: me
              }

            }
          ]
        },
        {
          xtype: 'panel',
          region: 'south',
          split: true,
          height: 160,
          fit: 2,
                    // layout: 'fit',
          html: outlineHtml
        }
      ]
    })

    var innerPnl = Ext.create('Ext.panel.Panel', {
      layout: {
        type: 'border'
      },
      defaults: {
        split: true
      },
      items: [
        me.menuPnl,
        me.editPnl
      ]
    })
    me.items.push(innerPnl)

    me.callParent(arguments)
  },

  isDirty: function () {
    return (this.editor ? this.editor.isModified() : false)
  },

  onmousemoveFunc: function (evnt) {
    var me = this
    if (!me.dragDropObj || !me.dragDropObj.dragElm) {
      return
    }
    var currXY = evnt.getXY()
    Ext.get(me.dragDropObj.dragElm).position('absolute', me.dragDropObj.dragElm.style.zIndex, currXY[0], currXY[1])
  },

  onmouseUpFunc: function (e) {
    var me = this, x, y, pt
    if (!me.dragDropObj) {
      return
    }
    if (!me.graphDivEl) {
      return
    }

    if (me.dragDropObj.dragElm) {
      me.dragDropObj.dragElm.parentNode.removeChild(me.dragDropObj.dragElm)
    }
    x = e.getX()
    y = e.getY()
    if (me.graphDivEl.getX() > x ||
            me.graphDivEl.getX() + me.graphDivEl.getWidth() < x ||
            me.graphDivEl.getY() > y ||
            me.graphDivEl.getY() + me.graphDivEl.getHeight() < y) {
      me.dragDropObj = null
      return
    }
    x = mxEvent.getClientX(e.browserEvent)
    y = mxEvent.getClientY(e.browserEvent)
    pt = mxUtils.convertPoint(me.editor.graph.container, x, y)

    me.addObjectToDiagram(pt, me.dragDropObj)
    me.dragDropObj = null
  },

  addObjectToDiagram: function (pt, config) {
    var me = this, vertex, doc, node, metaObj, objLinks = {}, linkmetaObj, lnkType,
      objCode = config.objectName, objExists = false, lnk

        // find exist UB obj
    Ext.Object.each(me.editor.graph.model.cells, function (id, cell) {
      var objectCode = cell.getAttribute('objectCode')
      if (!objectCode) {
        return true
      }
      if (objCode.toUpperCase() === objectCode.toUpperCase()) {
        objExists = true
        return false
      }
    }, me)

    if (objExists) {
      $App.dialogError('Object exist in diagram').done()
      return false
    }
    doc = mxUtils.createXmlDocument()
    node = doc.createElement('ubObject')
    node.setAttribute('label', objCode)
    node.setAttribute('objectCode', objCode)
    // ;verticalAlign=top;align=left;spacingLeft=36; overflow=fill; shape=component; spacingTop=2;spacingLeft=2;spacingRight=2;spacingBottom=2;
    vertex = new mxCell(node, new mxGeometry(0, 0, 187, 147), 'verticalAlign=top;align=left;overflow=fill;html=1')
    vertex.vertex = true
    // vertex.setId(me.dragDropObj.objectName);

    metaObj = $App.domainInfo.get(objCode)

    me.editor.addVertex(null, vertex, pt.x, pt.y) // me.editor.graph.getDefaultParent()

    metaObj.eachAttribute(function (attr, attrCode) {
      if (Ext.String.startsWith(attrCode, 'mi_', true)) {
        return true
      }
      if (attr.dataType === 'Entity' && attrCode.toUpperCase() !== 'ID') {
        lnk = objLinks[attr.associatedEntity]
        if (!lnk) {
          objLinks[attr.associatedEntity] = lnk = []
        }
        lnk.push({ linkType: 'relation',
          srcObj: objCode,
          srcProp: attrCode,
          destObj: attr.associatedEntity,
          destProp: 'ID' })
      }
    })

    if (metaObj.mixins && metaObj.mixins.unity /* && metaObj.mixins.unity.enabled */) {
      lnk = objLinks[metaObj.mixins.unity.entity]
      if (!lnk) {
        objLinks[metaObj.mixins.unity.entity] = lnk = []
      }
      lnk.push({ linkType: 'inheritage',
        srcObj: objCode,
        srcProp: 'ID',
        destObj: metaObj.mixins.unity.entity,
        destProp: 'ID' })
    }

    Ext.Object.each(me.editor.graph.model.cells, function (id, cell) {
      var objectCode = cell.getAttribute('objectCode')
      if (!objectCode) {
        return true
      }
      linkmetaObj = $App.domainInfo.get(objectCode)
      if (!linkmetaObj) {
        return true
      }

            // other objects inherited from me
      if (linkmetaObj.mixins && linkmetaObj.mixins.unity && /* linkmetaObj.mixins.unity.enabled && */
                linkmetaObj.mixins.unity.entity === objCode) {
        lnkType = { linkType: 'inheritage',
          srcObj: objectCode,
          srcProp: 'ID',
          destObj: objCode,
          destProp: 'ID' }
        me.editor.graph.addEdge(me.createEdge(lnkType), null, cell, vertex)
      }

           // obj link to other
      if (objLinks[objectCode]) {
        Ext.Array.each(objLinks[objectCode], function (val) {
          me.editor.graph.addEdge(me.createEdge(val), null, vertex, cell)
        }, me)
      }
            // other objs link to me (if is not inner link)
      if (objectCode !== objCode) {
        linkmetaObj.eachAttribute(function (attr, attrCode) {
          if (Ext.String.startsWith(attrCode, 'mi_', true)) {
            return true
          }
          if (attr.dataType === 'Entity' && attrCode.toUpperCase() !== 'ID' && attr.associatedEntity === objCode) {
            lnkType = { linkType: 'relation',
              srcObj: objectCode,
              srcProp: attrCode,
              destObj: objCode,
              destProp: 'ID' }
            me.editor.graph.addEdge(me.createEdge(lnkType), null, cell, vertex)
          }
        })
      }
    }, me)
  },

  createEdge: function (param) {
    var assoc, doc, node

    doc = mxUtils.createXmlDocument()
    node = doc.createElement('ubObject')

    node.setAttribute('linkType', param.linkType)
    node.setAttribute('srcObj', param.srcObj)
    node.setAttribute('srcProp', param.srcProp)
    node.setAttribute('destObj', param.destObj)
    node.setAttribute('destProp', param.destProp)

    if (param.linkType === 'relation') {
      assoc = new mxCell(node, new mxGeometry(0, 0, 0, 0),
                'endArrow=open;endSize=10;startArrow=diamondThin;startSize=10;startFill=0;edgeStyle=orthogonalEdgeStyle;')
      assoc.geometry.setTerminalPoint(new mxPoint(0, 0), true)
      assoc.geometry.setTerminalPoint(new mxPoint(80, 0), true)
      assoc.geometry.setTerminalPoint(new mxPoint(160, 0), false)
      assoc.edge = true
    }
    // segmentEdgeStyle orthogonalEdgeStyle
    if (param.linkType === 'inheritage') {
      assoc = new mxCell(node, new mxGeometry(0, 0, 0, 0), 'endArrow=block;endSize=10;endFill=0;startArrow=oval;startFill=0;startSize=7;edgeStyle=segmentEdgeStyle;fillColor=#0B31D9;strokeColor=#0B31D9;')
      assoc.geometry.setTerminalPoint(new mxPoint(0, 0), true)
      assoc.geometry.setTerminalPoint(new mxPoint(80, 0), true)
      assoc.geometry.setTerminalPoint(new mxPoint(160, 0), false)
      assoc.edge = true
    }

    // assoc.setAttribute('label', param.attributeFrom);
    return assoc
  },

  initObjectTree: function () {
    var ftree, me = this, store, detail = [], subsystems = {}

    $App.domainInfo.eachEntity(function (objVal, objName) {
      var subsystem = objVal.modelName
      var parentNode = subsystems[subsystem]
      if (!parentNode) {
        parentNode = {text: subsystem, expanded: false, children: [], icon: null}
        subsystems[subsystem] = parentNode
        detail.push(parentNode)
        parentNode.children.push({text: objName, leaf: true, icon: null, objCode: objName})
      } else {
        parentNode.children.push({text: objName, leaf: true, icon: null, objCode: objName})
      }
    })

    ftree = { root: { expanded: true, children: detail } }
    store = Ext.create('Ext.data.TreeStore', ftree)

    me.objectTree = Ext.create('Ext.tree.Panel', {
      title: UB.i18n('entities'),
      flex: 1,
      singleExpand: true,
      region: 'north',
      store: store,
      rootVisible: false,
      listeners: {
        itemmousedown: function (sender, record, item, index, e /*, eOpts */) {
          if (record.isLeaf()) {
            var dragElm, dragE, itemE, fXY, basewindow
            dragElm = document.createElement('DIV')
            basewindow = me.getContainer().getEl() // me.up('basewindow').getEl();
            document.documentElement.appendChild(dragElm)
            dragE = Ext.get(dragElm)
            itemE = Ext.get(item)
            dragElm.style.border = '1px solid black'
            dragElm.style.opacity = 1
            dragElm.style.backgroundColor = 'white'
            dragE.setWidth(itemE.getWidth())
            dragE.setHeight(itemE.getHeight())
            fXY = e.getXY()
            dragE.position('absolute', basewindow.dom.style.zIndex + 2, fXY[0], fXY[1])
            me.dragDropObj = {objectName: record.get('text'), dragElm: dragElm}
          }
        },
        scope: me
      }
    })
  },

  useBlobForData: true,

  getDataBlob: function () {
    var me = this
    if (!me.useBlobForData) {
      Ext.Error.raise('object does not use Blob')
    }
    return me.dataBlob
  },

  updateDataBlob: function (inblob) {
    var me = this
    if (!me.useBlobForData) {
      Ext.Error.raise('object does not use Blob')
    }
    // debugger;
    if (me.dataBlob && !Ext.isEmpty(this.objUrl)) {
      window.URL.revokeObjectURL(this.objUrl)
    }
    me.data = null
    me.dataBlob = inblob
    me.objUrl = window.URL.createObjectURL(inblob)
    me.data = me.objUrl
  },

  onDestroy: function () {
    var me = this
    // debugger;
    me.dataBlob = null
    me.data = null
    if (me.useBlobForData && !Ext.isEmpty(me.objUrl)) {
      window.URL.revokeObjectURL(me.objUrl)
    }
    me.objUrl = null
    this.callParent()
  },

  /**
   *
   * @param cfg
   * @returns(Promise)
   */
  setSrc: function (cfg) {
    var
      me = this,
      data = cfg.url,
      blobData = cfg.blobData,
      doInit

    doInit = function () {
      me.changeFired = true
      if (me.editor) {
        me.isInitEditor = true
        try {
          me.editor.open(me.objUrl)
        } finally {
          me.isInitEditor = false
        }
        me.validateDiagram()
        me.editor.setMode('select')
      }
      me.changeFired = false
    }

    me.dataUrl = data
    if (me.useBlobForData) {
      if (blobData) {
        me.updateDataBlob(blobData)
        doInit()
        return Q.resolve(true)
      } else {
        return $App.connection.get(me.dataUrl, {responseType: 'arraybuffer'})
        .then(function (response) {
          var blobData, pdfArray = response.data
          blobData = new Blob(
                [pdfArray],
                {type: cfg.contentType}
            )
          me.updateDataBlob(blobData)
          doInit()
        }).fail(function (reason) {
          if (reason.status === 404) {
            if (cfg.onContentNotFound) {
              cfg.onContentNotFound()
            } else {
              UB.showErrorWindow('<span style="color: red">' + UB.i18n('documentNotFound') + '<span/>')
            }
          }
        })
      }
    } else {
      me.objUrl = me.dataUrl
    }
    doInit()
    return Q.resolve(true)
  },

  validateDiagram: function () {
    var me = this, graph = me.editor.graph,
      metaObj, metaObjRef, objCode, cellEdge,
      srcObj, srcProp, destObj, destProp, linkType, lnkProp,
      existProps = {}, deleteEdge, graphObject = {}, isInheritage, hasInheritage

    Ext.Object.each(me.editor.graph.model.cells, function (id, cell) {
      objCode = cell.getAttribute('objectCode')
      if (!objCode) {
        return true
      }
      graphObject[objCode.toLowerCase()] = cell
    })

    Ext.Object.each(me.editor.graph.model.cells, function (id, cell) {
      objCode = cell.getAttribute('objectCode')
      if (!objCode) {
        return true
      }
      metaObj = $App.domainInfo.get(objCode)
           // удаляем устаревшие элементы в схеме
      if (!metaObj) {
        me.editor.graph.removeCells([cell], true)
        return true
      }
      hasInheritage = false
      for (var i = cell.getEdgeCount() - 1; i > -1; i--) {
        cellEdge = cell.getEdgeAt(i)
        // srcObj: , srcProp: , destObj: , destProp:
        srcObj = cellEdge.getAttribute('srcObj') || ''
        srcProp = cellEdge.getAttribute('srcProp') || ''
        destObj = cellEdge.getAttribute('destObj') || ''
        destProp = cellEdge.getAttribute('destProp') || ''
        linkType = cellEdge.getAttribute('linkType') || 'relation'
        isInheritage = (linkType === 'inheritage')
        deleteEdge = false

        switch (objCode) {
          case srcObj:
            lnkProp = metaObj.attr(srcProp)
            metaObjRef = $App.domainInfo.get(destObj)
            if (isInheritage) {
              deleteEdge = !lnkProp ||
                                !(metaObj.mixins && metaObj.mixins.unity && /** metaObj.mixins.unity.enabled && **/
                                    metaObj.mixins.unity.entity === destObj)
              hasInheritage = !deleteEdge
            } else {
              deleteEdge = !lnkProp || (lnkProp.dataType !== 'Entity') || (srcProp.toUpperCase() === 'ID') ||
                                (lnkProp.associatedEntity.toLowerCase() !== destObj.toLowerCase()) ||
                                (Ext.String.startsWith(srcProp.toLowerCase(), 'mi_', true))
            }
            deleteEdge = deleteEdge || !(graphObject[destObj.toLowerCase()])
            if (lnkProp) {
              existProps[srcProp] = lnkProp
            }
            break
          case destObj:
            lnkProp = metaObj.attr(destProp)
            deleteEdge = !lnkProp
            deleteEdge = deleteEdge || !(graphObject[srcObj.toLowerCase()])
            metaObjRef = $App.domainInfo.get(srcObj)
            break
          default : lnkProp = null; deleteEdge = true
        }
        if (!metaObjRef) {
          deleteEdge = true
        }
        if (deleteEdge) {
          graph.model.beginUpdate()
          try {
            graph.cellsRemoved([cellEdge])
            // graph.fireEvent(new mxEventObject(mxEvent.REMOVE_CELLS,
            //    'cells', cells, 'includeEdges', null));
          } finally {
            graph.model.endUpdate()
          }
        }
      }
       // добавляем отсутствующие элементы в схеме
      if (!hasInheritage && metaObj.mixins && metaObj.mixins.unity &&
               /** metaObj.mixins.unity.enabled &&**/ graphObject[metaObj.mixins.unity.entity]) {
        var val = { linkType: 'inheritage', srcObj: objCode, srcProp: 'ID', destObj: metaObj.mixins.unity.entity, destProp: 'ID' }
        me.editor.graph.addEdge(me.createEdge(val), null, cell, graphObject[metaObj.mixins.unity.entity])
      }

      Ext.Object.each(metaObj.attributes, function (attrCode, attr) {
        if (Ext.String.startsWith(attrCode, 'mi_', true)) {
          return true
        }
        if (attr.dataType === 'Entity' && (attrCode.toUpperCase() !== 'ID') && graphObject[attr.associatedEntity.toLowerCase()] &&
                    !existProps[attrCode]) {
          var val = { linkType: 'relation', srcObj: objCode, srcProp: attrCode, destObj: attr.associatedEntity, destProp: 'ID' }
          me.editor.graph.addEdge(me.createEdge(val), null, cell, graphObject[attr.associatedEntity.toLowerCase()])
        }
      })
    }, me)
  },

  /**
   * return either window or panel in which we born
   * @return {Ext.container.Container}
   */
  getContainer: function () {
    return this.up('basewindow') || this.up('basepanel')
  },

  initMXEditor: function () {
    var
      config = mxUtils.load('models/adminui-pub/resources/config/ubmetaeditor.xml').getDocumentElement(),
      me = this, editor, graph, div, mainWin
        // workfloweditor.xml

    mainWin = me.getContainer()

    me.editor = editor = new mxEditor(config)
    graph = editor.graph

    me.graphDivEl = Ext.get(me.containerId)
    div = me.graphDivEl.dom
    editor.setGraphContainer(div);

    (new Ext.Element(editor.toolbar.toolbar.container)).up('div.mxWindow').remove()
    Ext.get(me.toolbarId).dom.appendChild(editor.toolbar.toolbar.container)

    // key handler
    /*
    editor.keyHandler.handler.target = mainWin.getEl().dom;
    */
    editor.keyHandler.handler.target = me.getEl().dom
    mxEvent.addListener(editor.keyHandler.handler.target, 'keydown', editor.keyHandler.handler.keydownHandler)

    // graph.addListener(mxEvent.CELLS_REMOVED, Ext.bind(me.onCellRemoved,me));
    // graph.addListener(mxEvent.REMOVE_CELLS, Ext.bind(me.onCellRemove,me));
    editor.keyHandler.handler.isGraphEvent = function (evt) { return me.isGraphEvent(evt, this) }

    editor.setModified = function (value) {
      editor.modified = value
      if (value) {
        me.graphChanged()
      }
    }

    graph.popupMenuHandler.factoryMethod = mxUtils.bind(this, function (menu, cell, evt) {
      var frmDom = mainWin.getEl().dom
      menu.div.parent = frmDom
      menu.zIndex = frmDom.style.zIndex + 1
      menu.div.style.zIndex = frmDom.style.zIndex + 1

      // me.getel().style.zIndex;
      return editor.createPopupMenu(menu, cell, evt)
    })

    me.initGraph()

    editor.graph.cellsDisconnectable = false
    editor.graph.cellsCloneable = false
    editor.graph.allowDanglingEdges = false
    editor.graph.disconnectOnMove = false

    editor.showOutline()
    var el = (new Ext.Element(editor.outline.div)).down('div.mxWindowPane')
    Ext.get(me.outlineId).appendChild(el)
    editor.outline.setVisible(false) // MPV - hide native outline control

    editor._showTasks = editor.showTasks
    if (editor.tasks) {
      editor.tasks.destroy()
      editor.tasks = null
    }
    editor.showTasks = Ext.Function.bind(me.showTasks, me)
    editor.refreshTasks = Ext.Function.bind(me.refreshTasks, me)

    editor.properties = null
    editor.showProperties = Ext.Function.bind(me.showProperties, me)
    editor.hideProperties = Ext.Function.bind(me.hideProperties, me)

    /*
    editor.addAction('toggleOutline', function(editor)
    {
        if (editor.outline === null) {
            editor.showOutline();
        } else {
            editor.outline.setVisible(!editor.outline.isVisible());
        }
    });
    */

    editor.addAction('edit', function (editorprm, cell /*, evt */) {
      if (cell) {
        var objectCode = cell.getAttribute('objectCode')
        if (objectCode) {
          me.showEntityForm(objectCode)
        } else {
          if (editor.graph.isEnabled() && editor.graph.isCellEditable(cell)) {
            editor.graph.startEditingAtCell(cell)
          }
        }
      }
    })

    graph.getTooltipForCell = me.getTooltipForCell
    graph.tooltipHandler.zIndex = mainWin.getEl().dom.style.zIndex + 1

    graph.setResizeContainer(true)
    // graph.setEnabled(false);

    // Enables rubberband selection
    /* jshint nonew: false */
    /* eslint no-new: "off" */
    new mxRubberband(graph)
    graph.setPanning(true)
    graph.setTooltips(true)

    if (me.objUrl) {
      me.isInitEditor = true
      try {
        me.editor.open(me.objUrl)
      } finally {
        me.isInitEditor = false
      }
    }
  },

  showEntityForm: function (entityCode) {
    var me = this, storeData, mixData, entity, edtAttr, edtMixin, onTextFieldChange, gridProp
    if (!me.editEntityFrm) {
      storeData = Ext.create('Ext.data.Store', {
        fields: ['code', 'caption', 'size', 'dataType', 'associatedEntity', 'accessType', 'allowNull', 'isUnique', 'defaultValue', 'allowSort'],
        data: {attributes: [{}]}, // colData,
        proxy: {
          type: 'memory',
          reader: {
            type: 'json',
            root: 'attributes'
          }
        }
      })
      mixData = Ext.create('Ext.data.Store', {
        fields: ['icon', 'code', 'enabled'],
        proxy: {
          type: 'memory',
          reader: {
            type: 'json',
            root: 'mixins'
          }
        }
      })
      me.editEntityFrm = Ext.create('UB.view.BaseWindow', {
        title: 'Entity',
        height: 500,
        width: 600,
        closeAction: 'hide',
        autoDestroy: false,
        modal: true,
        stateful: true,
        stateId: 'ubMetaDiagrm_entityform',
        layout: { type: 'border' },
        items: [{
          xtype: 'tabpanel',
          deferredRender: false,
          region: 'center',
          items: [
            {
              title: UB.i18n('AsTаble'),
              layout: { type: 'border' },
              items: [
                gridProp = Ext.create('Ext.grid.Panel',
                  {
                    tbar: ['Search', {
                      xtype: 'textfield',
                      name: 'searchField',
                      hideLabel: true,
                      width: 200,
                      listeners: {
                        change: {
                          fn: function () { onTextFieldChange(this) },
                          buffer: 100
                        }
                      }
                    }
                    ],
                    region: 'center',
                    split: true,
                    itemId: 'colGrid',
                    flex: 1,
                    title: UB.i18n('Attributes'),
                    store: storeData,
                    columns: [
                      { text: UB.i18n('code'), dataIndex: 'code' },
                      { text: UB.i18n('caption'), dataIndex: 'caption' },
                      { text: UB.i18n('dataType'), dataIndex: 'dataType' },
                      { text: UB.i18n('size'), width: 60, dataIndex: 'size' },
                      { text: UB.i18n('associatedEntity'), dataIndex: 'associatedEntity' },
                      { text: UB.i18n('accessType'), dataIndex: 'accessType' },
                      { text: UB.i18n('allowNull'), width: 50, dataIndex: 'allowNull' },
                      { text: UB.i18n('isUnique'), width: 50, dataIndex: 'isUnique' },
                      { text: UB.i18n('defaultValue'), dataIndex: 'defaultValue' },
                      { text: UB.i18n('allowSort'), width: 50, dataIndex: 'allowSort' }
                    ],
                    listeners: {
                      select: function (grd, record/*, index, eOpts */) {
                        var prop = me.editEntityFrmEditor.selEntity.attributes[record.get('code')]

                        edtAttr.setValue(record.get('code') + ' =\n' +
                          JSON.stringify(prop, null, '\t')
                        )
                      },
                      scope: me
                    }
                  }),
                {
                  xtype: 'ubcodemirror',
                  mode: 'application/x-javascript',
                  itemId: 'edtAttr',
                  width: 250,
                  region: 'east',
                  showLineNumbers: false,
                  split: true
                },
                {
                  height: 120,
                  region: 'south',
                  layout: { type: 'border' },
                  split: true,
                  items: [
                    {
                      xtype: 'gridpanel',
                      region: 'center',
                      split: true,
                      itemId: 'mixGrid',
                      flex: 1,
                      title: UB.i18n('Mixins'),
                      store: mixData,
                      columns: [
                        { text: '-', dataIndex: 'icon' },
                        { text: UB.i18n('code'), dataIndex: 'code' },
                        { text: UB.i18n('enabled'), dataIndex: 'enabled' }
                      ],
                      listeners: {
                        select: function (grd, record/*, index, eOpts */) {
                          edtMixin.setValue(record.get('code') + ' =\n' +
                            JSON.stringify(
                                me.editEntityFrmEditor.selEntity.mixins[record.get('code')], null, '\t')
                          )
                        },
                        scope: me
                      }
                    },
                    {
                      xtype: 'ubcodemirror',
                      mode: 'application/x-javascript',
                      itemId: 'edtMixin',
                      width: 250,
                      region: 'east',
                      showLineNumbers: false,
                      split: true
                    }
                  ]
                }

              ]
            },
            {
              itemId: 'myEditor',
              xtype: 'ubcodemirror',
              mode: 'application/x-javascript',
              title: UB.i18n('AsJSON'),
              height: '100%',
              style: {
                background: 'white'
              },
              hideLabel: false /*, labelAlign: "top" */
            }
          ]
        }]
      })
      me.editEntityFrmEditor = me.editEntityFrm.down('[itemId=myEditor]') // me.editEntityFrm.getComponent('myEditor');
      me.editEntityFrmEditor.fColGrd = me.editEntityFrm.down('[itemId=colGrid]') // me.editEntityFrm.getComponent('columnGrid');
      me.editEntityFrmEditor.fmixGrid = me.editEntityFrm.down('[itemId=mixGrid]')
      edtAttr = me.editEntityFrm.down('[itemId=edtAttr]')
      edtMixin = me.editEntityFrm.down('[itemId=edtMixin]')

      onTextFieldChange = function (tbox) {
        var store = gridProp.getStore()
        var value = tbox.getValue()
        store.clearFilter(true)
        var valueftr = new RegExp(value, 'i')
        store.filter([
          {filterFn: function (item) {
            return valueftr.test(item.get('code')) ||
              valueftr.test(item.get('caption')) ||
              valueftr.test(item.get('dataType')) ||
              valueftr.test(item.get('associatedEntity')) ||
              valueftr.test(item.get('size')) ||
              valueftr.test(item.get('accessType'))
          }}
        ])
      }
    }
    entity = $App.domainInfo.get(entityCode)
    me.editEntityFrmEditor.selEntity = entity
    if (entity) {
      me.editEntityFrmEditor.setValue(JSON.stringify(entity, null, '\t'))

      var colData = []
      entity.eachAttribute(function (row, code) {
        var dat = Ext.clone(row)
        dat.code = code
        colData.push(dat)
      })
      var mixinData = []
      Ext.Object.each(entity.mixins, function (code, row) {
        var dat = Ext.clone(row)
        dat.code = code
        dat.icon = UB.ux.UBMetaDiagram.mixinPictures[code] || code
        mixinData.push(dat)
      })

      me.editEntityFrm.setTitle(entityCode)
      me.editEntityFrmEditor.fColGrd.getStore().loadRawData({attributes: colData}, false)
      me.editEntityFrmEditor.fmixGrid.getStore().loadRawData({mixins: mixinData}, false)
      me.editEntityFrm.down('[itemId=edtAttr]').setValue(' ')
      me.editEntityFrm.down('[itemId=edtMixin]').setValue(' ')
      me.editEntityFrm.show()
    }
  },

    //    .isGraphEvent = function(evt)
  isGraphEvent: function (evt, handler) {
    var source = mxEvent.getSource(evt)

        // Accepts events from the target object or
        // in-place editing inside graph
    if ((source === handler.target || source.parentNode === handler.target) ||
        (handler.graph.cellEditor !== null && source === handler.graph.cellEditor.textarea)) {
      return true
    }

    // in edit form
    var elt = source
    while (elt !== null) {
      if (elt === handler.target) {
        return true
      }

      elt = elt.parentNode
    }

        // Accepts events from inside the container
    elt = source

    while (elt !== null) {
      if (elt === handler.graph.container) {
        return true
      }

      elt = elt.parentNode
    }

    return false
  },

  getTooltipForCell: function (cell) {
    var attr, obj
    if ((attr = cell.getAttribute('objectCode'))) {
      try {
        obj = $App.domainInfo.get(attr)
        return obj.caption + ': ' + obj.description
      } catch (e) {
        return 'Unknown entity "' + attr + '"'
      }
    }
    if ((attr = cell.getAttribute('srcProp'))) {
      if ((cell.getAttribute('linkType') || 'relation') === 'relation') {
        return cell.getAttribute('srcObj') + '.' + attr + ' -> ' + cell.getAttribute('destObj') + '.' + cell.getAttribute('destProp')
      } else {
        return cell.getAttribute('srcObj') + ' inherit ' + cell.getAttribute('destObj')
      }
    }
  },

  graphChanged: function () {
    if (!this.isInitEditor) {
      this.fireEvent('change', this)
    }
  },

  initGraph: function () {
    var me = this, editor = me.editor, graph = editor.graph
    // Enables rotation handle
    mxVertexHandler.prototype.rotationEnabled = true
    // Enables managing of sizers
    mxVertexHandler.prototype.manageSizers = true
    // Enables live preview
    mxVertexHandler.prototype.livePreview = true

    // Enables guides
    // mxGraphHandler.prototype.guidesEnabled = true;
    graph.graphHandler.guidesEnabled = true

    // graph.defaultLoopStyle = mxEdgeStyle.EntityRelation;
    graph.allowLoops = true

    graph.isHtmlLabel = function (cell) {
      var state = graph.view.getState(cell)
      var style = (state) ? state.style : graph.getCellStyle(cell)

      return style.html + '' === '1' || style.whiteSpace + '' === 'wrap'
    }

    // HTML entities are displayed as plain text in wrapped plain text labels
    graph.cellRenderer.getLabelValue = function (state) {
      var result = mxCellRenderer.prototype.getLabelValue.apply(graph.cellRenderer, arguments)

      if (state.style.whiteSpace + '' === 'wrap' && state.style.html + '' !== '1') {
        result = mxUtils.htmlEntities(result, false)
      }

      return result
    }

    graph.convertValueToString = function (cell) {
      if (Ext.isString(cell.value)) {
        return cell.value
      } else {
        if (!Ext.isEmpty(cell.getAttribute('objectCode'))) {
          return me.generateObjHtml(cell)
        } else {
          return cell.getAttribute('label')
        }
      }
    }

    // .removeCells = function(cells, includeEdges)
    var oldRemoveCells = graph.removeCells
    graph.removeCells = function (cells, includeEdges) {
      if (!cells) {
        cells = graph.getDeletableCells(graph.getSelectionCells())
      }
      var index = cells.length - 1

      while (index > -1) {
        var srcProp = cells[index].getAttribute('srcProp')
        if (srcProp) {
          cells.splice(index, 1)
        }
        index--
      }
      oldRemoveCells.call(graph, cells, includeEdges)
    }
  },

  generateObjHtml: function (cell) {
    var me = this, ubObj, objectCode, htmlt, isEntity, ftype
    objectCode = cell.getAttribute('objectCode')
    if (!me.htmCache) {
      me.htmCache = {}
    }
    htmlt = [
      '<table width="100%" height="100%" style=" -moz-user-select: none; -webkit-user-select: none; -ms-user-select:none; user-select:none;" >',
      '<tr><td style="vertical-align: top;" ><div  >',
      '<table style="width:100%;" >',
      '<tr><td colspan="2" style="text-align:center; background:#C1D3F5;padding:2px;">', objectCode, '</td></tr>'
    ]
    try {
      ubObj = $App.domainInfo.get(objectCode)
      ubObj.eachAttribute(function (attr, attrCode) {
        if (Ext.String.startsWith(attrCode, 'mi_', true)) {
          return true
        }
        isEntity = attr.dataType === 'Entity'
        ftype = attr.dataType === 'Enum' ? 'Enum ' + attr.enumGroup + ''
                : (isEntity ? '<B>' + attr.associatedEntity + '</B>' : attr.dataType)
        htmlt.push('<tr><td>', attrCode, '</td><td style="padding:2px;">', ftype, '</td></tr>')
      })
        // Add mixins images
      var cellMixinImages = []
      _.forEach(ubObj.mixins, function (mixinConfig, mixinName) {
        if (mixinConfig.enabled) {
          cellMixinImages.push(UB.ux.UBMetaDiagram.mixinPictures[mixinName] || mixinName)
        }
      })
      if (cellMixinImages.length) {
        htmlt.push('<tr><td colspan="2" style="text-align:center; background:#C1D3F5;padding:2px;">' + cellMixinImages.join('&nbsp') + '</td></tr>')
      }
    } catch (e) {
      htmlt.push('<tr><td colspan="2">Unknown entity "' + objectCode + '"</td></tr>')
    }

    htmlt.push('</table></div></td></tr></table>')
    return htmlt.join('')
  },

  getMixinShortName: function (mixinCode) {
    if (mixinCode === 'mStorage') {
      return 'S'
    } else {
      return mixinCode.substr(0, 1).toUpperCase()
    }
  },

  refreshTasks: function (div) {
    var me = this
    if (this.tasks !== null) {
      // var div = this.tasks.content;
      // mxEvent.release(div);
      me.taskEl.innerHTML = ''
      me.taskEl.createTasks(div)
    }
  },

  showTasks: function () {
    var me = this, taskWnd, graph = me.editor.graph,
      taskPnl, taskEl
    if (me.editor.tasks === null) {
      var div = document.createElement('div')
      div.style.padding = '4px'
      div.style.paddingLeft = '20px'
      // var w = document.body.clientWidth;

      taskPnl = Ext.widget('panel', {
        border: true,
        flex: 1
      })

      taskWnd = Ext.create('Ext.Window', {
        title: 'Tasks',
        width: 200,
        height: 400,
        closable: true,
        closeAction: 'hide',
        autoDestroy: false,
        layout: 'fit',
        items: [
          taskPnl
        ]
      }).show()
      me.taskWnd = taskWnd
      taskWnd.ownerCt = me
      taskWnd.registerWithOwnerCt()
      var tdom = taskPnl.getEl().dom
      document.getElementById(tdom.id + '-innerCt').appendChild(div)
      me.taskEl = taskEl = div

      // Installs a function to update the contents
      // of the tasks window on every change of the
      // model, selection or root.
      var funct = mxUtils.bind(me, function (/* sender */) {
                // mxEvent.release(div);
        me.taskEl.innerHTML = ''
        me.editor.createTasks(me.taskEl)
      })

      graph.getModel().addListener(mxEvent.CHANGE, funct)
      graph.getSelectionModel().addListener(mxEvent.CHANGE, funct)
      graph.addListener(mxEvent.ROOT, funct)

      me.editor.tasks = taskWnd
      // debugger;
      me.editor.createTasks(div)
    }

    me.taskWnd.show()
  },

  showProperties: function (cell) {
    var
      me = this,
      editor = me.editor
    cell = cell || editor.graph.getSelectionCell()

    // Uses the root node for the properties dialog
    // if not cell was passed in and no cell is
    // selected
    if (cell === null) {
      cell = editor.graph.getCurrentRoot()

      if (cell === null) {
        cell = editor.graph.getModel().getRoot()
      }
    }

    if (cell !== null) {
      // Makes sure there is no in-place editor in the
      // graph and computes the location of the dialog
      editor.graph.stopEditing(true)
      // Hides the existing properties dialog and creates a new one with the
      // contents created in the hook method
      editor.hideProperties()
      var node = editor.createProperties(cell)

      if (node !== null) {
        // Displays the contents in a window and stores a reference to the
        // window for later hiding of the window

        var propPnl = Ext.widget('panel', {
          border: true,
          flex: 1
        })

        var propWnd = Ext.create('Ext.Window', {
          title: 'Properties',
          width: 250,
          height: 400,
          closable: false,
          layout: 'fit',
          items: [
            propPnl
          ]
        }).show()
        propWnd.ownerCt = me
        propWnd.registerWithOwnerCt()
        var tdom = propPnl.getEl().dom
        document.getElementById(tdom.id + '-innerCt').appendChild(node)
        editor.properties = propWnd
      }
    }
  },

  hideProperties: function () {
    var me = this
    var editor = me.editor

    if (editor.properties !== null) {
      editor.properties.close()
      editor.properties = null
    }
  },

  beforeDestroy: function () {
    var
            me = this
    if (me.editor) { me.editor.destroy() }
    if (me.tasksWnd) { me.tasksWnd.destroy() }

    me.editEntityFrmEditor = null
    if (me.editEntityFrm) { me.editEntityFrm.destroy() }
    Ext.EventManager.un(document, 'onmouseup', me.onmouseUpFunc, me)
    Ext.EventManager.un(document, 'onmousemove', me.onmousemoveFunc, me)

    me.callParent(arguments)
  },

  actionHandler: function (sender) {
    this.editor.execute(sender.mxAction)
  },

  getValue: function () {
    var me = this, enc = new mxCodec(),
      data = enc.encode(me.editor.graph.getModel())
    return mxUtils.getXml(data)

        // return this.initialValue;
  },

  resetOriginalValue: function () {
    return null
  }
})
