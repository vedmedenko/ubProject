require('../../../core/UBCommand')
require('../../../core/UBService')
require('../reader/UBArray')
require('../../../core/UBUtil')
require('../../../core/UBAppConfig')
/**
 * Файл: UB.ux.data.proxy.UBProxy.js
 * Автор: Игорь Ноженко
 * 
 * Proxy
 * 
 * Формирует запросы
 * Обеспечивает работу с кэшируемыми сущностями
 */

Ext.define('UB.ux.data.proxy.UBProxy', {
    extend: 'Ext.data.proxy.Server',
//extend: 'Ext.data.proxy.Ajax',
    alias: 'proxy.ubproxy',

    // requires: [
    //     'UB.core.UBCommand',
    //     'UB.core.UBService',
    //     'UB.ux.data.reader.UBArray',
    //     'UB.core.UBUtil',
    //     'UB.core.UBAppConfig'
    // ],
	
	uses: [
		'UB.view.ErrorWindow'
	],
	
    constructor: function(config) {
        Ext.apply(this, {
//            actionMethods: {
//                read: 'POST'
//            },
            reader: {
                type: 'ubarray',
                root: 'data',
                totalProperty: 'total'
            }
        });

        this.callParent(arguments);

        this.addListener('exception', this.onException, this);

        return this;
    },
    allLoaded: false,
    statics: {
        /**
         * Convert store filters to where list
         * @param {Array} filters
         * @param {String} entityName
         * @returns {Object}
         */
        ubFilterToWhereList: function(filters, entityName) {
            var whereList = {}, me = this, doFilter;
            doFilter = function(filter, index) {
                if(!filter.disabled && filter.filterFn){
                    var rFilter = me.ubFiltersItemToUBWhereListItem(filter, $App.domainInfo.get(entityName).attr(filter.property).dataType);
                    switch(filter.condition){
                        case "match":
                            whereList.match = rFilter;
                            break;
                        case "between":
                            whereList.between = rFilter;
                            break;
                        default:
                            whereList['x' + index] = rFilter;
                            break;
                    }
                }
            };
            if (filters instanceof  Ext.util.MixedCollection){
                filters.each(doFilter);
            } else {
                Ext.each(filters || [], doFilter);
            }
            return whereList;
        },

        /**
         *
         * @param {Object} fItem //todo - this is Ext.util.Filter or not?
         * @param {String} dataType
         * @return {Object}
         */
        ubFiltersItemToUBWhereListItem: function(fItem, dataType) {
            var
                conditions =  UB.core.UBCommand.condition,
                ubWLItem = {
                    values: {}
                };

            ubWLItem.expression = '[' + fItem.property + ']';
            if(dataType === UBDomain.ubDataTypes.String){
                if(fItem.exactMatch){
                    ubWLItem.condition =  conditions.sqlecEqual;
                } else if(fItem.startWith){
                    ubWLItem.condition =  conditions.sqlecStartWith;
                } else {
                    ubWLItem.condition =  conditions.sqlecLike;
                }
            }
            if(fItem.operator){
                switch (fItem.operator){
                    case '>=':
                        ubWLItem.condition = conditions.sqlecMoreEqual;
                        break;
                    case '<=':
                        ubWLItem.condition = conditions.sqlecLessEqual;
                        break;
                    case '<':
                        ubWLItem.condition = conditions.sqlecLess;
                        break;
                    case '=':
                        ubWLItem.condition = conditions.sqlecEqual;
                        break;
                    case '>':
                        ubWLItem.condition = conditions.sqlecMore;
                        break;
                    case '!=':
                        ubWLItem.condition = conditions.sqlecNotEqual;
                        break;
                    default:
                        ubWLItem.condition = conditions.sqlecEqual;
                }
            }
            if (fItem.condition){
                ubWLItem.condition =  fItem.condition;
            }
            ubWLItem.condition = ubWLItem.condition || conditions.sqlecEqual;
            ubWLItem.values[fItem.property] = fItem.value;
            // for special filter type. (foe example fts)
            switch(fItem.condition){
                case 'match':
                    ubWLItem = {
                        condition: "match",
                        values: {"any": fItem.value}
                    };
                    break;
                case 'between':
                    ubWLItem = {
                        condition: "between",
                        values: {"v1": fItem.valueFrom, "v2": fItem.valueTo}
                    };
                    break;
            }
            return ubWLItem;
        }
    },
    /**
     * 
     * @param {Ext.data.proxy.Proxy} proxy
     * @param {Object} response
     * @param {Ext.data.Operation} operation
     */
    onException: function(proxy, response, operation) {
        throw new Error({errMsg: operation.getError()});
    },

    /**
     * Take Ext.data.Operation and perform actual request using UnityBase cache rules.
     * For cached entities - do all filtration on client, for non-cached - on server
     * @override
     * @param {Ext.data.Operation} operation
     * @param {Object} operation.ubRequest
     * @param {Function} callback
     * @param {Object} scope
     */
    doRequest: function(operation, callback, scope) {
        var
            me = this,
            serverRequest = Ext.clone(operation.ubRequest),
            start, limit,
            operationFilterWhereList, operationOrderList,
            resultSet, fnFilters = [],
            successFn = function(resultSet) {
                operation.resultSet = resultSet;
                operation.setCompleted();
                operation.setSuccessful();
                scope = scope || {};
                //prevent callback execution in case of store (scope) start destroying
                if(!scope.isDestroyed){
                    Ext.callback(callback, scope, [operation]);
                }
            };

        if(operation.action !== 'read'){
            //TODO - implement all other operation type to allow directly communicate via store
            throw new Error('unsupported operation for UBProxy: ' + operation.action);
        }
        //merge operation filters to whereList
        operationFilterWhereList = me.operationFilter2WhereList(operation, serverRequest.entity, fnFilters) || {};
        UB.apply(operationFilterWhereList, serverRequest.whereList);
        if (Object.keys(operationFilterWhereList).length){
            serverRequest.whereList = operationFilterWhereList;
        } else {
            delete serverRequest.whereList;
        }

        //merge operation sorters to orderList
        operationOrderList = me.operationOrder2OrderList(operation) || {};
        UB.apply(operationOrderList, serverRequest.orderList);
        if (Object.keys(operationOrderList).length){
            serverRequest.orderList = operationOrderList;
        } else {
            delete serverRequest.orderList;
        }
        //TODO - что делать если лимиты были в реквесте??
        limit = (operation.limit && operation.limit > 0) ? operation.limit : undefined;
        start = (operation.start && operation.start > 0) ? operation.start : undefined;
        if (start || limit){
            serverRequest.options = serverRequest.options || {};
            if (start) {
                serverRequest.options.start = start;
            }
            if (limit) {
                serverRequest.options.limit = limit;
            }

            if (limit && !start) {
                serverRequest.options.start = 0;
            }
        }
        $App.connection.select(serverRequest).done(function(response){
            resultSet = me.getReader().read({data: response.resultData.data});
            if (fnFilters.length > 0){
               me.applyFilterFn(resultSet, fnFilters);
            }
            resultSet.total = response.total;
            resultSet.totalRecords = resultSet.total;

            resultSet.resultLock = response.resultLock;
            resultSet.resultAls = response.resultAls;
            /*
            if (scope) {  //TODO - check scope is Store
                scope.resultLock = response.resultLock;
                if (response.resultAls) {
                    scope.resultAls = response.resultAls;
                }
            }
            */
            successFn(resultSet);
        },function(reason){
            operation.setException(reason);

            if(!scope.isDestroyed){
                Ext.callback(callback, scope, [operation]);
            }

        });
    },


    applyFilterFn: function(data, fnFilters){
        var i, record, y, result = [], useIt;
        for(i = 0; i < data.records.length; i++){
            record = data.records[i];
            useIt = true;
            for(y = 0; y < fnFilters.length; y++){
                if (fnFilters[y](record) !== true){
                    useIt = false;
                    break;
                }
            }
            if (useIt){
                result.push(record);
            }
        }
        data.records = result;
        data.count = result.length;
        console.warn('Attention! Filter using the function works without paging');
    },

    /**
     * Transform operation filters to ubRequest whereList
     * @private
     * @param {Ext.data.Operation} operation
     * @param {String} entityName
     * @param {Array} [fnFilters] For filters that use a function
     * @return {Object}
     */
    operationFilter2WhereList: function(operation, entityName, fnFilters) {
        var
            len, i, result, filterItem, start = 100, filter;
        if(operation.filters && (len=operation.filters.length) > 0) {
            result = {};
            for(i=0; i<len; ++i){
                filterItem = operation.filters[i];
                if (fnFilters && filterItem.initialConfig.filterFn && !filterItem.initialConfig.property){
                    fnFilters.push(filterItem.initialConfig.filterFn);
                    continue;
                }
                if(!filterItem.disabled && !filterItem.property ){
                    throw new Error('invalid filter');
                }
                filter = UB.ux.data.proxy.UBProxy.ubFiltersItemToUBWhereListItem(
                    filterItem,
                    $App.domainInfo.get(entityName).attr(filterItem.property).dataType
                );
                result['x' + (start++)] = filter;
            }
        }
        return result;
    },

    /**
     * Transform operation.sorters to ubRequest orderList
     * @param {Ext.data.Operation} operation
     * @return {Object}
     */
    operationOrder2OrderList: function(operation) {
        var
            len, i,
            result,
            sorters = operation.sorters,
            start = 100;

        if(sorters && (len=sorters.length) > 0) {
            result = {};
            for(i=0; i<len; ++i){
                result['x' + start++] = {
                    expression: sorters[i].property,
                    order: sorters[i].direction === 'ASC' ?  'asc' : 'desc'
                };
            }
        }
        return result;
    }
});