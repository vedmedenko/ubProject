/**
 * @class Ext.ux.Exporter.HTMLFormatter
 * @extends Ext.ux.Exporter.Formatter
 * Specialised Format class for outputting .html files
 */
Ext.define("Ext.ux.exporter.htmlFormatter.HtmlFormatter", {
    extend: "Ext.ux.exporter.Formatter",
    /**
     * @cfg {String} contentType The content type to use. Defaults to 'data:text/html;base64,'
     */
    contentType: 'data:text/Html;base64,',
    /**
     * @cfg {String} separator The separator to use. Defaults to ';'
     */
    separator: "",
    /**
     * @cfg {String} extension The extension to use. Defaults to 'html'
     */
    extension: "html",
    /**
     * @cfg {String} lineSeparator The line separator to use. Defaults to "\n"
     */
    lineSeparator: "<br>",
    lineSeparator1: "</tr><tr>",
    startHtml: "<!DOCTYPE html><html><head><meta charset='utf-8'><title></title></head><style>.TD:hover{background: lightblue;color: #000000;}" +
        "caption{text-align: center;font-size: 22px;font-weight: bolder;font-style: italic}td{border: 1px solid black; font-size: 14px}" +
        "table{border: 2px double black;border-collapse: collapse;}</style><body><table style='width:",
    startCaption:"px'><caption>",
    endCaption:'</caption>',
    end:"</table></body></html>",
    /**
     * @cfg {Boolean} capitalizeHeaders Capitalizes the header fields. Defaults to false
     */
    capitalizeHeaders: false,
    /**
     * Formats the store to the HTML format.
     * @param store The store to export
     * @param config {Object} [config] Config object. Contains the "columns" property, which is an array of field names.
     */
    format: function(store, config){
        var result, entity;
        this.columns = config.columns || (store.fields ? store.fields.items : store.model.prototype.fields.items);
        this.entityName = config.entityName;
        entity = $App.domainInfo.get(this.entityName);
        this.eAttributes = {};
        Ext.each(config.columns, function(field, index) {
            this.eAttributes[field.dataIndex] = entity.getEntityAttribute(field.dataIndex );
        }, this);

        result =  this.startHtml+this.styleGridTable() + this.startCaption + this.gridTitleHtml(config) +
            this.endCaption+this.extHtml() + this.getRows(store)+this.end;
        config.callback.call(config.scope, result);
    },

    extHtml: function(){
        var tpl =new Ext.XTemplate(
            '<tr>',
            '<tpl for=".">',
            '<td style=" width:{width}px; text-align: center; font-weight: bold;font-size: 18px; background: lightblue ">{text}</td>',
            '</tpl>',
            '</tr>',
            '<tr>');
        return  tpl.apply(this.columns);
    },

    gridTitleHtml: function(config){
        var title = [];
        title.push(config.title);
        return title.join(this.separator);
    },

    getHeaders: function() {
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

    styleGridTable: function(){
        var styleHt = [];
        var panelWidth=0;
        Ext.each(this.columns, function(col) {
            var width;
           if (col.width != undefined) {
                width = col.width;
            } else if(col.width) {
                width = col.width.replace(/_/g, " ");

            } else {
                width = '';
            }
            if (this.capitalizeHeaders) {
                width = Ext.String.capitalize(width);
            }
            styleHt.push(width);
            panelWidth=panelWidth+width;
        }, this);

        return panelWidth;
    },

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

        return rows.join(this.lineSeparator1);
    },

    /**
     * Returns the cells for a specific row
     * @param {Object} record The record
     * @param {Integer} index
     * @param {Object} store
     * @returns {String} The cells of the record
     */
    getCells: function(record, index, store) {
        var me = this, cells = [];
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
            }

            value = '<td class="TD">' + (value || '') + '</td>';
            cells.push(value);
        });

        return cells.join(this.separator);
    }

});
