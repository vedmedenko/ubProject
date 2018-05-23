exports.formCode = {
    initUBComponent: function () {
        var me = this;
        me.down('#addRole').on('click', function(){
            me.addRemoveRole(true);
        }, me);
        me.down('#removeRole').on('click', function(){
            me.addRemoveRole(false);
        }, me);
        me.roleCombo = me.down('#roleCombo');
        me.recipientGrid = me.down('#recipientGrid');
        me.recipientGrid.store.on('entityModified', function(){
           me.saveInstance(true);
        });
        if (me.isNewInstance) {
			me.record.set('startDate', new Date());
			me.record.set('expireDate', Ext.Date.add(new Date(), Ext.Date.DAY, 7));
        }    
        //entityModified
    },

    addRemoveRole: function(isAdd){
        var me = this, roles, pr;
		pr = me.isNewInstance ? me.saveForm() : Q.resolve(1);
        if (me.isNewInstance) {

            //UB.showErrorWindow('Save this notification message before add users to it');
            //return;
        }    
		pr.done(function(saveResult){
            roles = me.roleCombo.getValue();
            if (!roles || saveResult!==1){
                return;
            }
            me.maskForm();
            return $App.connection.run({entity: 'ubs_message_recipient', method: isAdd ? 'addRoles': 'removeRoles',
                fieldList: ['ID'],
                execParams: {
                    messageID: me.instanceID,
                    roles: roles
                }
            }).done(function(){
                    me.recipientGrid.store.reload();
                    me.unmaskForm();
            },function(err){
                   me.unmaskForm();
                   throw err;
            });
        });    
    }
};