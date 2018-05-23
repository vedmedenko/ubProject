/**
 * Container for detail tree grid.
 * TODO - remove this class
 * @deprecated UB 1.7
 * @author UnityBase core team
 */
Ext.define('UB.ux.UBDetailTreeGrid', {
    extend: 'Ext.container.Container',
    alias: 'widget.ubdetailtreegrid',
    border: false,
    uses: [
        'UB.core.UBApp',
        'UB.core.UBCommand'
    ],

    layout: 'fit',

    initComponent: function() {
        this.callParent(arguments);
    },

    /**
     * 
     * @param {Ext.data.Model} record
     */
    setValue: function(record) {
        var
            cmdConfig = {
            cmdCode: this.cmdCode,
            createOnly: true,
            scope: this,
            callback: this.onTreeGridCreate
        };

        //TODO = MPV - похоже нигд ене используется :(
//        if(this.masterFields && this.detailFields)
//            cmdConfig.additionalWhereList = UB.core.UBCommand.createAdditionalWhereList(this.masterFields, this.detailFields, record);

        if(this.columns)
            cmdConfig.columns = this.columns;

        if(this.items && this.items.length > 0)
            this.removeAll();

        UB.core.UBApp.doCommand(cmdConfig);
    },

    /**
     * 
     * @param {Ext.tree.Panel} treegrid
     */
    onTreeGridCreate: function(treegrid) {
        this.add(treegrid)
    }
});