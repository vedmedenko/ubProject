/**
 * Файл: UB.ux.UBDetailTreeColumn.js
 */
Ext.define("Ext.ux.exporter.excelFormatter.Worksheet", {

  constructor: function(store, config) {
    config = config || {};

    this.store = store;

    Ext.applyIf(config, {
      hasTitle   : true,
      hasHeadings: true,
      stripeRows : true,

      title      : "Workbook",
      columns    : store.fields == undefined ? {} : store.fields.items
    });

    Ext.apply(this, config);

    Ext.ux.exporter.excelFormatter.Worksheet.superclass.constructor.apply(this, arguments);
  },

  /**
   * @property dateFormatString
   * @type String
   * String used to format dates (defaults to "Y-m-d"). All other data types are left unmolested
   */
  dateFormatString: "Y-m-d",

  worksheetTpl: Ext.create('Ext.XTemplate',
    '<Worksheet ss:Name="{title}">',
      '<Names>',
        '<NamedRange ss:Name="Print_Titles" ss:RefersTo="=\'{title}\'!R1:R2" />',
      '</Names>',
      '<Table x:FullRows="1" x:FullColumns="1" ss:ExpandedColumnCount="{colCount}" ss:ExpandedRowCount="{rowCount}">',
        '{columns}',
        '<Row ss:Height="38">',
            '<Cell ss:StyleID="title" ss:MergeAcross="{colCount - 1}">',
              '<Data xmlns:html="http://www.w3.org/TR/REC-html40" ss:Type="String">',
                '<html:B><html:U><html:Font html:Size="15">{title}',
                '</html:Font></html:U></html:B></Data><NamedCell ss:Name="Print_Titles" />',
            '</Cell>',
        '</Row>',
        '<Row ss:AutoFitHeight="1">',
          '{header}',
        '</Row>',
        '{rows}',
      '</Table>',
      '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">',
        '<PageSetup>',
          '<Layout x:CenterHorizontal="1" x:Orientation="Landscape" />',
          '<Footer x:Data="Page &amp;P of &amp;N" x:Margin="0.5" />',
          '<PageMargins x:Top="0.5" x:Right="0.5" x:Left="0.5" x:Bottom="0.8" />',
        '</PageSetup>',
        '<FitToPage />',
        '<Print>',
          '<PrintErrors>Blank</PrintErrors>',
          '<FitWidth>1</FitWidth>',
          '<FitHeight>32767</FitHeight>',
          '<ValidPrinterInfo />',
          '<VerticalResolution>600</VerticalResolution>',
        '</Print>',
        '<Selected />',
        '<DoNotDisplayGridlines />',
        '<ProtectObjects>False</ProtectObjects>',
        '<ProtectScenarios>False</ProtectScenarios>',
      '</WorksheetOptions>',
    '</Worksheet>'
  ),

  /**
   * Builds the Worksheet XML
   * @param {Ext.data.Store} store The store to build from
   */
  render: function(store) {
    return this.worksheetTpl.apply({
      header  : this.buildHeader(),
      columns : this.buildColumns().join(""),
      rows    : this.buildRows().join(""),
      colCount: this.columns.length,
      rowCount: this.store.getCount() + 2,
      title   : this.title.replace(/[\/\\\?\*\[\]]/g,'-')
    });
  },

  buildColumns: function() {
    var cols = [];

    Ext.each(this.columns, function(column) {
      cols.push(this.buildColumn());
    }, this);

    return cols;
  },

  buildColumn: function(width) {
    return Ext.String.format('<Column ss:AutoFitWidth="1" ss:Width="{0}" />', width || 164);
  },

  buildRows: function() {
    var rows = [];

    this.store.each(function(record, index) {
      rows.push(this.buildRow(record, index));
    }, this);

    return rows;
  },

  buildHeader: function() {
    var cells = [];

    Ext.each(this.columns, function(col) {
      var title;

      //if(col.dataIndex) {
          if (col.text != undefined) {
            title = col.text;
          } else if(col.name) {
            //make columns taken from Record fields (e.g. with a col.name) human-readable
            title = col.name.replace(/_/g, " ");
            title = Ext.String.capitalize(title);
          }

          cells.push(Ext.String.format('<Cell ss:StyleID="headercell"><Data ss:Type="String">{0}</Data><NamedCell ss:Name="Print_Titles" /></Cell>', title));
      //}
    }, this);

    return cells.join("");
  },

  buildRow: function(record, index) {
    var style,
        cells = [];
    if (this.stripeRows === true) style = index % 2 == 0 ? 'even' : 'odd';

    var iCol = 0;
    Ext.each(this.columns, function(col) {
      var name  = col.name || col.dataIndex;

      if(typeof name !== 'undefined') {
          //if given a renderer via a ColumnModel, use it and ensure data type is set to String
          if (_.isFunction(col.renderer)) {
            var value = col.renderer(record.get(name), {}, record, index, iCol++, this.store),
                type = "String";
          } else {
            var value = record.get(name),
                type  = this.typeMappings[col.type || record.fields.get(name).type.type];
          }

          cells.push(this.buildCell(value, type, style).render());
      }
    }, this);

    return Ext.String.format("<Row>{0}</Row>", cells.join(""));
  },

  buildCell: function(value, type, style) {
    if (type === 'DateTime' && _.isFunction(value.format)) value = value.format(this.dateFormatString);

    return Ext.create('Ext.ux.exporter.excelFormatter.Cell',{
      value: value,
      type : type,
      style: style
    });
  },

  /**
   * @property typeMappings
   * @type Object
   * Mappings from Ext.data.Record types to Excel types
   */
  typeMappings: {
    'int'   : "Number",
    'string': "String",
    'float' : "Number",
    'date'  : "DateTime"
  }
});