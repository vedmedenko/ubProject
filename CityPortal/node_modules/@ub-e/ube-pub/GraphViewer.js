/*global mxEvent, mxUtils, mxEditor, mxRubberband, mxCodec */
/**
 * Workflow Diagram
 */
Ext.define('UBE.GraphViewer', {
    extend: 'Ext.Panel',
    alias: 'widget.graphviewer',
    width: '100%',
    height: '100%',
    layout: 'fit',
    cls: 'mx-graph-editor',
    initComponent: function(){
        var me = this;

        me.tbar = {
            xtype: 'toolbar',
            items: [
                {
                    xtype: 'button',
                    text: 'Zoom',
                    mxAction: 'zoomIn',
                    handler: me.actionHandler,
                    scope: me
                },{
                    xtype: 'button',
                    text: 'Zoom Out',
                    mxAction: 'zoomOut',
                    handler: me.actionHandler,
                    scope: me
                },{
                    xtype: 'button',
                    text: 'Actual Size',
                    mxAction: 'actualSize',
                    handler: me.actionHandler,
                    scope: me
                },{
                    xtype: 'button',
                    text: 'Fit',
                    mxAction: 'fit',
                    handler: me.actionHandler,
                    scope: me
                },{
                    xtype: 'button',
                    text: 'Edit',
                    handler: me.editDiagram,
                    scope: me
                }
            ]
        };

        me.containerId = Ext.id();
        me.dataUrl = null;
        me.html = '<div id="' + me.containerId+'" class="graph-editor-holder" style="width: 100%; height: 100%;"></div>';
        me.on({
            boxready: function(sender){
                if (window.isDeveloperMode){
                    me.initMXEditor();
                } else {
                    UB.inject(window.mxBasePath + '/js/mxClient.js')
                        .then(function(){
                            return UB.inject(window.mxBasePath + '/js/graphEditor/Shapes.js');
                        }).done(function(){
                            me.initMXEditor();
                        });
                }
            },
            resize: function(){
                me.editor.graph.sizeDidChange();
            },
            scope: me
        });
        me.callParent(arguments);
    },

    /**
     *
     * @param data
     * @param contentType
     * @param {Blob} [blobData] (Optional) for loading data from exists blob
     * @return {Promise}
     */
    setSrc: function(cfg) {
        var
            me = this,
            data = cfg.url;

        me.dataUrl = data;
        if(me.editor) {
            me.editor.open(cfg.url);
        }
        return Q.resolve(true);

    },

    initMXEditor: function(){
        var
            config = mxUtils.load(window.mxBasePath + '/resources/config/graphviewer.xml').getDocumentElement(),
            me = this, editor, graph;

        me.editor = editor = new mxEditor(config);
        graph = editor.graph;

        editor.setGraphContainer(document.getElementById(me.containerId));
        //editor.graph.enabled = false;

        editor.graph.cellsEditable = false;
        editor.graph.cellsDeletable = false;
        editor.graph.cellsMovable = false;
        editor.graph.edgeLabelsMovable = false;
        editor.graph.vertexLabelsMovable = false;
        editor.graph.dropEnabled = false;
        editor.graph.splitEnabled = false;
        editor.graph.cellsResizable = false;
        editor.graph.cellsBendable = false;
        editor.graph.cellsSelectable = false;
        editor.graph.cellsDisconnectable = false;
        editor.graph.cellsCloneable = false;
        editor.graph.allowDanglingEdges = false;
        editor.graph.disconnectOnMove = false;


        editor.showTasks = function(){};
        editor.refreshTasks = function(){};
        editor.showProperties = function(){};
        editor.hideProperties = function(){};
        graph.popupMenuHandler.factoryMethod = function(){};



        graph.setResizeContainer(true);
        //graph.setEnabled(false);

        // Enables rubberband selection
        new mxRubberband(graph);
        graph.setPanning(true);
        graph.setTooltips(true);

        if( me.dataUrl) {
            me.editor.open(me.dataUrl);
        }
    },

    beforeDestroy: function(){
        var
            me = this;
        if (me.editor) { me.editor.destroy();}
        me.callParent(arguments);
    },

    actionHandler: function(sender){
        this.editor.execute(sender.mxAction);
    },

    editDiagram: function(sender){
        var enc = new mxCodec();
        var model = enc.encode(this.editor.graph.getModel());
        Ext.create('UB.view.Workflow', {
            incomeModel: model,
            resultCallBack: Ext.bind(this.onEndEdit, this),
            constrain: true,
            commandCode: true,
            modal: true,
            layout: {
                type: 'hbox',
                align: 'stretch'
            }
        });
    },

    onEndEdit: function(isChanged, data){
        var params, me = this,
            mainPnl, docContainer, document, baseDoc;

        //me.dataUrl
        if (isChanged){
            mainPnl = me.up('basepanel');
            docContainer = mainPnl.getUBCmp('attrDocument');

            baseDoc =  mainPnl.record.get('document');
            params = {
                entity: docContainer.entityName,
                attribute: docContainer.attributeName,
                ID: docContainer.instanceID
            };
            params.origName = baseDoc ? baseDoc.origName  :
                  (me.baseMIME && (me.baseMIME.indexOf('/') < me.baseMIME.length - 1) ?
                      'file.' + me.baseMIME.substr(me.baseMIME.indexOf('/')+1) : '' ) ;
            params.filename = baseDoc ? baseDoc.filename : params.origName;
            if (Ext.isEmpty(params.filename) || params.filename === '' ){
                params.origName = 'unknown.xml';
                params.filename = 'unknown.xml';
            }

            document = mxUtils.getXml(data);
            UB.core.UBService.setDocument(params, 'POST', document, function(response){
                //debugger;
                var resDat = Ext.JSON.decode(response);
                if (resDat.success){
                  var ndoc = Ext.JSON.encode(resDat.result);
                    //mainPnl.form.findField('document').setValue(document);
                    //mainPnl.record.set('document', ndoc);
                    mainPnl.getUBCmp(UB.core.UBCommand.getUBCmpUBName('document')).setValue(ndoc, mainPnl.instanceID);
                  this.editor.readGraphModel(data);
                }

            }, this );


        }
    }

});

window.mxBasePath = 'models/UBE/mxGraph';
UB.ux.UBDocument.contentTypeMapping['application/ubWorkFlow'] = 'UBE.GraphViewer';
UB.ux.UBDocument.contentTypeMapping['application/ubworkflow'] = 'UBE.GraphViewer';