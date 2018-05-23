/**
 *  Paging tool bar for Grid.
 */
Ext.define('UB.view.PagingToolbar',{
    extend: 'Ext.toolbar.Paging',
    alias: 'widget.pagingtb',
    requires: [
        'Ext.data.Store'
    ],

    baseWidth: 130,
    width: 160,

    initComponent : function(){
        var me = this;
        me.beforePageText = '';
        me.lastTotalCount = null;

        me.callParent();
        if (me.store){
            me.store.on('load', me.onStoreLoad, me);
        }

        me.child('#first').hide();
        me.child('#last').hide();
        me.child('#afterTextItem').hide();
        me.child('#refresh').hide();
        me.child('#inputItem').hide();
        me.child('#inputItem').setMinValue(1);
        /**
         * @event totalChanged
         * Fires each times when the total count was changed
         * @param {number} Total rows count.
         */
        me.addEvents('totalChanged');
    },

    onStoreLoad: function(){
        var me = this;
        me.onLoad();
    },

    /**
     * @cfg {Boolean} autoCalcTotal default false
     * If it is true show total row count in paging toolbar
     */

    getPagingItems: function() {
        var me = this, items;
        items = me.callParent(arguments);
        me.buttonCount = Ext.create('Ext.Button',{
            focusOnToFront: false,
            iconCls: 'ub-sum-row-icon',
            tooltip: UB.i18n('calcRowCount'),
            //glyph: UB.core.UBUtil.glyphs.faCalculator,
            handler: me.calcTotalRow,
            scope: me,
            margin: '0 0 0 0',
            hidden: !!me.autoCalcTotal
        });
        me.labelCtrl = Ext.create('Ext.form.Label', {
            text: '',
            hidden: !me.autoCalcTotal,
            cls: 'ub-total-row',
            listeners: {
                boxready: function(){
                    me.labelCtrl.getEl().set({"data-qtip": UB.i18n('totalRowCount')});
                }
            }
        });
        me.store.on('refresh', function(){
            if (me.autoCalcTotal){
                if (me.store.totalCount < 0 && me.lastTotalCount === null){
                    me.labelCtrl.hide();
                    me.buttonCount.show();
                    me.autoCalcTotal = false;
                }
                if (me.store.totalCount >= 0){
                    me.lastTotalCount = me.store.totalCount;
                }
                me.setTotal(me.lastTotalCount !== null ? me.lastTotalCount : me.store.totalCount);
                //me.calcTotalRow();
            }
        }, me);

        function requestChanged(){
            me.lastTotalCount = null;
            if (!me.store.ubRequest.options){
                me.store.ubRequest.options = {};
            }
            me.store.ubRequest.options.totalRequired = true;
        }

        me.store.on('beforereload', requestChanged, me);
        //me.store.on('filterchange', requestChanged, me);
        me.store.filters.on('add', requestChanged, me );
        me.store.filters.on('clear', requestChanged, me );
        me.store.filters.on('remove', requestChanged, me );
        me.store.filters.on('replace', requestChanged, me );

        me.buttonPage = Ext.create('Ext.Button',{
            focusOnToFront: false,
            tooltip: UB.i18n('currentPageNumber'),
            text: '1',
            handler: function(){ me.selectPage(); },
            scope: me,
            cls: 'UB-paging-toolbar-page',
            //menu: {},
            margin: '0 0 0 0'
        });

        items[0].hiden = true;
        items[4].hiden = true;
        items[5].hiden = true;
        items[8].hiden = true;
        items[10].hiden = true;

        items.push(
            '-',
            me.buttonCount,
            me.labelCtrl
        );
        items.splice(6, 1);
        items.splice(8, 1);
        items.splice(5, 0,
            me.buttonPage
        );
        items.splice(2, 2);
        return items;
    },

    onLoad : function(){
        var me = this, pageData, afterText, itemCount;
        me.callParent();
        itemCount = me.store.getCount();
        if (itemCount > 0) {
            pageData = me.getPageData();
            afterText = UB.format(me.afterPageText, pageData.total < 0 ? '?' : pageData.pageCount);

            me.child('#inputItem').setDisabled(me.store.pageSize > itemCount && pageData.currentPage === 1 );
        } else {
            if (me.store.currentPage > 1){
                var inputItem = me.child('#inputItem');
                inputItem.setDisabled(false);
                inputItem.setValue(me.store.currentPage);
                me.child('#first').setDisabled(false);
                me.child('#prev').setDisabled(false);
            }
            me.child('#inputItem').setDisabled(true);
        }
        me.child('#afterTextItem').setText(afterText);
        //me.child('#next').setDisabled(currPage === pageCount  || isEmpty);
        //me.child('#last').setDisabled(currPage === pageCount  || isEmpty);

        me.buttonPage.setText( parseInt(me.store.currentPage, 10).toLocaleString() );
        if (me.store.currentPage <= 1 && itemCount < me.store.pageSize){
            me.buttonCount.hide();
            me.setTotal(itemCount);
            if (me.rendered){
               Ext.AbstractComponent.updateLayout(me, true);
            }
            return;
        }
        if (me.store.totalCount !== undefined && me.store.totalCount >= 0){
            me.buttonCount.hide();
            //me.autoCalcTotal = true;
            me.setTotal(me.store.totalCount);
            me.lastTotalCount = me.store.totalCount;
        }
        if (!me.autoCalcTotal && me.labelCtrl.isVisible()){
            me.labelCtrl.hide();
            me.buttonCount.show();
            me.setWidth(me.baseWidth + me.buttonCount.getWidth() );
            // change total to undefined
            me.fireEvent('totalChanged', null);
        }
        if (me.rendered){
            Ext.AbstractComponent.updateLayout(me, true);
        }

    },

    selectPage: function(basePage){
        var me = this,
            menuItems = [], startItem,
            maxPage, isLastPage = false, endPage,
            itemCount = 7, itemBefore = 3, totalCount;
        //me.buttonPage.menu.removeAll();

        function onItemClick(item){
            me.store.loadPage(item.itemNum);
        }

        startItem  = basePage ? basePage : (me.store.currentPage - itemBefore > 0 ?  me.store.currentPage - itemBefore: 1);
        maxPage = startItem + itemCount;

        totalCount = me.lastTotalCount !== null ? me.lastTotalCount: me.store.totalCount;

        if (totalCount !== undefined && totalCount > 0){
            endPage = totalCount / me.store.pageSize;
            if (Math.floor(endPage) !== endPage ){
                endPage = endPage + 1;
            }
            endPage = Math.floor(endPage);
            maxPage = endPage;
            if (startItem > maxPage){
                startItem = maxPage - itemCount > 0 ? maxPage - itemCount : 1;
            }
            if (maxPage > startItem + itemCount - 1){
                maxPage = startItem + itemCount - 1;
            } else {
                isLastPage = true;
            }
        }
        if (startItem > 1){
            menuItems.push({
                text: 1,
                itemNum: 1,
                handler: onItemClick
            });
            if (startItem > 2){
                menuItems.push({
                    text: '...',
                    handler: function(){
                        //me.contextMenu.close();
                        me.selectPage( startItem - itemCount <= 0 ? 1 : startItem - itemCount  );
                    }
                });
            }
        }
        for( var i = startItem ; i <= maxPage; i++){
            menuItems.push({
                //xtype: 'button',
                text: i,
                itemNum: i,
                disabled: me.store.currentPage === i,
                handler: onItemClick
            });
        }
        if (!isLastPage){
            menuItems.push({
                text: '...',
                handler: function(){
                    //me.contextMenu.close();
                    me.selectPage( maxPage );
                }
            });
            if (endPage){
                menuItems.push({
                    xtype: 'label',
                    text: endPage,
                    disabled: true
                });
            }
        }

        if (!me.contextMenu){
            me.contextMenu = Ext.create('Ext.menu.Menu', {
                width: 60,
                minWidth: 60,
                cls : 'ub-paging-tb-menu',
                plain: true,
                margin: '0 0 5 0',
                items: menuItems
            });
        } else {
            me.contextMenu.removeAll();
            me.contextMenu.add(menuItems);
        }
        if (menuItems.length > 0){
            me.contextMenu.showBy( me.buttonPage);
        }
        //menu.showAt( me.getX(), me.buttonPage.getY());
    },

    calcTotalRow: function(){
        var me = this,
            store = me.store;
        if (!store.ubRequest.options){
            store.ubRequest.options = {};
        }
        store.ubRequest.options.totalRequired = true;
        me.autoCalcTotal = true;
        store.load();
        me.buttonCount.hide();
    },

    decreaseTotal: function(){
        if (typeof(this.lastTotal) === 'number'){
           this.setTotal(this.lastTotal - 1);
        }
    },

    updateTotal: function(){
       this.setTotal(this.lastTotal || 0);
    },

    setTotal: function(totalCount){
        var me = this;
        me.labelCtrl.setText( totalCount || totalCount === 0 ?  Ext.util.Format.number(parseInt(totalCount, 10), '0,000') : '-' );
        me.labelCtrl.show();
        me.setWidth(me.baseWidth + (me.labelCtrl.rendered ? me.labelCtrl.getWidth(): 0) );
        me.fireEvent('totalChanged', totalCount);
        if (me.store.ubRequest && me.store.ubRequest.options){
            me.store.ubRequest.options.totalRequired = false;
        }
        me.lastTotal =  totalCount;
        //me.autoCalcTotal = true;
    },

    readPageFromInput : function(pageData){
        var inputItem = this.getInputItem(),
            v = inputItem.getValue();
        if (v <= 0){
            inputItem.setValue(pageData.currentPage);
            return false;
        }
        return this.callParent(arguments);
    },

    // @private
    getPageData : function(){
        var store = this.store,
            totalCount = store.getTotalCount();

        return {
            total : totalCount,
            currentPage : store.currentPage,
            pageCount: totalCount < 0 ? store.currentPage + 1 : Math.ceil(totalCount / store.pageSize),
            fromRecord: ((store.currentPage - 1) * store.pageSize) + 1,
            toRecord: Math.min(store.currentPage * store.pageSize, totalCount)

        };
    },


    /**
     * Move to the next page, has the same effect as clicking the 'next' button.
     */
    moveNext : function(){
        var me = this,
            pageData = me.getPageData(),
            total = pageData.pageCount,
            next = me.store.currentPage + 1;

        if (pageData.total < 0 || next <= total) {
            if (me.fireEvent('beforechange', me, next) !== false) {
                me.store.nextPage();
            }
        }
    },

    onPagingKeyDown : function(field, e){
        var me = this,
            k = e.getKey(),
            pageData = me.getPageData(),
            increment = e.shiftKey ? 10 : 1,
            pageNum;

        if (k === e.RETURN) {
            e.stopEvent();
            pageNum = me.readPageFromInput(pageData);
            if (pageNum !== false) {
                //pageNum = Math.min(Math.max(1, pageNum), pageData.pageCount);
                if(me.fireEvent('beforechange', me, pageNum) !== false){
                    me.store.loadPage(pageNum);
                }
            }
        } else if (k === e.HOME ) { /*|| k === e.END*/
            e.stopEvent();
            pageNum = 1; // k === e.HOME ? 1 : pageData.pageCount;
            field.setValue(pageNum);
        } else if (k === e.UP || k === e.PAGE_UP || k === e.DOWN || k === e.PAGE_DOWN) {
            e.stopEvent();
            pageNum = me.readPageFromInput(pageData);
            if (pageNum) {
                if (k === e.DOWN || k === e.PAGE_DOWN) {
                    increment *= -1;
                }
                pageNum += increment;
                if (pageNum >= 1 ) { //&& pageNum <= pageData.pageCount
                    field.setValue(pageNum);
                }
            }
        }
    }
});
