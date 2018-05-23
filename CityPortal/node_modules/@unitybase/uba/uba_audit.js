var me = uba_audit
const WebSockets = require('@unitybase/ub/modules/web-sockets')

me.entity.addMethod('secureBrowserEvent')

var __supervisorUserID = 0

function getSupervisorID () {
  var
    supervisorUserName

  if (__supervisorUserID === 0) {
    supervisorUserName = ubs_settings.getSettingValue('UBA.securityDashboard.supervisorUser')
    if (supervisorUserName) {
      __supervisorUserID = UB.Repository('uba_user').attrs('ID').where('name', '=', supervisorUserName).selectAsObject()[0].ID
    }
  }
  return __supervisorUserID
}

me.on('insert:after', function notifyAboutSecurity (ctxt) {
  var notifier = WebSockets.getWSNotifier()
  if (notifier) {
		// Send to specific user
    var userSessions = notifier.getUserSessions(getSupervisorID())
    userSessions.forEach(function (sessionID) {
      notifier.sendCommand('uba_audit_notifier', sessionID, JSON.stringify(ctxt.mParams.execParams))
    })
  }
})

const UBA_AUDIT = new TubDataStore('uba_audit')
/**
 * Store an audit events from secure browser
 * @param {ubMethodParams} ctx
 * @param {string} ctx.mParams.reason
 * @param {string} ctx.mParams.action
 */
function secureBrowserEvent (ctx) {
  var
    params = ctx.mParams,
    action = params.action || 'DOWNLOAD',
    reason = params.reason || 'Invalid client call'

  UBA_AUDIT.run('insert', {
    execParams: {
      entity: 'secureBrowser',
      entityinfo_id: 0,
      actionType: action,
      actionUser: Session.uData.login || Session.userID,
      actionTime: new Date(),
      remoteIP: Session.callerIP,
      fromValue: reason
    }
  })
}
me.secureBrowserEvent = secureBrowserEvent
