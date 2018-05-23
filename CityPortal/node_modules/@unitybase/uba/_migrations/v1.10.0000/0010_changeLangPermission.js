/**
 * User: pavel.mash
 * Add permission for uba_user.changeLanguage for Everyone role
 */

 /**
  * @param {cmd.argv.serverSession} session
  */
module.exports = function (session) {
  var conn = session.connection
  conn.insert({
    entity: 'uba_els',
    execParams: {
      code: 'UBA_USER_LANGCH_EVERYONE',
      description: 'Allow change language for Everyone',
      entityMask: 'uba_user',
      methodMask: 'changeLanguage',
      ruleType: 'A',
      ruleRole: 0
    }
  })
}
