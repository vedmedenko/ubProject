/**
 * Number field indicating left meaningless zeros
 */
Ext.define('Ext.ux.form.field.PadNumber', {
    extend:'Ext.form.field.Number',
    alias: 'widget.padnumberfield',

    /**
     * Padding symbol. Default '0'
     */
    padSymbol: '0',
    /**
     * Required length. Default 2
     */
    padLength: 2,

    rawToValue: function(rawValue) {
        var value = this.callParent(arguments);
        if (value === null) {
           value = 0;
        }
        return  parseFloat(value);
    },

    padLeft: function(nr, n, str){
       return Array(n-String(nr).length+1).join(str||'0')+nr;
    },

    valueToRaw: function(value) {
        var val = this.callParent(arguments);
        return this.padLeft(val, this.padLength, this.padSymbol);
    }


});
