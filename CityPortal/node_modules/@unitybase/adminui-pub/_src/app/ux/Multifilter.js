require('../core/UBStoreManager')
require('../core/UBUtil')
require('./form/field/UBBoolBox')
require('./form/field/UBBoxSelect')
require('./form/field/UBMultiSelectBox')
/**
 * Widget for grid filtration. Used in UB.view.EntityGridPanel toolbar.
 * This mixin will create toolbar on grid. When user select cell in grid the mixin will show a context filter in toolbar.
 * This works only if the grid selection model is Ext.selection.CellModel.
 * Controls the filter will be created by the meta-data of the store list field.
 * If you have the complex field in grid but you want use filter by entity you must add base field to fields list.
 * For example you have field list:
 *
 *      fieldList:["ID","dateReg","companyID.caption"]
 *
 * By default the mixin will make a filter as string for companyID
 * But in this example will be created the entity filter:
 *
 *      fieldList:["ID","dateReg", {name: "companyID", visibility: false}, "companyID.caption"]
 *
 * @author UnityBase core team. garzaev
 */

Ext.define('UB.ux.Multifilter', {
    extend: 'Ext.toolbar.Toolbar', //Ext.toolbar.Toolbar Ext.form.Panel
    // requires: [
    //     'UB.core.UBStoreManager',
    //     'UB.core.UBUtil',
    //     'UB.ux.form.field.UBBoolBox',
    //     'UB.ux.form.field.UBBoxSelect',
    //     'UB.ux.form.field.UBMultiSelectBox'
    // ],

    //height: 40,
    alias: 'plugin.multifilter',
    border: false,
    margin: '0 0 0 3', // 30
    padding: 0,
    cls: 'ub-multi-filter',
    bodyStyle: 'background: none;',
    //layout:'column',
    filtersList: {},
    selectedColumn: null,


    init: function(owner){
        var
            me = this, timeOut = 0, menu;

        me.gridOwner = owner;
        me.gridOwner.on({
            afterrender: me.onParentAfterRenderer,
            columnmove: me.onGridChaged,
            columnhide: me.onGridChaged,
            columnshow: me.onGridChaged,
            selectionchange: function(sender, selected, eOpts){
                clearTimeout(timeOut);
                timeOut =setTimeout(function(){
                    me.onSelectionChange(sender, selected, eOpts);
                }, 350);
            },
            scope: me
        });
        me.gridOwner.store.on({
            load: me.filtersDescription,
            filterchange: me.onFilterChange,
            scope: me
        });
        me.fieldsConfig = {};
        _.forEach( (me.gridOwner.autoFilter ? me.gridOwner.autoFilter.params || {}: {}), function(item, name){
                me.fieldsConfig[name] = item;
        });
        _.forEach(me.gridOwner.extendedFieldList || [], function(item){
            if (item.filter){
               me.fieldsConfig[item.name] = item.filter;
            }
        });

        me.filterPrefix = 'context_' + Ext.id();
        me.filtersPanel = {};

        menu = me.createSelectFilterMenu(function( menu, item, e, eOpts ){
            Ext.suspendLayouts();
            try {
                me.hideAllPanel();
                me.selectedColumn = item.column;
                me.createFilterPanel(item.column.dataIndex, item.column);
            }finally{
                Ext.resumeLayouts(true);
            }
            if (me.topfilterPenel.layout.overflowHandler.menuItems.length > 0){
                me.showContexFilterPanel();
            }
        });

        me.buttonSelectFilter = new Ext.button.Button({
            //cls: Ext.layout.container.Box.prototype.innerCls + ' ' + me.triggerButtonCls + ' ' + Ext.baseCSSPrefix + 'toolbar-item',
            //plain: owner.usePlainButtons,
            //ownerCt: owner, // To enable the Menu to ascertain a valid zIndexManager owner in the same tree
            //ownerLayout: layout,
            //ui: owner instanceof Ext.toolbar.Toolbar ? 'default-toolbar' : 'default',
            tooltip: UB.i18n('Filter by'),
            glyph: UB.core.UBUtil.glyphs.faFilter,
            handler: function(){
                menu.showBy(me.buttonSelectFilter.el, me.menuAlign);
            }
        });
        me.add(this.buttonSelectFilter);
    },

    getItemMargin: function(){
        return  '0 10 0 10';
    },

    /**
     *
     * @param {Function} onClick
     * @returns {Array}
     */
    createSelectFilterMenu: function(onClick){
        var me = this, menuItems = [], menu, attrChain, fieldList, filterGroups = {};
        _.forEach(me.gridOwner.columns, function(column){
            var fieldCfg = me.fieldsConfig[column.dataIndex] || {};
            if ( fieldCfg.disabled || column.filterable === false ){
                return;
            }

            attrChain = column.dataIndex.split('.');
            if (attrChain.length > 1 && !column.simpleFilter ){
                fieldList = me.gridOwner.store.ubRequest.fieldList;
                if (fieldList.indexOf(attrChain[0]) > 0 ){
                    if (!filterGroups[attrChain[0]]){
                        menuItems.push({ text:
                            $App.domainInfo.get(me.gridOwner.entityName).getEntityAttribute(attrChain[0]).caption,
                            column: column });
                        filterGroups[attrChain[0]] = true;
                    }
                    //isDictFilter
                    return;
                }
                //isFirstInComplex = true;
            }

            menuItems.push({ text: column.filterCaption || column.text ||
            $App.domainInfo.get(me.gridOwner.entityName).getEntityAttribute(column.dataIndex).caption,
                column: column });
        });
        /*
        menuItems.push({ text: 'all',
            showAllItem: true });
        */
        menu = Ext.create('Ext.menu.Menu', {
            //width: 100,
            margin: '0 0 10 0',
            //floating: false,  // usually you want this set to True (default)
            items: menuItems,
            listeners: {
                click: function(menu, item, e, eOpts){
                    if (item.showAllItem){
                        UB.ux.UBPreFilter.makeFilters({ options: me.gridOwner.autoFilter || {}, entityCode: me.gridOwner.entityName, store:  me.gridOwner.getStore(),
                            onFilterReady: function(){
                                if (me.gridOwner.filtersDescription){
                                    me.gridOwner.filtersDescription();
                                }
                            }
                        } );
                    }
                    onClick.apply(me,arguments);
                }
            }
        });
        return menu;
    },

    initComponent: function() {
        var me = this;

        me.callParent();
    },

    onFilterChange: function(store){
        store.totalRequired = false;
    },

    showContexFilterPanel: function(){
        var
            me = this,
            attribute, filterItems, win, btn, handler,
            panel  = me.activeFilterPanel,
            button, menu, filterBar;


        function createFilterItems(ubAttrName, caption){
            var items;
            attribute = $App.domainInfo.get(panel.ubEntity).getEntityAttribute(ubAttrName);
            items = me.getFilterControls(panel.ubEntity, ubAttrName, attribute);
            btn = items[items.length - 1];
            if (btn.isButton){
                items.splice(items.length - 1,1);
                handler = btn.handler;
                btn.handler = function(){
                    handler();
                    win.close();
                };
            }

            items[0].hideLabel = true;
            items.unshift( Ext.create('Ext.form.Label', {
                shrinkWrap: 1, margin: '0 10 0 3', text: caption || items[0].fieldLabel
                //width: 100, style: 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
            }));
            return items;
        }

        menu = me.createSelectFilterMenu(function( menu, item, e, eOpts ){
            Ext.suspendLayouts();
            try {
                filterBar.removeAll();
                filterBar.add(createFilterItems(item.column.dataIndex, item.column.filterCaption || item.column.text));
            }finally{
                Ext.resumeLayouts(true);
            }
        });

        button = new Ext.button.Button({
            tooltip: UB.i18n('search'),
            glyph: UB.core.UBUtil.glyphs.faFilter,
            handler: function(){
                menu.showBy(button.el, me.menuAlign);
            }
        });

        filterItems = createFilterItems(panel.ubAttrName, panel.columnText);

        win = Ext.create('Ext.window.Window', {
           //floating: true,    \
            padding: '10 5 10 5',
            height: 160,
            minWidth: 550,
            modal: true,
            overflowX: 'scroll',
            layout: { type: 'hbox', align: 'middle'},
            title: UB.i18n('search'),
            items: [
                button,
                filterBar = Ext.create('Ext.toolbar.Toolbar',{
                    items: filterItems
                })

            ],
            buttons: [btn, {
                  xtype: 'button',
                  margin: '0 0 0 15',
                  text: UB.i18n('cancel'),
                  handler: function(){
                     win.close();
                  }
            }]
        });
        win.center();
        win.show();
        //me.activeFilterPanel.showAt(1,1);
    },


    onParentAfterRenderer: function(){
        var
            me = this,
            grid = me.gridOwner, handler,
            view = grid.getView(),
            tBar = grid.getDockedItems('toolbar[dock="top"]')[0];

        me.baseToolbar = tBar;

        me.topfilterPenel =  Ext.create('Ext.toolbar.Toolbar',{
            border: 0,
            margin: 0,
            padding: 0,
            flex: 30,
            enableOverflow: true,
            items: [me]
        });

        if (me.topfilterPenel.layout){
           handler = me.topfilterPenel.layout.overflowHandler;
           if (handler){
               handler.getSuffixConfig = function() {
                   var
                       layout = this.layout,
                       owner = layout.owner,
                       oid = owner.id;
                   this.menuTrigger = new Ext.button.Button({
                       id: oid + '-menu-trigger',
                       cls: Ext.layout.container.Box.prototype.innerCls + ' ' + me.triggerButtonCls + ' ' + Ext.baseCSSPrefix + 'toolbar-item',
                       plain: owner.usePlainButtons,
                       ownerCt: owner, // To enable the Menu to ascertain a valid zIndexManager owner in the same tree
                       ownerLayout: layout,
                       ui: owner instanceof Ext.toolbar.Toolbar ? 'default-toolbar' : 'default',
                       tooltip: UB.i18n('search'),
                       glyph: UB.core.UBUtil.glyphs.faFilter,
                       handler: function(){
                           if (me.activeFilterPanel){
                               me.showContexFilterPanel();
                           }
                       }
                   });

                   return this.menuTrigger.getRenderTree();
               };
               /*
               if (handler.menuTrigger) {
                   handler.menuTrigger.setGlyph('xf0b0@FontAwesome');
               }
               handler.beforeMenuShow = function(menu) {
                   //alert('show menu');
                   if (me.activeFilterPanel){
                       me.showContexFilterPanel();
                   }
                   return false;
               };
               */
           }


        }

        /*
        me.topfilterPenel.on('overflowchange', function(){
            me.updateLayout();
        }, me);
        */
        //tBar.on('overflowchange',me.onOverflowChange,me);
        //tBar.on('resize',me.onBaseTBResize,me);
        tBar.insert(tBar.items.getCount()-2, me.topfilterPenel);
        if(view){
            view.on({
                // if user start to type something - go to filter panel
                itemkeydown: function( sender, record, item, index, e, eOpts ){
                    if(e.isNavKeyPress() || e.isSpecialKey() || e.ctrlKey){
                        return;
                    }
                    var fld =  me.down('field');
                    if(fld) {
                        // filter can ontain several items
                        var f = fld.next();
                        if(f){
                            f.focus();
                        } else {
                            fld.focus();
                        }
                    }
                }
            });
        }


    },

    hideAllPanel: function(){
        var me = this;
        Ext.Object.each(me.filtersPanel, function(column, panel){
            panel.hide();
        });
    },

    /**
     * @param {String} entity
     * @param {String} attrName
     * @param {Object} attribute
     * @returns {Array}
     */
    getFilterControls : function(entity, attrName, attribute, options){
        var
            me = this,
            items, attributeBase;

        attributeBase = $App.domainInfo.get(entity).getEntityAttribute(attrName, true);

        if (attributeBase.customSettings && attributeBase.customSettings.UIGridColumnClass){
            items = me.getEnumFilterInput(entity, attrName, attributeBase.customSettings.UIGridColumnClass, options);
        } else if(attribute.associatedEntity ){
            items = me.getAssociationFilterInput(entity, attrName, options);
        } else if(attribute.dataType === 'Enum'){
            items = me.getEnumFilterInput(entity, attrName);
        } else {
            var dt = UBDomain.getPhysicalDataType(attribute.dataType);
            switch(dt){
                case 'float':
                case 'int':
                    items = me.getNumericFilterInput(entity, attrName, (dt === 'float' || dt === 'currency'));
                    break;
                case 'date':
                    items = me.getDateFilterInput(entity, attrName);
                    break;
                case 'boolean':
                    //items.push(new Ext.form.field.Checkbox());
                    items = me.getBooleanFilterInput(entity, attrName);
                    break;
                default:
                    items = me.getPlainTextFilter(entity, attrName);
            }
        }
        return items;
    },

    onGridChaged: function(){
        this.clearFilterPanel();
    },

    clearFilterPanel: function(){
        var me = this;
        _.forEach(me.filtersPanel || [], function(panel, column){
             me.remove(panel);
        });
        me.filtersPanel = {};
    },

    getInitParam: function(attrName){
       return this.fieldsConfig[attrName] || null;
    },

    createFilterPanel: function(attrName, gridColumn){
        var me = this, fieldCfg, attrChain,
            filterPanel, items, fieldList,
            grid = me.gridOwner,
            entity = grid.entityName,
            attribute, lbl, isDictFilter = false;

        attrChain = attrName.split('.');
        if (attrChain.length > 1 && !gridColumn.simpleFilter ){
            fieldList = grid.store.ubRequest.fieldList;
            if (fieldList.indexOf(attrChain[0]) > 0){
                attrName = attrChain[0];
                isDictFilter = true;
            }
            //isFirstInComplex = true;
        }
        attribute =  $App.domainInfo.get(entity).attr(attrName);

        filterPanel = me.filtersPanel[attrName];
        if (filterPanel) {
            me.activeFilterPanel = filterPanel;
            filterPanel.show();
            return;
        }

        items = me.getFilterControls(entity, attrName, attribute, fieldCfg);
        items[0].hideLabel = true;
        items.unshift(lbl = Ext.create('Ext.form.Label', {
            shrinkWrap: 0,
            margin: '0 0 0 3',
            width: 100,
            text: gridColumn.filterCaption || (isDictFilter ? attribute.caption: null) || gridColumn.text,
            style: 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
            /* style: "text-align: right;", */ /* defaultAlign: 'tr?', */
        }));
        lbl.on('afterrender', function () {
            Ext.create('Ext.tip.ToolTip', {
                target: this.getEl(),
                trackMouse: true,
                html: this.text
            });
        }, lbl);

        filterPanel = Ext.create('Ext.toolbar.Toolbar', {
            border: 0,
            margin: 0,
            padding: 0,
            flex: 2,
            //minWidth: 450,
            //height: '100%',
            //style: { height: '100%' },
            //enableOverflow: true,
            items: items
        });
        filterPanel.ubEntity = entity;
        filterPanel.ubAttrName = attrName;
        filterPanel.columnText = gridColumn.filterCaption || gridColumn.text;

        me.filtersPanel[attrName] = filterPanel;
        me.add(filterPanel);
        me.activeFilterPanel = filterPanel;

    },

    onSelectionChange: function(sender, selected, eOpts){
        var
            me = this,
            clm,
            grid = me.gridOwner,
            data = grid.getSelectionModel().getCurrentPosition() || {},
            fieldCfg, gridColumn;

        if(!Ext.isDefined(data.column) || !selected.length || data.column === me.selectedColumn){
            return;
        }
        if( !(clm =  data.columnHeader /*grid.columns[data.column]*/ )) { //Sometimes grid.columns[data.column] is undefined ( BVV )
            return;
        }
        //me.removeAll();
        gridColumn = me.gridOwner.getColumnManager().getHeaderAtIndex(data.column) || {};
            //me.gridOwner.columns[data.column] || {};
        me.activeFilterPanel = null;
        Ext.suspendLayouts();
        try {
            me.hideAllPanel();
            me.selectedColumn = data.column;
            if (gridColumn.filterable === false){
                return;
            }
            var attrName = clm.dataIndex;
            if (!attrName){
                return;
            }
            fieldCfg = me.fieldsConfig[attrName] || {};
            if ( fieldCfg.disabled ){
                return;
            }
            me.createFilterPanel(attrName, gridColumn);
        }finally{
            Ext.resumeLayouts(true);
        }
    },

    /**
     *
     * @param {String} entityName
     * @param {String} attrName
     * @param {Object} [options]
     * @returns {Array}
     */
    getAssociationFilterInput: function(entityName, attrName, options){
        return UB.ux.Multifilter.getAssociationFilterInputS(entityName, attrName, options, this);
    },

    getEnumFilterInput: function(entityName, attrName, enumGroup, options){
        return UB.ux.Multifilter.getEnumFilterInputS(entityName, attrName, enumGroup, options, this);
    },

    getBooleanFilterInput: function(entityName, attrName){
        return UB.ux.Multifilter.getBooleanFilterInputS(entityName, attrName, this);
    },

    getNumericFilterInput: function(entityName, attrName, allowDecimals){
        return UB.ux.Multifilter.getNumericFilterInputS(entityName, attrName, allowDecimals, this);
    },

    getPlainTextFilter: function(entityName, attrName){
       return UB.ux.Multifilter.getPlainTextFilterS(entityName, attrName, this);
    },

    getDateFilterInput: function(entityName, attrName){
        return  UB.ux.Multifilter.getDateFilterInputS(entityName, attrName, this);
    },

    clearFilter: function(){
        var
            me = this,
            store = me.gridOwner.store,
            storeFilters = store.filters,
            filterKeys = me.filtersList,
            filterRemoved = false;
        me.selectedColumn = null;
        Ext.Object.each(filterKeys, function(key, value){
            var filter = storeFilters.getByKey(key);
            if (filter && filter.relatedFilter){
                storeFilters.removeAtKey(filter.relatedFilter.id);
            }
            storeFilters.removeAtKey(key);
            filterRemoved = true;
            delete filterKeys[key];
        });
        //me.gridOwner.onRefresh();

        if (store.filters.length) {
            if (filterRemoved){
                store.filter();
            }
            me.gridOwner.onPrefilter();
        } else {
            store.clearFilter();
        }
        me.filtersDescription();
    },

    filtersDescription: function(){
        var
            me = this,
            grid = me.gridOwner,
            store = grid.store,
            entityName = grid.entityName,
            filters = store.filters,
            conditions =  UB.core.UBCommand.condition,
            filtersData = [],
            showFilter = true, pnlFilters = {}, pnlFilterItem = {}, updateFilterCaption = false,
            itemExecuted = {};

        me.initBarControls();
        me.filterPenelFilters.items.each(function(item){
            pnlFilters[item.filterID] = 1;
            pnlFilterItem[item.filterID] = item;
        },me);

        filters.sort('property');

        //grid.clearBBar();
        //me.bBar.removeAll();

        filters.each(function(item){
            var fieldLabel, attribute, labelValue, isPreFilter, disabled,
                isFullTextSearch;
            showFilter = true;
            updateFilterCaption = false;

            if (!item ||
                !item.property ||
                !item.id ||
                 item.condition === 'between' ||
                 item.id === UB.core.UBCommand.whereListParentID ||
                (item && item.relatedFilter && item.relatedFilter.id && itemExecuted[item.relatedFilter.id]  )){
                return; // неизвестные фильтры или парные (дата по ..)
            }
            itemExecuted[item.id] = 1;
            /*if (pnlFilters[item.id] && pnlFilterValues[item.id] === filterValue ){
                pnlFilters[item.id] = 0;
                return;
            }*/
            attribute = $App.domainInfo.get(entityName).attr(item.property);
            fieldLabel =  attribute.caption;
            labelValue = item.userValue || item.value;
            isPreFilter =  item.id && (item.id.substr(0, UB.ux.UBPreFilter.basePrefix.length) === UB.ux.UBPreFilter.basePrefix);
            isFullTextSearch = item.condition === 'match';
            disabled = !(item.id && me.filtersList[item.id]);

            if ( pnlFilters[item.id]){
                pnlFilters[item.id] = 0;
                updateFilterCaption = true;
            }
            //if (item && item.id){
            //    pnlFilters[item.id] = 0;
            //}
            if (isFullTextSearch){
                fieldLabel = UB.format(UB.i18n('ftsFilterName'), item.value);
                labelValue = '';
            } else if(attribute.associatedEntity){
                labelValue = item.text;
            } else  if(attribute.dataType === 'Enum'){
                labelValue = item.text;
            } else {
                var dt = UBDomain.getPhysicalDataType(attribute.dataType);
                var toDate;
                switch(dt){
                    case 'date':
                        if(item.filterType === 'period' ){
                            if(item.operator === '>='){
                                if(item.value){
                                    labelValue = UB.i18n('s') + ' ' + Ext.Date.format(item.value, 'd-m-Y');
                                }
                                toDate = item.relatedFilter.value;
                                if( toDate ){
                                    labelValue += ' ' + UB.i18n('po') +  ' ' +
                                        Ext.Date.format(item.isTime ? UB.core.UBUtil.addDays(toDate, -1): toDate, 'd-m-Y');
                                }
                            } else {
                                showFilter = false;
                            }
                        } else if(item.filterType ==='to_date'){
                            labelValue = UB.i18n('po') +  ' ' +
                                Ext.Date.format( item.isTime ? UB.core.UBUtil.addDays(item.value, -1): item.value, 'd-m-Y')
                            ;
                        }  else if(item.filterType ==='from_date'){
                            labelValue = UB.i18n('s') + ' ' +Ext.Date.format(item.value, 'd-m-Y');
                        }  else if(item.filterType ==='date'){
                            labelValue = Ext.Date.format(item.value, 'd-m-Y');
                        } else {
                            var types = {
                                today: UB.i18n('today'),
                                yesterday: UB.i18n('yesterday'),
                                current_week: UB.i18n('current_week'),
                                this_month: UB.i18n('this_month'),
                                this_year: UB.i18n('this_year')
                            };
                            labelValue = types[item.filterType];
                            if (item.operator  === '<=' || item.operator  === '<') {
                                showFilter = false;
                            }
                        }
                         break;
                    case 'boolean':
                        break;
                    case 'float':
                    case 'int':
                        switch (item.filterType){
                            case 'range':
                                if(item.operator === '>='){
                                    if(item.value){
                                        labelValue = item.value + '';
                                    }
                                    toDate = item.relatedFilter.value;
                                    if( toDate ){
                                        labelValue += ' - ' + toDate;
                                    }
                                } else {
                                    showFilter = false;
                                }
                                break;
                            case 'br': break;
                            case 'isNull': break;
                            default :
                                //if (item.condition)
                                // todo write description for condition in
                                labelValue = (item.operator || '') + item.value;
                        }
                        break;
                    case 'string':
                        if (item.filterType === 'equal'){
                            labelValue = item.userValue || item.value;
                        } else {
                            labelValue = UB.i18n(item.filterType) + ' ' + (item.userValue ||item.value);
                        }
                        break;

                    default:
                }
            }
            if (Ext.isEmpty(labelValue) && item.condition === conditions.sqlecIsNull){
                labelValue = UB.i18n('isNull');
            }


            if (showFilter){
                var filterCaption = fieldLabel +  (labelValue ? ': ' + Ext.String.ellipsis(labelValue, 70) : '') + ' <b class="ub-rem-filter">&#x2716;</b>';
                if (updateFilterCaption){
                    pnlFilterItem[item.id].setText(filterCaption);
                } else {
                    filtersData.push( Ext.create('Ext.button.Button',{
                        xtype: 'button',
                        text: filterCaption,
                        filterID: item.id,
                        filterValue: item.value,
                        //tooltip: labelValue,
                        //disabledClass: 'ub-btn-ftr-disabled',
                        cls: disabled ? 'ub-btn-ftr-disabled': 'ub-btn-ftr',
                        //labelStyle: 'color: #5C2A44;',
                        //disabled : !(item.id && me.filtersList[item.id]),
                        scope: me,
                        handler: function(sender){
                            if (isPreFilter){
                                //sender.hide();
                                me.gridOwner.onPrefilter();
                            } else {
                                if (!disabled){
                                   sender.hide();
                                   me.removeFilter(item.id);
                                }
                            }
                        }
                    }));
                }
            }

        });

        me.filterPenelFilters.items.each(function(item){
            if (pnlFilters[item.filterID] === 1){
                me.filterPenelFilters.remove(item, true);
            }
        },me);

        if (filtersData.length + me.filterPenelFilters.items.getCount() > 0){
            Ext.Array.each(filtersData, function(item){
                me.filterPenelFilters.add(item);
            },me);
            me.filterPenel.show();
            me.filterPenel.mustBeVisibled = true;
        } else {
            me.filterPenel.hide();
            me.filterPenel.mustBeVisibled = false;
        }
        me.gridOwner.updateVisibleBBar();

        /*
        if(filtersData.length){
            bBar.push({
                xtype: 'label',
                html:  UB.i18n('filter')+': ' //+ filtersData.join(', ')
            });
            bBar.push(filtersData);
            bBar.push( me.clearButton = Ext.create('Ext.button.Button',{
                xtype: 'button',
                style: 'text-weight: bolder',
                margin: '0 0 0 5',
                text:  UB.i18n('clear')+ ' <b>&#x2716;</b>',
                handler: me.clearFilter,
                scope: me
            }));
            bBar.push({
                xtype: 'tbseparator'
            });
        }

        if(totalCount !== maxRecordCountLevelApp){
            countInfo = totalCount;
        }else {
            countInfo = '<b title="'+  UB.i18n('tooManyItems') +'">&#8734;</b>';
        }
        bBar.push('->',{
            xtype: 'label',
            margin: '0 5 0 5',
            html:  UB.i18n('rowCounts') + ': '+ countInfo
        });
        if(totalCount === maxRecordCountLevelApp && !store.totalRequired){
            bBar.push({
                xtype: 'tbseparator'
            },{
                xtype: 'button',
                text: UB.i18n('fetchAllRows'),
                handler: function(){
                    if (window.confirm(UB.i18n('fetchConfirm'))){
                        store.totalRequired = true;
                        grid.onRefresh();
                    }
                }
            });
        }

        Ext.Array.each(bBar,function(item){
            grid.bBar.add(item);
        });
        if (grid.pagingBar){
          grid.bBar.add(grid.pagingBar);
        }
        */
    },

    initBarControls: function(){
        var me = this, grid = me.gridOwner;
        if (me.filterPenel){
            return;
        }
        me.filterPenel = Ext.create('Ext.toolbar.Toolbar',{
            cls: 'ub-grid-info-panel',
            border: 0,
            margin: 0,
            padding: 0,
            flex: 1,
            items: [
                {
                    xtype: 'button',
                    style: 'text-weight: bolder',
                    margin: '0 0 0 0',
                    tooltip: UB.i18n('clear'),
                    text:  ' <b>&#x2716;</b>',
                    handler: me.clearFilter,
                    scope: me
                },
            {
              xtype: 'label',
              html:  UB.i18n('filter')+': ' //+ filtersData.join(', ')
            }, me.filterPenelFilters =  Ext.create('Ext.toolbar.Toolbar',{
                cls: 'ub-grid-info-panel',
                border: 0,
                margin: 0,
                padding: 0,
                flex: 1,
                enableOverflow: true
                //overflowX: 'auto'
            })
            /*    ,
            {
                xtype: 'button',
                style: 'text-weight: bolder',
                margin: '0 0 0 5',
                text:  UB.i18n('clear')+ ' <b>&#x2716;</b>',
                handler: me.clearFilter,
                scope: me
            } */

            ]
        }
        );
        /*
         if (grid.pagingSeparator){  //pagingBar
         grid.bBar.insert(grid.bBar.items.indexOf(grid.pagingSeparator), me.filterPenel);
         } else {
         grid.bBar.add(me.filterPenel);
         }
        */
        grid.filterBar.add(me.filterPenel);


        /*
        //bBar.push(filtersData);
        bBar.push({
            xtype: 'tbseparator'
        });

        if(totalCount !== maxRecordCountLevelApp){
            countInfo = totalCount;
        }else {
            countInfo = '<b title="'+  UB.i18n('tooManyItems') +'">&#8734;</b>';
        }
        bBar.push('->',{
            xtype: 'label',
            margin: '0 5 0 5',
            html:  UB.i18n('rowCounts') + ': '+ countInfo
        });
        if(totalCount === maxRecordCountLevelApp && !store.totalRequired){
            bBar.push({
                xtype: 'tbseparator'
            },{
                xtype: 'button',
                text: UB.i18n('fetchAllRows'),
                handler: function(){
                    if (window.confirm(UB.i18n('fetchConfirm'))){
                        store.totalRequired = true;
                        grid.onRefresh();
                    }
                }
            });
        }
        */

    },

    removeFilter: function(key, attrName){
        var
            me =this,
            store = me.gridOwner.store,
            filter = store.filters.getByKey(key);
        if(filter && filter.relatedFilter){
            store.filters.removeAtKey(filter.relatedFilter.id);
        }
        store.filters.removeAtKey(key);
        me.filtersList[key] = undefined;
        if (store.filters.length) {
            store.filter();
        } else {
            store.clearFilter();
        }
    },

    storeFiltered: function(){
        var
            me = this,
            grid = me.gridOwner,
            selectionModel = grid.getSelectionModel(),
            selection = selectionModel.getSelection();
        if(!selection.length){
            selectionModel.setCurrentPosition({
                row: 0,
                column: me.selectedColumn
            });
            return;
        }
    },

    // functions for context
    getPrevFilter: function(filterName, attrName){
        var
            me = this,
            store = me.gridOwner.store, result;
        result = store.filters.getByKey(filterName);
        if (result && result.relatedFilter){
            return [result, result.relatedFilter];
        } else {
            return result;
        }

    },

    getFilterPrefix: function(attrName){
        return this.filterPrefix + attrName;
    },


    setFilter: function(attrName, filter){
        var
        me = this,
        store = me.gridOwner.store,
        filterName = me.getFilterPrefix(attrName);
        if (store){
            store.filters.removeAtKey(filterName);
            store.filters.removeAtKey(filterName + '_to');
            store.filter(filter);
          me.filtersList[filterName] = true;
        }
    },

    statics: {
        dateValidator: function(val){
            if(!val){
                return true;
            }
            var dateReg = /^\d{2}([.\/\-])\d{2}\1\d{4}$/;
            if(val.match(dateReg)){
                return true;
            }
            return ' ';
        },

        /**
         *
         * @param {String} fieldType
         * @param {Boolean} fullDate
         * @returns {Array}
         */
        getWeekRange: function(fieldType, fullDate){
            var curr = new Date(), // get current date
                first, last;

            //getDay 0 соответствует воскресенью, 1 — понедельнику, 2 — вторнику и так далее.
            first = UB.core.UBUtil.addDays(curr, -1 * ((curr.getDay() || 7) - 1));
            last = UB.core.UBUtil.addDays(curr, 7 - (curr.getDay() || 7));
            if (!fullDate) {
                first = UB.core.UBUtil.truncTimeToUtcNull(first);
                last = UB.core.UBUtil.truncTimeToUtcNull(last);
            }

            return [first, last];
        },

        /**
         *
         * @param {String} fieldType
         * @param {Boolean} fullDate
         * @returns {Array}
         */
        getMonthRange: function(fieldType, fullDate){
            var date = new Date(), y = date.getFullYear(), m = date.getMonth();
            var firstDay = new Date(y, m, 1);
            var lastDay = UB.core.UBUtil.addDays(new Date(y, m + 1, 1), -1);
            if (!fullDate) {
                firstDay = UB.core.UBUtil.truncTimeToUtcNull(firstDay);
                lastDay = UB.core.UBUtil.truncTimeToUtcNull(lastDay);
            }
            /*
            if (fieldType === 'dateTime' ){
                firstDay = UB.core.UBUtil.truncTime(firstDay);
                lastDay = UB.core.UBUtil.truncTime(UB.core.UBUtil.addDays(lastDay, 1));
            } */
            return [firstDay, lastDay];
        },

        /**
         *
         * @param {String} fieldType
         * @param {Boolean} fullDate
         * @returns {Array}
         */
        getYearRange: function(fieldType, fullDate){
            var date = new Date(), y = date.getFullYear();
            var firstDay = new Date(y, 0, 1);
            var lastDay = UB.core.UBUtil.addDays( new Date(y + 1, 0, 1), -1 );
            if (!fullDate) {
                firstDay = UB.core.UBUtil.truncTimeToUtcNull(firstDay);
                lastDay = UB.core.UBUtil.truncTimeToUtcNull(lastDay);
            }
            /*
             if ( fieldType === 'dateTime' ){
                firstDay = UB.core.UBUtil.truncTime(firstDay);
                lastDay = UB.core.UBUtil.truncTime(UB.core.UBUtil.addDays(lastDay, 1));
            }
            */
            return [firstDay, lastDay];
        },


        getfilterFuncIsNull: function(attrName){
          return function(record){
              var val = record.get(attrName);
              return val === null;
          };
        },

        isNullFilterType :'isNull',

        /**
         * list of predefined filters key associated with not predefined filter key
         */
        predefinedFilters: {
            today: 'date',
            yesterday: 'date',
            current_week: 'date',
            this_month: 'date',
            this_year: 'date',
            isNull: 'no_filter'
        },

        filterTypeWidth: 150,

        getNumericFilterInputS: function(entityName, attrName, allowDecimals, context){
            var me = this,
                filterName, allPrevFilter, prevFilterTo, prevFilterFrom,
                startSearch, createFilter,
                attribute = $App.domainInfo.get(entityName).attr(attrName),
                fcfg, numfield, numfieldTo, comboChanged,
                initParam, required = false, baseFilterType, filterType;

                filterName = context.getFilterPrefix(attrName);
                allPrevFilter = context.getPrevFilter(filterName, attrName);


            if (allPrevFilter && Ext.isArray(allPrevFilter)){
                Ext.Array.each(allPrevFilter, function(filter){
                    switch (filter.controlID){
                        case 'number': prevFilterFrom = filter; break;
                        case 'numberTo': prevFilterTo = filter; break;
                    }
                });
            } else {
                prevFilterFrom = allPrevFilter || {filterType: 'equal' };
            }
            //prevFilter = prevFilter || {filterType: 'equal' };
            if (context.getInitParam){
                initParam =  context.getInitParam(attrName);
            }
            initParam = initParam || {};
            if (!Ext.isEmpty(initParam.required)){
                required = initParam.required;
            }
            if (!Ext.isEmpty(initParam.filterType)){
                baseFilterType = initParam.filterType;
            }
            filterType = (prevFilterFrom ? prevFilterFrom.filterType : (baseFilterType || 'equal'));


            fcfg = {
                //fieldLabel:  ubDomain.getEntityAttributeCaption(entityName, attrName),
                hideTrigger: true,
                isFormField: context.isPreFilter,
                controlID: 'number',
                allowDecimals: allowDecimals,
                width: 90,
                margin: context.getItemMargin(),
                labelWidth: 100, // 'auto'
                withoutIndent: true
            };
            if (context.isPreFilter){
                fcfg.hideLabel = true;
            }

            if (!Ext.isEmpty(initParam.valueFrom)){
                fcfg.value = initParam.valueFrom;
            }
            if (!Ext.isEmpty(initParam.value)){
                fcfg.value = initParam.value;
            }
            if(prevFilterFrom){
               fcfg.value = prevFilterFrom.value;
            }

            numfield = Ext.create('Ext.form.field.Number', fcfg);

            fcfg = {
                //xtype: 'textfield',
                fieldLabel:  ' -',
                labelSeparator: '',
                isFormField: context.isPreFilter,
                hideTrigger: true,
                controlID: 'numberTo',
                width: 115,
                margin: context.getItemMargin(),
                labelWidth : 20,
                allowDecimals: allowDecimals,
                withoutIndent: true
            };
            if (!Ext.isEmpty(initParam.valueTo)){
                fcfg.value = initParam.valueTo;
            }
            if(prevFilterTo){
                fcfg.value = prevFilterTo.value;
            }
            numfieldTo = Ext.create('Ext.form.field.Number', fcfg);

            comboChanged = function(sender, newValue){
                numfieldTo.hide();
                numfield.hide();
                numfieldTo.allowBlank = true;
                numfield.allowBlank = true;

                if(newValue === 'no_filter' || newValue === 'isNull'){
                    numfield.reset();
                    numfieldTo.reset();
                    numfield.setValue(null);
                    numfieldTo.setValue(null);
                }
                else {
                    numfield.allowBlank = !required;
                    numfield.show();
                }

                if(newValue === 'no_filter' && !context.isPreFilter ){
                    context.removeFilter(filterName, attrName);
                    return;
                }

                if(newValue === 'isNull' && !context.isPreFilter){
                    startSearch();
                    return;
                }

                if (newValue === 'range'){
                    numfieldTo.allowBlank = !required;
                    numfieldTo.show();
                } else {
                    numfieldTo.reset();
                    numfieldTo.setValue(null);
                }

            };

            var combo =  Ext.create('Ext.form.ComboBox', {
                fieldLabel: attribute.caption,
                hideLabel: context.isPreFilter,
                labelWidth: 100, // 'auto',
                //fieldLabel: UB.i18n('filterType'),
                isFormField: context.isPreFilter,
                store: me.createFilterItems('number', attribute.allowNull ), //this.numberFilters,
                queryMode: 'local',
                displayField: 'text',
                valueField: 'type',
                //margin: '0 15 0 0',
                margin: context.getItemMargin(),
                width: this.filterTypeWidth,
                value: filterType,
                forceSelection: true,
                editable: false,
                withoutIndent: true,
                listeners: {
                   change: function(sender, newValue, oldValue, eOpts){
                       comboChanged(sender, newValue);
                   }
                },
                validator: function(value){
                    if (required && (this.getValue() === 'no_filter')){
                        return UB.i18n('filterIsRequired');
                    }
                    return true;
                }

            });
            comboChanged(combo, filterType);

            createFilter = function(){
                var fval,  filter, cfilterType, conditions, cfg,
                    fvalto, filterTo;
                conditions =  UB.core.UBCommand.condition;
                cfilterType = combo.getValue();
                fval = numfield.getValue();
                fvalto = numfieldTo.getValue();

                if( (cfilterType === 'no_filter') || (Ext.isEmpty(fval) && (cfilterType !== me.isNullFilterType)) ){
                    return null;
                }

                cfg = {
                    id: filterName,
                    root: 'data',
                    controlID: 'number',
                    property: attrName,
                    filterType: cfilterType,
                    value: fval
                };

                switch (cfilterType){
                    case 'more':
                        cfg.operator = '>';
                        break;
                    case 'less':
                        cfg.operator = '<';
                        break;
                    case 'equal':
                        cfg.operator = '=';
                        break;
                    case 'range':
                        cfg.operator = '>=';
                        filterTo = Ext.create('Ext.util.Filter', {
                            id: filterName + '_to',
                            root: 'data',
                            property: attrName,
                            controlID: 'numberTo',
                            operator: '<=',
                            filterType: cfilterType,
                            value: fvalto
                        });
                        break;
                    case 'isNull':
                        cfg.filterFn = function(record){
                            var val = record.get(attrName);
                            return val === null;
                        };
                        cfg.condition = conditions.sqlecIsNull;
                        break;


                }
                filter = Ext.create('Ext.util.Filter', cfg);
                if (filterTo){
                   filter.relatedFilter = filterTo;
                   filterTo.relatedFilter = filter;
                   return [filter,filterTo];
                } else {
                   return filter;
                }

            };
            startSearch = function(){
                var filter = createFilter();
                if (filter){
                    context.setFilter(attrName,  filter);
                } else {
                    context.removeFilter(filterName, attrName);
                }

            };

            if (context.isPreFilter){
                context.initFilterControl(attrName, 'value', numfield);
                context.initFilterControl(attrName, 'valueto', numfieldTo);
                context.initFilterControl(attrName, 'filterType', combo);

                context.initFilterFunc(attrName, createFilter);
            } else {
                numfield.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);
                numfieldTo.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);

            }

            var controls = [combo, numfield, numfieldTo];
            if (!context.isPreFilter){
                controls.push(this.createSearchButton(startSearch));
            }
            return controls;
        },

        getBooleanFilterInputS: function(entityName, attrName, context){
            var
                me = this,
                attribute = $App.domainInfo.get(entityName).attr(attrName),
                cfg = { addnoFilterValue: true},
                filterName = context.getFilterPrefix(attrName),
                prevFilter = context.getPrevFilter(filterName, attrName),
                control, createFilter, startSearch;


            cfg.fieldLabel = attribute.caption;
            cfg.isFormField = context.isPreFilter;
            cfg.labelWidth = 100 ;// 'auto';
            cfg.filterEmptyValue = 'no_filter';
            cfg.value = cfg.filterEmptyValue;
            //cfg.margin = '0 15 0 0';
            cfg.margin = context.getItemMargin();
            cfg.width = this.filterTypeWidth;
            cfg.withoutIndent = true;
            cfg.addEmptyValue = attribute.allowNull;
            if(prevFilter){
                cfg.value = prevFilter.value === 0 ? 0 : (prevFilter.value || prevFilter.filterType || 'no_filter');
            }
            if(context.isPreFilter){
                cfg.hideLabel = true;
            }
            control =  Ext.widget('ubboolbox', cfg);

            createFilter = function(){
                var fval = control.getValue(),
                conditions =  UB.core.UBCommand.condition, result;

                if (Ext.isEmpty(fval) || fval === 'no_filter'){
                    return null;
                }
                if (fval === 'isNull'){
                    result = Ext.create('Ext.util.Filter',{
                        id: filterName,
                        root: 'data',
                        property: attrName,
                        filterType: fval,
                        filterFn: me.getfilterFuncIsNull(attrName),
                        condition: conditions.sqlecIsNull,
                        value: null,
                        userValue: control.inputEl ? control.inputEl.getValue() : ''
                    });
                } else {
                    result = Ext.create('Ext.util.Filter',{
                        id: filterName,
                        root: 'data',
                        property: attrName,
                        filterType: fval,
                        exactMatch: true,
                        operator: '=',
                        value: fval,
                        userValue: control.inputEl ? control.inputEl.getValue() : fval
                    });
                }
                return result;
            };
            startSearch = function(){
                var filter = createFilter();
                if (filter){
                    context.setFilter(attrName,  filter);
                } else {
                    context.removeFilter(filterName, attrName);
                }
            };

            if (context.isPreFilter){
                context.initFilterFunc(attrName, createFilter);
                context.initFilterControl(attrName, null, control);
            } else {
                control.on('change',function(sender, newVal){
                    if (!context.isPreFilter){
                        startSearch();
                    }
                },me);
            }

            var controls = [control];
            if (!context.isPreFilter){
                controls.push(this.createSearchButton(startSearch));
            }
            return controls;
        },

        /**
         *
         * @param {String} entityName
         * @param {String} attrName
         * @param {String} enumGroup
         * @param {Object} options
         * @param {Array}  options.filters Array of filter for enum store
         * @param {Object} context
         * @returns {Array}
         */
        getEnumFilterInputS: function(entityName, attrName, enumGroup, options, context){
            var
                me = this,
                attribute = $App.domainInfo.get(entityName).attr(attrName),
                cfg = UB.core.UBUtil.getComponentConfig4Enum(enumGroup || attribute.enumGroup, options),
                filterName = context.getFilterPrefix(attrName),
                prevFilter = context.getPrevFilter(filterName, attrName),
                control, combo, createFilter, startSearch, comboChanged,
                initParam, required = false, baseFilterType, filterType,
                multiControl, activeControl, value ;

            if (context.getInitParam){
                initParam =  context.getInitParam(attrName);
            }
            initParam = initParam || {};
            if (!Ext.isEmpty(initParam.required)){
                required = initParam.required;
            }
            if (!Ext.isEmpty(initParam.filterType)){
                baseFilterType = initParam.filterType;
            }
            filterType = (prevFilter ? prevFilter.filterType : (baseFilterType || 'by_value'));

            if (prevFilter && baseFilterType === 'no_filter' && Ext.isEmpty(prevFilter.value) ){
                filterType = 'no_filter';
            }

            //cfg.fieldLabel = ubDomain.getEntityAttributeCaption(entityName, attrName);
            cfg.width = 180;
            //cfg.flex = 1;
            cfg.labelWidth = 100; // 'auto';
            cfg.isFormField = context.isPreFilter;
            cfg.allowBlank = !required;
            cfg.withoutIndent = true;
            cfg.margin = context.getItemMargin();

            if (!Ext.isEmpty(initParam.value)){
                value = initParam.value;
            }
            if(prevFilter){
                value = prevFilter.value;
                cfg.hidden = (prevFilter.filterType === 'by_several_value');
            }
            cfg.disableModifyEntity = true;
            cfg.hideEntityItemInContext = true;

            control =  Ext.widget(cfg.xtype, cfg);
            activeControl = control;

            cfg.hidden = !prevFilter || prevFilter.filterType !== 'by_several_value' || filterType === 'no_filter';
            multiControl = Ext.widget('ubmultiselecbox', cfg);
            if(value){
                if (prevFilter && prevFilter.filterType === 'by_several_value'){
                    activeControl = multiControl;
                }
                if ((activeControl === multiControl) || !_.isArray(prevFilter.value) ) {
                    activeControl.setValue(prevFilter.value);
                }
            }

            comboChanged = function(sender, newValue){
                control.hide();
                multiControl.hide();
                control.allowBlank = true;

                if (newValue === 'no_filter' && !context.isPreFilter){
                    control.reset();
                    multiControl.reset();
                    context.removeFilter(filterName, attrName);
                    return;
                }
                if(newValue === 'isNull' && !context.isPreFilter){
                    startSearch();
                    return;
                }

                if (newValue === 'no_filter' || newValue === 'isNull'){
                    control.reset();
                    multiControl.reset();
                } if (newValue === 'by_several_value'){
                    multiControl.allowBlank = !required;
                    multiControl.show();
                } else {
                    control.allowBlank = !required;
                    control.show();
                }
            };


            combo =  Ext.create('Ext.form.ComboBox', {
                fieldLabel: attribute.caption,
                hideLabel: context.isPreFilter,
                isFormField: context.isPreFilter,
                labelWidth: 100, // 'auto',
                //fieldLabel: UB.i18n('filterType'),
                store: me.createFilterItems('association', attribute.allowNull ), //this.AssociationFilters,
                queryMode: 'local',
                displayField: 'text',
                valueField: 'type',
                value: filterType,
                //margin: '0 15 0 0',
                margin: context.getItemMargin(),
                width: this.filterTypeWidth,
                forceSelection: true,
                editable: false,
                withoutIndent: true,
                listeners: {
                    change: function(sender, newValue, oldValue, eOpts){
                        comboChanged(sender, newValue);
                    }
                },
                validator: function(value){
                    if (required && (this.getValue() === 'no_filter')){
                        return UB.i18n('filterIsRequired');
                    }
                    return true;
                }
            });
            comboChanged(combo, filterType);

            createFilter = function(){
                var fval = control.getValue(),
                    conditions =  UB.core.UBCommand.condition,
                    result, cfilterType, ftrcfg;

                cfilterType = combo.getValue();
                fval = cfilterType === 'by_several_value' ? multiControl.getValue(): control.getValue();

                if( (cfilterType === 'no_filter') || (Ext.isEmpty(fval) && (cfilterType !== me.isNullFilterType)) ){
                    return null;
                }

                ftrcfg = {
                    id: filterName,
                    root: 'data',
                    filterType: cfilterType,
                    property: attrName
                };
                switch (cfilterType){
                    case 'isNull':
                        ftrcfg.filterFn = me.getfilterFuncIsNull(attrName);
                        ftrcfg.condition = conditions.sqlecIsNull;
                        ftrcfg.value = null;
                        break;
                    case 'by_value':
                        ftrcfg.text =  control.getDisplayValue();
                        ftrcfg.anyMatch = true;
                        ftrcfg.value = fval;
                        break;
                    case 'by_several_value':
                        ftrcfg.text =  multiControl.getDisplayValue();
                        ftrcfg.condition = conditions.sqlecIn;
                        ftrcfg.value = fval;
                }
                result = Ext.create('Ext.util.Filter', ftrcfg );
                return result;
            };

            startSearch = function(){
                var filter = createFilter();
                if (filter){
                    context.setFilter(attrName,  filter);
                } else {
                    context.removeFilter(filterName, attrName);
                }
            };

            if (context.isPreFilter){
                context.initFilterFunc(attrName, createFilter);
                context.initFilterControl(attrName, 'filterType', combo);
                context.initFilterControl(attrName, null, control);
                context.initFilterControl(attrName, 'multi', multiControl);
            } else {
                control.on('change',function(sender, newVal){
                  if (sender.findRecordByDisplay(newVal)){
                    startSearch();
                  }
                },me);
                multiControl.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);
                multiControl.on('itemSelected', function(){
                    startSearch();
                }, me);
            }

            var controls = [combo, control, multiControl];
            if (!context.isPreFilter){
                controls.push(this.createSearchButton(startSearch));
            }
            return controls;

            /*
            if (context.isPreFilter){
                cfg.listeners = {
                    scope: context,
                    boxready: function(sender){
                        context.initFilterControl(attrName, null, sender);
                    }
                };
            } else {
                cfg.listeners = {
                    change: function(sender, newVal){
                        context.setFilter(attrName,
                            new Ext.util.Filter({
                                id: filterName,
                                root: 'data',
                                property: attrName,
                                exactMatch: true,
                                value: newVal
                            }));
                    }
                };
            }
            return [cfg];
            */
        },


        /**
         * Return the interface controls required to filter by entity attribute of store
         * @param {Styring} entityName
         * @param {Styring} attrName
         * @param {Object} [options]
         * @param {Object} [options.whereList]
         * @param {Object} [options.orderList]
         * @param {Object} [options.fieldList]
         * @param {Date} [options.__mip_ondate]
         * @param {Boolean} [options.__mip_recordhistory]
         * @param {Boolean} [options.__mip_recordhistory_all]
         * @param {Boolean} [options.__mip_disablecache]
         * @param {Boolean} [options.__allowSelectSafeDeleted]
         * @param {{
         *         getFilterPrefix: Function,
         *         getPrevFilter: Function,
         *         getInitParam: Function,
         *         removeFilter: Function,
         *         setFilter: Function,
         *         initFilterFunc: Function,
         *         initFilterControl: Function
         *         isPreFilter: boolean
         *         }} context
         * isPreFilter - if "true" then for filter on form
         * @returns {Array}
         */
        getAssociationFilterInputS: function(entityName, attrName, options, context){
            // todo перенести в отдельный модуль и уйти от context
            var
                me = this,
                attribute = $App.domainInfo.get(entityName).attr(attrName),
                cfg = UB.core.UBUtil.getComponentConfig4Entity(attribute.associatedEntity, options),
                filterName = context.getFilterPrefix(attrName),
                prevFilter = context.getPrevFilter(filterName, attrName),
                control, multiControl, activeControl, startSearch, createFilter, combo, comboChanged,
                initParam, required = false, baseFilterType, filterType,
                value;

            options = options || {};

            if (context.getInitParam){
                initParam =  context.getInitParam(attrName);
            }
            initParam = initParam || {};
            if (!Ext.isEmpty(initParam.required)){
                required = initParam.required;
            }
            if (!Ext.isEmpty(initParam.filterType)){
                baseFilterType = initParam.filterType;
            }
            filterType = (prevFilter ? prevFilter.filterType : null) || baseFilterType || 'by_value';

            if (prevFilter && baseFilterType === 'no_filter' && Ext.isEmpty(prevFilter.value) ){
                filterType = 'no_filter';
            }

            cfg.width = 180;
            cfg.labelWidth = 100; //'auto';
            cfg.isFormField = context.isPreFilter;
            cfg.allowBlank = !required;
            cfg.withoutIndent = true;
            cfg.margin = context.getItemMargin();
            if (!Ext.isEmpty(initParam.value)){
                value = initParam.value;
            }
            if(prevFilter){
                value = prevFilter.value;
                cfg.hidden = (prevFilter.filterType === 'by_several_value');
            }
            cfg.hidden = cfg.hidden || filterType === 'no_filter';

            cfg.disableModifyEntity = true;
            cfg.hideEntityItemInContext = true;

            control = Ext.widget(cfg.xtype, cfg);
            activeControl = control;

            cfg.hidden = !prevFilter || prevFilter.filterType !== 'by_several_value' || filterType === 'no_filter';
            multiControl = Ext.widget('ubmultiselecbox', cfg);
            if(value){
                if (prevFilter && prevFilter.filterType === 'by_several_value'){
                    activeControl = multiControl;
                }

                if (activeControl.setValueById){
                    activeControl.setValueById(prevFilter.value);
                } else {
                    activeControl.setValue(prevFilter.value);
                }
            }

            comboChanged = function(sender, newValue){
                control.hide();
                multiControl.hide();
                control.allowBlank = true;

                if (newValue === 'no_filter' && !context.isPreFilter){
                    control.reset();
                    multiControl.reset();
                    context.removeFilter(filterName, attrName);
                    return;
                }
                if (newValue === 'isNull' && !context.isPreFilter){
                    startSearch();
                    return;
                }

                if (newValue === 'no_filter' || newValue === 'isNull'){
                    control.reset();
                    multiControl.reset();
                } if (newValue === 'by_several_value'){
                    multiControl.allowBlank = !required;
                    multiControl.show();
                } else {
                    control.allowBlank = !required;
                    control.show();
                }

            };

            combo =  Ext.create('Ext.form.ComboBox', {
                fieldLabel: attribute.caption,
                isFormField: context.isPreFilter,
                hideLabel: context.isPreFilter,
                labelWidth: 100, // 'auto',
                store: me.createFilterItems('association', attribute.allowNull ), //this.AssociationFilters,
                queryMode: 'local',
                displayField: 'text',
                valueField: 'type',
                value: filterType,
                //margin: '0 15 0 0',
                margin: context.getItemMargin(),
                width: this.filterTypeWidth,
                forceSelection: true,
                editable: false,
                withoutIndent: true,
                listeners: {
                    change: function(sender, newValue, oldValue, eOpts){
                        comboChanged(sender, newValue);
                    }
                }
            });
            combo.setValue(filterType);

            createFilter = function(){
                var fval, conditions =  UB.core.UBCommand.condition,
                    result, cfilterType, ftrcfg;

                cfilterType = combo.getValue();
                fval = cfilterType === 'by_several_value' ? multiControl.getValue(): control.getValue();

                if ((cfilterType === 'no_filter') || (Ext.isEmpty(fval) &&  cfilterType !== me.isNullFilterType)){
                    return null;
                }

                ftrcfg = {
                    id: filterName,
                    root: 'data',
                    filterType: cfilterType,
                    property: attrName
                };
                switch (cfilterType){
                    case 'isNull':
                        ftrcfg.filterFn = me.getfilterFuncIsNull(attrName);
                        ftrcfg.condition = conditions.sqlecIsNull;
                        ftrcfg.value = null;
                        break;
                    case 'by_value':
                        if (attribute.dataType === 'Many') {
                            ftrcfg.condition = conditions.sqlecIn;
                            ftrcfg.value = [fval];
                        } else {
                            ftrcfg.anyMatch = true;
                            ftrcfg.value = fval;
                        }
                        ftrcfg.text =  control.getDisplayValue();
                        break;
                    case 'by_several_value':
                        ftrcfg.text =  multiControl.getDisplayValue();
                        ftrcfg.condition = conditions.sqlecIn;
                        ftrcfg.value = fval;

                }
                result = Ext.create('Ext.util.Filter', ftrcfg );
                return result;
            };

            startSearch = function(){
                var filter = createFilter();
                if (filter){
                    context.setFilter(attrName,  filter);
                } else {
                    context.removeFilter(filterName, attrName);
                }
            };

            if (context.isPreFilter){
                context.initFilterFunc(attrName, createFilter);
                context.initFilterControl(attrName, 'filterType', combo);
                context.initFilterControl(attrName, null, control);
                context.initFilterControl(attrName, 'multi', multiControl);
            } else {
                control.on('change',function(sender, newVal){
                    if (sender.findRecordByDisplay(newVal)){
                      startSearch();
                    }
                },me);
                control.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);
                multiControl.on('specialkey', function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);
                multiControl.on('itemSelected', function(){
                        startSearch();
                }, me);

            }

            var controls = [combo, control, multiControl];
            if (!context.isPreFilter){
                controls.push(this.createSearchButton(startSearch));
            }
            return controls;
        },

        /**
         * @private {Object} filterTypeStores
         */
        filterTypeStores: {},

        /**
         *
         * @param {String} dataType
         * @param {Boolean} allowNull
         * @returns {Ext.data.Store}
         */
        createFilterItems: function(dataType, allowNull){
            var me = this, items = [{type:'no_filter', text: 'no_filter'}],
                key = dataType + String(allowNull), result;

            result = me.filterTypeStores[key];
            if (!result){
                switch(dataType){
                    case 'date':
                        items.push(
                            {type:'today', text: 'today'},
                            {type:'yesterday', text: 'yesterday'},
                            {type:'current_week', text: 'current_week'},
                            {type:'this_month', text: 'this_month'},
                            {type:'this_year', text: 'this_year'},
                            {type:'from_date', text: 'from_date'},
                            {type:'to_date', text: 'to_date'},
                            {type:'date', text: 'date'},
                            {type:'period', text: 'period'}
                        ); break;
                    case 'string':
                        items.push(
                            {type:'startWith', text: 'startWith'},
                            {type:'contains', text: 'contains'},
                            // {type:'endWith', text: 'endWith'},
                            // {type:'notContains', text: 'notContains'},
                            {type:'equal', text: 'equal'}
                        ); break;
                    case 'number':
                        items.push(
                            {type:'more', text: 'more'},
                            {type:'less', text: 'less'},
                            {type:'equal', text: 'equal'},
                            {type:'range', text: 'range'}
                        ); break;
                    case 'association':
                        items.push(
                            {type:'by_value', text: 'by_value'},
                            {type:'by_several_value', text: 'by_several_value'}
                        ); break;
                }

                if (allowNull){
                    items.push( {type:'isNull', text: 'isNull'} );
                }

                _.forEach(items, function (item) {
                    item.text = UB.i18n(item.text);
                });

                me.filterTypeStores[key] = result =  Ext.create('Ext.data.Store', {
                            fields: ['type', 'text'],
                            data : items
                });
            }

            return result;
        },


        createSearchButton: function(handler){
            return Ext.create('Ext.button.Button', {
                scale   : 'medium',
                glyph: UB.core.UBUtil.glyphs.faBinoculars,
                tooltip: UB.i18n('search'),
                margin: '0 0 0 8',
                handler: handler
            });
        },

        getPlainTextFilterS: function(entityName, attrName, context){
            var
                me = this,
                comboChanged,
                attribute = $App.domainInfo.get(entityName).attr(attrName),
                filterName, prevFilter, tbcfg, textField, startSearch, createFilter,
                initParam, required = false, baseFilterType, filterType, labelText;

            filterName = context.getFilterPrefix(attrName);
            prevFilter = context.getPrevFilter(filterName, attrName);

            if (context.getInitParam){
                initParam =  context.getInitParam(attrName);
            }
            initParam = initParam || {};
            if (!Ext.isEmpty(initParam.required)){
                required = initParam.required;
            }
            if (!Ext.isEmpty(initParam.filterType)){
                baseFilterType = initParam.filterType;
            }
            filterType = (prevFilter ? prevFilter.filterType : (baseFilterType || 'contains'));

            if (prevFilter && baseFilterType === 'no_filter' && Ext.isEmpty(prevFilter.value)  ){
                filterType = 'no_filter';
            }

            tbcfg = {
                    //xtype: 'textfield',    beforeLabelTextTpl
                    //labelStyle: 'white-space: nowrap; text-overflow: ellipsis;',
                    isFormField: context.isPreFilter,
                    labelCls: 'ub-overflow-elips',
                    labelWidth: 100, //'auto'
                    enforceMaxLength: true,
                    margin: context.getItemMargin(),
                    maxLength : attribute.size || 2000,
                    withoutIndent: true
                    //,fieldLabel: ubDomain.getEntityAttributeCaption(entityName, attrName)
                };

            if (!Ext.isEmpty(initParam.value)){
                tbcfg.value = initParam.value;
            }
            if(prevFilter){
                tbcfg.value = prevFilter.value;
            }
            if(context.isPreFilter){
                tbcfg.hideLabel = true;
            }
            tbcfg.enforceMaxLength = !!UB.appConfig.maxSearchLength;
            if (tbcfg.enforceMaxLength){
                tbcfg.maxLength = UB.appConfig.maxSearchLength;
            }


            textField = Ext.create('Ext.form.field.Text', tbcfg);

            comboChanged = function(sender, newValue){
                textField.hide();
                textField.allowBlank = true;

                if (newValue === 'no_filter' && !context.isPreFilter){
                    context.removeFilter(filterName, attrName);
                    return;
                }

                if(newValue === 'isNull' && !context.isPreFilter){
                    startSearch();
                    return;
                }

                if (newValue === 'no_filter' || newValue === 'isNull'){
                    textField.reset();
                } else {
                    textField.allowBlank = !required;
                    textField.show();
                }
            };

            labelText = attribute.caption;
            var combo =  Ext.create('Ext.form.ComboBox', {
                fieldLabel: labelText ,
                hideLabel: context.isPreFilter,
                isFormField: context.isPreFilter,
                labelWidth: 100, // 'auto',
                margin: context.getItemMargin(),
//labelStyle: 'width: 100px;',
                //beforeLabelTextTpl: '<span style="white-space: nowrap; text-overflow: ellipsis; width: auto;">',
                //afterLabelTextTpl: '</span>',
                //labelCls: 'ub-overflow-elips',
                //fieldLabel: UB.i18n('filterType'),
                store: me.createFilterItems('string', attribute.allowNull ), //this.stringFilters,
                queryMode: 'local',
                displayField: 'text',
                valueField: 'type',
                //margin: '0 15 0 0',
                width: this.filterTypeWidth,
                value: filterType,
                forceSelection: true,
                editable: false,
                withoutIndent: true,
                listeners: {
                    afterrender: function(sender){
                        Ext.create('Ext.tip.ToolTip', {
                                target: sender.getEl(),
                                html: labelText
                        });
                    },
                    change: function(sender, newValue, oldValue, eOpts){
                        comboChanged(sender, newValue);
                    }
                },
                validator: function(value){
                    if (required && (this.getValue() === 'no_filter')){
                        return UB.i18n('filterIsRequired');
                    }
                    return true;
                }

            });
            comboChanged(combo, filterType);

            createFilter = function(){
                 var fval, pattern, filter, cfilterType, conditions, cfg;
                 conditions =  UB.core.UBCommand.condition;
                 cfilterType = combo.getValue();
                 fval = textField.getValue();

                 if( (cfilterType === 'no_filter') || ((!fval || !fval.trim()) && (cfilterType !== me.isNullFilterType))  ){
                    return null;
                 }


                 cfg = {
                     id: filterName,
                     root: 'data',
                     property: attrName,
                     filterType: cfilterType,
                     value: fval,
                     userValue: fval
                 };

                 switch (cfilterType){
                     case 'contains':
                         pattern = new RegExp(UB.Utils.escapeForRegexp(fval), 'i');
                         cfg.filterFn = function(record){
                           var val = record.get(attrName);
                           return val && (val.match(pattern) !== null);
                         };
                         cfg.condition = conditions.sqlecLike;
                         break;
                     case 'startWith':
                         cfg.filterFn = function(record){
                             var val = record.get(attrName);
                             return val && (val.toLowerCase().indexOf(fval) === 0);
                         };
                         cfg.condition = conditions.sqlecStartWith;
                         break;
                     case 'equal':
                         pattern = new RegExp('^' + UB.Utils.escapeForRegexp(fval) + '$', 'i');
                         cfg.filterFn = function(record){
                             var val = record.get(attrName);
                             return pattern.test(val);
                         };
                         cfg.condition = conditions.sqlecEqual;
                         break;
                     case 'isNull':
                         cfg.filterFn = function(record){
                             var val = record.get(attrName);
                             return val === null;
                         };
                         cfg.condition = conditions.sqlecIsNull;
                         break;
                     case 'no_filter':
                         return null;
                 }
                filter = Ext.create('Ext.util.Filter', cfg);
                return filter;
            };

            startSearch = function(){
                var filter = createFilter();
                if (filter){
                    context.setFilter(attrName,  filter);
                } else {
                    context.removeFilter(filterName, attrName);
                }
            };

            if (context.isPreFilter){
                context.initFilterFunc(attrName, createFilter);
                context.initFilterControl(attrName, null, textField);
                context.initFilterControl(attrName, 'filterType', combo);
            } else {
                textField.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);
            }


            var controls = [combo, textField];
            if (!context.isPreFilter){
                controls.push(this.createSearchButton(startSearch));
            }
            return controls;
        },

        getOnChangeHandler: function(filterName, attrName, context){
            //var me = this;
            return function(sender, newVal){
                var
                    dateFrom, dateTo;
                if(!sender.isValid()){
                    return ;
                }

                if(sender.dateRole === 'fromDate'){
                    sender.relatedPiker.setMinValue(newVal);
                    dateFrom = newVal;
                    dateTo = sender.relatedPiker.getValue() || 0;
                } else {
                    sender.relatedPiker.setMaxValue(newVal);
                    dateTo = newVal;
                    dateFrom = sender.relatedPiker.getValue() ||0;
                }
            };
        },

        /**
         * create input controls for date filters
         * @param {String} entityName
         * @param {String} attrName
         * @param {Object} context
         * @return {Array}
         */
        getDateFilterInputS: function(entityName, attrName, context){
            var
            me = this, createFilter,
            filterName = context.getFilterPrefix(attrName),
            allPrevFilter = context.getPrevFilter(filterName, attrName),
            attribute = $App.domainInfo.get(entityName).attr(attrName),
            prevFilter, onChange, fromDate, toDate, date, startSearch,
            prevFilterDate, prevFilterDateFrom, prevFilterDateTo,
            initParam, required = false, baseFilterType, filterType, fvalue, isTime, fieldType;

            fieldType = attribute.dataType;
            isTime = (fieldType === 'DateTime');

            if (context.getInitParam){
               initParam =  context.getInitParam(attrName);
            }
            initParam = initParam || {};
            if (!Ext.isEmpty(initParam.required)){
                required = initParam.required;
            }
            if (!Ext.isEmpty(initParam.filterType)){
               baseFilterType = initParam.filterType;
            }

            if (allPrevFilter && Ext.isArray(allPrevFilter)){
                Ext.Array.each(allPrevFilter, function(filter){
                   prevFilter = filter;
                   switch (filter.controlID){
                       case 'date': prevFilterDate = filter; break;
                       case 'dateFrom': prevFilterDateFrom = filter; break;
                       case 'dateTo': prevFilterDateTo = filter; break;
                   }
                });
            } else {
                prevFilter = allPrevFilter || {filterType: baseFilterType || 'date' };
                prevFilterDate = prevFilter;
            }
            prevFilter = prevFilter || {filterType: baseFilterType || 'date' };

            filterType = prevFilter.filterType || baseFilterType || 'date';

            if (isTime && (prevFilter.filterType === 'date' ||
                prevFilter.filterType === 'today' ||
                prevFilter.filterType === 'yesterday') && prevFilterDateFrom ){
                prevFilterDate = prevFilterDateFrom;
            }

            if (prevFilter && baseFilterType === 'no_filter' && Ext.isEmpty(prevFilter.valueFrom) && Ext.isEmpty(prevFilter.value)  ){
                filterType = 'no_filter';
            }


            fvalue = null;
            if (!Ext.isEmpty(initParam.valueFrom)){
                fvalue = initParam.valueFrom;
            }
            if (prevFilterDateFrom){
                fvalue = prevFilterDateFrom.value;
            }

            onChange = this.getOnChangeHandler(filterName, attrName, context);
            fromDate = Ext.widget('ubdatefield', {
                isFormField: context.isPreFilter,
                value: fvalue,
                //validator: this.dateValidator,
                hidden: filterType !== 'period',
                allowBlank: !required,
                dateRole: 'fromDate',
                fieldType: fieldType,
                withoutIndent: true,
                margin: context.getItemMargin(),
                listeners: {
                    scope: context,
                    change: onChange
                }
            });

            fvalue = null;
            if (!Ext.isEmpty(initParam.valueTo)){
                fvalue = initParam.valueTo;
            }
            if (prevFilterDateTo){
                fvalue = isTime ? UB.core.UBUtil.addDays(prevFilterDateTo.value, -1): prevFilterDateTo.value;
            }
            toDate = Ext.widget('ubdatefield', {
                labelWidth: 10,
                //margin: '0 0 0 20',
                isFormField: context.isPreFilter,
                labelSeparator: '',
                fieldLabel: ' -', // UB.i18n('po'),
                value: fvalue,
                allowBlank: !required,
                dateRole: 'toDate',
                hidden: filterType !== 'period',
                fieldType: fieldType,
                withoutIndent: true,
                margin: context.getItemMargin(),
                listeners: {
                    scope: context,
                    change: onChange
                }
            });

            fvalue = null;
            if (!Ext.isEmpty(initParam.value)){
                fvalue = initParam.value;
            }

            if (prevFilterDate){
                fvalue = prevFilterDate.value;
                if (isTime && prevFilter.filterType === 'to_date'){
                    fvalue = UB.core.UBUtil.addDays(fvalue, -1);
                }
            }
            date = Ext.widget('ubdatefield', {
                //margin: '0 20 0 0',
                isFormField: context.isPreFilter,
                value: fvalue,
                allowBlank: !required,
                fieldType: fieldType,
                margin: context.getItemMargin(),
                withoutIndent: true,
                hidden: !(filterType === 'date' || filterType === 'from_date' || filterType === 'to_date' )
            });


            fromDate.relatedPiker = toDate;
            toDate.relatedPiker = fromDate;


            var comboChanged = function(sender, newValue){
                fromDate.hide();
                toDate.hide();
                date.hide();

                fromDate.reset();
                toDate.reset();
                date.reset();

                fromDate.allowBlank = true;
                toDate.allowBlank = true;
                date.allowBlank = true;
                //fromDate.allowBlank: !required,


                if(newValue === 'no_filter'){
                    if (!context.isPreFilter){
                        context.removeFilter(filterName, attrName);
                    }
                    return;
                }
                if(newValue === 'isNull'){
                    if (!context.isPreFilter){
                        startSearch();
                    }
                    return;
                }
                if(newValue === 'period'){
                    fromDate.allowBlank = !required;
                    toDate.allowBlank = !required;
                    fromDate.show();
                    toDate.show();
                    return;
                }

                if(newValue === 'date' || newValue === 'from_date' || newValue ==='to_date'){
                    date.allowBlank = !required;
                    date.show();
                    return;
                }

            };

            var combo =  Ext.create('Ext.form.ComboBox', {
                fieldLabel: attribute.caption,
                hideLabel: context.isPreFilter,
                isFormField: context.isPreFilter,
                labelWidth: 100, // 'auto',
                store: me.createFilterItems('date', attribute.allowNull ), //this.dateFilters,
                queryMode: 'local',
                displayField: 'text',
                valueField: 'type',
                //margin: '0 15 0 0',
                margin: context.getItemMargin(),
                width: this.filterTypeWidth,
                value: filterType,
                forceSelection: true,
                withoutIndent: true,
                editable: false,
                validator: function(){
                   if (required && (this.getValue() === 'no_filter')){
                       return UB.i18n('filterIsRequired');
                   }
                   return true;
                },
                listeners: {
                    change: function(sender, newValue, oldValue, eOpts){
                        comboChanged(sender, newValue);
                    }
                }
            });
            comboChanged(combo, filterType);

            createFilter = function(){
                var cfilterType, fromDateV, oneDateV, toDateV, dateVal, operator, dateRange,
                    filterFrom, filterTo, result = [], conditions;
                conditions =  UB.core.UBCommand.condition;
                cfilterType = combo.getValue();
                fromDateV = fromDate.getValue();
                toDateV = toDate.getValue();
                oneDateV = date.getValue();


                switch (cfilterType){
                    case 'no_filter':
                        return null;
                    case 'today':
                        dateVal = new Date();
                        if (isTime){
                            dateVal = UB.core.UBUtil.truncTime(dateVal);
                            dateRange = [dateVal, UB.core.UBUtil.addDays(dateVal, 1)];
                            dateVal = null;
                        } else {
                            dateVal = UB.core.UBUtil.truncTimeToUtcNull(dateVal);
                            operator = '=';
                        }
                        break;
                    case 'yesterday':
                        dateVal = UB.core.UBUtil.addDays( new Date(), -1);
                        if (isTime){
                            dateRange = [UB.core.UBUtil.truncTime(dateVal), UB.core.UBUtil.truncTime(new Date())];
                            dateVal = null;
                        } else {
                            dateVal = UB.core.UBUtil.truncTimeToUtcNull(dateVal);
                            operator = '=';
                        }
                        break;
                    case 'current_week':
                        if (isTime){
                            dateRange =  UB.ux.Multifilter.getWeekRange(fieldType, true);
                            dateRange[0] = UB.core.UBUtil.truncTime(dateRange[0]);
                            dateRange[1] = UB.core.UBUtil.addDays( UB.core.UBUtil.truncTime(dateRange[1]), 1);
                        } else {
                            dateRange =  UB.ux.Multifilter.getWeekRange(fieldType);
                        }
                        break;
                    case 'this_month':
                        if (isTime){
                            dateRange =  UB.ux.Multifilter.getMonthRange(fieldType, true);
                            dateRange[0] = UB.core.UBUtil.truncTime(dateRange[0]);
                            dateRange[1] = UB.core.UBUtil.addDays( UB.core.UBUtil.truncTime(dateRange[1]), 1);
                        } else {
                            dateRange =  UB.ux.Multifilter.getMonthRange(fieldType);
                        }
                        break;
                    case 'this_year':
                        if (isTime){
                            dateRange =  UB.ux.Multifilter.getYearRange(fieldType, true);
                            dateRange[0] = UB.core.UBUtil.truncTime(dateRange[0]);
                            dateRange[1] = UB.core.UBUtil.addDays( UB.core.UBUtil.truncTime(dateRange[1]), 1);
                        } else {
                            dateRange =  UB.ux.Multifilter.getYearRange(fieldType);

                        }

                        break;
                    case 'from_date':
                        dateVal = UB.core.UBUtil.truncTimeToUtcNull(oneDateV);
                        if (isTime){
                            dateVal = UB.core.UBUtil.truncTime(oneDateV);
                        }
                        operator = '>=';
                        break;
                    case 'to_date':
                        dateVal = UB.core.UBUtil.truncTimeToUtcNull(oneDateV);
                        operator = '<=';
                        if (isTime){
                            operator = '<';
                            dateVal = UB.core.UBUtil.addDays(UB.core.UBUtil.truncTime(oneDateV), 1);
                        }
                        break;
                    case 'date':
                        if (isTime){
                            dateVal = UB.core.UBUtil.truncTime(oneDateV);
                            dateRange = [dateVal, UB.core.UBUtil.addDays(dateVal, 1)];
                            dateVal = null;
                        } else {
                            dateVal = UB.core.UBUtil.truncTimeToUtcNull(oneDateV);
                            operator = '=';
                        }
                        break;
                    case 'period':
                        dateRange = [UB.core.UBUtil.truncTimeToUtcNull(fromDateV), UB.core.UBUtil.truncTimeToUtcNull(toDateV)];
                        if (isTime){
                            dateRange = [UB.core.UBUtil.truncTime(fromDateV), UB.core.UBUtil.addDays(UB.core.UBUtil.truncTime(toDateV),1)];
                        }
                        break;
                    case 'isNull':
                        result.push( Ext.create('Ext.util.Filter',{
                            id: filterName,
                            root: 'data',
                            filterType: cfilterType,
                            property: attrName,
                            filterFn: me.getfilterFuncIsNull(attrName),
                            condition: conditions.sqlecIsNull,
                            value: null
                        }));
                        break;

                }

                if (dateVal){
                    //dateVal.setHours(0, 0, 0, 0);
                    result.push(
                        Ext.create('Ext.util.Filter',{
                            id: filterName,
                            root: 'data',
                            filterType: cfilterType,
                            property: attrName,
                            operator: operator,
                            controlID: 'date',
                            exactMatch: true,
                            isTime: isTime,
                            value: dateVal
                        })
                    );
                }

                if (dateRange && dateRange[0] && dateRange[1]){
                    //dateRange[0].setHours(0, 0, 0, 0);
                    //dateRange[1].setHours(0, 0, 0, 0);
                    filterFrom = Ext.create('Ext.util.Filter',{
                        id: filterName,
                        root: 'data',
                        filterType: cfilterType,
                        property: attrName,
                        controlID: 'dateFrom',
                        operator: '>=',
                        isTime: isTime,
                        value: dateRange[0]
                    });
                    filterTo = Ext.create('Ext.util.Filter',{
                        id: filterName + '_to', // + (new Date()).getDate(),
                        root: 'data',
                        property: attrName,
                        filterType: cfilterType,
                        controlID: 'dateTo',
                        operator: isTime ? '<' : '<=',
                        isTime: isTime,
                        value: dateRange[1]
                    });
                    filterFrom.relatedFilter = filterTo;
                    filterTo.relatedFilter = filterFrom;
                    result.push(filterFrom, filterTo);
                }
                return result;
            };
            startSearch = function(){
                var filter = createFilter();
                if (filter){
                    context.setFilter(attrName,  filter);
                } else {
                    context.removeFilter(filterName, attrName);
                }

            };

            if (context.isPreFilter){
                context.initFilterFunc(attrName, createFilter);
                context.initFilterControl(attrName, 'date', date);
                context.initFilterControl(attrName, 'fromDate', fromDate);
                context.initFilterControl(attrName, 'toDate', toDate);
                context.initFilterControl(attrName, 'filterType', combo);
            } else {
                date.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);

                fromDate.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);

                toDate.on('specialkey',function(sender,e){
                    if(e.getKey() === e.ENTER){
                        e.stopEvent();
                        startSearch();
                    }
                }, me);

            }

            var controls = [combo, fromDate, toDate, date];
            if (!context.isPreFilter){
                controls.push(this.createSearchButton(startSearch));
            }
            return controls;
        }
    }
});