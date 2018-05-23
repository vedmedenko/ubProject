require('../DateTimePicker')

Ext.define('Ext.ux.form.DateTimeField', {
      extend: 'Ext.form.field.Date',
      alias: 'widget.datetimefield',
      requires: ['Ext.ux.DateTimePicker'],

    /**
     * @cfg {Date|function|string} defaultTime
     * When is string then time separated ':'. Example:  '12:20' or '12:31:34'
     * When is Date object then from this object get Hours, Minutes, Seconds
     * Function first parameter is this and second parameter date
     */

    /**
     * @cfg {Boolean} useSeconds
     * by default false.
     */

      initComponent: function() {
          this.format = this.format + ' ' + (this.useSeconds ? 'H:i:s': 'H:i');
          this.callParent();
      },
      // overwrite
      createPicker: function() {
          var me = this,
              format = Ext.String.format;
          return Ext.create('Ext.ux.DateTimePicker', {
                ownerCt: me.ownerCt,
                useSeconds: me.useSeconds,
                renderTo: document.body,
                floating: true,
                hidden: true,
                focusOnShow: true,
                minDate: me.minValue,
                maxDate: me.maxValue,
                disabledDatesRE: me.disabledDatesRE,
                disabledDatesText: me.disabledDatesText,
                disabledDays: me.disabledDays,
                disabledDaysText: me.disabledDaysText,
                format: me.format,
                showToday: me.showToday,
                minText: format(me.minText, me.formatDate(me.minValue)),
                maxText: format(me.maxText, me.formatDate(me.maxValue)),
                listeners: {
                    scope: me,
                    select: me.onSelect
                },
                keyNavConfig: {
                    esc: function() {
                        me.collapse();
                    }
                }
            });
      },

    /**
     * override to set default time
     */
    onExpand: function() {
        var me = this, value = this.getValue();
        if (!value && me.defaultTime ){
            value = new Date();
            if (typeof(me.defaultTime) === 'string'){
                var items = me.defaultTime.split(':');

                value.setHours( parseInt(items[0], 10));
                value.setMinutes( parseInt(items[1], 10));
                if (items.length > 2){
                    value.setMilliseconds( parseInt(items[2], 10));
                }
            } else if (typeof(me.defaultTime) === 'function'){
                me.defaultTime( me, value );
            } else {
                value.setHours( me.defaultTime.getHours() );
                value.setMinutes( me.defaultTime.getMinutes() );
                value.setMilliseconds( me.defaultTime.getMilliseconds() );
            }
        }
        this.picker.setValue(Ext.isDate(value) ? value : new Date());
    }

  });