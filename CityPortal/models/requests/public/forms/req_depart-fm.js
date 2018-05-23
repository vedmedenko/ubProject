exports.formCode = {
       addBaseActions: function () {
        this.callParent(arguments);
        this.actions.ActionReassignedAll = new Ext.Action({ 
            actionId: "ActionReassignedAll",
            actionText: UB.i18n('Reassigned all requests'),
            handler: reAssignAll.bind(this)
        });
    },
     initUBComponent: function () {
        var me = this; 
         me.getField('ID').readOnly = true;
    }
};

function reAssignAll() {
var form = this;

    $App.showModal({
        formCode: 'req_reqList-reassignAll',
        description: UB.i18n('Reassign to'),
       }).done(function (result) {
         if (result.action === 'ok') {
            if(result.newDep != form.getField('ID').getValue())
            {
             $App.connection.query({
                       entity: 'req_depart',
                       method: 'reassignDep',
               curDep: form.getField('ID').getValue(),
                       newDep: result.newDep
            }).done(function(){
                $App.dialogInfo('Requests Reassigned Successfully').done();
            });
                }
              else {$App.dialogError('Departments must be different')}
        }
    }); 
}

