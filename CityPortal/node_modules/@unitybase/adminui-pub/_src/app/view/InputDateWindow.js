/**
 * Файл: UB.view.InputDateWindow.js
 * Автор: Игорь Ноженко
 * 
 * Расширение Ext.window.Window
 * 
 * Реализует функционал для выбора даты
 */

Ext.define('UB.view.InputDateWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.inputdatewindow',

    padding: 1,
    autoShow: true,
    autoDestroy: true,
    closable: false,
    border: 0,
    layout: "fit",
    modal: true,
    initComponent: function() {
        var
            me = this,
            fieldDate = Ext.create('Ext.form.field.Date', {
                allowBlank: false,
                blankText: UB.i18n('obazatelnoePole'),
                fieldLabel: UB.i18n('aktualnoS'),
                anchor: '100%',
                value: new Date(),
                listeners: {
                    scope: me,
                    specialkey: function(field, e, eOpts) {
                        switch(e.getKey()) {
                            case e.ENTER:
                                me.onButtonClick();
                                break;
                            case e.ESC:
                                me.close();
                                break;
                        }
                    }
                }
            }),
            form = Ext.create('Ext.form.Panel', {
                frame: true,
                items: [fieldDate]
            });

        Ext.apply(me, {
            title: UB.i18n('aktualnoS'),
            defaultFocus: fieldDate,
            items: [form],
            fieldDate: fieldDate,
            buttons: [{
                text: Ext.MessageBox.buttonText.ok,
                scope: me,
                handler: me.onButtonClick
            }, {
                text: Ext.MessageBox.buttonText.cancel,
                scope: me,
                handler: me.close
            }]
        });

        me.callParent(arguments);
    },

    onButtonClick: function(btn, e) {
        var
            me = this,
            date = me.fieldDate.getValue();

        Ext.callback(me.callback, me.callback, [date]);
        me.close();
    }
});
