/**
 * Файл: UB.ux.data.reader.UBArray.js
 * Автор: Игорь Ноженко
 * 
 * Reader
 * 
 * Читает данные
 * Обеспечивает добавление служебных полей в модель
 * Устанавливает totalRecCount в proxy для обеспечения paging'а
 */

Ext.define("UB.ux.data.reader.UBArray", {
    extend: "Ext.data.reader.Array",
    alias: "reader.ubarray",

    /**
     * TODO - this actually need only for __totalRecCount support. Remove in future
     * @override
     * @param data
     * @returns {*}
     */
    readRecords: function (data) {
        var
            _data_;

        if(!Ext.isDefined(this.proxy.totalRecCount) && Ext.isDefined(data.__totalRecCount)) {
            this.proxy.totalRecCount = data.__totalRecCount;
        }

        _data_ = {
            data: data.data,
            total: this.proxy.totalRecCount
        };

        return this.callParent([_data_]);
    }
});