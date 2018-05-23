Ext.define('UB.ux.tree.Column', {
    extend: 'Ext.grid.column.Column',
    alias: 'widget.ubtreecolumn',

    tdCls: Ext.baseCSSPrefix + 'grid-cell-treecolumn',

    autoLock: true,
    lockable: false,
    draggable: false,
    hideable: false,

    //iconCls: Ext.baseCSSPrefix + 'tree-icon',
    //checkboxCls: Ext.baseCSSPrefix + 'tree-checkbox',
    //elbowCls: Ext.baseCSSPrefix + 'tree-elbow',
    //expanderCls: Ext.baseCSSPrefix + 'tree-expander',
    textCls: '', // Ext.baseCSSPrefix + 'tree-node-text',
    innerCls: 'ub_tree_inner-col', // Ext.baseCSSPrefix + 'grid-cell-inner-treecolumn',
    isTreeColumn: true,

    cellTpl: [
        '<tpl for="lines">',
        '<span class="{parent.lineCLS}{#}" ></span>',
        //'<img src="{parent.blankUrl}" class="{parent.childCls} {parent.elbowCls}-img ',
        //'{parent.elbowCls}-<tpl if=".">line<tpl else>empty</tpl>" role="presentation"/>',
        '</tpl>',
        //'<img src="{blankUrl}" class="{childCls} {elbowCls}-img {elbowCls}',
        //  '<tpl if="isLast">-end</tpl><tpl if="expandable">-plus {expanderCls}</tpl>" role="presentation"/>',
        //'<tpl if="checked !== null">',
        //'<input type="button" {ariaCellCheckboxAttr}',
        //' class="{childCls} {checkboxCls}<tpl if="checked"> {checkboxCls}-checked</tpl>"/>',
        //'</tpl>',
        //'<img src="{blankUrl}" role="presentation" class="{childCls} {baseIconCls} ',
        //'{baseIconCls}-<tpl if="leaf">leaf<tpl else>parent</tpl> {iconCls}"',
        //'<tpl if="icon">style="background-image:url({icon})"</tpl>/>',
        //'<tpl if="href">',
        //'<a href="{href}" role="link" target="{hrefTarget}" class="{textCls} {childCls}">{value}</a>',
        //'<tpl else>',
        //'<span class="{textCls} {childCls}">{value}</span>',
        //'</tpl>'
        '<tpl if="iconCls">',
           '<span class="ub_tree_icon ub_tree_depth ub_tree_depth_{depth} {iconCls}"></span>',
        '</tpl>',
        '<span class="ub_tree_text ub_tree_depth ub_tree_depth_{depth} ',
          '<tpl if="isNode">ub_tree_text_group</tpl>',
        ' {textCls}">{value}</span>',
        '<tpl if="isNode"><span class=',
        '"ub_tree_group ub_tree_depth ub_tree_depth_{depth} fa <tpl if="expanded">fa-angle-down<tpl else>fa-angle-left</tpl>"',
        '></span>',
        '<tpl else><span class="ub_tree_group ub_tree_depth ub_tree_depth_{depth}"></tpl>'
    ],

    initComponent: function() {
        var me = this,
            renderer = me.renderer;

        if (typeof renderer == 'string') {
            renderer = Ext.util.Format[renderer];
        }
        me.origRenderer = renderer;
        me.origScope = me.scope || window;

        me.renderer = me.treeRenderer;
        me.scope = me;

        me.callParent();
    },

    treeRenderer: function(value, metaData, record, rowIdx, colIdx, store, view){
        var me = this,
            cls = record.get('cls'),
            rendererData;

        if (cls) {
            metaData.tdCls += ' ' + cls;
        }

        rendererData = me.initTemplateRendererData(value, metaData, record, rowIdx, colIdx, store, view);

        return me.getTpl('cellTpl').apply(rendererData);
    },

    initTemplateRendererData: function(value, metaData, record, rowIdx, colIdx, store, view) {
        var me = this,
            renderer = me.origRenderer,
            data = record.data,
            parent = record.parentNode,
            rootVisible = view.rootVisible,
            showLines = view.showTreeLines,
            //levelOffset = view.levelOffset || 10,
            //lineOffset = 0,
            lines = [],
            parentData;

        while (parent && (rootVisible || parent.data.depth > 0)) {
            //lineOffset += levelOffset;
            parentData = parent.data;
            lines[rootVisible ? parentData.depth : parentData.depth - 1] =
                parentData.isLast ? 0 : 1;
            parent = parent.parentNode;
        }

        return {
            record: record,
            baseIconCls: me.iconCls,
            iconCls: data.iconCls, //? data.iconCls : 'fa fa-columns', // data.iconCls,
            icon: data.icon,
            checkboxCls: me.checkboxCls,
            checked: data.checked,
            elbowCls: me.elbowCls,
            expanderCls: me.expanderCls,
            textCls: me.textCls,
            leaf: data.leaf,
            expanded: data.expanded,
            isNode: record.hasChildNodes( ) , //isLeaf()
            depth: record.getDepth(),
            expandable: record.isExpandable(),
            isLast: data.isLast,
            blankUrl: Ext.BLANK_IMAGE_URL,
            href: data.href,
            hrefTarget: data.hrefTarget,
            lines: lines,
            metaData: metaData,
            // subclasses or overrides can implement a getChildCls() method, which can
            // return an extra class to add to all of the cell's child elements (icon,
            // expander, elbow, checkbox).  This is used by the rtl override to add the
            // "x-rtl" class to these elements.
            childCls:  me.getChildCls ? me.getChildCls() + ' ' : '',
            lineCLS: showLines ? 'ub_tree_line_visible ub_tree_line_visible': 'ub_tree_line ub_tree_line' ,
            //lineCLS: 'ub_tree_line',
            value: renderer ? renderer.apply(me.origScope, arguments) : value
        };
    }
});

