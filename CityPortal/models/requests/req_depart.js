var me = req_depart;
me.entity.addMethod('reassignDep');

/**
 * Reassign all departments form params.curDep to params.newDep
 * @param {ubMethodParams} ctxt
 */
function reassignDep(ctxt){
    "use strict";
    var
        params = ctxt.mParams,
        curDep = params.curDep,
        newDep = params.newDep;

       if(!$.currentUserInGroup(ubm_desktop,'admins')){
        throw new Error('You don`t nave permission for this action');
        } 
    if (!curDep) {
            throw new Error('curDep parameter is required');
        }
        if (!newDep) {
            throw new Error('newDep parameter is required');
        }
    if (curDep === newDep) {
            throw new Error('curDep and newDep parameters must be different');
        }
    var store = new TubDataStore('req_reqList');
    var updStore = new TubDataStore('req_reqList');
    UB.Repository('req_reqList').attrs('ID','department','subDepartment','mi_modifyDate').where('department', '=', curDep).select(store);
    while(!store.eof) {
                updStore.run('update', {
                entity: 'req_reqList',
        lockType: 'Temp',
            execParams: {
                department: newDep,
        subDepartment: null,
        ID: store.get('ID'),
        mi_modifyDate: store.get('mi_modifyDate')
                }
            });
    store.next();
}                
}
me.reassignDep = reassignDep;
