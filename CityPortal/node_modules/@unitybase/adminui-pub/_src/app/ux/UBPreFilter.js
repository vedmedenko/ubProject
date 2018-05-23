require('../core/UBStoreManager')
require('../core/UBUtil')
require('../view/BaseWindow')
/**
 * Prefatory data filter for "showList" command. If used in navigation shortcut for `showList` command type will display pre-filtration form before the grid is display.
 *
 * In case filter is configured in navigation shortcut definition you can pass either
 *
 * `autoFilter: true` - in this case all entity attributes will be used in filtration form
 *
 * or config `autoFilter: config.options`, there `config.options` is the same as in constructor:
 *
 *  autoFilter = {
        groups: [{caption: "Limits", fields: ["code", "name", "objType", "objStatus", "docKindID"]}],
        params: {
            code: {filterType: 'startWith'},
            docKindID: {
                whereList: {
                    entity: {
                        expression: '[entity]',
                        condition: 'equal',
                        values: {'entity': 'doc_incdoc'}
                    }
                },
                fieldList: ["name", "entity"],
                __allowSelectSafeDeleted: true,
                __mip_recordhistory_all: true
            }
        }
    },
 *
 * WARNING: This class is used by DOC model (doc_document-search-fm.def)
 */
Ext.define('UB.ux.UBPreFilter', {
    // requires: [
    //     'UB.core.UBStoreManager',
    //     'UB.core.UBUtil',
    //     'UB.view.BaseWindow'
    // ],

    uses: [
        'UB.view.ErrorWindow',
        'UB.view.BasePanel'
    ],

    statics: {
        basePrefix: 'pre_',
        storeKeyPrefix: 'admin:ub:filterLastConfig:',
        /**
         * Static method - just call UB.ux.UBPreFilter constructor with specified config
         * @inheritDoc UB.ux.UBPreFilter.constructor
         * @inheritdoc UB.ux.UBPreFilter.constructor
         */
        makeFilters: function(config){
           return Ext.create('UB.ux.UBPreFilter', config);
        }
    },

    isPreFilter: true,
    /**
     * Create filter panel with specified configuration.
     *
     * In case filter is configured in navigation shortcut definition you can pass either `autoFilter: true` or `autoFilter: config.options` as configuration.
     * See shortcut configuration sample in the head of this article.
     *
     * @param {Object} config
     * @param {String} config.entityCode
     * @param {Array} [config.filters]  (optional) base filters
     * @param {String} [config.configName] (optional) filter name
     * @param {Function} [config.onFilterReady] (optional) callback
     * @param {Function} [config.onCancel] (optional) callback
     * @param {Object} [config.scope] (optional)
     * @param {Object} [config.options] (optional) settings
     * @param {String} [config.options.code] (optional) same as config.configName
     * @param {Array} [config.options.groups] (optional) array of group settings [{"caption": "group caption", fields: ["field1","field2"]}]
     * @param {Object} [config.options.params] (optional)
     *  detail filter settings "params": {"regDate": { "filterType": 'current_week', description: 'description' }}
     *  The options:
     *    filterType - initial filter type
     *    caption - custom filter caption
     *    whereList - for entity
     *    fieldList - for entity
     *    orderList - for entity
     * @param {Boolean} config.options.enableFts (optional) by default true
     * @param {Boolean} config.customForm (optional) true - to open a custom form
     * @param {Object} config.customView (optional) true - to custom view
     * @param {function} config.options.componentsReady (optional) Callback function for customize filter.
     * Income parameters:
     *   filters - associative massive where key {String}- entity attribute code, value - panel config that contains controls in items
     *   0 - label
     *   1 - combobox for select filter type
     *   2 and more - filter controls
     *   all controls are created
     */
    constructor: function(config){
        var me = this;
        me.filters = config.filters;
        me.entityCode = config.entityCode;
        me.onFilterReady = config.onFilterReady;
        me.onCancel = config.onCancel;
        me.store = config.store;
        me.scope = config.scope;
        me.options = config.options || {};
        me.configName = config.configName || me.options.code || me.entityCode;
        me.initParams =  me.options.params || {};

        me.customForm = config.customForm;
        me.customView = config.customView;
        me.enableFts = me.options.enableFts !== false;

        me.filterPrefix = me.store && me.store.filterFormId ? me.store.filterFormId : UB.ux.UBPreFilter.basePrefix + Ext.id();
        me.controls = {};
        me.filtersFunc = {};

        me.resultFilters = {};
        if (!Ext.isEmpty(me.filters) && Ext.isArray(me.filters)){
            Ext.Array.each(me.filters, function(filter){
                var ftr = me.resultFilters[filter.property];
                if (ftr){
                    ftr = [ftr,filter];
                } else {
                    ftr = filter;
                }
                me.resultFilters[filter.property] = ftr;
            });
        }
        if (!me.customForm) {
            me.createFilterForm();
            me.filterWin.show();

            // perform search action on Enter keydown
            me.filterWin.down('form').getEl().on('keydown', function(e) {
                if (e.getKey() === Ext.EventObject.ENTER) {
                    me.searchHandler();
                }
            });
        }
    },

    /**
     * Apply filters
     */
    updateStoreFilters: function(){
        var me = this, filters = [];
        if (!me.store) {return;}
        me.store.filterFormId = me.filterPrefix;
        me.store.filters.each(function(filter){
            if (filter.id.substr(0,4) === UB.ux.UBPreFilter.basePrefix){
                filters.push(filter);
            }
        });
        Ext.Array.each(filters, function(filter){
            me.store.filters.removeAtKey(filter.id);
        });

        if (me.filters.length > 0){
            me.store.filter(me.filters);
        } else {
            me.store.clearFilter();
        }

    },

    /**
     * Delete selected config
     */
    deleteConfig: function(){
        var me = this, configName;
        configName = me.configBox.getRawValue();

        if (Ext.isEmpty(configName)){
            $App.dialogError('doNotSelectedConfigName');
            return;
        }
        $App.dialogYesNo('attention', 'deleteConfirm').done(function(result){
            if (result){
                me.deleteSettings(configName, function(){
                    me.configBox.clearValue();
                    me.refreshConfig();
                });
            }
        });
    },

    /**
     * Save new config or update exists
     */
    saveConfig: function(){
        var me = this, configName, resItm = {}, data;

        configName = me.configBox.getRawValue();

        if (Ext.isEmpty(configName)){
            $App.dialogError('doNotSelectedConfigName');
            return;
        }

        Ext.Object.each(me.controls, function(attrName, controls){
               var valuesAttr = {};
               Ext.Object.each(controls, function(controlName, control){
                      valuesAttr[controlName] = control.getValue();
               }, me);
               resItm[attrName] = valuesAttr;
        },me);

        data = JSON.stringify(resItm);
        me.saveSettings( configName, data, false).done(function(){
            localStorage.setItem(UB.ux.UBPreFilter.storeKeyPrefix + me.configName, configName);
            me.refreshConfig();
        });
    },

    getInitParam: function(attrName){
        return this.initParams ? this.initParams[attrName]: null; //!this.store ? this.initParams[attrName] : null;
    },

    setInitParams: function(){
        var me = this;
        Ext.Object.each(me.controls, function(attrName, controls){
            Ext.Object.each(controls, function(controlName, control){
                if (controlName === 'filterType'){
                    var defKey, initPrm = me.initParams[attrName];
                    if (initPrm && initPrm.filterType ){
                        defKey = initPrm.filterType;
                    }
                    if (defKey){
                        control.setValue(defKey);
                    }
                }
            }, me);
        },me);
    },

    clearAllFilter: function(){
        var me = this, predefinedFilters = UB.ux.Multifilter.predefinedFilters;
        Ext.Object.each(me.controls, function(attrName, controls){
            Ext.Object.each(controls, function(controlName, control){
                if (controlName !== 'filterType'){
                   if (control.clearValue){
                       control.clearValue();
                   }
                   control.setValue(null);
                   if (control.filterEmptyValue){
                       control.setValue(control.filterEmptyValue);
                   }
                } else {
                   var defKey, initPrm = me.initParams[attrName];
                   if (initPrm && initPrm.filterType ){
                       defKey = initPrm.filterType;
                   }
                   if (!defKey){
                       defKey = predefinedFilters[control.getValue()];
                   }
                   if (defKey){
                       control.setValue(defKey);
                   }
                }
            }, me);
        },me);
    },

    doLoadConfig: function(onError, onErrorPrm){
        var me = this, vForm = me.filterWin.down('form');
        if (vForm.isDirty() ){
            $App.dialogYesNo('attention', 'filterWasChangedConfirm').done(function(result){
                if (result){
                    me.loadConfig();
                } else {
                    if (onError){
                      onError.call(me, onErrorPrm);
                    }
                }
            });
        } else {
            me.loadConfig();
        }
    },


    loadConfig: function(){
        var me = this, configName, setControlValue;

        configName = me.configBox.getRawValue();

        if (Ext.isEmpty(configName)){
            $App.dialogError('doNotSelectedConfigName');
            return;
        }
        setControlValue = function(control, value){
            if (Ext.isEmpty(value)){
                if (control.clearValue){
                    control.clearValue();
                }
                control.setValue(null);
            } else {
                if (control.setValueById){
                    control.setValueById(value);
                } else {
                    try {
                        if (control.fieldType === "DateTime" && Ext.isString(value)){
                            value = new Date(value);
                        }
                        control.setValue(value);
                    } catch(err) {
                        control.clearValue();
                    }
                }
            }
            if (control && control.resetOriginalValue){
                control.resetOriginalValue();
            }
        };
        me.loadSettings(configName).done(function(store){
            var record;
            if (store.getCount() !== 0){
                record = store.getAt(0);
                var resControls = JSON.parse(record.get('filter'));
                if (Ext.isObject(resControls)){
                    me.clearAllFilter();
                    Ext.Object.each(resControls, function(attrName, controls){

                        var attrControls = me.controls[attrName];
                        if (attrControls){
                            // first loads the control's 'filterType'
                            if (controls.filterType && attrControls.filterType){
                                    setControlValue(attrControls.filterType, controls.filterType);
                            }
                            Ext.Object.each(controls, function(controlName, controlValue){
                                if (controlName !== 'filterType'){
                                    var control = attrControls[controlName];
                                    if (control){
                                       setControlValue(control, controlValue);
                                    }
                                }
                            }, me);
                        } else {
                            UB.logError('!!!! filter not found for attribute ' + me.entityCode + '.' + attrName + ' in filter ' + me.configName );
                        }

                    },me);
                    localStorage.setItem(UB.ux.UBPreFilter.storeKeyPrefix + me.configName, configName);
                }
            }
        });
    },

    /**
     * if key is null load all settings for this filter
     * @param {String} [key] (optional) if is empty load all
     * @returns {Promise}
     */
    loadSettings: function( key ){
        var
             me = this, repo;

        repo = UB.Repository('ubs_filter').attrs(['ID','code','name','filter','isGlobal','owner','mi_modifyDate'])
            .where('code', '=', me.configName);

        if (key){
            repo = repo.where('name', '=', key);
        }
        return repo.selectAsStore();
    },

    /**
     * saveSettings
     * @param {String} key config name
     * @param {String} data json string
     * @param {Boolean} [isGlobal] (optional)
     * @returns {Promise}
     */
    saveSettings: function(key, data, isGlobal){
        var
            me = this;
        if (Ext.isEmpty(isGlobal)){
           isGlobal = false;
        }

        return me.loadSettings(key).then(function(store){
            var record, params;
            if (store.getCount() !== 0){
                record = store.getAt(0);
                params = {
                    fieldList: ['ID','filter', 'mi_modifyDate'],
                    entity: 'ubs_filter',
                    method: UB.core.UBCommand.methodName.UPDATE,
                    execParams: {
                        'ID': record.get('ID'),
                        'filter': data
                    }
                };
                params.execParams.mi_modifyDate = record.get('mi_modifyDate');
                return $App.connection.update(params);
            } else { // not found
                return $App.connection.insert({
                    fieldList: ['code','name','filter','isGlobal'],
                    entity: 'ubs_filter',
                    execParams: {
                        code: me.configName,
                        name: key,
                        filter: data,
                        isGlobal: isGlobal ? 1 : 0
                    }
                });
            }
        });
    },

    /**
     * Delete Settings by config name
     * @param {String} key Config name
     * @param {Function} [onDelete] (optional)
     */
    deleteSettings: function(key, onDelete){
        var
            me = this;

        me.loadSettings(key).done(function(store) {
            var record;
            if (store.getCount() !== 0) {
                record = store.getAt(0);
                $App.connection.doDelete({
                    entity: 'ubs_filter',
                    execParams: {
                        ID: record.get('ID'),
                        mi_modifyDate: record.get('mi_modifyDate')
                    }
                }).done(function () {
                    if (onDelete) {
                        onDelete.call(me);
                    }
                });
            }
        });
    },

    /**
     *
     * @returns {Promise}
     */
    refreshConfig: function(){
        var me = this,
            lastValue = me.configBox.getValue();

        return me.loadSettings().then(function(store){
            store.autoLoad = false;
            store.remoteSort = false;
            store.remoteFilter = false;
            store.remoteGroup = false;

            me.configBox.bindStore(store);
            if (me.configBox.findRecordByValue(lastValue)){
                me.configBox.setValue(lastValue);
            }
        });
    },

    reCalcFilters: function(){
        var me = this, func, filters, dateFrom, dateTo;

        me.filters = [];

        if (me.ftsTextBox && me.ftsTextBox.getValue()){
            me.filters.push({
                id: me.getFilterPrefix('ftsText'),
                root: 'data',
                //controlID: 'number',
                property: 'ID',
                filterType: 'match',
                condition: 'match',
                value: me.ftsTextBox.getValue()
            });

            func = me.filtersFunc[me.ftsRecordDateAttr];
            if (func){
                filters = func();
                if (filters.length > 0){
                    dateFrom = filters[0].value;
                    if (filters.length > 1){
                        dateTo = filters[1].value;
                    } else {
                        dateTo = filters[0].value;
                    }
                    me.filters.push({
                        id: me.getFilterPrefix('ftsBetween'),
                        root: 'data',
                        //controlID: 'number',
                        property: 'ID',
                        filterType: 'between',
                        condition: 'between',
                        valueFrom: dateFrom,
                        valueTo: dateTo
                    });
                }
            }
        }

        Ext.Object.each(me.filtersFunc, function(attrName, func){
            var filter = func.call();
            if (filter){
               if (Ext.isArray(filter)) {
                  Ext.Array.each(filter, function(elm){
                      me.filters.push(elm);
                  });
               } else {
                 me.filters.push(filter);
               }
            }
        }, me);

    },

    initFilterControl: function(attrName, type, sender){
        var rec = this.controls[attrName] || {};
        rec[type || 'main'] = sender;
        this.controls[attrName] = rec;
        if (sender && sender.resetOriginalValue){
           sender.resetOriginalValue();
        }
    },

    initFilterFunc: function(attrName, func){
        this.filtersFunc[attrName] = func;
    },

    searchHandler: function() {
        var me = this,
            vForm = me.filterWin.down('form');
        if (!vForm.isValid()){
            return;
        }
        me.reCalcFilters();

        me.updateStoreFilters();
        if(me.onFilterReady){
            me.onFilterReady.call(me.scope || me, me.filters, me.filterPrefix );
        }
        me.filterWin.isFilterReady = true;
        me.filterWin.close();
        me.filterWin = null;
    },

    createFilterForm: function(){
        var window,
            me = this;

        me.filterWin = window = Ext.create('UB.view.BaseWindow', {
            title: UB.i18n('filterForm'),
            height: 500,
            width: 600,
            modal: true,
            stateful: true,
            stateId: "ubFilterForm_" + me.entityCode + '_' + me.configName,
            layout: { type: 'fit' },

            items: [{
                xtype: 'form',
                layout: { type: 'fit' },
                items: me.createFilters()
            }],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                padding: '0 0 0 5',
                layout: { type: 'hbox',  align: 'middle'},
                items: [
                    me.configBox =  Ext.widget('ubbasebox', { //xtype: 'ubbasebox',
                        queryMode: 'local',
                        displayField: 'name',
                        valueField: 'name',
                        fieldLabel: UB.i18n('configurationName')
                    }), {
                        xtype: 'button',
                        tooltip: UB.i18n('load'),
                        scale   : 'medium',
                        glyph: UB.core.UBUtil.glyphs.faOpen,
                        //minWidth: 75,
                        margin  : '5 0 0 0',
                        handler: function() {
                            me.doLoadConfig();
                        }
                    }, {
                        xtype: 'button',
                        tooltip: UB.i18n('save'),
                        scale   : 'medium',
                        glyph: UB.core.UBUtil.glyphs.faSave,
                        //minWidth: 75,
                        margin  : '5 0 0 0',
                        handler: function() {
                            me.saveConfig();
                        }
                    }, {
                        xtype: 'button',
                        tooltip: UB.i18n('fDelete'),
                        scale   : 'medium',
                        glyph: UB.core.UBUtil.glyphs.faTrashO,
                        //minWidth: 75,
                        margin  : '5 5 0 0',
                        handler: function() {
                            me.deleteConfig();
                        }
                    }
                ]
            }],
            buttons: [{
                glyph: UB.core.UBUtil.glyphs.faBinoculars,
                text: UB.i18n('search'),
                handler: me.searchHandler,
                scope: me
            }, {
                text: UB.i18n('clear'),
                glyph: UB.core.UBUtil.glyphs.faEraser,
                handler: function() {
                    me.clearAllFilter();
                }
            }, {
                text: UB.i18n('cancel'),
                glyph: UB.core.UBUtil.glyphs.faClose,
                handler: function() {
                    window.close();
                }
            }]
        });
        me.filterWin.on('close', function(){
            if (!me.filterWin.isFilterReady){
                if(me.onCancel){
                    me.onCancel.call(me.scope || me );
                }
            }
        }, me);
        me.refreshConfig().done(function(){
            me.loadLastConfig();
        });
    },

    loadLastConfig: function(){
        var me =  this, lastConfig;
        lastConfig =  localStorage.getItem(UB.ux.UBPreFilter.storeKeyPrefix + me.configName);
        if (lastConfig && Ext.isString(lastConfig)){
            if (!me.store){
                me.configBox.isInternalChange = true;
                try {
                    if (me.configBox.findRecordByValue(lastConfig)){
                        me.configBox.setValue(lastConfig);
                    }
                }
                finally {
                    me.configBox.isInternalChange = false;
                }
               if( me.configBox.getValue()  ){
                 me.loadConfig();
               }
            }
        }
    },

    createFtsPanel: function(entity){
       var me = this,
           items = [],
           ftsRecordDateAttr = entity.mixins.fts.ftsRecordDateAttr, //recordDateAttr
           filter;

        filter = me.getPrevFilter(me.getFilterPrefix('ftsText'));
       me.ftsRecordDateAttr = ftsRecordDateAttr;

       me.ftsTextBox = Ext.create('Ext.form.field.Text', {
            fieldLabel: UB.i18n('ftsTextFieldLabel'),
            enableKeyEvents: true,
            value: filter ? filter.value: null,
            listeners: {
                keyup: function(sender, e){
                    if (e.getKey() === e.ENTER){
                        me.searchHandler();
                    }
                },
                scope: me
            }
        });

       items.push({
            layout: 'hbox',
            defaults:{margins:'0 5 0 0'},
            width: '100%',
            fit: 1,
            margin: '0 0 10 0',
            collapsible: false,
            border:false,
            bodyBorder:false,
            items: [
                me.ftsTextBox
            ]
       });

       return {
            title: UB.i18n('ftsSearchGroup'),
            padding: '5 0 0 5', flex: 1,
            layout: { type: 'vbox', align: 'stretch' },
            autoScroll: true,
            items: items
       };
    },

    createFilters: function(){
        var me = this,
            filter, groupControls, attribute,
        entity = $App.domainInfo.get(me.entityCode),
        results = [],
        groups = me.options.groups,
        componentsReady =  me.options.componentsReady,
        cbParam = {},
        ftsPanelCfg;



        if (me.enableFts && entity.mixins && entity.mixins.fts){
            ftsPanelCfg = me.createFtsPanel(entity);
        }
        if (groups && Ext.isArray(groups)){
            Ext.Array.each(groups, function( group){
                if (group.fields && Ext.isArray(group.fields) ){
                    groupControls = [];
                    Ext.Array.each(group.fields, function( attrName){
                        attribute = entity.attr(attrName);
                        //attribute = entity.attributes[attrName];
                         if (attribute){
                             filter = me.createFilter(attribute, attrName);
                             if (filter){
                                 cbParam[attrName] = filter;
                                 groupControls.push(filter);
                                 //groupControls.push({columnWidth: 1,collapsible: false, border:false, bodyBorder:false, height: 10});
                             }
                         }
                    });
                    //results.push(groupControls);
                    results.push({ title: UB.i18n(group.caption), padding: '5 0 0 5', flex: 1,
                         layout: { type: 'vbox', align: 'stretch' }, autoScroll: true,
                         items: groupControls }); //  layout: { type: 'vbox' },   layout: 'column'
                }
            });
            if (componentsReady){
                componentsReady(cbParam);
            }
            if (ftsPanelCfg){
               results.push(ftsPanelCfg);
            }
            return {
                flex: 1,
                xtype: "tabpanel",
                cls: 'ub-basepanel',
                isForValidate: true,
                layout: { type: 'vbox', align: 'stretch' },
                autoScroll: true,
                padding: '5 0 0 5',
                items: results
            };
        } else {
            Ext.Object.each(entity.attributes, function(attrName, attr){
                if(attr.defaultView){
                    filter = me.createFilter(attr, attrName);
                    if (filter){
                        cbParam[attrName] = filter;
                        results.push(filter);
                        //results.push({columnWidth: 1, collapsible: false, border:false, bodyBorder:false, height: 10});
                    }
                }
            });
            if (componentsReady){
                componentsReady(cbParam);
            }

            if (ftsPanelCfg){
                groupControls = [{
                    title: UB.i18n('UbPreFilterMainGroup'),
                    padding: '5 0 0 5',
                    flex: 1,
                    layout: { type: 'vbox', align: 'stretch' }, autoScroll: true,
                    items: results
                },
                    ftsPanelCfg
                ];
                return {
                    flex: 1,
                    xtype: "tabpanel",
                    cls: 'ub-basepanel',
                    isForValidate: true,
                    layout: { type: 'vbox', align: 'stretch' },
                    autoScroll: true,
                    padding: '5 0 0 5',
                    items: groupControls
                };
            } else {
                return {
                    //flex: 1,
                    //width: "100%",
                    isForValidate: true,
                    layout: { type: 'vbox', align: 'stretch' },
                    //cls: 'ub-basepanel',
                    autoScroll: true,
                    padding: '5 0 0 5',
                    items: results
                };
            }
        }
    },

    createFilter: function(attribute, attrName){
        var me = this, items = [], attributeBase,
            entity = me.entityCode, title, view = {}, initParam;

        initParam = me.initParams[attrName] || {};
        attributeBase = $App.domainInfo.get(entity).getEntityAttribute(attrName, true);

        if (attributeBase.customSettings && attributeBase.customSettings.UIGridColumnClass){
            items = me.getEnumFilterInput(entity, attrName, attributeBase.customSettings.UIGridColumnClass);
            items[1].flex = 100;
            items[2].flex = 100;
        } else if( attribute.associatedEntity ){
            items = me.getAssociationFilterInput(entity, attrName, initParam);
            items[1].flex = 100;
            items[2].flex = 100;
            //items[1].width = '50%';
        } else if(attribute.dataType === 'Enum'){
            items = me.getEnumFilterInput(entity, attrName, undefined, initParam);
            items[1].flex = 100;
            items[2].flex = 100;
            //items[1].width = '50%';
        } else {
            var dt = UBDomain.getPhysicalDataType(attribute.dataType);
            switch(dt){
                case 'float':
                case 'int':
                    items = me.getNumericFilterInput(entity, attrName, (dt === 'float' || dt === 'currency'));
                    break;
                case 'date':
                    items = me.getDateFilterInput(entity, attrName);
                    break;
                case 'boolean':
                    items = me.getBooleanFilterInput(entity, attrName);
                    break;
                default:
                    items = me.getPlainTextFilter(entity, attrName);
                    items[1].flex = 100;
                    //items[1].width = '50%';
            }
        }
        if (initParam.caption){
            items[0].fieldLabel = initParam.caption;
        }

        if (items.length === 0){
            return null;
        }
        title = items[0];
        title.hideLabel = true;

        items.unshift({
            xtype: 'label',
            shrinkWrap: 2,
            margin: '0 0 0 3',
            width: 110,
            text: items[0].fieldLabel // attribute.caption
         /* style: "text-align: right;", */ /* defaultAlign: 'tr?', */
        });

        if (!me.customView) {
            view = {
                layout: {
                    type: 'hbox'//, padding:'5' ,align:'middle'
                },
                defaults:{margins:'0 5 0 0'},
                width: '100%',
                fit: 1,
                margin: '0 0 10 0',
                //columnWidth: 1,
                collapsible: false,
                border:false,
                bodyBorder:false
            };
        } else {
            Ext.Object.each(me.customView, function (prop, value) {
                view[prop] = value;
            });
        }
        view.items = items;
        return view;
    },

    getBaseFilter: function(attrName){
        return this.resultFilters[attrName];
    },

    getPrevFilter: function(filterName, attrName){
        var me = this, result = [];
        if (me.store ){
            if (me.store.filterFormId){
                result = me.store.filters.getByKey(filterName);
                if (result && result.relatedFilter){
                    return [result, result.relatedFilter];
                } else {
                    return result;
                }
            } else {
                this.store.filters.each(function(filter){
                   if (filter.property === attrName){
                       result.push(filter);
                   }
                });
                return result.length === 0 ? null : (result.length === 1 ? result[0]: result);
            }
        } else {
            return attrName ? this.getBaseFilter(attrName): null;
        }
    },

    getFilterPrefix: function(attrName){
        return this.filterPrefix + attrName;
    },

    getItemMargin: function(){
        return Ext.form.field.Base.prototype.margin;
    },


    /**
     *
     * @param {String} entityName
     * @param {String} attrName
     * @param {Object} [options]
     * @returns {Array}
     */
    getAssociationFilterInput: function(entityName, attrName, options){
        return UB.ux.Multifilter.getAssociationFilterInputS(entityName, attrName, options, this);
    },

    getEnumFilterInput: function(entityName, attrName, enumGroup, options){
        return UB.ux.Multifilter.getEnumFilterInputS(entityName, attrName, enumGroup, options, this);
    },

    getNumericFilterInput: function(entityName, attrName, allowDecimals){
        return UB.ux.Multifilter.getNumericFilterInputS(entityName, attrName, allowDecimals, this);
    },

    getPlainTextFilter: function(entityName, attrName){
        return UB.ux.Multifilter.getPlainTextFilterS(entityName, attrName, this);
    },

    getDateFilterInput: function(entityName, attrName){
        return  UB.ux.Multifilter.getDateFilterInputS(entityName, attrName, this);
    },

    getBooleanFilterInput: function(entityName, attrName){
        return UB.ux.Multifilter.getBooleanFilterInputS(entityName, attrName, this);
    }
});