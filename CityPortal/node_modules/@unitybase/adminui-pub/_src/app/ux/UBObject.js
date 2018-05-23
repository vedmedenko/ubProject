/**
 * Файл: UB.ux.UBObject.js
 * Автор: Игорь Ноженко
 *
 * Расширение Ext.Component для отображения документа
 */

Ext.define('UB.ux.UBObject', {
    extend: 'Ext.Component',
    alias: 'widget.ubobject',
    type: '',
    width: '100%',
    height: '100%',


    getElConfig: function () {
        var
            config = this.callParent(),
            obj;

        if(this.autoEl === 'object'){
            obj = config;
        } else {
            config.cn = [obj = {
                tag: 'object',
                id: this.id + '-object'
            }];
        }


        obj.type = this.type;
        obj.data = this.data;

        obj.width = this.width;
        obj.height = this.height;

        return config;
    },

    onRender: function () {
        var
            el;

        this.callParent(arguments);

        el = this.el;
        this.objEl = (this.autoEl === 'object') ? el : el.getById(this.id + '-object');
    },

    onDestroy: function () {
        Ext.destroy(this.objEl);
        this.objEl = null;
        this.callParent();
    },


    /**
      * @param cfg
     * @returns {Promise}
     */
    setSrc: function (cfg) {
        var
            objEl = this.objEl;

        this.type = cfg.contentType;
        this.data = cfg.url + (this.forceMIME ? '&forceMIME=' + encodeURIComponent(this.forceMIME) : '');

        if (objEl) {
            objEl.dom.type = this.type;
            objEl.dom.data = this.data;
        }
        return Q.resolve(true);
    },
    // {width: "100%", height: "100%"}
    setXSize: function (prm) {
        this.width = prm.width;
        this.height = prm.height;
        if (this.objEl) {
            this.objEl.dom.width = '100%';//this.width;
            this.objEl.dom.height = '100%';//this.height;
        }
    }
});
