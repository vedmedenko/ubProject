module.exports = function(session){
var
    desktopID, usersRoleID, folderID, lastID, userID, conn = session.connection;

//hd_user and Health Department role
userID=conn.lookup('uba_user', 'ID',{expression: 'name', condition: 'equal', values: {code: 'hd_user'}});
if (!userID) {
console.info('\t\tcreate new `hd_user` user');
        userID = conn.insert({
            entity: 'uba_user',
        fieldList: ['ID'],
            execParams: {
                name: 'hd_user',
                firstName: 'hd',
        lastName: 'user',
                uPasswordHashHexa: nsha256('salt' + 'hduser')
            }
        });
}
usersRoleID = conn.lookup('uba_role', 'ID', {expression: 'name', condition: 'equal', values: {name: 'HealthDepartment'}});
if(!usersRoleID)
{
console.info('\t\tcreate new `HealthDepartment` role');
        usersRoleID = conn.insert({
            entity: 'uba_role',
            fieldList: ['ID'],
            execParams: {
                name: 'HealthDepartment',
                description: 'Health department role'
            }
        });
}

var checkUserInRole = conn.lookup('uba_userrole', 'ID',
      conn.Repository('uba_userrole').where('userID', '=', userID).where('roleID', '=', usersRoleID).ubRequest().whereList
     );
if(!checkUserInRole)
{
console.info('\t\tadd hd_user to Health department role');
        conn.insert({
            entity: 'uba_userrole',
        execParams: {
                userID: userID,
        roleID: usersRoleID
            }
        });
}


desktopID =  conn.lookup('ubm_desktop', 'ID', {expression: 'code', condition: 'equal', values: {code: 'CityReq_desktop'}});
if(desktopID){
var checkRoleInDesktop = conn.lookup('ubm_desktop_adm', 'ID',
      conn.Repository('ubm_desktop_adm').where('instanceID', '=', desktopID).where('admSubjID', '=', usersRoleID).ubRequest().whereList
     );
if(!checkRoleInDesktop){
console.info('\t\tprovide rights for `CityReq_desktop` to HealthDepartment role');
    conn.insert({
        entity: 'ubm_desktop_adm',
        execParams: {
            instanceID: desktopID,
            admSubjID: usersRoleID
        }
    });
}

lastID=conn.lookup('ubm_navshortcut', 'ID',{expression: 'code', condition: 'equal', values: {code: 'req_reqList'}});
if(lastID){
var checkRoleInShortcut = conn.lookup('ubm_navshortcut_adm', 'ID',
      conn.Repository('ubm_navshortcut_adm').where('instanceID', '=', lastID).where('admSubjID', '=', usersRoleID).ubRequest().whereList
     );
if(!checkRoleInShortcut){
console.info('\t\tprovide rights for `req_reqList` shortcut to HealthDepartment role');
    conn.insert({
        entity: 'ubm_navshortcut_adm',
        execParams: {
            instanceID: lastID,
            admSubjID: usersRoleID
        }
    });
}
}


}

//entity level security
var checkCodeEls = conn.lookup('uba_els', 'ID',
      conn.Repository('uba_els').where('code', '=', 'READ_UPD_REQ_HD').ubRequest().whereList
     );
if(!checkCodeEls){
console.info('\t\tprovide rights for `req*` entities to HealthDepartment role');
    conn.insert({
        entity: 'uba_els',
        execParams: {
            code: 'READ_UPD_REQ_HD',
            entityMask: 'req*',
        methodMask: '[su]*',
        ruleType: 'A',
        ruleRole: usersRoleID,
        description: 'Read and update RequestList model'

        }
    });
}
}
