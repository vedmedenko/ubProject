exports.formCode = {
  initUBComponent: function() {
    var me = this;
    me.getField('reqDate').setValue(new Date());
    me.getField('reqDate').readOnly = true;
    me.getField('department').addListener('change', me.onDepartChanged, me);
  },
  
  onDepartChanged: function () {
  var me = this;
  var subDepartField = me.getField('subDepartment');

  subDepartField.setValue(null);
  subDepartField.getStore().filter(new Ext.util.Filter({
    id: 'toDocumentIDFilter',
    property: 'department',
    exactMatch: true,
    value: me.getField('department').getValue()
  }));
  subDepartFieldCombo = this.getUBCmp('attrSubDepartment');
}
}
