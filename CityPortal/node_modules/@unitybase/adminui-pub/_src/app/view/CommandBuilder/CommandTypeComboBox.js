/**
 * Файл: UB.view.CommandBuilder.CommandTypeComboBox.js
 * Автор: Игорь Ноженко
 * 
 * Расширение Ext.form.field.ComboBox
 * 
 * Реализует выбор типа команды
 */
 
Ext.define("UB.view.CommandBuilder.CommandTypeComboBox", {
    extend: "Ext.form.field.ComboBox",
    alias: "widget.commandbuildercommandtypecombobox",
    requires: [
        "Ext.data.ArrayStore"
    ],

    initComponent: function() {
        this.valueField = "id";
        this.displayField = "description";

        this.store = Ext.create("Ext.data.ArrayStore", {
            fields: [
                { name: this.valueField, type: "int" },
                { name: this.displayField, type: "string" }
            ],
            data: [
                [ 0, UB.core.UBCommand.commandType.showList ],
                [ 1, UB.core.UBCommand.commandType.showForm ]
            ]
        });

        Ext.apply(this, {
            queryMode: "local",
            editable: false,
            width: 150
        });

        this.callParent(arguments);
    }
});
