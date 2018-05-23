/**
 * User: pavel.mash
 * Fill navigation shortcuts for UBQ model
 */

/**
 * Initial script for create UnityBase Administration desktop navigation shortcuts for UBQ model
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function (session) {
  'use strict'
  var desktopID, folderID, conn = session.connection

  desktopID = conn.lookup('ubm_desktop', 'ID', {
    expression: 'code',
    condition: 'equal',
    values: {code: 'adm_desktop'}
  })
  if (!desktopID) {
    throw new Error('Can\'t find row in ubm_desktop with code="adm_desktop". May be UBA model initialized incorrectly?')
  }

  folderID = conn.lookup('ubm_navshortcut', 'ID', {
    expression: 'code',
    condition: 'equal',
    values: {code: 'adm_folder_UBQ'}
  })
  if (!folderID) {
    console.log('\t\tcreate `Queue` folder')
    folderID = conn.insert({
      entity: 'ubm_navshortcut', fieldList: ['ID'], execParams: {
        desktopID: desktopID,
        code: 'adm_folder_UBQ',
        caption: 'Queue',
        isFolder: true,
        isCollapsed: false,
        iconCls: 'fa fa-ellipsis-h',
        displayOrder: 50
      }
    })
  }
  console.log('\t\tuse `Queue` folder')

  console.log('\t\t\tcreate `Schedulers` shortcut')
  conn.insert({
    fieldList: ['ID'], entity: 'ubm_navshortcut', execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'ubq_scheduler',
      caption: 'Schedulers',
      displayOrder: 10,
      cmdCode: JSON.stringify({
        cmdType: 'showList', cmdData: {
          params: [{
            entity: 'ubq_scheduler', method: 'select', fieldList: '*'
          }]
        }
      }, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Queue items` shortcut')
  conn.insert({
    fieldList: ['ID'], entity: 'ubm_navshortcut', execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'ubq_messages',
      caption: 'Queue',
      displayOrder: 10,
      cmdCode: JSON.stringify({
        'cmdType': 'showList', 'cmdData': {
          'params': [{
            'entity': 'ubq_messages', 'method': 'select', 'fieldList': '*'
          }]
        }
      }, null, '\t')
    }
  })

  console.log('\t\t\tcreate `Queue statistics` shortcut')
  conn.insert({
    fieldList: ['ID'], entity: 'ubm_navshortcut', execParams: {
      desktopID: desktopID,
      parentID: folderID,
      code: 'ubq_runstat',
      caption: 'Statistics',
      displayOrder: 20,
      cmdCode: JSON.stringify({
        'cmdType': 'showList', 'cmdData': {
          'params': [{
            'entity': 'ubq_runstat', 'method': 'select', 'fieldList': '*'
          }]
        }
      }, null, '\t')
    }
  })
}
