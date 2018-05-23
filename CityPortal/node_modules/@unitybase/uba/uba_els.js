var me = uba_els

/**
 * After inserting new user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditNewEls (ctx) {
  if (!App.domain.byName('uba_audit')) {
    return
  }
  var params = ctx.mParams.execParams
  var store = new TubDataStore('uba_audit')
  var ruleRole = params.ruleRole
  if (ruleRole) {
    ruleRole = UB.Repository('uba_role').attrs('name').where('[ID]', '=', ruleRole).select()
    ruleRole = ruleRole.eof ? params.ruleRole : ruleRole.get('name')
  }

  store.run('insert', {
    execParams: {
      entity: 'uba_els',
      entityinfo_id: params.ID,
      actionType: 'INSERT',
      actionUser: Session.uData.login,
      actionTime: new Date(),
      remoteIP: Session.callerIP,
      targetRole: ruleRole,
      toValue: JSON.stringify(params)
    }
  })
}
me.on('insert:after', ubaAuditNewEls)

/**
 * After updating user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditModifyEls (ctx) {
  if (!App.domain.byName('uba_audit')) {
    return
  }
  var
    params = ctx.mParams.execParams,
    store = new TubDataStore('uba_audit'),
    origStore = ctx.dataStore,
    origName = origStore.currentDataName,
    oldValues,
    ruleRole, ruleRoleNew = params.ruleRole, obj
  if (ruleRoleNew) {
    obj = UB.Repository('uba_role').attrs('name').where('[ID]', '=', ruleRoleNew).select()
    ruleRoleNew = obj.eof ? ruleRoleNew : obj.get('name')
  }

  try {
    origStore.currentDataName = 'selectBeforeUpdate'
    oldValues = origStore.asJSONObject
    ruleRole = origStore.get('ruleRole')
  } finally {
    origStore.currentDataName = origName
  }
  if (ruleRole && params.ruleRole !== ruleRole) {
    obj = UB.Repository('uba_role').attrs('name').where('[ID]', '=', ruleRole).select()
    ruleRole = obj.eof ? ruleRole : obj.get('name')
  } else {
    ruleRole = null
  }

  if (ruleRole && ruleRoleNew !== ruleRole) {
    store.run('insert', {
      execParams: {
        entity: 'uba_els',
        entityinfo_id: params.ID || oldValues.ID,
        actionType: 'DELETE',
        actionUser: Session.uData.login,
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetRole: ruleRole,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
    store.run('insert', {
      execParams: {
        entity: 'uba_els',
        entityinfo_id: params.ID || oldValues.ID,
        actionType: 'INSERT',
        actionUser: Session.uData.login,
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetRole: ruleRoleNew,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
  } else {
    store.run('insert', {
      execParams: {
        entity: 'uba_els',
        entityinfo_id: params.ID || oldValues.ID,
        actionType: 'UPDATE',
        actionUser: Session.uData.login,
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetRole: ruleRole || ruleRoleNew,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
  }
}
me.on('update:after', ubaAuditModifyEls)

/**
 * After deleting user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditDeleteEls (ctx) {
  if (!App.domain.byName('uba_audit')) {
    return
  }
  var
    store = new TubDataStore('uba_audit'),
    params = ctx.mParams.execParams,
    origStore = ctx.dataStore,
    origName = origStore.currentDataName,
    oldValues,
    ruleRole, ruleRoleObj

  try {
    origStore.currentDataName = 'selectBeforeDelete'
    oldValues = origStore.asJSONObject
    ruleRole = origStore.get('ruleRole')
  } finally {
    origStore.currentDataName = origName
  }
  if (ruleRole) {
    ruleRoleObj = UB.Repository('uba_role').attrs('name').where('[ID]', '=', ruleRole).select()
    ruleRole = ruleRoleObj.eof ? ruleRole : ruleRoleObj.get('name')
  }

  store.run('insert', {
    execParams: {
      entity: 'uba_els',
      entityinfo_id: params.ID || oldValues.ID,
      actionType: 'DELETE',
      actionUser: Session.uData.login,
      actionTime: new Date(),
      remoteIP: Session.callerIP,
      targetRole: ruleRole,
      fromValue: oldValues
    }
  })
}
me.on('delete:after', ubaAuditDeleteEls)
