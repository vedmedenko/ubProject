require('./Portlet')
Ext.define('UB.ux.dashboard.DashboardColumn', {
    extend: 'Ext.container.Container',
    alias: 'widget.dashboardcolumn',

    // requires: ['UB.ux.dashboard.Portlet'],

    layout: 'anchor',
    defaultType: 'portlet',
    cls: 'x-dashboard-column'

    // This is a class so that it could be easily extended
    // if necessary to provide additional behavior.
});
