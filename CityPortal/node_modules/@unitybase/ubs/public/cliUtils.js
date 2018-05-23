Ext.define('UBS.cliUtils', {
    singleton: true,
    atLeastOne : true,
    ask: function (aTitle, aMessage, callback) {
        Ext.MessageBox.show({
            title: aTitle,
            msg: aMessage,
            buttons: Ext.MessageBox.OKCANCEL,
            fn: function (btn) {
                if (Ext.isFunction(callback)) {
                    callback(btn);
                } else if (callback && Ext.isFunction(callback.focus)) {
                    setTimeout(function () {
                        callback.focus(true);
                    }, 500);
                }
            }
        });

    },
    showMessage: function (aTitle, aMessage, callback) {
        Ext.MessageBox.show({
            title: aTitle,
            msg: aMessage,
            buttons: Ext.Msg.OK,
            fn: function (btn) {
                if (Ext.isFunction(callback)) {
                    callback(btn);
                } else if (callback && Ext.isFunction(callback.focus)) {
                    setTimeout(function () {
                        callback.focus(true);
                    }, 500);
                }
            }
        });

    },
    clearDirty: function (form) {
        for (var i = 0, len = form.fields.length; i < len; ++i) {
            form.fields[i].resetOriginalValue();
        }
    },
    closeForm: function (form) {
        if (form) {
            if (form.isDirty()) {
                this.clearDirty(form);
            }
            form.up("window").close();
        }
    },

    browse: function (browConfig) {
        var
            config = {
                entity: browConfig.entityName,
                cmdType: UB.core.UBCommand.commandType.showList,
                cmdData: {
                    "params": [
                        {
                            "entity": browConfig.entityName,
                            "method": "select",
                            "fieldList": browConfig.fieldList || '*',
                            "whereList": browConfig.whereList
                        }
                    ]
                },
                description: $App.domainInfo.get(browConfig.entityName, true).getEntityDescription(),
                isModal: Ext.isDefined(browConfig.isModal) ? browConfig.isModal : true,
                onItemSelected: browConfig.onItemselected
            };
        UB.core.UBCommand.getCommandByEntityAndType(browConfig.entityName, UB.core.UBCommand.commandType.showList);
        UB.core.UBApp.doCommand(config);

    },
    loadEntityByID: function (eName, ID, fieldList, cb, scope) {
        var
            me = this,
            whereList = {
                ID: {
                    expression: '[ID]',
                    condition: 'equal',
                    values: { 'ID': ID}
                }
            },
            store = [
                {
                    entity: eName,
                    requestName: 'entityByID',
                    method: 'select',
                    fieldList: fieldList || '*',
                    whereList: whereList
                }
            ];
        UB.core.UBDataLoader.loadStoresSimple({
            ubRequests: store,
            setStoreId: true,
            callback: function (stores) {
                var row = stores.entityByID.getAt(0);

                if (!row) {
                    me.showMessage('cliUtils.loadEntityByID', 'Не знайдено запис з кодом ' + ID);
                } else {
                    cb.call(scope, row);
                }
            },
            scope: scope
        });
    },
    userIsMemberOf: function (checkRoles, atLeastOne) {
        var
            userData = UB.core.UBApp.getUserData(),
            roles = userData.roles.split(','),
            result = true;
        if (!Ext.isArray(checkRoles)) { // Only one role check
            return (roles.indexOf(checkRoles) != -1);
        }
        for (var i = 0,len = checkRoles.length;i < len;++i ) {
            result = (roles.indexOf(checkRoles[i]) != -1);
            if (atLeastOne) {
                if (result) {
                    break;
                }
            } else
            if (!result) {
                break;
            }
        }
        return result;
    }
});



