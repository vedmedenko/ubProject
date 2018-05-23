require('../../core/UBStoreManager')
require('../../core/UBAppConfig')
/**
 * Файл: UB.view.CommandBuilder.FormsComboBox.js
 * Автор: Игорь Ноженко
 * 
 * Расширение Ext.form.field.ComboBox
 * 
 * Реализует выбор form'ы
 */

Ext.define("UB.view.CommandBuilder.FormsComboBox", {
    extend: "Ext.form.field.ComboBox",
    alias: "widget.commandbuilderformscombobox",
    // requires: [
    //     "UB.core.UBStoreManager",
    //     "UB.core.UBAppConfig"
    // ],

    initComponent: function() {
        this.valueField = this.displayField = "Code";

        this.store = UB.core.UBStoreManager.getFormStore();

        Ext.apply(this, {
            queryMode: "local",
            editable: false,
            width: 150
        });

        this.callParent(arguments);
    }
});
