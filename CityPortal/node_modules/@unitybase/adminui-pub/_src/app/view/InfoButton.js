require('../core/UBUtil')
require('./BaseWindow')
/**
 * Button to show quick information in modal form.
 */
Ext.define('UB.view.InfoButton', {
    extend : 'Ext.button.Button',
    alias: 'widget.ubinfobutton',
    // requires: [
    //     'UB.core.UBUtil',
    //     'UB.view.BaseWindow'
    // ],

    initComponent: function(){
        var me = this;
        /**
         * @cfg [information] Information text. It will be translated by  {@link UB.i18n}.
         * @type {String}
         */
        /**
         * @cfg [description]  It will be translated by  {@link UB.i18n}.
         * @type {String}
         */
        /**
         * @cfg [winHeight] By default 300.
         * @type {Integer}
         */
        /**
         * @cfg [winWidth]  By default 400.
         * @type {Integer}
         */

        me.text = '';
        me.border = false;
        me.margin = 3;
        me.padding = 1;
        //me.style = {color: me.glyphColor + ' !important;' || 'blue !important'};
        me.glyph = UB.core.UBUtil.glyphs.faQuestionCircle;
        me.tooltip = UB.i18n('informationHeader');
        me.on('click', me.buttonQuestionClick, me);
        me.callParent(arguments);
    },

    buttonQuestionClick: function(){
        var me = this, win;
        win = Ext.create('UB.view.BaseWindow', {
            title: me.description ? UB.i18n(me.description) : UB.i18n('informationHeader'),
            header: {
                items: [{
                    xtype: 'image',
                    glyph: UB.core.UBUtil.glyphs.faQuestionCircle,
                    style: {color: 'blue'}
                }]
            },
            height: me.winHeight || 300,
            width: me.winWidth || 400,
            closable: true,
            minimizable: false,
            maximizable: false,
            modal: true,
            stateful: true,
            html: UB.i18n(me.information),
            buttons: [{
                text: UB.i18n('ok'),
                glyph: UB.core.UBUtil.glyphs.faCheck,
                handler: function() {
                    win.close();
                }
            }]
        });

        win.show();

    }

});