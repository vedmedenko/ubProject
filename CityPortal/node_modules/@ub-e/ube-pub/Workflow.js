/*global mxEvent, mxUtils, mxEditor, mxRubberband, mxCodec */
/**
 * Workflow Diagram
 */
Ext.define('UBE.WorkflowViewer', {
    extend: 'UB.view.BaseWindow', // 'Ext.Window',
    alias: 'widget.workflow',
    // IMPORTANT! UB.core.UBApp must be in uses not in requires
    uses: [
        'UB.core.UBApp',
        'UB.core.UBStoreManager',
        'UB.view.NavigationPanel',
        'Ext.ux.window.Notification'
    ],

    //maximized: true,
    layout: 'border',
    title: 'Workflow',
    width: 800,
    height: 600,

    initComponent: function(){
        var
            me = this;

        me.idPrefix  = Ext.id();
        var
            id =  me.idPrefix + 'graph',
            html = '<div id="' + id+'" class="graph-editor-holder"></div>';
        me.items = [
            {
                region:'west',
                id: me.idPrefix + '-west',
                cls: 'mx-graph-toolbar',
                width: 200,
                maxWidth: 200,
                split: true,
                collapsible: true,
                layout: 'fit'
            },
            {
                region: 'center',
                flex: 1,
                cls: 'mx-graph-editor',
                html: html,
                layout: 'fit',
                listeners: {
                    boxready: function(sender){
                        me.initMXEditor();
                    },
                    resize: function(){
                        me.editor.graph.sizeDidChange();
                    }
                }
            }
        ];
        me.callParent(arguments);
        me.on('boxready', function(){
            me.getEl().on('keydown', function(evt, e){
                evt.srcElement = evt.target = document.getElementById(me.idPrefix + 'graph');
            });
        });
    },

    initMXEditor: function(){

        var
            config = mxUtils.load(window.mxBasePath + '/resources/config/workfloweditor.xml').getDocumentElement(),
            me = this, editor, graph;

        me.editor = editor = new mxEditor(config);
        graph = editor.graph;


        editor.setGraphContainer(document.getElementById(me.idPrefix + 'graph'));

        graph.setResizeContainer(true);

        //debugger;

        editor.addAction('save', Ext.bind(this.onSaveDiagram,this) );

        (new Ext.Element(editor.toolbar.toolbar.container)).up('div.mxWindow').remove();
        Ext.getCmp(me.idPrefix + '-west').body.dom.appendChild(editor.toolbar.toolbar.container);

        //var toolbarDiv = document.createElement('div');
        //editor.toolbar.init(toolbarDiv);
        //Ext.getCmp(me.idPrefix + '-west').body.dom.appendChild(toolbarDiv);
        //editor.toolbar.init(editor.toolbar.toolbar.container);

       // me.editor.keyHandler.handler.target = me.getEl().dom;
        editor.keyHandler.handler.target = me.getEl().dom;
        mxEvent.addListener(me.getEl().dom, 'keydown', editor.keyHandler.handler.keydownHandler);

        //me.getEl().dom.addEventListener( 'keydown', function(event){alert('dfsdfsdfs-' + event.target);}, false);

        graph.popupMenuHandler.factoryMethod =
            mxUtils.bind(this, function(menu, cell, evt)
            {
                var frmDom = me.getEl().dom;
                menu.div.parent = frmDom;
                menu.zIndex = frmDom.style.zIndex + 1;
                menu.div.style.zIndex = frmDom.style.zIndex + 1;

                    //me.getel().style.zIndex;
                return editor.createPopupMenu(menu, cell, evt);
            });

        /*
        if (editor.tasks){
            el = (new Ext.Element(editor.tasks.div)).down('div.mxWindowPane');

            var tasksWnd = Ext.create('Ext.Window', {
                title: 'Tasks',
                width: 250,
                height: 300,
                closable: false,
                layout: 'fit'
            }).show();

            if(el){
               tasksWnd.body.dom.appendChild(el.dom);
            }
            (new Ext.Element(editor.tasks.div)).remove();

            if (editor.tasks){
              editor.tasks.div = el.dom;
            }
            tasksWnd.ownerCt = me;
            tasksWnd.registerWithOwnerCt();

            me.tasksWnd = tasksWnd;
        }
        */
        // Enables rubberband selection
        /* var rb = */
 	new mxRubberband(graph);
        graph.setPanning(true);
        graph.setTooltips(true);
        editor._showOutline = editor.showOutline;
        editor.showOutline = Ext.Function.bind(me.showOutline, me);

        editor._showTasks = editor.showTasks;
        if (editor.tasks){
            editor.tasks.destroy();
            editor.tasks = null;
        }
        editor.showTasks = Ext.Function.bind(me.showTasks, me);
        editor.refreshTasks = Ext.Function.bind(me.refreshTasks, me);

        editor.properties = null;
        editor.showProperties = Ext.Function.bind(me.showProperties, me);
        editor.hideProperties = Ext.Function.bind(me.hideProperties, me);


        editor.addAction('toggleOutline', function(editor) {
            if (editor.outline === null) {
                editor.showOutline();
            } else {
                editor.outline.setVisible(!editor.outline.isVisible());
            }
        });

        if (this.dataUrl){
            editor.open(this.dataUrl);
        }

        if (this.incomeModel){
            editor.readGraphModel(this.incomeModel);
        }

        me.addListener('Close',function(){
            if (editor && editor.isModified()){
                //Ext.msg.confirm()
                Ext.Msg.confirm('Attention', 'Diagram was changed. Do you want save changes?',
                    function ( buttonId){
                        if (buttonId === 'yes'){
                            this.saveDiagram();
                        }
                    }, this
                );
            }
        },this);
    },

    loadSchema: function(){

    },


    refreshTasks: function (div)
    {
        var me = this;
        if (this.tasks !== null)
        {
            //var div = this.tasks.content;
            //mxEvent.release(div);
            me.taskEl.innerHTML = '';
            me.taskEl.createTasks(div);
        }
    },


    showTasks: function(){
        var me = this, taskWnd, graph = me.editor.graph,
            taskPnl, taskEl;
        if (me.editor.tasks === null)
        {
            var div = document.createElement('div');
            div.style.padding = '4px';
            div.style.paddingLeft = '20px';
            //var w = document.body.clientWidth;

            taskPnl = Ext.widget('panel', {
                border: true,
                flex: 1
            });

            taskWnd = Ext.create('Ext.Window', {
                title: 'Tasks',
                width: 200,
                height: 400,
                closable: true,
                closeAction : 'hide',
                autoDestroy: false,
                layout: 'fit',
                items:[
                    taskPnl
                ]
            }).show();
            me.taskWnd = taskWnd;
            taskWnd.ownerCt = me;
            taskWnd.registerWithOwnerCt();
            var tdom = taskPnl.getEl().dom;
            document.getElementById(tdom.id + '-innerCt').appendChild(div);
            me.taskEl = taskEl = div;


            /*
                var wnd = new mxWindow(
                    mxResources.get(this.tasksResource) ||
                        this.tasksResource,
                    div, w - 220, this.tasksTop, 200);
                wnd.setClosable(true);
                wnd.destroyOnClose = false;
            */
            // Installs a function to update the contents
            // of the tasks window on every change of the
            // model, selection or root.
            var funct = mxUtils.bind(me, function(sender)
            {
                //mxEvent.release(div);
                me.taskEl.innerHTML = '';
                me.editor.createTasks(me.taskEl);
            });

            graph.getModel().addListener(mxEvent.CHANGE, funct);
            graph.getSelectionModel().addListener(mxEvent.CHANGE, funct);
            graph.addListener(mxEvent.ROOT, funct);

            me.editor.tasks = taskWnd;
            //debugger;
            me.editor.createTasks(div);
        }

        me.taskWnd.show();
        //this.tasks.setVisible(true);
    },

    beforeDestroy: function(){
        var
            me = this;
        if (me.editor)  { me.editor.destroy(); }
        if (me.tasksWnd) { me.tasksWnd.destroy(); }
        if (me.outlineWnd) {  me.outlineWnd.destroy(); }
        me.callParent(arguments);
    },

    showOutline: function (){
        var
            me = this,
            editor = me.editor;
        //debugger;
        if (me.outlineWnd){
            me.outlineWnd.show();
        } else {
            editor._showOutline();
            var outlineWnd = Ext.create('Ext.Window', {
                title: 'Overview',
                width: 200,
                height: 200,
                closable: true,
                closeAction : 'hide',
                autoDestroy: false,
                layout: 'fit'
            }).show();
            me.outlineWnd = outlineWnd;
            outlineWnd.ownerCt = me;
            outlineWnd.registerWithOwnerCt();


            editor.outline.setVisible = function(){
                outlineWnd.show();
            };

            var el = (new Ext.Element(editor.outline.div)).down('div.mxWindowPane');

            outlineWnd.body.dom.appendChild(el.dom);
            //(new Ext.Element(editor.tasks.div)).remove();
            //editor.tasks.div = el.dom;
        }

    },

    onSaveDiagram:  function(editor, cell){
        this.saveDiagram();
        this.close();
    },

    saveDiagram: function(){
      if (this.resultCallBack){
        var enc = new mxCodec();
        var model = enc.encode(this.editor.graph.getModel());
        this.resultCallBack(this.editor.isModified(), model);
        this.editor.modified = false;
      }
    },


    showProperties:  function (cell)
    {
        var
            me = this,
            editor = me.editor, cell;
        cell = cell || editor.graph.getSelectionCell();

        // Uses the root node for the properties dialog
        // if not cell was passed in and no cell is
        // selected
        if (cell === null)
        {
            cell = editor.graph.getCurrentRoot();

            if (cell === null)
            {
                cell = editor.graph.getModel().getRoot();
            }
        }

        if (cell !== null)
        {
            // Makes sure there is no in-place editor in the
            // graph and computes the location of the dialog
            editor.graph.stopEditing(true);

            /*
            var offset = mxUtils.getOffset(editor.graph.container);

            var x = offset.x+10;
            var y = offset.y;


            // Avoids moving the dialog if it is alredy open
            if (editor.properties !== null && !editor.movePropertiesDialog)
            {
                x = editor.properties.getX();
                y = editor.properties.getY();
            }

            // Places the dialog near the cell for which it
            // displays the properties
            else
            {
                var bounds = editor.graph.getCellBounds(cell);

                if (bounds != null)
                {
                    x += bounds.x+Math.min(200, bounds.width);
                    y += bounds.y;
                }
            }
            */
            // Hides the existing properties dialog and creates a new one with the
            // contents created in the hook method
            editor.hideProperties();
            var node = editor.createProperties(cell);

            if (node !== null)
            {
                // Displays the contents in a window and stores a reference to the
                // window for later hiding of the window

                var propPnl = Ext.widget('panel', {
                    border: true,
                    flex: 1
                });

                var propWnd = Ext.create('Ext.Window', {
                    title: 'Properties',
                    width: 250,
                    height: 400,
                    closable: false,
                    //closeAction : 'hide',
                    //autoDestroy: false,
                    layout: 'fit',
                    items:[
                        propPnl
                    ]
                }).show();
                //me.taskWnd = taskWnd;
                propWnd.ownerCt = me;
                propWnd.registerWithOwnerCt();
                var tdom = propPnl.getEl().dom;
                document.getElementById(tdom.id + '-innerCt').appendChild(node);
                editor.properties = propWnd;

                //this.properties = new mxWindow(mxResources.get(this.propertiesResource) ||
                //    this.propertiesResource, node, x, y, this.propertiesWidth, this.propertiesHeight, false);
                //this.properties.setVisible(true);
            }
        }
    },


    hideProperties: function () {
        var me = this
        var editor = me.editor
        if (editor.properties !== null)
        {
            editor.properties.close();
            editor.properties = null;
        }
    }

    /*
    ,

    editDiagram: function(model, callBack ){
        this.resultCallBack = callBack;
        this.incomeModel = model;
        this.show();
    },

    editDiagramUrl: function(dataUrl, callBack ){
        this.resultCallBack = callBack;
        this.dataUrl = dataUrl;
        this.show();
    }
    */
});

window.mxBasePath = 'models/UBE/mxGraph';