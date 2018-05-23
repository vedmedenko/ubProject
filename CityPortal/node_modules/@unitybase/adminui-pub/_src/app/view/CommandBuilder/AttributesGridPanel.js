/**
 * @deprecated
 * @author Nozhenko
 */
Ext.define("UB.view.CommandBuilder.AttributesGridPanel", {
    extend: "Ext.grid.Panel",
    alias: "widget.commandbuilderattributesgridpanel",
    requires: [
        "Ext.data.Model",
        "Ext.data.Store",
        "Ext.ModelManager",
        "UB.core.UBAppConfig"
    ],

    initComponent: function() {
        var
            modelName = UB.ux.data.UBStore.entityModelName("CommandBuilderAttributesGridPanelModel");

        if(!Ext.ModelManager.getModel(modelName)) {
            Ext.define(modelName, {
                extend: "Ext.data.Model",
                idProperty: "name",
                fields: [
                    { name: "name", type: "string" },
                    { name: "caption", type: "string" }
                ]
            });
        }


        Ext.apply(this, {
            store: Ext.create("Ext.data.Store", {
                model: modelName
            }),
            columns: [
                { dataIndex: "caption", header: "caption", flex: 1 },
                { dataIndex: "name", header: "name", flex: 1 }
            ],
            multiSelect: true,
            menu: Ext.create("Ext.menu.Menu",{
                items:[{
                    text: UB.i18n('Delete'),
                    iconCls: "iconDelete",
                    scope: this,
                    handler: this.deleteRecord
                }]
            }),
            listeners: {
                itemcontextmenu: function(grid, record, item, index, event, eOpts) {
                    event.stopEvent();
                    this.menu.showAt(event.xy);
                }
            }
        });

        this.callParent(arguments);
    },

    getData: function() {
        var
            data = [];

        this.getStore().each(function(record) {
            data.push(record.get("name"));
        });

        return data.join(',');
    },

    setData: function(data) {
        this.getStore().loadData(data);
    },

    addRecord: function(rec) {
        this.getStore().add(rec);
    },

    deleteRecord: function() {
        var
            sm = this.getSelectionModel(),
            sel = sm.getSelection();

        if(sm.hasSelection())
            this.getStore().remove(sel);
    }
});
