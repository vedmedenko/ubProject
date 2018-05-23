require('../core/UBAppConfig')
require('../core/UBStoreManager')
require('../core/UBUtilTree')
require('./NavigationPanel')

Ext.define('UB.view.NavAccordion', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.navaccordion',
    // requires: [
    //     'UB.core.UBAppConfig',
    //     'UB.core.UBStoreManager',
    //     'UB.core.UBUtilTree',
    //     'UB.view.NavigationPanel'
    // ],
  uses: ['UB.core.UBApp'],
    layout: {
        // layout-specific configs go here
        type: 'accordion',
        titleCollapse: true,
        animate: true
        //activeOnTop: true
    },
    initComponent: function() {
        var me = this, storeDS, dsRow;

        //me.storeNavigationShortcut = UB.core.UBStoreManager.getNavigationShortcutStore();
        me.desktopStore = storeDS = UB.core.UBStoreManager.getDesktopStore();
        me.items = me.items || [];
        for( var dsNum = 0; dsNum < storeDS.getCount(); dsNum++){
            dsRow = storeDS.getAt(dsNum);
            me.items.push({
                title: dsRow.get('caption'),
                layout: { type: 'vbox', align: 'stretch' },
                //split: true,
                //collapsible: true,
                border: false,
                overflowY: 'auto',
                items: [{
                   xtype: 'navigationpanel',
                   desktopID: dsRow.get('ID')
                }]
            });
        }
        this.callParent(arguments);
    }

});


