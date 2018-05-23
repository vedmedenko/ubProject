/**
 * UnityBase Row Level Security routines. For use in rls mixin.
 * @author MPV
 * Comment by Felix: Внимание! Для Оракла НЕЛЬЗЯ начинать алиас таблицы с символа подчеркивания '_'
 */

/* global Session: false, TubDataStore */
/**
 * @namespace
 */
var RLS = UB.ns('RLS')
global['$'] = RLS

var
    roleCache // it's safe to cache roles here because uba_role table is readonly in production

RLS.initCache = function () {
  var
        rInst
  if (!roleCache) {
    roleCache = {}
    rInst = new TubDataStore('uba_role')
        // here is direct SQL because permission to uba_role dose not exist for non-supervisor user's
    rInst.runSQL('select ID, name FROM uba_role', {})
    while (!rInst.eof) {
      roleCache[rInst.get(1)] = rInst.get(0) // roleCashce['admin'] = 1 e.t.c.
      rInst.next()
    }
  }
}

RLS.currentOwner = function () {
  return '( [mi_owner] = :(' + Session.userID + '): )'
}

/**
 * todo - OPTIMIZE using role cache
 * @param user
 * @param groupname
 * @return {String}
 */
RLS.userInGroup = function (user, groupname) {
  return "exists (select 1 from UBA_USERROLE ur inner join UBA_ROLE r ON ur.RoleID = r.ID WHERE  r.name = :('" + groupname + "'): AND ur.UserID = :(" + user + '): )'
}

/**
 * is current ( Session.userID) user have role with name groupname
 * @param groupname group name from uba_role
 * @return {*}
 */
RLS.currentUserInGroup = function (sender, groupname) {
  var
	groupID

  RLS.initCache()
  groupID = roleCache[groupname]
  if (groupID && new RegExp('\\b' + groupID + '\\b').test(Session.userRoles)) {
    return '(1=1)'
  } else {
    return '(0=1)'
  }
/*    if ( RLS.isOracle(sender.entity) ){
        return '( BITAND(' + Session.userRoles + ',' + (roleCache[groupname] || 0) + ')!=0 )';
    }
    else {
        return '( (' + Session.userRoles + ' & ' + (roleCache[groupname] || 0) + ')!=0 )';
    }
*/
}

/* Session.userRoles is comma separated string of group ID's
  RLS.currentUserInGroupByFieldName = function(sender, fieldName){
      return '( (' + Session.userRoles + ' & ' + (fieldName || 0) + ')!=0 )';

}; */

/**
*   Check user in adm subtable
*   no user group check performed!
*/
RLS.userInAdmSubtable = function (sender, user) {
  return 'exists (select 1 from ' + sender.entity.name + '_adm admsubtable where admsubtable.instanceID = [ID] and admsubtable.admSubjID = :(' + user + '): )'
}

/**
 *   Check staff unit in adm subtable by admOrgUnitID field
 */
RLS.currentStaffUnitInDocAdmSubtable = function (sender, admSubTableName) {
  var roles = Session.uData.roles
  if (/\badmins\b/.test(roles)) {
    return '1=1'
  }
  else if (/\ballSeeing\b/.test(roles)) {
    return '1=1'
  }
  else if (Session.uData.orgUnitIDs === '') {
    return '1=0'
  }
  else {
    var orgUnitIDs = Session.uData.orgUnitIDs ? Session.uData.orgUnitIDs : -1
    var result = 'exists (select 1 from ' + admSubTableName + ' admsubtable where admsubtable.instanceID = [ID] and (admsubtable.admOrgUnitID IN (' + orgUnitIDs + ') OR ' +
            'admsubtable.admSubjID IN (' + Session.userRoles + ',' + Session.userID + ')))'
    return result
  }
    // return '1=1';
}

/**
 *  Check sender staff unit
 */
RLS.currentSender = function (sender, user) {
  if (Session.uData.orgUnitIDs === '') {
    return '1=0'
  }
  else {
    return '[sendEmployee.staffUnitID] = ' + Session.uData.staffUnitID
  }
}

/**
 *  Check receiver staff unit
 */
RLS.currentReceiver = function (sender, user) {
  if (Session.uData.orgUnitIDs === '') {
    return '1=0'
  }
  else {
    return 'exists (select 1 from fld_receiver rec where rec.docID = [ID] and rec.receiveOrganization = ' + Session.uData.orgUnitIDs.split(',')[0] + ')'
  }
}

RLS.isOracle = function (entity) {
  var dialect = entity.connectionConfig.dialect
  return ((dialect === TubSQLDialect.Oracle) || (dialect === TubSQLDialect.Oracle9) ||
          (dialect === TubSQLDialect.Oracle10) || (dialect === TubSQLDialect.Oracle11))
}

/** Check user or any of user groups in adm subtable
/*  xmax using ORACLE
* _todo check oracle syntax!!
*/
RLS.userOrUserGroupInAdmSubtable = function (sender, user) {
  var result = 'exists (select 1 from ' + sender.entity.name + '_adm admsubtable where admsubtable.instanceID = [ID] and admsubtable.admSubjID in (select ur.RoleID from uba_userrole ur where ur.UserID = :(' + user + '): union select ' + user
  if (RLS.isOracle(sender.entity)) {
    return result + ' from dual ))'
  }
  else {
    return result + '))'
  }

  // exists (select 1 from ubm_navshortcut_adm admsubtable where admsubtable.instanceID = navsh.ID and admsubtable.admSubjID in (select RoleID from uba_userrole where UserID = 1000000161401 union select 1000000161401)))
}

RLS.currentUserInAdmSubtable = function (sender) {
  return this.userInAdmSubtable(sender, Session.userID)
}

RLS.currentUserOrUserGroupInAdmSubtable = function (sender) {
  return this.userOrUserGroupInAdmSubtable(sender, Session.userID)
}

RLS.depForUser = function (sender, user) {
  var isOra = RLS.isOracle(sender.entity)
  return '(select ounit.parentID ' +
        'from org_user ouser, org_employee oe, org_employeeonstaff oeos, ' +
        '  org_staffunit osu, org_unit ounit ' +
        'where oe.id = ouser.employeeID ' +
        'and oeos.employeeID = oe.id ' +
        (isOra ?
        'and sysdate between oeos.mi_dateFrom and oeos.mi_dateTo ' :
        'and getdate() between oeos.mi_dateFrom and oeos.mi_dateTo ') +
        'and osu.id = oeos.staffUnitID ' +
        'and ounit.id = osu.ID ' +
        'and ouser.userID = ' + user + ')'
}

RLS.staffUnitForUser = function (sender, user) {
  return '(select oeos.staffUnitID ' +
        'from org_user ouser, org_employee oe, org_employeeonstaff oeos ' +
        'where ouser.userID = ' + user + ' ' +
        'and oe.id = ouser.employeeID ' +
        'and oeos.employeeID = oe.id ' +
        (isOra ?
        'and sysdate between oeos.mi_dateFrom and oeos.mi_dateTo)' :
        'and getdate() between oeos.mi_dateFrom and oeos.mi_dateTo)')
}

RLS.userInIncdocRecipient = function (sender, user) {
  return this.staffUnitForUser(sender, Session.userID) + ' in (select b.destID from doc_incdoc_org_stunit b where b.sourceID = [ID])'
}
