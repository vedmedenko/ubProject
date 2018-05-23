require('./UBBaseComboBox')
/**
 * The control to select many items from dictionary.
 * Selected elements displayed in one line separated by comma. To edit selected elements, user must press trigger button.
 * When trigger button is pressed, a new modal window showing.
 * At left side you can see selected elements and at right side all elements.
 */
Ext.define('UB.ux.form.field.UBMultiSelectBox', {
    extend: 'UB.ux.form.field.UBBaseComboBox',
    alias: 'widget.ubmultiselecbox',
    multiSelect: true,

    /**
     * @private
     */
    initComponent: function(){
        var me = this;
        me.displayTpl =
            '<tpl for=".">' +
            '{[Ext.String.ellipsis(typeof values === "string" ? values : values["' + me.displayField + '"], 16)]}' +
            '<tpl if="xindex < xcount">' + me.delimiter + '</tpl>' +
            '</tpl>';

        me.callParent(arguments);
        /** @event itemSelected
         * Fires when user press ok on form
         * @param this
         */
        me.addEvents('itemSelected');
    },

    initContextMenu: function(){
        var me = this;
        me.callParent(arguments);
        if (me.editItemButton){
           me.editItemButton.disable();
           me.editItemButton.hide();
        }
        if (me.showLookupButton){
           me.showLookupButton.disable();
           me.showLookupButton.hide();
        }
        if (me.addItemButton){
           me.addItemButton.disable();
           me.addItemButton.hide();
        }
    },

    editItem: function(){
    },

    showLookup: function(){
    },

    queryDelay: 500,

    afterRender: function(){
        var me = this, input;
        me.callParent(arguments);
        input = Ext.get(me.getInputId());
        input.dom.readOnly = true;
    },

    onTriggerClick: function() {
        var me = this, win,
            storeMain,
            bBar,
            searchCtrl, doQueryTask, storeSel,
            allGrid, selGrid, isInitialSelect = false,
            request;


        function updateSelection(){
            var selModel = allGrid.getSelectionModel();
            isInitialSelect = true;
            storeSel.each(function(record){
                var rec, idx = -1;
                rec = storeMain.findRecord( me.valueField, record.get(me.valueField));
                if (rec){
                    idx = storeMain.indexOf(rec);
                }
                if (idx >= 0){
                    selModel.select( idx, true, true);
                }
            }, me);
            isInitialSelect = false;
        }

        if (me.store.ubRequest){
            request = Ext.clone(me.store.ubRequest);
            request.orderList = [{
                expression: me.displayField,
                order: 'ASC'
            }];
            storeMain = Ext.create('UB.ux.data.UBStore', {
                ubRequest: request,
                autoLoad: false,
                autoDestroy: true
            });
            storeMain.load();
            storeMain.on('load', function(){
                if (allGrid){
                    updateSelection();
                }
            });
        } else {
            storeMain = Ext.create('Ext.data.Store', {
                model: me.store.model,
                sorters: [{
                    property:  me.displayField
                }],
                proxy: {
                    type: 'memory',
                    enablePaging: true
                },
                autoLoad: false,
                autoDestroy: true
            });
            storeMain.load();
            storeMain.add(me.store.getRange(0, me.store.getCount() - 1));
        }

        bBar = Ext.widget('toolbar', {
            dock: 'bottom',
            border: '1 0 0 0',
            cls: 'ub-grid-info-panel',
            style: 'border-top-width: 1px !important;',
            items: [
                Ext.widget('tbfill'),
                Ext.widget('tbseparator'),
                me.pagingBar = Ext.create( 'UB.view.PagingToolbar', {//xtype: 'pagingtoolbar', 'Ext.toolbar.Paging'
                    isPagingBar: true,
                    cls: 'ub-grid-info-panel',
                    border: 0,
                    margin: 0,
                    padding: '0 0 0 5',
                    width: 180,
                    store: storeMain
                })
            ]
        });

        if (!me.store.ubRequest){
            bBar.hide();
        }

        doQueryTask = new Ext.util.DelayedTask(function(){
            var value = searchCtrl.getValue();
            if (value === ''){
                storeMain.filters.removeAtKey('searchTask');
                storeMain.clearFilter();
            } else {
                storeMain.filter({
                    id: 'searchTask',
                    property: me.displayField,
                    condition: UB.core.UBCommand.condition.sqlecLike,
                    value: searchCtrl.getValue()
                });
            }

        }, me);
        searchCtrl = Ext.widget('textfield', {
            labelWidth: 60,
            fieldLabel: UB.i18n('filter')
        });
        searchCtrl.on('change', function(sender, newVal){
            doQueryTask.delay(me.queryDelay);
        });

        storeSel = Ext.create('Ext.data.Store',{
            model: me.store.model,
            sorters: [{
                property: me.displayField
            }],
            proxy: {
                type: 'memory'
            }
        });


        var val = me.getValue();
        if (val && val.length > 0){
            if (me.store.ubRequest){
                request = Ext.clone(me.store.ubRequest);
                delete request.orderList;
                request.whereList = request.whereList || {};
                var valuesExpr = {};
                valuesExpr[me.valueField] = val;
                request.whereList['selectedItems' + (new Date()).getTime()] = {
                    condition: "in",
                    expression: '[' + me.valueField + ']',
                    values : valuesExpr
                };
                Ext.create('UB.ux.data.UBStore', {ubRequest: request} ).load().
                    done(function(store){
                        storeSel.add(store.getRange(0, store.getCount() - 1));
                        updateSelection();
                    });
            } else {
                _.forEach(val, function(elm){
                    var rec = me.store.findRecord( me.valueField, elm);
                    if (rec){
                        storeSel.add(rec);
                    }
                });
            }
        }

        win = Ext.create('Ext.window.Window', {
            padding: '5 5 0 5',
            height: 450,
            width: 550,
            modal: true,
            stateful: !!me.store.ubRequest,
            stateId: 'nultiselect_' + (me.store.ubRequest ? me.store.ubRequest.entity: '' ),
            layout: 'fit',
            title: UB.i18n('selectElements') + (me.fieldLabel ? ' - ' + me.fieldLabel: ''),
            items: [{
                layout: {type: 'hbox', align: 'stretch'},
                items: [ selGrid = Ext.widget('grid',{
                        xtype: 'grid',
                        hideHeaders: true,
                        flex: 1,
                        title: UB.i18n('selectedElements'),
                        store:  storeSel,
                        tbar: {
                            items: []
                        },
                        columns: [{
                                name: 'id',
                                width: 25,
                                dataIndex: me.valueField,
                                renderer: function(value){
                                    return '<a style="color: #141b9b; cursor:pointer;" class="fa fa-times"></a>';
                                }
                            },
                            { name: 'name', dataIndex: me.displayField, flex: 1 }
                        ],
                        listeners:{
                            cellclick: function( grd, td, cellIndex, record, tr, rowIndex, e, eOpts ){
                                if (cellIndex === 0){
                                    storeSel.remove(record);
                                    var idx = -1, selModel = allGrid.getSelectionModel(),
                                        rec = storeMain.findRecord( me.valueField, record.get(me.valueField));
                                    if (rec){
                                        idx = storeMain.indexOf(rec);
                                    }
                                    if (idx >= 0){
                                        selModel.deselect( idx, true);
                                    }
                                }
                            },
                            scope: me
                        }
                    }),{
                        xtype: 'splitter'
                    }, allGrid = Ext.widget('grid',{
                        selModel: {
                            selType: 'checkboxmodel',
                            checkOnly: true,
                            pruneRemoved: false,
                            showHeaderCheckbox: true,
                            listeners: {
                                select: function( grd, record, index){
                                    if (!isInitialSelect){
                                        storeSel.add(record);
                                    }
                                },
                                deselect: function( grd, record, index){
                                    if (!isInitialSelect){
                                        var rec = storeSel.findRecord( me.valueField, record.get(me.valueField));
                                        if (rec){
                                            storeSel.remove(rec);
                                        }
                                    }
                                },
                                scope: me
                            }
                        },
                        hideHeaders: true,
                        flex: 1,
                        title: UB.i18n('allElements'),
                        store: storeMain,
                        hideActionToolbar: true,
                        tbar: {
                            items: [searchCtrl]
                        },
                        bbar: bBar,
                        columns: [
                            { name: 'name', dataIndex: me.displayField, flex: 1 }
                        ]
                    })
                ]
            }],
            buttons: [{
                text: UB.i18n('clear'),
                glyph: UB.core.UBUtil.glyphs.faEraser,
                handler: function(){
                    storeSel.removeAll();
                    isInitialSelect = true;
                    allGrid.getSelectionModel().deselectAll(true);
                    isInitialSelect = false;
                }
            },{
                text: UB.i18n('selectAll'),
                tooltip: UB.i18n('selectAllOnPage'),
                handler: function(){
                    var sm = allGrid.getSelectionModel(), items = [], rec;
                    sm.selectAll(true);
                    sm.selected.each(function(record){
                        rec = storeSel.findRecord( me.valueField, record.get(me.valueField));
                        if (!rec){
                          items.push(record);
                        }
                    });
                    storeSel.add(items);
                }
            },{
                xtype: 'panel',
                flex: 1
            },{
                text: UB.i18n('ok'),
                glyph: UB.core.UBUtil.glyphs.faCheck,
                handler: function(){
                    me.setValue(storeSel.getRange(0, storeSel.getCount() - 1));
                    win.close();
                    me.fireEvent('itemSelected', me);
                }
            }, {
                text: UB.i18n('cancel'),
                glyph: UB.core.UBUtil.glyphs.faTimes,
                handler: function(){
                    win.close();
                }
            }]
        });

        win.center();
        win.show();
        updateSelection();

        win.on('close', function(){
            doQueryTask.cancel();
        });

    },

    /**
     * Set combo value by recordId
     * @param {Number} id  id of chosen value
     * @param {Boolean} [isDefault]  (optional) true - to set initial value of combo. Used in {@link UB.view.BasePanel} Default: false
     * @param {Function} [onLoadValue] (optional) raised when data loaded
     * @param {Object} [scope] (optional) scope to onLoadValue
     *
     */
    setValueById: function(id, isDefault, onLoadValue, scope){
        var me = this;
        if(Ext.isEmpty(id)){
            if(isDefault){
                me.resetOriginalValue();
            }
            if (onLoadValue){
                Ext.callback(onLoadValue, scope || me,[me]);
            }
            return;
        }
        var store = me.getStore();
        function doSetValue(record, setNull){
            me.setValue(setNull ? null : record || id);
            if(isDefault){
                me.resetOriginalValue( );
            }
            store.resumeEvent('clear');
            me.lastQuery = null; // reset cuery caching
            if (onLoadValue){
                Ext.callback(onLoadValue, scope || me,[me]);
            }
        }
        store.on({
            load: {
                fn: function(){
                    if (store.getCount() === 0 ){
                        var entity = $App.domainInfo.get(me.getEntity());
                        // load deleted row or not actual historical
                        if ( (entity.hasMixin('mStorage') && entity.mixin('mStorage').safeDelete) || entity.hasMixin('dataHistory') ){
                            $App.connection.select({
                                entity: me.getEntity(),
                                fieldList: store.ubRequest.fieldList, // [me.valueField, me.displayField ],
                                __allowSelectSafeDeleted: true,
                                ID: id
                            }).done( function(result){
                                if (store.isDestroyed){
                                    return;
                                }
                                var record = Ext.create(store.model);
                                //UB.ux.data.UBStore.createRecord(me.getEntity(), [me.valueField, me.displayField ], false);
                                if (!UB.ux.data.UBStore.resultDataRow2Record(result, record)){
                                    doSetValue(null, true);
                                    return;
                                }
                                UB.ux.data.UBStore.resetRecord(record);
                                store.add(record, true); // we MUST save cache here! In other case clearCache works some ms and formDataReady fires BEFORE store was actually loaded
                                doSetValue(record);
                                me.fieldCls += ' ub-combo-deleted';
                                if (me.rendered){
                                    var input = Ext.get(me.getInputId());
                                    input.addCls('ub-combo-deleted');
                                }
                                me.phantomSelectedElement = true;
                                me.tipPhantomElement = Ext.create('Ext.tip.ToolTip', {
                                    target: me.getInputId(),
                                    html: UB.i18n('elementIsNotActual')
                                });
                            });
                        } else {
                            doSetValue(null, true);
                        }
                    } else if (store.getCount() === 1) {
                        doSetValue(store.getAt(0));
                    } else {
                        doSetValue();
                    }
                },
                single: true
            }
        });
        store.suspendEvent('clear');
        store.filter(new Ext.util.Filter({
            id: me.userFilterId,
            root: 'data',
            property: 'ID',
            condition: id && _.isArray(id) ? 'in' : 'equal',
            value: id
        }));
    }


});

