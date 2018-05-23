require('./UBAppConfig')
require('./UBStoreManager')

/**
 * Файл: UB.core.UBEnumManager.js
 */
Ext.define('UB.core.UBEnumManager', {
    singleton: true,

    // requires: [
    //     'UB.core.UBAppConfig',
    //     'UB.core.UBStoreManager'
    // ],

    uses: [
    ],



    /**
     *
     * @param {String} eGroup
     * @return {Ext.data.ArrayStore}
     */
    getArrayStore: function(eGroup) {
        var
            storeId = UB.core.UBUtil.getNameMd5('ubm_enum', eGroup),
            store, //store = Ext.data.StoreManager.lookup(storeId),
            modelName = UB.ux.data.UBStore.entityModelName(storeId);

        if(!Ext.ModelManager.getModel(modelName)){
            Ext.define(modelName, {
                extend: 'Ext.data.Model',
                idProperty: 'code',
                fields: [
                    'code',
                    'name',
                    'shortName',
                    'sortOrder'
                ]
            });
        }
        store = Ext.create('Ext.data.ArrayStore', {
            //storeId: storeId,
            model: modelName,
            autoDestroy:true,
            data: this.getGroupData(eGroup)
        });

        store.sort('sortOrder');

        return store;
    },


    /**
     *
     * @param {String} eGroup
     * @param {String} field
     * @return {Object}
     */
    getDictionary: function(eGroup, field){
        var
            data = {},
            store = UB.core.UBStoreManager.getEnumStore();

        store.each(function(item) {
            if(item.get('eGroup') === eGroup){
                data[item.get('code')] =  item.get(field || 'name');
            }
        });

        return data;
    },


    /**
     *
     * @param {String} eGroup
     * @return {Ext.data.ArrayStore}
     */
    getStore: function(eGroup) {
        return this.getArrayStore(eGroup);
    },


    /**
     *
     * @param {String} eGroup
     * @param {Object} options Config object for UB.ux.data.UBStore
     * @return {UB.ux.data.UBStore}
     */
    getUBStore: function(eGroup, options) {
        var store = Ext.create('UB.ux.data.UBStore', _.defaults(options || {}, {
            ubRequest: {
                entity: 'ubm_enum',
                method: UB.core.UBCommand.methodName.SELECT,
                fieldList: ['eGroup','code','name','shortName','sortOrder'],
                whereList: {eGroup: {
                    expression: '[eGroup]',
                    condition: 'equal',
                    values: {eGroup: eGroup }
                }},
                orderList: {byName: {expression: "name", order: "asc"}}
            },
            autoLoad: false,
            autoDestroy: true,
            disablePaging: true,
            idProperty: 'code'
        }));
        store.load();
        return store;
    },


    /**
     *
     * @param {String} eGroup
     * @return {Array}
     */
    getGroupData: function(eGroup) {
        var
            data = [],
            store = UB.core.UBStoreManager.getEnumStore();

        store.each(function(item) {
            if(item.get('eGroup') === eGroup){
                data.push([
                    item.get('code'),
                    item.get('name'),
                    item.get('shortName'),
                    item.get('sortOrder')
                ]);
            }
        });

        return data;
    },

    /**
     *
     * @param {String} eGroup
     * @param {String} value
     * @return {Ext.data.Model}
     */
    getById: function(eGroup, value) {
        var
            store = UB.core.UBEnumManager.getStore(eGroup);

        return store.getById(value);
    }
});