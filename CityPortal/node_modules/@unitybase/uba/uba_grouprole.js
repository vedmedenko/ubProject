var me = uba_grouprole
var UBA_COMMON = require('./modules/uba_common')

me.on('insert:before', UBA_COMMON.denyBuildInRoleAssignmentAndAdminsOnlyForAdmins)
me.on('update:before', UBA_COMMON.denyBuildInRoleAssignmentAndAdminsOnlyForAdmins)

// TODO - uba_audit for uba_grouprole
// /**
//  * After inserting new user - log event to uba_audit
//  * @param {ubMethodParams} ctx
//  */
// function ubaAuditNewGroupRole(ctx){
//     "use strict";
//     if (!App.domain.byName('uba_audit')){
//         return;
//     }
//     var params = ctx.mParams.execParams;
//     var role = params.roleID, obj, user = params.userID;
//     if (role){
//         obj = UB.Repository('uba_role').attrs('name').where('[ID]', '=', role).select();
//         role = obj.eof ? role: obj.get('name');
//     }
//     if (user){
//         obj = UB.Repository('uba_user').attrs('name').where('[ID]', '=', user).select();
//         user = obj.eof ? user: obj.get('name');
//     }
//
//     var auditStore = new TubDataStore('uba_audit');
//     auditStore.run('insert', {
//         execParams: {
//             entity: 'uba_userrole',
//             entityinfo_id: params.ID,
//             actionType: 'INSERT',
//             actionUser: Session.uData.login,
//             actionTime: new Date(),
//             remoteIP: Session.callerIP,
//             targetUser: user,
//             targetRole: role,
//             toValue: JSON.stringify(params)
//         }
//     });
// }
// me.on('insert:after', ubaAuditNewUserRole);
//
// /**
//  * After updating user - log event to uba_audit
//  * @param {ubMethodParams} ctx
//  */
// function ubaAuditModifyUserRole(ctx){
//     "use strict";
//     if (!App.domain.byName('uba_audit')){
//         return;
//     }
//     var
//         params = ctx.mParams.execParams,
//         origStore = ctx.dataStore,
//         origName = origStore.currentDataName,
//         oldValues,
//         role, roleNew = params.roleID, obj, user, userNew = params.userID;
//     if (roleNew){
//         obj = UB.Repository('uba_role').attrs('name').where('[ID]', '=', roleNew).select();
//         roleNew = obj.eof ? roleNew: obj.get('name');
//     }
//     if (userNew){
//         obj = UB.Repository('uba_user').attrs('name').where('[ID]', '=', userNew).select();
//         userNew = obj.eof ? userNew: obj.get('name');
//     }
//
//     try {
//         origStore.currentDataName = 'selectBeforeUpdate';
//         oldValues = origStore.asJSONObject;
//         role = origStore.get('roleID');
//         user = origStore.get('userID');
//     } finally {
//         origStore.currentDataName = origName;
//     }
//     if (role){
//         obj = UB.Repository('uba_role').attrs('name').where('[ID]', '=', role).select();
//         role = obj.eof ? role: obj.get('name');
//     }
//     if (user){
//         obj = UB.Repository('uba_user').attrs('name').where('[ID]', '=', user).select();
//         user = obj.eof ? user: obj.get('name');
//     }
//     var auditStore = new TubDataStore('uba_audit');
//     auditStore.run('insert', {
//         execParams: {
//             entity: 'uba_userrole',
//             entityinfo_id: params.ID,
//             actionType: 'DELETE',
//             actionUser: Session.uData.login,
//             actionTime: new Date(),
//             remoteIP: Session.callerIP,
//             targetRole: role,
//             targetUser: user,
//             fromValue: oldValues
//         }
//     });
//     auditStore.run('insert', {
//         execParams: {
//             entity: 'uba_userrole',
//             entityinfo_id: params.ID,
//             actionType: 'INSERT',
//             actionUser: Session.uData.login,
//             actionTime: new Date(),
//             remoteIP: Session.callerIP,
//             targetRole: roleNew || role,
//             targetUser: userNew || user,
//             fromValue: oldValues,
//             toValue: JSON.stringify(params)
//         }
//     });
// }
// me.on('update:after', ubaAuditModifyUserRole);
//
//
// me.on('delete:before', function(ctxt){
//     if (!App.domain.byName('uba_audit')){
//         return;
//     }
//     var
//         store, execParams = ctxt.mParams.execParams;
//
//         store = UB.Repository('uba_userrole').attrs(['userID','roleID'])
//             .where('[ID]', '=', execParams.ID).select();
//     ctxt.mParams.delUserID = store.get('userID');
//     ctxt.mParams.delRoleID = store.get('roleID');
// });
//
// /**
//  * After deleting user - log event to uba_audit
//  * @param {ubMethodParams} ctx
//  */
// function ubaAuditDeleteUserRole(ctx){
//     if (!App.domain.byName('uba_audit')){
//         return;
//     }
//     var
//         params = ctx.mParams.execParams,
//         oldValues,
//         role, obj, user;
//
//     role = ctx.mParams.delRoleID;
//     user = ctx.mParams.delUserID;
//     if (role){
//         obj = UB.Repository('uba_role').attrs('name').where('[ID]', '=', role).select();
//         role = obj.eof ? role: obj.get('name');
//     }
//     if (user){
//         obj = UB.Repository('uba_user').attrs('name').where('[ID]', '=', user).select();
//         user = obj.eof ? user: obj.get('name');
//     }
//
//     var auditStore = new TubDataStore('uba_audit');
//     auditStore.run('insert', {
//         execParams: {
//             entity: 'uba_userrole',
//             entityinfo_id: params.ID,
//             actionType: 'DELETE',
//             actionUser: Session.uData.login,
//             actionTime: new Date(),
//             remoteIP: Session.callerIP,
//             targetRole: role,
//             targetUser: user,
//             fromValue: oldValues
//         }
//     });
// }
// me.on('delete:after', ubaAuditDeleteUserRole);
