/**
 * Categories grid column. See {@link https://enviance.softline.kiev.ua/confluence/pages/viewpage.action?pageId=90148338 this WiKi article} for usage samples
 *
 * @author xmax 23.02.15
 */
Ext.define('UB.view.ColumnCategories', {
    extend: 'Ext.grid.column.Action',
    alias: 'widget.columncategories',
    width: 40,
    align: 'center',
    minWidthChar: 6,
    maxWidthChar: 7,
    sortable: true,
    header: '', // UB.i18n('gridFavoritesHeader'),
    cls: 'ub-favorites-header',
    tdCls: 'ub-favorites-td',

    disableExport: true,
    /**
     * @cfg {String} filterCaption Caption for ub filters
     */
    /**
     * @cfg {Number} updateDelay Delay before start server method in ms. Default 300 ms
     */
    updateDelay: 500,
    defaultRenderer: function(v, meta, record, rowIdx, colIdx, store, view){
        var me = this,
            prefix = Ext.baseCSSPrefix,
            scope = me.origScope || me,
            items = me.items,
            len = items.length,
            i = 0,
            item, ret, disabled, tooltip;

        record.baseValue = v;
        me.items[0].iconCls = 'ub-favorites-img ' + me.getCls(v);

        ret = _.isFunction(me.origRenderer) ? me.origRenderer.apply(scope, arguments) || '' : '';

        for (; i < len; i++) {
            item = items[i];

            disabled = item.disabled || (item.isDisabled ? item.isDisabled.call(item.scope || scope, view, rowIdx, colIdx, item, record) : false);
            tooltip = disabled ? null : (item.tooltip || (item.getTip ? item.getTip.apply(item.scope || scope, arguments) : null));

            // Only process the item action setup once.
            if (!item.hasActionConfiguration) {

                // Apply our documented default to all items
                item.stopSelection = me.stopSelection;
                item.disable = Ext.Function.bind(me.disableAction, me, [i], 0);
                item.enable = Ext.Function.bind(me.enableAction, me, [i], 0);
                item.hasActionConfiguration = true;
            }

            ret += '<div role="button" alt="' + (item.altText || me.altText) +
            '" class="' + prefix + 'action-col-icon ' + prefix + 'action-col-' + String(i) + ' ' + (disabled ? prefix + 'item-disabled' : ' ') +
            ' ' + (_.isFunction(item.getClass) ? item.getClass.apply(item.scope || scope, arguments) : (item.iconCls || me.iconCls || '')) + '"' +
            (tooltip ? ' data-qtip="' + tooltip + '"' : '') + ' ></div>';
        }


        return ret;
        //me.callParent(arguments);
    },

    constructor: function(config) {
        var me = this;
        if (!config){
            config = {};
        }
        config.items = [{
            //icon: 'images/star-empty.png',  // Use a URL in the icon config
            tagName: 'div',
            tooltip: UB.i18n('FavoritesToolTip'),
            iconCls: 'ub-favorites-img ub-favorites-img-empty',
            handler: function(){
                me.onFavoritesClick.apply(me, arguments);
            }
        }];
        me.filterCaption = UB.i18n('gridCategoryCaption');
        me.callParent([config]);
    },

    initComponent: function(){
        var me = this;
        me.timers = {};
        me.callParent(arguments);
    },

    onFavoritesClick: function(grid, rowIndex, colIndex, cfg, event ) {
        var me = this, itemID, value,
            store = grid.getStore(),
            rec = store.getAt(rowIndex),
            newValue, entityCode, metaColumn,
            idColumn;

        value = rec.baseValue;

        entityCode = store.ubRequest.entity;
        metaColumn = $App.domainInfo.get(entityCode, true).getEntityAttributeInfo(this.dataIndex, -1);

        idColumn = this.dataIndex.split('.');
        if (metaColumn.attributeCode === idColumn[0]){
            idColumn = 'ID';
        } else {
            idColumn = idColumn.slice(0, idColumn.length - 2).join('.');
        }
        itemID = rec.get(idColumn);

        if (!itemID){
            throw new Error('You must add column "' + idColumn + '" to fieldList' );
        }

        switch (value){
            case '1': newValue = '2'; break;
            case '2': newValue = '3'; break;
            case '3': newValue = '0'; break;
            default: newValue = '1';
        }

        if (me.timers[itemID]){
            clearTimeout(me.timers[itemID]);
        }
        //event.target.src = me.getImage(newValue);
        me.updateCls(event.target, value, newValue);

        rec.baseValue = newValue;
        me.timers[itemID] = setTimeout(function () {
            delete me.timers[itemID];
            me.startUpdateFavorites(itemID, value, newValue, event.target, metaColumn, rec);
        }, me.updateDelay || 300);
    },

    updateCls: function(domEl, oldValue, newValue){
        var me = this,
            elFly = Ext.fly(domEl);
        elFly.removeCls(me.getCls(oldValue));
        elFly.addCls(me.getCls(newValue));
    },

    getCls: function(value){
        switch (value){
            case '1': return 'ub-favorites-img-yellow';
            case '2': return 'ub-favorites-img-green';
            case '3': return 'ub-favorites-img-red';
            default: return 'ub-favorites-img-empty';
        }
    },

    startUpdateFavorites: function(itemID, value, newValue, target, metaColumn, cfg){
        var me = this, promise,
            associatedEntity = metaColumn.attribute.associatedEntity,
            associationAttr = metaColumn.attribute.associationAttr;   //instanceID

        if (value){
            promise = UB.Repository(associatedEntity).attrs(['ID', associationAttr, 'ubUser', 'code']) //'mi_modifyDate'
                .where('instanceID', '=', itemID).select();
        } else {
            promise = $App.connection.addNew({
                entity: associatedEntity,
                fieldList: ['ID', associationAttr, 'ubUser', 'code']
            }).then(function(responce){
                    return UB.LocalDataStore.selectResultToArrayOfObjects(responce);
                });
        }
        promise.then(function(responce){
            var execParams = responce[0] || {}, request;
            execParams.code = newValue;
            execParams.instanceID = itemID;
            execParams.ubUser = $App.connection.userData('userID'); //  $App.userID;  $App.connection.userData()

            request  = {entity: associatedEntity,
                method: (execParams.code === '0' ? 'delete': (value && execParams.ID ? 'update': 'insert')),
                execParams: execParams
            };
            return $App.connection.run(request).catch(function(){
                //target.src = me.getImage(value);
                me.updateCls(target, value, cfg.baseValue);

                //rec.set(me.dataIndex, value);
                cfg.baseValue = value;
            });
        });
    },

    statics: {
        /**
         *
         * @param ubRequest
         * @param attributeName
         */
        prepareConditions: function(ubRequest, attributeName, metaColumn){
            var attrPart = attributeName.split('.'),
                exprName = 'favFtrUsr' + attrPart[0],
                wExpr,
                values = {},idColumn, colNum, col, colExist;

            idColumn = attributeName.split('.');
            if (metaColumn.attributeCode === idColumn[0]){
                idColumn = 'ID';
            } else {
                idColumn = idColumn.slice(0, idColumn.length - 2).join('.');
            }

            if (ubRequest.fieldList.indexOf(idColumn) < 0){
                ubRequest.fieldList.push(idColumn);
            }

            colExist = false;
            for( colNum = 0; colNum < ubRequest.fieldList.length; colNum++ ){
                col = ubRequest.fieldList[colNum];
                if (col.name === idColumn || (typeof(col) === 'object' && col.name === idColumn)){
                    colExist = true;
                    break;
                }
            }

            if (!colExist){
                ubRequest.fieldList.push({name: idColumn, visibility: false });
            }

            wExpr = attrPart.slice(0, attrPart.length - 1).join('.') + '.' + 'ubUser';
            if (!ubRequest.whereList){
                ubRequest.whereList = {};
            }
            if (!ubRequest.joinAs){
                ubRequest.joinAs = [];
            }
            values[wExpr] = $App.connection.userData('userID');
            ubRequest.whereList[exprName] = {
                expression: '[' + wExpr + ']',
                condition: 'equal',
                values: values
            };
            ubRequest.joinAs.push(exprName);
        }

    }


});

