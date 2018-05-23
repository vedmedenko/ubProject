var me = uba_role

var UBA_COMMON = require('./modules/uba_common')

/**
 * After inserting new user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditNewRole (ctx) {
  'use strict'
  if (!App.domain.byName('uba_audit')) {
    return
  }
  var params = ctx.mParams.execParams
  var store = new TubDataStore('uba_audit')
  var actionUserRepo = UB.Repository('uba_user').attrs('name').where('[ID]', '=', Session.userID).select()
  store.run('insert', {
    execParams: {
      entity: 'uba_role',
      entityinfo_id: params.ID,
      actionType: 'INSERT',
      actionUser: actionUserRepo.eof ? Session.userID : actionUserRepo.get('name'),
      actionTime: new Date(),
      remoteIP: Session.callerIP,
      targetRole: params.name,
      toValue: JSON.stringify(params)
    }
  })
}
me.on('insert:after', ubaAuditNewRole)

/**
 * Set description = name in case it missing
 * @param {ubMethodParams} ctxt
 */
function fillRoleDescriptionIfMissing (ctxt) {
  let params = ctxt.mParams.execParams
  if (!params.description) {
    params.description = params.name
  }
}
me.on('insert:before', fillRoleDescriptionIfMissing)

/**
 * After updating user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditModifyRole (ctx) {
  if (!App.domain.byName('uba_audit')) {
    return
  }
  var
    params = ctx.mParams.execParams,
    store = new TubDataStore('uba_audit'),
    actionUserRepo = UB.Repository('uba_user').attrs('name').where('[ID]', '=', Session.userID).select(),
    origStore = ctx.dataStore,
    origName = origStore.currentDataName,
    oldValues, oldName

  try {
    origStore.currentDataName = 'selectBeforeUpdate'
    oldValues = origStore.asJSONObject
    oldName = origStore.get('name')
  } finally {
    origStore.currentDataName = origName
  }

  if (params.name) {
    store.run('insert', {
      execParams: {
        entity: 'uba_role',
        entityinfo_id: params.ID,
        actionType: 'DELETE',
        actionUser: actionUserRepo.eof ? Session.userID : actionUserRepo.get('name'),
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetRole: oldName,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
    store.run('insert', {
      execParams: {
        entity: 'uba_role',
        entityinfo_id: params.ID,
        actionType: 'INSERT',
        actionUser: actionUserRepo.eof ? Session.userID : actionUserRepo.get('name'),
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetRole: params.name,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
  } else {
    store.run('insert', {
      execParams: {
        entity: 'uba_role',
        entityinfo_id: params.ID,
        actionType: 'UPDATE',
        actionUser: actionUserRepo.eof ? Session.userID : actionUserRepo.get('name'),
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetRole: oldName,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
  }
}
me.on('update:after', ubaAuditModifyRole)

/**
 * After deleting user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditDeleteRole (ctx) {
  if (!App.domain.byName('uba_audit')) {
    return
  }
  var
    params = ctx.mParams.execParams,
    store = new TubDataStore('uba_audit'),
    actionUserRepo = UB.Repository('uba_user').attrs('name').where('[ID]', '=', Session.userID).select(),
    origStore = ctx.dataStore,
    origName = origStore.currentDataName,
    oldValues, oldName

  try {
    origStore.currentDataName = 'selectBeforeDelete'
    oldValues = origStore.asJSONObject
    oldName = origStore.get('name')
  } finally {
    origStore.currentDataName = origName
  }

  store.run('insert', {
    execParams: {
      entity: 'uba_role',
      entityinfo_id: params.ID,
      actionType: 'DELETE',
      actionUser: actionUserRepo.eof ? Session.userID : actionUserRepo.get('name'),
      actionTime: new Date(),
      remoteIP: Session.callerIP,
      targetRole: oldName,
      fromValue: oldValues
    }
  })
}
me.on('delete:after', ubaAuditDeleteRole)

/**
 * Prevent delete a build-in roles
 * @param {ubMethodParams} ctx
 */
function disableBuildInRoleDelete (ctx) {
  var
    params = ctx.mParams.execParams,
    ID = params.ID

  for (let role in UBA_COMMON.ROLES) {
    if (UBA_COMMON.ROLES[role].ID === ID) {
      throw new UB.UBAbort('<<<Removing of built-in role is prohibited>>>')
    }
  }
}
me.on('delete:before', disableBuildInRoleDelete)
