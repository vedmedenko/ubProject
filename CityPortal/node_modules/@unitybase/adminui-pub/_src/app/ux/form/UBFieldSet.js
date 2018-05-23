/**
 * Ext.form.FieldSet but with margins,   padding's & borders preset for UB UI
 */
Ext.define("UB.ux.form.UBFieldSet", {
    extend: "Ext.form.FieldSet",
    alias: "widget.ubfieldset",

    margin: '5 0 5 0',
    padding: '5 0 5 0',
    border: '0 0 0 0 ',

    createLegendCt: function () {
        var me = this, result;
        result = me.callParent(arguments);
        if (result.items.length > 1){
            result.items = [result.items[1], result.items[0]];
        }

        return result;
    },

    glyphCollapsed: 0xf105,
    glyph: 0xf107,


    createToggleCmp: function() {
        var me = this;
        /*
         me.toggleCmp = Ext.widget({
         xtype: 'tool',
         height: 15,
         width: 15,
         type: 'toggle',
         handler: me.toggle,
         id: me.id + '-legendToggle',
         scope: me
         });
         */
        me.toggleCmp = Ext.widget({
            xtype: 'component',
            autoEl: {
                tag: 'div'
            },
            height: 15,
            width: 35,
            //glyph: 0, // me.glyphCollapsed,
            //handler: me.toggle,
            id: me.id + '-legendToggle',
            style: 'float: left; font-size: 1.4em; padding-left: 12px; cursor: pointer;',
            scope: me
        });
        me.toggleCmp.on('boxready', function(){
            me.toggleCmp.getEl().on('click',me.toggle, me);
        });
        if (!me.collapsed){
            me.toggleCmp.addCls(['fa','fa-angle-down']);
        } else {
            me.toggleCmp.addCls(['fa','fa-angle-right']);
        }
        return me.toggleCmp;
    },

    toggle: function() {
        var me = this;

        me.callParent(arguments);

        if (!me.collapsed){
            me.toggleCmp.removeCls('fa-angle-right');
            me.toggleCmp.addCls('fa-angle-down');
        } else {
            me.toggleCmp.removeCls('fa-angle-down');
            me.toggleCmp.addCls('fa-angle-right');
        }
    }
});
