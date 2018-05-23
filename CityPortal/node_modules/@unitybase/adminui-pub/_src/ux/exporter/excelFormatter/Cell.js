/**
 * @class Ext.ux.Exporter.ExcelFormatter.Cell
 * @extends Object
 * Represents a single cell in a worksheet
 */

Ext.define("Ext.ux.exporter.excelFormatter.Cell", {
    constructor: function(config) {
        Ext.applyIf(config, {
          type: "String"
        });

        Ext.apply(this, config);

        Ext.ux.exporter.excelFormatter.Cell.superclass.constructor.apply(this, arguments);
    },

    render: function() {
        return this.tpl.apply(this);
    },

    tpl: Ext.create('Ext.XTemplate',
        '<Cell ss:StyleID="{style}">',
          '<Data ss:Type="{type}">{value}</Data>',
        '</Cell>'
    )
});
