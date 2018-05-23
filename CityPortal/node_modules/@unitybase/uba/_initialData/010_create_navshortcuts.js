/**
 * User: pavel.mash
 * Fill navigation shortcuts for UBA model
 */

/**
 * Initial script for create UnityBase Administration desktop navigation shortcuts for UBA model
 * Used by ubcli initialize command
 * @param {ServerSession} session
 */
module.exports = function (session) {
  let desktopID, folderID
  let conn = session.connection
  let domain = conn.getDomainInfo()
  if (!domain.has('ubm_desktop') || !domain.has('ubm_navshortcut')) {
    console.info('\tSkip shortcut initialization - entity ubm_navshortcut not in domain')
    return
  }
  desktopID = conn.lookup('ubm_desktop', 'ID', {
    expression: 'code',
    condition: 'equal',
    values: {code: 'adm_desktop'}
  })
  console.info('\tFill `Administrator` desktop')
  if (!desktopID) {
    console.info('\t\tcreate new `Administrator` desktop')
    desktopID = conn.insert({
      entity: 'ubm_desktop',
      fieldList: ['ID'],
      execParams: {
        code: 'adm_desktop',
        caption: 'Administrator'
      }
    })
  } else {
    console.info('\t\tuse existed desktop with code `adm_desktop`', desktopID)
  }

  console.log('\t\tcreate `Users` folder')
  folderID = conn.insert({
    entity: 'ubm_navshortcut',
    fieldList: ['ID'],
    execParams: {
      desktopID: desktopID,
      code: 'adm_folder_users',
      caption: 'Groups and Users',
      isFolder: true,
      isCollapsed: false,
      iconCls: 'fa fa-folder-o',
      displayOrder: 10
    }
  })

  console.log('\t\t\tcreate `User list` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_user',
      caption: 'User list',
      iconCls: 'fa fa-user',
      displayOrder: 10,
      cmdCode: JSON.stringify({
        cmdType: 'showList',
        cmdData: {params: [{
          entity: 'uba_user', method: 'select', fieldList: ['disabled', 'isPending', 'name', 'firstName', 'lastName']
        }]}
      }, null, '\t')
    }
  })

  console.log('\t\t\tcreate `User roles` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_userrole',
      caption: 'User roles',
      displayOrder: 20,
      cmdCode: JSON.stringify({
        cmdType: 'showList',
        cmdData: {params: [{entity: 'uba_userrole', method: 'select', fieldList: ['userID', 'roleID']}]}
      }, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Group list` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_group',
      caption: 'Group list',
      iconCls: 'fa fa-group',
      displayOrder: 30,
      cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [{entity: 'uba_group', method: 'select', fieldList: ['name', 'description', 'code']}]}}, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Advanced security')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_advSecurity',
      caption: 'Advanced security',
      displayOrder: 15,
      iconCls: 'fa fa-user-secret',
      cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [{entity: 'uba_advSecurity', method: 'select', fieldList: ['*'] }]}}, null, '\t')
    }
  })

  console.log('\t\t\tcreate `User groups` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_usergroup',
      caption: 'User groups',
      displayOrder: 40,
      cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [{entity: 'uba_usergroup', method: 'select', fieldList: ['userID', 'groupID']}]}}, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Certificates` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_usercertificate',
      caption: 'Certificates',
      iconCls: 'fa fa-key',
      isFolder: false,
      displayOrder: 50,
      cmdCode: JSON.stringify({
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'uba_usercertificate',
            method: 'select',
            fieldList: ['userID', 'issuer_cn', 'serial', 'disabled', 'revoked']
          }]
        }
      })
    }
  })

  console.log('\t\tcreate `Security` folder')
  folderID = conn.insert({
    entity: 'ubm_navshortcut',
    fieldList: ['ID'],
    execParams: {
      desktopID: desktopID,
      code: 'adm_folder_security',
      caption: 'Security',
      isFolder: true,
      isCollapsed: false,
      iconCls: 'fa fa-lock',
      displayOrder: 20
    }
  })

  console.log('\t\t\tcreate `System roles` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_role',
      caption: 'System roles',
      iconCls: 'fa fa-users',
      displayOrder: 10,
      cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [{entity: 'uba_role', method: 'select', fieldList: '*'}]}}, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Entity level security` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_els',
      caption: 'Entity level security',
      displayOrder: 20,
      cmdCode: JSON.stringify({
        cmdType: 'showList',
        cmdData: {
          params: [{
            entity: 'uba_els',
            method: 'select',
            fieldList: ['code', 'description', 'disabled', 'entityMask', 'methodMask', 'ruleType', 'ruleRole']
          }]
        }
      })
    }
  })

  console.log('\t\t\tcreate `Attribute level security` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_als',
      caption: 'Attribute level security',
      displayOrder: 30,
      cmdCode: JSON.stringify({
        cmdType: 'showList',
        cmdData: {params: [{entity: 'uba_als', method: 'select', fieldList: '*'}]}
      }, null, '\t')
    }
  })

  console.log('\t\t\tcreate `One-time passwords` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_otp',
      caption: 'One-time passwords',
      iconCls: 'fa fa-eye',
      displayOrder: 40,
      cmdCode: JSON.stringify({
        cmdType: 'showList',
        cmdData: {params: [{entity: 'uba_otp', method: 'select', fieldList: '*'}]}
      }, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Security audit')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_audit',
      caption: 'Security audit',
      displayOrder: 60,
      iconCls: 'fa fa-lock',
      cmdCode: JSON.stringify({'cmdType': 'showList',
                'cmdData': {
                  'params': [{
                    'entity': 'uba_audit',
                    'method': 'select',
                    'fieldList': ['entity', 'entityinfo_id', 'actionType', 'actionUser', 'actionTime', 'remoteIP', 'targetUser', 'targetRole']
                  }]
                }
           }, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Security monitor')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
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

  console.log('\t\t\tcreate `Audit Trail` shortcut')
  conn.insert({
    fieldList: ['ID'],
    entity: 'ubm_navshortcut',
    execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'uba_auditTrail',
      caption: 'Audit Trail',
      displayOrder: 40,
      cmdCode: JSON.stringify({
        cmdType: 'showList',
        autoFilter: true,
        cmdData: {params: [{entity: 'uba_auditTrail', method: 'select', fieldList: '*'}]}
      }, null, '\t')
    }
  })
}
