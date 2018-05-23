require('./UBBaseComboBox')
/**
 * ComboBox to select values true, false and optional blank
 */
Ext.define('UB.ux.form.field.UBBoolBox', {
    extend: 'UB.ux.form.field.UBBaseComboBox',
    alias: 'widget.ubboolbox',
    editable: false,
    forceSelection: true,
    queryMode: 'local',

    /**
     *  add empty value to data store
     */
    addEmptyValue: false,
    addnoFilterValue: false,


    initComponent: function(){
        var me = this, data;
        me.displayField = 'name';
        me.valueField = 'value';

        data = [
            {"value": 1, "name": UB.i18n('da')},
            {"value": 0, "name":  UB.i18n('net')}
        ];

        if (me.addEmptyValue){
            data.unshift({"value": 'isNull', "name": UB.i18n('isNull') });
        }

        if (me.addnoFilterValue){
            data.unshift({"value": 'no_filter', "name": UB.i18n('no_filter') });
        }

        me.store = Ext.create('Ext.data.Store', {
            fields: ['value', 'name'],
            data : data
        });

        me.callParent(arguments);

    },

    setValueById: null


});
