require('./DashboardDropZone')
require('./DashboardColumn')
Ext.define('UB.ux.dashboard.DashboardPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.dashboardpanel',

    // requires: ['UB.ux.dashboard.DashboardColumn'],

    cls: 'x-dashboard',
    bodyCls: 'x-dashboard-body',
    defaultType: 'dashboardcolumn',
    autoScroll: true,

    initComponent : function() {
        // Implement a Container beforeLayout call from the layout to this Container
        this.layout = {
            type : 'column'
        };
        this.callParent();

        this.addEvents({
            validatedrop: true,
            beforedragover: true,
            dragover: true,
            beforedrop: true,
            drop: true
        });
        this.on('drop', this.doLayout, this);
    },

    // Set columnWidth, and set first and last column classes to allow exact CSS targeting.
    beforeLayout: function() {
        var items = this.layout.getLayoutItems(),
            len = items.length,
            i = 0,
            item;

        for (; i < len; i++) {
            item = items[i];
            item.columnWidth = 1 / len;
            item.removeCls(['x-dashboard-column-first', 'x-dashboard-column-last']);
        }
        items[0].addCls('x-dashboard-column-first');
        items[len - 1].addCls('x-dashboard-column-last');
        return this.callParent(arguments);
    },

    // private
    initEvents : function(){
        this.callParent();
        this.dd = Ext.create('UB.ux.dashboard.DashboardDropZone', this, this.dropConfig);
    },

    // private
    beforeDestroy : function() {
        if (this.dd) {
            this.dd.unreg();
        }
        this.callParent();
    }
});
