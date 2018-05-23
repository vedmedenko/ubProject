/**
 * @class Ext.ux.Exporter
 * @author Ed Spencer (http://edspencer.net), with modifications from iwiznia.
 * Class providing a common way of downloading data in .xls or .csv format
 */
//@require ../../../../../file-saver/FileSaver.js
require('./Formatter')
require('./csvFormatter/CsvFormatter')
require('./htmlFormatter/HtmlFormatter')
require('./xlsxFormatter/XlsxFormatter')
Ext.define("Ext.ux.exporter.Exporter", {
    uses: [
        "Ext.ux.exporter.Base64",
        "Ext.ux.exporter.Button",
        "Ext.ux.exporter.csvFormatter.CsvFormatter",
        "Ext.ux.exporter.wikiFormatter.WikiFormatter",
        "Ext.ux.exporter.excelFormatter.ExcelFormatter",
        "Ext.ux.exporter.htmlFormatter.HtmlFormatter",
        "Ext.ux.exporter.xlsxFormatter.XlsxFormatter"
    ],

    statics: {
        exportAny: function(component, formatter, config) {
            var func = "export";
            if(!component.is) {
                func = func + "Store";
            } else if(component.is("gridpanel")) {
                func = func + "Grid";
            } else if (component.is("treepanel")) {
                func = func + "Tree";
            } else {
                func = func + "Store";
                component = component.getStore();
            }

            this[func](component, this.getFormatterByName(formatter), config);
        },

        /**
         * Exports a grid, using the .xls formatter by default
         * @param {Ext.grid.Panel} grid The grid to export from
         * @param {String} formatter
         * @param {Object} config Optional config settings for the formatter
         * @param {Function} callback
         */
        exportGrid: function(grid, formatter, config) {
          config = config || {};
          formatter = this.getFormatterByName(formatter);

          var columns = Ext.Array.filter(grid.columns, function(col) {
              return !col.hidden && !col.disableExport; // && (!col.xtype || col.xtype != "actioncolumn");
          });
          columns = columns.sort(function(a, b){
            return (a.getIndex() < b.getIndex()) ? -1: 1
          })

          Ext.applyIf(config, {
            title  : grid.title,
            columns: columns
          });

            this.doFormat(formatter, grid.store, config );
            //return formatter.format(grid.store, config);
        },

        exportStore: function(store, formatter, config) {
           config = config || {};
           formatter = this.getFormatterByName(formatter);

           Ext.applyIf(config, {
             columns: store.fields ? store.fields.items : store.model.prototype.fields.items
           });

            this.doFormat(formatter, store, config );
           //return formatter.format(store, config);
        },

        /**
         *
         * @param {Object} formatter
         * @param {Object} store
         * @param {Object} config
         * @param {Function} config.callback
         * @param {Object} config.scope
         */
        doFormat: function(formatter, store, config){
            var
                srcCallback = config.callback;
            Ext.getBody().mask(UB.i18n('pleaseWait'));
            config.callback = function(result){
                Ext.getBody().unmask();
                srcCallback.call(config.scope, result);
            };
            if (store.buffered || (store.pageSize && store.pageSize > 0) ){
                var stdata, request, filterItemWhereList,
                    rfields = {}, rawData, entityName;

                entityName = config.entityName;

                request = Ext.apply(Ext.clone(store.ubRequest),{options: {start:0, totalRequired:true}});
                filterItemWhereList = UB.ux.data.proxy.UBProxy.ubFilterToWhereList(store.filters.getRange(), entityName);
                request.whereList = request.whereList || {};
                Ext.Object.merge(request.whereList, filterItemWhereList);

              var sorterItem;
              var start = 100;
              var len;
              if(store.sorters && (len=store.sorters.length) > 0) {
                request.orderList = {};
                for(i = 0; i < len; ++i){
                  sorterItem = store.sorters.get(i)
                  request.orderList['x' + start++] = {
                    expression: sorterItem.property,
                    order: sorterItem.direction === 'ASC' ?  'asc' : 'desc'
                  };
                }
              }


              //request.limit = 65000;
                delete request.limit;

                $App.connection.select(request).done(function(result){
                    //Ext.Array.each( result.resultData.fields , function(fld, index){
                    Ext.Array.each( request.fieldList , function(fld, index){
                        rfields[fld] = index;
                    }, this );
                    rawData = { data: result.resultData.data };
                    rawData.dataFieldsMap = rfields;
                    rawData.isRawData = true;
                    rawData.ubRequest = store.ubRequest;
                    rawData.model = store.model;
                    formatter.format(rawData, config);
                });
            } else {
               formatter.format(store, config);
            }
        },

        exportTree: function(tree, formatter, config) {
          config    = config || {};
          formatter = this.getFormatterByName(formatter);

          var store = tree.store || config.store;

          Ext.applyIf(config, {
            title: tree.title
          });

          this.doFormat(formatter, store, config );

            //return formatter.format(store, config);
        },

        getFormatterByName: function(formatter) {
            formatter = formatter ? formatter : "csv";
            formatter = !Ext.isString(formatter) ? formatter : Ext.create("Ext.ux.exporter." + formatter + "Formatter." + Ext.String.capitalize(formatter) + "Formatter");
            return formatter;
        }
    }
});