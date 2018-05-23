/**
 * User: pavel.mash
 * Fill navigation shortcuts for UBA model
 */

/**
 * Initial script for create UnityBase Administration desktop navigation shortcuts for UBA model
 * Used by cmd\initialize command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function (session) {
  var desktopID, folderID, conn = session.connection

  desktopID = conn.lookup('ubm_desktop', 'ID', {
    expression: 'code',
    condition: 'equal',
    values: {code: 'adm_desktop'}
  })
  if (!desktopID) {
    throw new Error('adm_desktop not found')
  }
  folderID = conn.lookup('ubm_navshortcut', 'ID', {
    expression: 'code',
    condition: 'equal',
    values: {code: 'adm_folder_security'}
  })

  console.log('\t\t\tcreate `Security monitor')
  conn.insert({
    fieldList: ['ID'], entity: 'ubm_navshortcut', execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_audit-securityDashboard',
      caption: 'Security dashboard',
      displayOrder: 70,
      iconCls: 'fa fa-user-secret ',
      cmdCode: JSON.stringify({
        cmdType: 'showForm',
        formCode: 'uba_audit-securityDashboard'
      }, null, '\t')
    }
  })
}
