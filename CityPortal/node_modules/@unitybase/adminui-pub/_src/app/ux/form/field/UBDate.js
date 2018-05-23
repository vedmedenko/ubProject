/**
 * UnityBase ext-based Date picker
 * @author Nozhenko I.
 */
Ext.define('UB.ux.form.field.UBDate', {
  extend: 'Ext.form.field.Date',
  alias: 'widget.ubdatefield',
  format: 'd.m.Y',
  labelAlign: 'left',
  fieldCls: 'ub-date-input',
  minWidth: 120,
  startDay: 1,
  // the minimum date value server handle correctly is 1900-01-01
  minValue: new Date(1901, 1, 1),

  validator: function (val) {
    if (!val) {
      return true
    }
    var dateReg = /^\d{2}([.\/\-])\d{2}\1\d{4}$/
    if (val.match(dateReg)) {
      return true
    }
    return ' '
  },

  constructor: function (config) {
    var me = this

    config = config || {}
    if (!config.width) {
      config.width = ((config.fieldLabel) ? config.labelWidth || me.labelWidth || 100 : 0) + 120
    }
    if (config.fieldLabel) {
      me.minWidth = config.width
    }
    me.maxWidth = config.maxWidth || config.width
    me.callParent([config])
  },

  initComponent: function () {
    var me = this
    me.fieldType = me.fieldType || 'DateTime'
    me.callParent(arguments)
  },

  rawToValue: function (rawValue) {
    var dateValue = this.callParent(arguments)

    if (this.fieldType === UBDomain.ubDataTypes.Date && Ext.isDate(dateValue)) {
      dateValue = UB.core.UBUtil.truncTimeToUtcNull(dateValue)
    }
    return dateValue
  }

})
