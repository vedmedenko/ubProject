require('../../../../ux/form/DateTimeField')
/**
 * UnityBase ext-based DateTime picker
 */
Ext.define('UB.ux.form.field.UBDateTime', {
  extend: 'Ext.ux.form.DateTimeField',
  alias: 'widget.ubdatetimefield',
  minWidth: 160,
  showToday: false,
  // the minimum date value server handle correctly is 1900-01-01
  minValue: new Date(1901, 1, 1),
  constructor: function (config) {
    var me = this

    config = config || {}
    if (!config.width) {
      config.width = ((config.fieldLabel) ? config.labelWidth || me.labelWidth || 100 : 0) + 160
    }
    if (config.fieldLabel) {
      me.minWidth = config.width
    }
    me.maxWidth = config.maxWidth || config.width
    me.callParent([config])
  }

})

// Patch for date picker. User get exception message when picker opened and button TAB pressed.
Ext.override(Ext.picker.Date, {
  handleTabClick: function (e) {
    var me = this,
      t = me.getSelectedDate(me.activeDate),
      handler = me.handler

    // The following code is like handleDateClick without the e.stopEvent()
    // xmax add check "&& t"
    if (!me.disabled && t && t.dateValue && !Ext.fly(t.parentNode).hasCls(me.disabledCellCls)) {
      me.doCancelFocus = me.focusOnSelect === false
      me.setValue(new Date(t.dateValue))
      delete me.doCancelFocus
      me.fireEvent('select', me, me.value)
      if (handler) {
        handler.call(me.scope || me, me, me.value)
      }
      me.onSelect()
    }
  }
})
