require('./UBComboBox')
/**
 * UBComboBox descendant with ability to add new row to lookup entity in "silence" mode.
 *
 * Consider we have `organizationID` attribute with type 'Entity'(cdn_organization).
 * User type in comboBox value `Microsoft` and we do not fount `Microsoft` in descriptionAttribute of `cdn_organization`.
 * In this case UBDictComboBox able to add new row to `cdn_organization` and fill it mandatory attributes:
 *
 *  - attribute listened in `fieldsCloneText` config become typed text valuse
 *  - attributes listened in {@link UB.ux.form.field.UBDictComboBox.staticValues UBDictComboBox.staticValues} object taken from `staticValues`
 *  - developer can fill some additional attributes in runtime inside in `UBDictComboBox.beforeAutoSave` event handler
 *
 * It works correct when used {@link UB.view.FormDataBinder} for binding data.
 *
 *      //Using in config sample:
 *      {
 *           xtype: 'ubdictcombobox',
 *           fieldsCloneText: 'fullName',
 *           staticValues: {description: 'New instance description added during autoSave'},
 *           listeners: {
 *               beforeAutoSave: function(sender, request){
 *                   request.execParams.OKPOCode = '00000000'; ///'НB' + request.execParams.ID;
 *               }
 *           },
 *           attributeName: 'organizationID'
 *      }
 *
 *      //Using in script sample:
 *      Ext.create('UB.ux.form.field.UBDictComboBox',{
 *           store: Ext.create('UB.ux.data.UBStore', {
 *               ubRequest: {
 *                   entity: entityCode,
 *                   method: UB.core.UBCommand.methodName.SELECT,
 *                   fieldList: fieldList,
 *                   whereList: whereList,
 *                   orderList: orderList || {_asc: {expression: fieldList[1], order: UB.core.UBCommand.order.sqlotAsc}}
 *               },
 *               autoLoad: false,
 *               autoDestroy: true
 *           }),
 *           valueField: 'ID',
 *           displayField: fieldList[1],
 *           fieldsCloneText: 'fullName',
 *           staticValues: {description: 'New instance description added during autoSave'},
 *           listeners: {
 *               beforeAutoSave: function(sender, request){
 *                   request.execParams.OKPOCode = '00000000'; ///'НB' + request.execParams.ID;
 *               }
 *           }
 *      }
 *
 */Ext.define('UB.ux.form.field.UBDictComboBox', {
    extend: 'UB.ux.form.field.UBComboBox',
    alias: 'widget.ubdictcombobox',

    initComponent: function(){
        var me = this;
        me.allowCustomText = true;
        me.forceSelection = false;
        me.on('focus', me.oncbFocus, me);
        me.callParent(arguments);
        /**
         * @event beforeAutoSave
         * Fires before send request for insert element. First parameter is comboBox. Second parameter is request config object.
         * @param {this}
         * @param {Object}
         *
         * Actual autoSave performed during main form save, not after exiting from comboBox, to prevent garbage adding to dictionary.
         */
        /**
         * @event afterAutoSave
         * Fires after insert element. First parameter is comboBox. Second parameter is record.
         * @param {this}
         * @param {Ext.data.Model}
         */
        /**
         * @event beforeShowDictionary
         * Fires before show dictionary form. First parameter is comboBox. Second parameter is command config object.
         * @param {this}
         * @param {Object}
         */
        me.addEvents('beforeAutoSave', 'afterAutoSave', 'beforeShowDictionary');
    },
    /**
     * @cfg {Number} saveOrderNumber by default null - infinity. Order of start autoSave when form saving.
     */

    /**
     *
     * @cfg {Object} staticValues This columns will used when doing auto insert
     * Example:
     *
     *      {
     *        code: '123',
     *        dateReg: new Date()
     *      }
     */

    /**
     * @cfg {Array|String} fieldsCloneText
     *
     * Other fields that will get displayText when doing auto insert.
     */

    /**
     * @cfg {String} messageFillOtherAttribute
     * This message will see user after edit text and after leave focus comboBox. This message will be translated by UB.i18n.
     */
    messageFillOtherAttribute: 'doYouWantFillOtherAttr',

    /**
     * @cfg {boolean} doQueryFillOtherAttribute
     * Prompt the user to fill other dictionary attributes. By default true.
     */
    doQueryFillOtherAttribute: true,



    oncbFocus: function(){
        this.onFocusRawValue = this.getRawValue();
    },

    getValue: function(field){
        var me = this, value, rawValue;
        value = me.callParent(arguments);
        rawValue = me.getRawValue();
        if (!value && !!rawValue){
            // return temporary id
            return (new Date()).getTime() * -1;
        }
        return value;
    },

    setValue: function(value) {
        var me = this,
            fValue, i, valItem, valIn,
            isEqualVal;

        fValue = Ext.Array.from(value);
        // check has changes value
        if (me.valueModels && me.valueModels.length > 0 && fValue.length === me.valueModels.length){
            isEqualVal = true;
            for(i = 0; i < me.valueModels.length; i++){
                valItem = me.valueModels[i];
                valItem = valItem.get(me.valueField);
                valIn = fValue[i];
                if ( Ext.isObject(valIn) && valIn.isModel ){
                    valIn =  valIn.get(me.valueField);
                }
                if (valItem !== valIn){
                    isEqualVal = false;
                    break;
                }
            }
            if (isEqualVal){
                return;
            }
        }
        me.clearIsPhantom();
        me.callParent(arguments);
    },

    onBlur: function(event){
        var me = this, i, el,
            picker = me.getPicker();
        me.callParent(arguments);

        // focus on picker
        if (picker && picker.el && event.relatedTarget) {
            i = 0;
            el = event.relatedTarget;
            while(i < 11 && el){
                if (picker.el.dom === el){
                    el = Ext.dom.Element.get(event.relatedTarget);
                    el.un({blur: this.onPickerBlur, scope: me});
                    el.on({blur: this.onPickerBlur, scope: me});
                    return;
                }
                el = el.parentElement;
                i++;
            }
        }

        Ext.defer(me.checkOnBlur, 20, me);
    },

    checkOnBlur: function(){
        var me = this,
            rawValue = me.getRawValue(),
            rawId = null,
            store, entityName,
            val;

            if (me.isDestroyed){
                return;
            }

            store = me.getStore();
            entityName = store.entityName;

        if (me.getValue() < 0 && (me.onFocusRawValue !== rawValue) ){
            // check raw value in store
            me.store.each(function(record){
                if (rawValue === record.get(me.displayField)){
                    rawId = record.get(me.valueField);
                    return false;
                }
            }, me);
           if (rawId){
               me.setValue(rawId);
               return;
           }
           // check raw value in server
           val = {};
           val[me.displayField] = rawValue;
           $App.connection.select({
               entity: entityName,
               fieldList: [me.valueField, me.displayField],
               whereList: {
                   valExpr: {
                       expression: '[' + me.displayField + ']',
                       condition: 'equal',
                       values: val
                   }
               }
           }).done(function(response){
                   if (response && response.resultData.data.length){
                       var records  = store.add(UB.core.UBCommand.resultDataRow2Object(response), true);
                       //var record = UB.ux.data.UBStore.createRecord(entityName, fieldList);
                       //UB.ux.data.UBStore.resultDataRow2Record(response, record);
                       //store.add(record);
                       me.setValue(records[0]);
                       return;
                   }
                   //me.saveDictItem.setDisabled(false);

                   if (me.doQueryFillOtherAttribute){
                       $App.dialogYesNo('', UB.format( UB.i18n(me.messageFillOtherAttribute), me.getFieldLabel(),
                           $App.domainInfo.get(entityName, true).getEntityCaption() )).
                       done(function(result){
                           if (result){
                               Ext.defer(function(){
                                   this.addDictItem({ caption: this.getRawValue() });
                               }, 10, me);
                           }
                       });
                   }
           });
        }
    },

    /*
    afterQuery: function(queryPlan) {
        var me = this;

        me.callParent(arguments);
    },
    */

    addDictItem: function (/* initValue */) {
        var
            me = this, cmdConfig,
            store = me.getStore(),
            entityName = store.entityName,
            displayField = me.displayField;

        cmdConfig = {
            cmdType: UB.core.UBCommand.commandType.showForm,
            entity: entityName,
            store: store,
            isModal: true,
            sender: me,
            onClose: function (itemId) {
                if (itemId){
                   //me.saveDictItem.setDisabled(true);
                   me.setValueById(itemId);
                   me.editItemButton.setDisabled(false);
                }
            }
        };
        cmdConfig.initValue = {};
        if (me.staticValues){
            Ext.applyIf(cmdConfig.initValue, me.staticValues);
        }
        cmdConfig.initValue[displayField] = me.getRawValue();
        if (me.fieldsCloneText){
            _.forEach( Ext.Array.from(me.fieldsCloneText, false), function(field){
                cmdConfig.initValue[field] = me.getRawValue();
            });
        }
        me.fireEvent('beforeShowDictionary', me, cmdConfig);
        UB.core.UBApp.doCommand(cmdConfig);
    },

    onBeforeSaveForm: function(functionArray){
        functionArray.push([this.orderNumber || Number.MAX_VALUE, this.onBeforeSaveFormRun.bind(this) ]);
    },

    /**
     *
     * @returns {Promise} Promise done when dictionary element will be saved.
     */
    onBeforeSaveFormRun: function(){
        var me = this,
            entityName,
            promise,
            execParams,
            fieldList,
            value;
        value = me.getValue();
        if (!value || (value > 0) || (value && value instanceof Array && value.length === 0)){
            return;
        }
        fieldList = [me.displayField, me.valueField];
        entityName = me.store.ubRequest.entity;
        execParams = {};
        if (me.staticValues){
            Ext.applyIf(execParams, me.staticValues);
            fieldList = fieldList.concat(Object.keys(me.staticValues));
        }
        execParams[me.displayField] =  me.getRawValue();
        promise = $App.connection.addNew({
            entity: entityName,
            execParams: execParams,
            fieldList: fieldList
        }).then(function(response){
                var data = response.resultData.data[0],
                fieldList = response.resultData.fields, execParams = {}, request;
                _.forEach(fieldList, function(fieldName, index){
                    execParams[fieldName] = data[index];
                });
                if (me.fieldsCloneText){
                    _.forEach( Ext.Array.from(me.fieldsCloneText, false), function(field){
                        execParams[field] = me.getRawValue();
                    });
                }
                request = {
                    entity: entityName,
                    execParams: execParams,
                    fieldList: fieldList
                };
                me.fireEvent('beforeAutoSave', me, request);
                return $App.connection.insert(request).
                then(function(response){
                        //var record = UB.ux.data.UBStore.createRecord(entityName, fieldList);
                        //UB.ux.data.UBStore.resultDataRow2Record(response, record);
                        /*
                        var data = response.resultData.data[0],
                            fieldList = response.resultData.fields, execParams = {};
                        _.forEach(fieldList, function(fieldName, index){
                            execParams[fieldName] = data[index];
                        }, me);
                       me.setValue(execParams[me.valueField]);
                       */
                       // me.setValue(record);
                        if (response && response.resultData.data.length){
                            //me.saveDictItem.setDisabled(true);
                            me.editItemButton.setDisabled(false);
                            var records  = me.getStore().add(UB.core.UBCommand.resultDataRow2Object(response), true);
                            me.setValue(records[0]);
                            me.fireEvent('afterAutoSave', me, records[0]);
                        }

                });
        });
        /*
        if (promiseArray){
            promiseArray.push({ promise: promise,  orderNumber: me.saveOrderNumber });
        } else {
            promise;
        } */
        /*
        if (this.orderNumber === null || this.orderNumber === undefined || this.orderNumber ===  Number.MAX_VALUE){
            promise;
            return Q.resolve(true);
        } */
        return promise;
    },

    onValueChange: function () {
        var me = this, value = me.getValue(),
            disabled = !value || (value <= 0);
        if (me.editItemButton){
            me.editItemButton.setDisabled(disabled);
        }
    },

    saveItem: function(){
        this.onBeforeSaveFormRun();
    }

    /*,

    initContextMenu: function(){
        var me = this;
        me.callParent(arguments);

        me.saveDictItem = me.contextMenu.items.add([{
                text: UB.i18n('comboBoxSaveDictItem'),
                glyph: UB.core.UBUtil.glyphs.faFloppy,
                itemID: 'saveDictItem',
                handler: me.saveItem,
                disabled: true,
                scope: me
           }]
        );
    }
    */

});