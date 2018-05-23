/**
 * Файл: UB.ux.form.field.ComboExtraButtons.js
 */
Ext.define('UB.ux.form.field.ComboExtraButtons', {
    extend: 'Ext.panel.Panel',
    hidden: true,
    width: "100px",
    shadow: false,
    autoRender: true,
    autoHide: false,
    alwaysFramed: false,
    frameHeader: false,
    frame: false,
    baseCls: Ext.baseCSSPrefix + 'ubcombo',
    floating: true,
    constrain: false,
    focusOnToFront: false,
    init: function (combo) {
        var me = this;

        me.parentCombo = combo;
        me.ownerCt = combo;
        combo.on({
            afterrender: me.onParentAfterRenderer,
            added: function (combo, container, pos, eOpts) {
                me.ownerCt = combo.up('[floating]');
                me.registerWithOwnerCt();
            },
            refresh: function () {
                var arr = combo.bodyEl.getXY();
                arr[1] -= 20;
                me.showAt(arr);
            },
            scope: this
        });

    },
    clearSelection:function () {
        var
            me = this,
            comboBox = me.parentCombo;
        me.items.first().disable();
        comboBox.clearValue();
    },
    addItem: function (){
        var
            me = this,
            parentCombo = me.parentCombo,
            store = parentCombo.getStore(),
            entityName = store.entityName,
            displayField = parentCombo.displayField ,
            val = parentCombo.getValue(),
            rec = store.getById(val),
            cmdConfig = {
                cmdType: UB.core.UBCommand.commandType.showForm,
                entity: entityName,
                store: store,
                isModal: true,
                sender: parentCombo,
                onItemAdded: function (itemId) {
                    parentCombo.setValueById(itemId);
                }
            };
        cmdConfig.initValue = {};
        cmdConfig.initValue[displayField] = rec ? rec.get(displayField) : val;

        UB.core.UBApp.doCommand(cmdConfig);
    },
    editItem: function () {
        var
            me = this,
            parentCombo = me.parentCombo,
            store = parentCombo.getStore(),
            entityName = store.entityName,
            instanceID = parentCombo.getValue(),
            cmdConfig = {
                cmdType: UB.core.UBCommand.commandType.showForm,
                entity: entityName,
                instanceID: instanceID,
                store: store,
                isModal: true,
                sender: parentCombo,
                onClose: function () {
                    parentCombo.setValue(store.getById(parentCombo.getValue()));
                    me.enable();
                }
            };
        if(instanceID){
            UB.core.UBApp.doCommand(cmdConfig);
        }

    },
    showLookup: function () {
        var
            me = this,
            parentCombo = me.parentCombo,
            store = parentCombo.getStore(),
            entityName = store.entityName,
            instanceID = parentCombo.getValue(),
            config = {
                entity: entityName,
                cmdType: UB.core.UBCommand.commandType.showList,
                description: $App.domainInfo.get(entityName, true).getEntityDescription(),
                isModal: true,
                sender: parentCombo,
                selectedInstanceID: instanceID,
                onItemSelected: function (selected) {
                    parentCombo.setValueById(selected.get('ID'));
                },
                cmdData: {
                    params:[{
                        entity: entityName,
                        method: 'select',
                        fieldList: '*',
                        whereList: store.ubRequest.whereList
                    }]
                }
            };
        var filters = store.filters.clone();
        filters.removeAtKey(parentCombo.userFilterId);
        config.filters = filters;

        UB.core.UBApp.doCommand(config);
    },
    onParentAfterRenderer: function () {
        this.initEventHandlers();
        this.bindHotKeys();
    },

    initEventHandlers: function () {
        var me = this;

        me.parentCombo.on({
            expand: me.onParentFocus,
            change: me.onParentValueChange,
            focus: me.onParentFocus,
            blur: me.onParentBlur,
            scope: me
        });
        me.parentCombo.on({
            expand: me.onParentExpand,
            scope: me
        });

        setTimeout(function(){
            // The panel must have its zIndex managed by the same ZIndexManager which is
            // providing the zIndex of our Container.
            me.ownerCt = me.parentCombo.up('[floating]');
            me.registerWithOwnerCt();
        },100);
    },

    bindHotKeys: function () {
        var me = this;
        new Ext.util.KeyMap({
            target: me.parentCombo.getEl(),
            binding: [
                {
                    ctrl: true,
                    key: Ext.EventObject.E,
                    fn: function (keyCode, e) {
                        if(me.parentCombo.disabled || me.parentCombo.readOnly){
                            return;
                        }
                        e.stopEvent();
                        me.editItem();
                        return false;
                    }
                },
                {
                    key: 120,
                    fn: function (keyCode, e) {
                        if(me.parentCombo.disabled || me.parentCombo.readOnly){
                            return;
                        }
                        me.showLookup();
                        return false;
                    }
                }
            ]
        });
    },
    onParentExpand: function (){
        this.parentCombo.un({
            expand: this.onParentExpand,
            scope: this
        });
    },
    initComponent: function () {
        var me = this;

        me.floating = Ext.apply({}, {shadow: me.shadow}, me.self.prototype.floating);
        me.items = [
            {
                xtype: 'button',
                width: '25px',
                flex: 1,
                glyph: UB.core.UBUtil.glyphs.faEdit,
                //iconCls: 'ub-icon-table-edit',
                handler: {
                    fn: me.editItem,
                    scope: me
                }
            },
            {
                xtype: 'button',
                width: '25px',
                flex: 1,
                glyph: UB.core.UBUtil.glyphs.faTable,
                //iconCls: 'ub-icon-table',
                handler: {
                    fn: me.showLookup,
                    scope: me
                }
            },
            {
                xtype: 'button',
                width: '25px',
                flex: 1,
                glyph: UB.core.UBUtil.glyphs.faPlusCircle,
                // iconCls: 'iconAdd',
                handler: {
                    fn: me.addItem,
                    scope: me
                }
            },
            {
                xtype: 'button',
                width: '25px',
                glyph: UB.core.UBUtil.glyphs.faEraser,
                //iconCls: 'iconClear',
                handler: {
                    fn: me.clearSelection,
                    scope: me
                }
            }
        ];
        me.callParent(arguments);

        me.on({
            element: 'el',
            mousedown: me.onClick,
            scope: me
        });


    },
    showAt: function (xy) {
        var me = this;
        if(me.parentCombo.disabled || me.parentCombo.readOnly){
            return;
        }

        me.callParent(arguments);
        // Show may have been vetoed.
        if (me.isVisible()) {
            me.setPagePosition(xy[0], xy[1]);
            if (me.constrainPosition || me.constrain) {
                me.doConstrain();
            }
            me.toFront();
        }
    },
    onParentFocus: function (cmp) {
        var me = this,
            parentCombo = me.parentCombo,
            store = parentCombo.getStore(),
            comboValue = parentCombo.getValue(),
            disabled = !(store.getById(comboValue) || store.getCount() === 0 && Ext.isNumber(comboValue));

        me.items.first().setDisabled(disabled);
        var arr = parentCombo.bodyEl.getXY();
        arr[1] -= 20;
        me.showAt(arr);
    },
    onParentBlur: function () {
        this.hide();
    },
    onParentValueChange: function () {
        var me = this,
            parentCombo = me.parentCombo,
            disabled = !parentCombo.getStore().getById(parentCombo.getValue());
        me.items.first().setDisabled(disabled);
    },
    onClick: function (e) {
        var me = this,
            item;

        if (me.disabled) {
            e.stopEvent();
            return;
        }
        item = me.getItemFromEvent(e);
        if (item && !item.isDisabled()) {
            if(_.isFunction(item.handler)){
                item.handler(e);
            }else if(item.handler && _.isFunction(item.handler.fn)){
                Ext.callback(item.handler.fn, item.handler.scope, [e]);
            }
        }
    },
    getItemFromEvent: function (e) {
        return this.getChildByElement(e.getTarget());
    }

});