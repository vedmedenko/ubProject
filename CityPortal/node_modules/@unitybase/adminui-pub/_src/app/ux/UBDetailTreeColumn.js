/**
 * Columns class for UB.ux.UBDetailTree
 * TODO - describe usage
 * @author UnityBase core team
 */
Ext.define('UB.ux.UBDetailTreeColumn', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.ubdetailtreecolumn',

    tdCls: Ext.baseCSSPrefix + 'grid-cell-treecolumn',

    autoLock: true,
    lockable: false,
    draggable: false,
    hideable: false,

    treePrefix: Ext.baseCSSPrefix + 'tree-',
    elbowPrefix: Ext.baseCSSPrefix + 'tree-elbow-',
    expanderCls: Ext.baseCSSPrefix + 'tree-expander',
    imgText: '<img src="{1}" class="{0}" />',

    initComponent: function(){
        var me = this;

        me.origRenderer = me.renderer || me.defaultRenderer;
        me.origScope = me.scope || window;

        me.renderer = me.treeRenderer;
        me.scope = me;

        me.callParent();
    },

    treeRenderer: function(value, metaData, record, rowIdx, colIdx, store, view){

        var me = this,
            buf = [],
            format = UB.format,
            depth = record.getDepth(),
            treePrefix  = me.treePrefix,
            elbowPrefix = me.elbowPrefix,
            expanderCls = me.expanderCls,
            imgText     = me.imgText,
            formattedValue = me.origRenderer.apply(me, arguments),
            blank = Ext.BLANK_IMAGE_URL,
            cls = record.get('cls'),
        // subclasses or overrides can implement a getChildCls() method, which can
        // return an extra class to add to all of the cell's child elements (icon,
        // expander, elbow, checkbox).  This is used by the rtl override to add the
        // "x-rtl" class to these elements.
            childCls = me.getChildCls ? me.getChildCls() + ' ' : '';

        var iconCls = record.raw.iconCls;
        var titleContent = record.raw.title;
        titleContent = titleContent ? '<legend>' + '<span>' + record.raw.title + '</span>' + '</legend>' : undefined;
        if (iconCls){
            formattedValue = [
                '<fieldset class="ub-tree-node">',
                '<legend>',
                '<span role="img" class="ub-tree-node-icon '+iconCls+'">',
                '&nbsp',
                '</span>',
                '<span class="ub-tree-node-title-withicon">',
                record.raw.title,
                '</span>',
                '</legend>',
                formattedValue,
                '</fieldset>'
            ].join('');
        } else {
            formattedValue = [
                '<fieldset class="ub-tree-node">',
                titleContent,
                formattedValue,
                '</fieldset>'
            ].join('');
        }
        while (record) {

            if (!record.isRoot() || (record.isRoot() && view.rootVisible)) {
                if (record.getDepth() === depth) {
                    buf.unshift(format(imgText,
                        childCls +
                            //treePrefix + 'icon ' +
                            treePrefix + 'icon' + (record.get('icon') ? '-inline ' : '') +
                            (record.get('iconCls') || ''),
                        record.get('icon') || blank
                    ));

                    if (record.isLast()) {
                        if (record.isExpandable()) {
                            buf.unshift(format(imgText, (childCls + ' x-tree-icon ' + elbowPrefix + 'end-plus ' + expanderCls), blank));
                        } else {
                            buf.unshift(format(imgText, (childCls + ' x-tree-icon ' +  elbowPrefix + 'end'), blank));
                        }
                    } else {
                        if (record.isExpandable()){
                            buf.unshift(format(imgText, (childCls + ' x-tree-icon ' + elbowPrefix + 'plus ' + expanderCls), blank));
                        } else {
                            buf.unshift(format(imgText, (childCls + ' x-tree-icon ' + treePrefix + 'elbow'), blank));
                        }
                    }
                } else {

                    if (record.isLast() || record.getDepth() === 0) {
                        buf.unshift(format(imgText, (childCls + ' x-tree-icon ' + elbowPrefix + 'empty'), blank));
                    } else if (record.getDepth() !== 0) {
                        buf.unshift(format(imgText, (childCls + ' x-tree-icon ' + elbowPrefix + 'line'), blank));
                    }
                }
            }
            record = record.parentNode;
        }

        buf.push(formattedValue);

        if (cls) {
            metaData.tdCls += ' ' + cls;
        }
        return buf.join('');
    },

    defaultRenderer: Ext.identityFn
});