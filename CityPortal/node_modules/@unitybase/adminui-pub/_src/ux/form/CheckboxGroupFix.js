Ext.onReady(function() {
    /**
     * Fix ext bug - On error no red border.
     */
    Ext.define('Ext.ux.form.CheckboxGroupFix', {
        override: 'Ext.form.CheckboxGroup',
        initComponent: function(){
            var me = this;
            me.invalidCls = me.invalidCls ? me.invalidCls: Ext.baseCSSPrefix + 'form-invalid';
            me.callParent(arguments);
        }
    });
});
