/*global UB, Ext */
exports.formCode = {
    initUBComponent: function () {
    },
    onSave: function(action) {
        var
            me = this,
			diagramName = me.record.get('name');

		if (!me.isEditMode) {
            me.record.set('document', "{\"store\":\"mdb\",\"fName\":\"" + diagramName + ".xml\",\"origName\":\"" + diagramName + "\",\"ct\":\"application/xml\",\"size\":0,\"isDirty\":true}");
        }    
        this.callParent([action]);
    }
}