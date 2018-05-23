/**
 * Base class for MainToolbar widget.
 * See <a href="https://enviance.softline.kiev.ua/confluence/display/UB/Ext-based+client.+Main+window+toolbar+customization">Main window toolbar customization</a> article for details.
 */
Ext.define("UB.view.ToolbarWidget", {
    extend: "Ext.toolbar.Toolbar",
    alias: "widget.toolbarwidget",
    cls: 'ub-header-menu-item',
    border: 0,
    margin: 0,
    padding: 0,
    requires: [],

    initComponent: function() {
        this.callParent(arguments);
    }
});

