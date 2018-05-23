/*
 * Constants for administrative security model
 * Created by pavel.mash on 15.09.2016.
 */

const USERS = {
  ADMIN: {
    ID: 10,
    NAME: 'admin',
    HASH: nsha256('salt' + 'admin')
  },
  ANONYMOUS: {
    ID: 20,
    NAME: 'anonymous',
    HASH: '-' // impossible to log in
  }
}
const ROLES = {
  EVERYONE: {
    ID: 0,
    NAME: 'Everyone',
    ENDPOINTS: 'auth,timeStamp,statics,getAppInfo,models,getDomainInfo,ubql,rest',
    DESCR: 'Everyone build-in role',
    TIMEOUT: 1000
  },
  ADMIN: {
    ID: 1,
    NAME: 'Admin',
    ENDPOINTS: '*',
    DESCR: 'Admin build-in role',
    TIMEOUT: 10
  },
  ANONYMOUS: {
    ID: 2,
    NAME: 'Anonymous',
    ENDPOINTS: '',
    DESCR: 'Anonymous build-in role',
    TIMEOUT: 1000
  },
  USER: {
    ID: 3,
    NAME: 'User',
    ENDPOINTS: 'logout,changePassword,setDocument,getDocument',
    DESCR: 'User build-in role',
    TIMEOUT: 30
  },
  SUPERVISOR: {
    ID: 4,
    NAME: 'Supervisor',
    ENDPOINTS: '',
    DESCR: 'Supervisor build-in role',
    TIMEOUT: 10
  },
  DEVELOPER: {
    ID: 5,
    NAME: 'Developer',
    ENDPOINTS: '',
    DESCR: 'Developer build-in role',
    TIMEOUT: 10
  },
  MONITOR: {
    ID: 6,
    NAME: 'Monitor',
    ENDPOINTS: 'stat',
    DESCR: 'Monitor build-in role',
    TIMEOUT: 100
  }
}

module.exports = {
  /** Build-in users */
  USERS: USERS,
  /** Build-in roles */
  ROLES: ROLES,
  /** Name of Audit Trail entity */
  AUDIT_TRAIL_ENTITY: 'uba_auditTrail',
  /**
   * Do not allow assign of Everyone & Anonymous preudo-roles.
   * Allow assign `admins` role only by `admins` member.
   *
   *
   * @param {ubMethodParams} ctxt
   */
  denyBuildInRoleAssignmentAndAdminsOnlyForAdmins: function (ctxt) {
    let params = ctxt.mParams.execParams
    let role = params.roleID

    if (role === ROLES.EVERYONE.ID) {
      throw new Error(`<<<${ROLES.EVERYONE.ID} pseudo-role is assigned automatically>>>`)
    }
    if (role === ROLES.ANONYMOUS.ID) {
      throw new Error(`<<<${ROLES.ANONYMOUS.ID} pseudo-role is assigned automatically>>>`)
    }
    if (role === ROLES.USER.ID) {
      throw new Error(`<<<${ROLES.USER.ID} pseudo-role is assigned automatically>>>`)
    }
    if ((role === ROLES.ADMIN.ID) && (Session.userRoleNames.split(',').indexOf(ROLES.ADMIN.NAME) === -1)) {
      throw new Error(`<<<Only members with ${ROLES.ADMIN.NAME} role are allowed for assign a ${ROLES.ADMIN.NAME} role to other members>>>`)
    }
  },
  /**
   * Check logged in user is superuser (have a Admin role)
   * @returns {boolean}
   */
  isSuperUser: function () {
    return Session.uData.roleIDs.indexOf(ROLES.ADMIN.ID) > -1
  }
}
