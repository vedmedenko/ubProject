require('../core/UBAppConfig')
require('../core/UBUtil')
require('../core/UBLocalStorageManager')
require('./ToolbarWidget')
require('./ToolbarMenu')
require('./ToolbarUser')
require('./ToolbarMenuButton')
require('./FullTextSearchWidget')

/**
 * Main window toolbar container.
 * Content of toolbar is added inside `buildMainMenu` event handler(s).
 * Default toolbar content created in UBM/public/initModel.js
 *
 * See <a href="https://enviance.softline.kiev.ua/confluence/display/UB/Ext-based+client.+Main+window+toolbar+customization">Main window toolbar customization</a> article for details.
 */
Ext.define("UB.view.MainToolbar", {
    extend: "Ext.toolbar.Toolbar",
    alias: "widget.maintoolbar",
    // requires: [
    //     "UB.core.UBApp",
    //     "UB.core.UBAppConfig",
    //     "UB.core.UBUtil",
    //     "UB.core.UBLocalStorageManager",
    //     'UB.view.ToolbarWidget',
    //     'UB.view.ToolbarMenu',
    //     'UB.view.ToolbarUser',
    //     'UB.view.ToolbarMenuButton',
    //     'UB.view.FullTextSearchWidget'
    // ],
    cls: 'ub-header-menu-container',

    initComponent: function() {
        this.buildToolbar();
        this.callParent(arguments);
        UB.view.MainToolbar.toolbar = this;
    },

    buildToolbar: function(){
        var toolBarItems = [];
        $App.fireEvent('buildMainMenu', toolBarItems);
        Ext.apply(this, { items: toolBarItems });
    }
});
