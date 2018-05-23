/**
 * @class Ext.ux.Exporter.CSVFormatter
 * @extends Ext.ux.Exporter.Formatter
 * Specialised Format class for outputting .csv files
 */
Ext.define("Ext.ux.exporter.csvFormatter.CsvFormatter", {
    extend: "Ext.ux.exporter.Formatter",
    
    /**
     * @cfg {String} contentType The content type to use. Defaults to 'data:text/csv;base64,'
     */
    contentType: 'data:text/csv;base64,',
    
    /**
     * @cfg {String} separator The separator to use. Defaults to ';'
     */
    separator: ",",

    /**
     * @cfg {String} extension The extension to use. Defaults to 'csv'
     */
    extension: "csv",
    
    /**
     * @cfg {String} lineSeparator The line separator to use. Defaults to "\n"
     */
    lineSeparator: "\n",
    
    /**
     * @cfg {Boolean} capitalizeHeaders Capitalizes the header fields. Defaults to false
     */
    capitalizeHeaders: false,

    /**
     * Formats the store to the CSV format. 
     * @param store The store to export
     * @param config {Object} [config] Config object. Contains the "columns" property, which is an array of field names.
     */
    format: function(store, config) {
        var result;
        this.columns = config.columns || (store.fields ? store.fields.items : store.model.prototype.fields.items);
        this.entityName = config.entityName;
        this.eAttributes = {};
        Ext.each(config.columns, function(field, index) {
            this.eAttributes[field.dataIndex] = $App.domainInfo.get(this.entityName).getEntityAttribute( field.dataIndex );
        }, this);

        result = this.getHeaders() + this.lineSeparator + this.getRows(store);
        config.callback.call(config.scope, result);

    },
    
    /**
     * Returns the headers for the specific store.
     * 
     * @param {Object} store The store to process
     * @returns {String} The header line
     */
    getHeaders: function(store) {
        var columns = [];
        
        Ext.each(this.columns, function(col) {
          var title;
          if (col.text != undefined) {
            title = col.text;
          } else if(col.name) {
            title = col.name.replace(/_/g, " ");
          } else {
        	  title = "";
          }
          
          if (this.capitalizeHeaders) {
        	  title = Ext.String.capitalize(title);        	  
          }

          columns.push(title);
        }, this);

        return columns.join(this.separator);
    },
    /**
     * Returns all rows for the store
     * 
     * @param {Object} store The store to use
     * @returns {String}
     */
    getRows: function(store) {
        var rows = [];
        if (store.isRawData ){
            Ext.Array.each(store.data,
                function(fdata, index){
                    rows.push(this.getCells(fdata, index, store));
                },this);
        }
        else {
            store.each(function(record, index) {
              rows.push(this.getCells(record, index, store));
            }, this);
        }

        return rows.join(this.lineSeparator);
    },
    /**
     * Returns the cells for a specific row
     * @param {Object} record The record
     * @param {Integer} index
     * @param {Object} store
     * @returns {String} The cells of the record
     */
    getCells: function(record, index, store) {
        var cells = [], me= this;

        Ext.each(this.columns, function(col, iCol) {
            var value, name = col.name || col.dataIndex;
            if(!name){
                return true;
            }
            if (store.isRawData){
                value = record[ store.dataFieldsMap[col.dataIndex]];
                switch (me.eAttributes[col.dataIndex].dataType){
                    case UBDomain.ubDataTypes.Date:
                    case UBDomain.ubDataTypes.DateTime: value = new Date(value); break;
                    case UBDomain.ubDataTypes.Float:
                    case UBDomain.ubDataTypes.Currency: value = parseFloat(value); break;
                    case UBDomain.ubDataTypes.Int: value = parseInt(value,10); break;
                }
            } else {
                value = record.get(name);
            }
            if (_.isFunction(col.renderer)){
                value = col.renderer(value); // , {}, record, index, iCol, record.store
                value = Ext.String.htmlDecode(value);
            }

            value = '"' + value + '"';
            cells.push(value);
        });

        return cells.join(this.separator);
    }
});