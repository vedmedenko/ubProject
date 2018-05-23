/**
 * Bind form controls and Record {@link Ext.data.Model}. It operates in mode two way binding.
 * Any changes in control immediately fall into the Record and any changes in record immediately fall into given form control.
 * To make bind data form control must have attribute "attributeName" with value that corresponds to the field name of the Record.
 *
 * Usage example:
 *
 *      var panel = Ext.create('Ext.panel.Panel', {
 *        items: [
 *          {
 *            xtype: 'textfield',
 *            attributeName: 'code'
 *          },{
 *            xtype: 'textfield',
 *            attributeName: 'name'
 *          }
 *        ]
 *      });
 *
 *       var store = Ext.create('Ext.data.Store', {
 *               fields: ['code','name'],
 *               data : [{code: '1', name: 'One'}]
 *       });
 *
 *       panel.binder = Ext.create('UB.view.FormDataBinder', {
 *           panel: panel,
 *       });
 *
 *       panel.binder.setRecord(store.getAt(0));
 *       panel.binder.bind();
 *
 */
Ext.define('UB.view.FormDataBinder', {
    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @constructor
     * @param {object} config
     * @param {object} [config.form]
     * @param {object} config.panel
     */
    constructor : function(config) {
        var me = this;
        //me.dataSource = config.dataSource;
        //me.form = config.form;
        if (!config || !Ext.isObject(config)) {
            throw new Error('Config object is required.');
        }
        if (!config.panel){
            throw new Error('Properties panel is required.');
        }
        Ext.apply(me, config);
        if (!me.form && (!me.controls || !Ext.isArray(me.controls)) ){
            if (me.panel.getForm){
                me.form = me.panel.getForm();
            } else {
                throw new Error('Property form or controls in config object is required.');
            }
        }
        me.mixins.observable.constructor.call(this, config);
        /**
         * @event formDataReady
         * Fires when data bonded and all required data loaded
         */
        /**
         * @event controlDataReady
         * Fires when data of each control is loaded.
         */
        /**
         * @event dataBind
         * @param {Ext.data.Model} record
         * Fired when data is bound.
         */

        /**
         * @event controlChanged
         * Fires when any binded control changed by user. When data changed from dataBinder then this event do not fired.
         * If you want to interrupt the data binding then return false from function.
         * @param {Ext.form.field.Field} this
         * @param {Object} newValue The new value
         * @param {Object} oldValue The original value
         */
        me.addEvents( 'formDataReady', 'controlDataReady', 'controlChanged', 'dataBind');
        me.connectFieldsEvents();
    },

    updateFormFields: function(){
        var me = this;
        me.disconnectFieldsEvents();
        me.connectFieldsEvents();
    },

    /**
     * Return all field that will be bound.
     * @param {Boolean} [withOneWay] When true result contains fields with one way binding. By default false.
     * @returns {Object.<string, Ext.form.field.Field> }
     */
    getFields: function(withOneWay){
        var me = this, fields, result = {};
        if (me.controls){
            fields = me.controls;
        } else {
            fields = me.form.getFields().items;
        }
        _.forEach(fields, function(field){
            if (field.attributeName && (withOneWay || field.oneWayBinding !== true )){
                result[field.attributeName] = field;
            }
        });
        return result;
    },

    /**
     *
     * @param {String} fieldName
     * @param {Boolean} [oneWay]
     * @returns {[Ext.form.field.Field]}
     */
    getFieldsByName: function(fieldName, oneWay){
        var me = this, result = [], fn;
        fn = function(field){
            if (field.attributeName === fieldName){
                result.push(field);
            }
            return true;
        };
        if  (!oneWay){
            _.forEach(me.getFields(), fn);
        }
        _.forEach(me.getOneWayBindCtrl(), fn);

        return result;
    },

    suspendAutoBind: function(){
        this.isSuspendAutoBind = true;
    },

    releaseAutoBind: function(){
        this.isSuspendAutoBind = false;
    },

    /**
     * @param {Ext.data.Model} record
     */
    setRecord: function(record){
        var me = this;
        if (me.record){
            me.record.store.un('update', me.onRecordUpdate, me );
        }
        me.record = record;
        me.record.store.on('update', me.onRecordUpdate, me );
    },


    getOneWayBindCtrl: function(){
        var me = this, forms, excluded = [], items, form;
        if (!me.oneWayBindCtrl){
            form = me.panel.getForm();
            forms = me.panel.query('form');
            Ext.each(forms, function(dform){
                if (dform !== form){
                    Ext.each( dform.query('[attributeName][oneWayBinding=true]'), function(detIiem){
                        excluded.push(detIiem);
                    },me);
                }
            },me);
            items = me.panel.query('[attributeName][oneWayBinding=true]'); //:not([isFormField])
            Ext.each(excluded, function(eitem){
                var delItem = items.indexOf(eitem);
                if (delItem >= 0){
                    items.splice(delItem,1);
                }
            },me);
            me.oneWayBindCtrl = items;
        }
        return me.oneWayBindCtrl;
    },


    /**
     * Bind data and form controls.
     * @param {boolean} isDefault
     */
    bind: function(isDefault){
        var me = this,
            fields = me.getFields(true), ctrls;

        ctrls = me.getOneWayBindCtrl();
        me.calcReady = true;
        me.notReadyControls = 1;
        me.notReadyControlList = [];
        try {
            _.forEach(fields,function (field) {
                me.bindField(field, isDefault);
            });
            _.forEach(ctrls,function (ctrl) {
                me.bindField(ctrl, isDefault);
            });
            me.controlDataReady();
            me.fireEvent('dataBind', me.record);
        } finally {
            me.calcReady = false;
        }
    },

    /**
     * @private
     * @param control
     */
    controlDataReady: function(control){
        var me = this, elmIdx;
        me.notReadyControls--;
        if (control && (elmIdx = me.notReadyControlList.indexOf(control)) >= 0){
            me.notReadyControlList.splice(elmIdx, 1);
        }
        me.fireEvent('controlDataReady', control);
        if (me.notReadyControls === 0){
             me.fireEvent('formDataReady');
        }
    },

    /**
     * @private
     * @param field
     * @param isDefault
     */
    bindField: function(field, isDefault){
        var me = this,
            newValue, result, instanceID;
        me.isInnerChangingControl = true;
        try{
            newValue = me.record.get(field.attributeName);
            instanceID = me.panel.getInstanceID();
            if (field.setValueById) {
                if (field.dataLoadDelay && me.calcReady){
                    me.notReadyControls += 1;
                    me.notReadyControlList.push(field);
                    // todo Change to use instead of Promise controlDataReady
                    result = field.setValueById(newValue, isDefault, me.controlDataReady, me);
                } else {
                    result = field.setValueById(newValue, isDefault, me.controlDataReady, me);
                }
            } else {
                if ((field.xtype === 'ubdocument') && (field.attributeName.indexOf('.') !== -1)) { //for complex 'ubdocument' attributes
                    result = field.setComplexValue(me.record);
                } else if (field.setValue){
                    result = field.setValue(newValue, instanceID, true);
                } else { //if (field.setText){
                    result = field.setText(newValue, instanceID, true);
                }
                if (field.resetOriginalValue){
                   field.resetOriginalValue();
                }
                if (result && Q.isPromise(result)){
                    me.notReadyControls += 1;
                    me.notReadyControlList.push(field);
                    result.done(function(){
                        me.controlDataReady(field);
                    });
                }

            }
            if (field.onBeforeSaveForm && me.panel){
                me.panel.on('beforeSaveForm', field.onBeforeSaveForm, field);
            }
        } finally {
            me.isInnerChangingControl = false;
        }
    },

    /**
     * @private
     */
    onRecordUpdate: function(store, record, operation, modifiedFieldNames){
        var me = this;
        if (me.record !== record){
            return;
        }
        /*
        if (me.isInnerChangingRecord && !me.isSuspendAutoBind){
            _.forEach(modifiedFieldNames, function(fieldName){
                _.forEach(me.getFieldsByName(fieldName), function(field){
                    me.bindField(field);
                });
            }, me);
        }
        */
        if (me.isInnerChangingRecord || me.isSuspendAutoBind){
            return;
        }
        _.forEach(modifiedFieldNames, function(fieldName){
            _.forEach(me.getFieldsByName(fieldName), function(field){
                me.bindField(field);
            });
        });

    },

    /**
     * @private
     * @param {Ext.form.field.Field} field
     * @param {*} newValue
     * @param {*} oldValue
     */
    onControlChanged: function(field, newValue, oldValue){
        var me = this;
        if (!field || !field.attributeName){
            return;
        }
        if (me.isInnerChangingControl || me.isSuspendAutoBind) {
            return;
        }
        if (me.panel && !me.panel.formDataReady) {
            return;
        }
        if (me.fireEvent('controlChanged', field, newValue, oldValue) === false) {
            return;
        }
        me.isInnerChangingRecord = true;
        try {
            if (newValue === undefined){
                newValue = null;
            }
            if (newValue !== null && (typeof(newValue) === 'string' && newValue === "")){
                newValue = null;
            }
            me.record.set(field.attributeName, newValue);
        } finally {
            me.isInnerChangingRecord = false;
        }
    },

    /**
     * @private
     */
    connectFieldsEvents: function(){
        var me = this,
            fields = me.getFields();

        me.connectedFields = {};
        _.forEach(fields, function (field) {
            me.connectedFields[field.attributeName] = field;
            field.on('change', me.onControlChanged, me);
        });
    },

    /**
     *
     * @returns {Object}
     * an associative array of {@Link Ext.form.field.Field}
     */
    getBindedFields: function(){
       return this.connectedFields;
    },

    /**
     * @private
     */
    disconnectFieldsEvents: function(){
        var me = this,
            fields = me.connectedFields;
        if (!fields){
            return;
        }
        _.forEach(fields,function (field) {
            field.un('change', me.onControlChanged, me);
        });
        me.connectedFields = null;
    },

    /**
     * @private
     */
    destroy : function() {
        var me = this;
        if (me.isDestroyed) {
            return;
        }
        if (me.record){
          me.record.store.un('update', me.onRecordUpdate, me );
        }
        me.disconnectFieldsEvents();
        me.record = null;
        me.parent = null;
        me.form = null;
        me.isDestroyed = true;
    }
});
