require('../../core/UBUtil')
/**
 * ComboBox able to display all Domain entities. Used, for example, in ubm_form form.
 *
 * @authors UnityBase core team, Nozhenko Igor
 */
Ext.define("UB.view.CommandBuilder.EntitiesComboBox", {
    extend: 'UB.ux.form.field.UBBaseComboBox',
    alias: "widget.commandbuilderentitiescombobox",
    requires: [
        // "UB.core.UBUtil",
        "Ext.data.ArrayStore"
    ],

    initComponent: function() {
        this.valueField = this.displayField = "name";

        this.store = Ext.create("Ext.data.ArrayStore", {
            fields: [
                { name: this.valueField, type: "string" }
            ]
        });

        Ext.apply(this, {
            queryMode: "local"
        });

        this.callParent(arguments);

        this.addListener("render", this.loadEntities, this);
    },

    loadEntities: function(combo, eOpts) {
        var
            data = [];
        $App.domainInfo.eachEntity(function(value, key){
            data.push([key]);
        });

        this.getStore().loadData(data);
    }
});
