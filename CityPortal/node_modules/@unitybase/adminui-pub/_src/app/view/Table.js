/**
 * User: xmax
 * Date: 01.07.15
 */
Ext.define('UB.view.Table', {
    extend: 'Ext.view.Table',
    alias: 'widget.ubtableview',
    renderRows: function(rows, viewStartIndex, out) {
        var me = this;
        me.callParent(arguments);
        /**
         * @cfg {boolean} hideEndRow When true end row does not render.
         */
        if (!me.hideEndRow){
           out.push('<tr class="ub-grid-row-end" ><td class="ub-grid-row-cell-end" colspan="' + me.ownerCt.getVisibleColumnManager().getColumns().length +'">' + me.getEndRowHtml() + '</td></tr>');
        }
    },

    /**
     * You can override this function to set your html to end row
     * @returns {string}
     */
    getEndRowHtml: function(){
       return '';
    }


});


