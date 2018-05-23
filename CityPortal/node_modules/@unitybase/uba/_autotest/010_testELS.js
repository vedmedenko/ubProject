/**
 * User: pavel.mash
 * Date: 09.10.14
 * Entity Level Security (ELS) rules test
 */

const _ = require('lodash')
const UBA_COMMON = require('@unitybase/base').uba_common
const assert = require('assert')
const ok = assert.ok
const fs = require('fs')
const cmdLineOpt = require('@unitybase/base').options
const argv = require('@unitybase/base').argv
const TEST_NAME = 'Entity Level Security (ELS) test'

module.exports = function runELSTest (options) {
  let session, conn

  if (!options) {
    let opts = cmdLineOpt.describe('', TEST_NAME)
      .add(argv.establishConnectionFromCmdLineAttributes._cmdLineParams)
    options = opts.parseVerbose({}, true)
    if (!options) return
  }

  session = argv.establishConnectionFromCmdLineAttributes(options)
  // if (!session.__serverStartedByMe) {
  //   throw new Error('Shut down server before run this test')
  // }
  conn = session.connection

  try {
    console.debug('Start ' + TEST_NAME)
    testELS()
  } finally {
    // session.logout()
  }

  function testELS () {
    let domainInfo = conn.getDomainInfo()
    let addedArray = []

    function relogon (credential) {
      let opts = _.merge({}, options, {forceStartServer: true}, credential)
      session.logout() // shut down server
      session = argv.establishConnectionFromCmdLineAttributes(opts)
      conn = session.connection
    }

    let testUserID = conn.lookup('uba_user', 'ID', {expression: 'name', condition: 'equal', values: { name: 'testelsuser'}})

    if (testUserID) {
      console.warn('\t\tSkip ELS test - uba_user "testelsuser" already exists. Test can be run only once after app initialization')
      return
    }

    const TEST_ENTITY = 'uba_role'

    assert.deepEqual(Object.keys(domainInfo.get(TEST_ENTITY).entityMethods).sort(), ['select', 'insert', 'update', 'addnew', 'delete'].sort(), 'must be 5 permission for ' + TEST_ENTITY + ' methods but got: ' + JSON.stringify(domainInfo.get(TEST_ENTITY).entityMethods))

    console.debug('Create new role testRole, user testelsuser and assign testelsuser to testRole')

    testUserID = conn.insert({
      entity: 'uba_user',
      fieldList: ['ID'],
      execParams: {
        name: 'testelsuser'
      }
    })
    conn.xhr({
      UBMethod: 'changePassword',
      data: {
        newPwd: 'testElsPwd',
        forUser: 'testelsuser'
      }
    })
    let testRole1 = conn.insert({
      entity: 'uba_role',
      fieldList: ['ID', 'mi_modifyDate'],
      execParams: {
        name: 'testRole',
        allowedAppMethods: 'ubql'
      }
    })
    function grantRoleToUser (roleID, userID) {
      return conn.insert({
        entity: 'uba_userrole',
        fieldList: ['ID'],
        execParams: {
          userID: userID,
          roleID: roleID
        }
      })
    }

    grantRoleToUser(testRole1[0], testUserID)

    assert.throws(function () { grantRoleToUser(testRole1[0], testUserID) }, /.*/, 'must deny duplicate roles adding')
    console.debug('Start re-logon using testelsuser user')
    relogon({user: 'testelsuser', pwd: 'testElsPwd'})

    /* deprecated since 1.8. Now Everyone role add getDomainInfo rights
     assert.throws(function(){
     domainInfo = conn.getDomainInfo();
     }, /405:/, 'getDomainInfo app level method is forbidden');

     */
    domainInfo = conn.getDomainInfo()
    assert.ok(domainInfo)
    relogon()

    console.debug('Extend allowedAppMethods for role testRole by add getDomainInfo app level method')
    conn.query({
      entity: 'uba_role',
      fieldList: ['ID'],
      method: 'update',
      execParams: {
        ID: testRole1[0],
        mi_modifyDate: testRole1[1],
        allowedAppMethods: 'ubql,getDomainInfo'
      }
    })

    console.debug('Test new role do not hav permissions')
    relogon({user: 'testelsuser', pwd: 'testElsPwd'})
    domainInfo = conn.getDomainInfo()
    if (domainInfo.has(TEST_ENTITY)) {
      throw new Error('no permission by default, but actual is: ' + JSON.stringify(domainInfo.get(TEST_ENTITY).entityMethods))
    }

    assert.throws(function () { conn.Repository(TEST_ENTITY).attrs('ID').select() }, /Access deny/, 'must deny select permission for testelsuser ' + TEST_ENTITY)

    function addUBSAuditPermission (method, rule) {
      let res = conn.insert({
        entity: 'uba_els',
        fieldList: ['ID'],
        execParams: {
          entityMask: TEST_ENTITY,
          methodMask: method,
          ruleType: rule,
          ruleRole: testRole1[0],
          description: 'test rule for ' + TEST_ENTITY
        }
      })
      addedArray.push(res)
      return res
    }
    let accessDenyRe = /Access deny/
    assert.throws(function () { conn.Repository(TEST_ENTITY).attrs('ID').select() }, accessDenyRe, 'must deny select permission for testelsuser ' + TEST_ENTITY)
    assert.throws(addUBSAuditPermission.bind(null, 'select', 'A'), accessDenyRe, 'must deny insert permission for testelsuser to ' + TEST_ENTITY)

    console.debug('Add permission for testElsRole to', TEST_ENTITY, 'and verify it')
    relogon()
    ok(addUBSAuditPermission('select', 'A'), 'must allow insert permission for testelsuser to ' + TEST_ENTITY)
    ok(addUBSAuditPermission('addnew', 'A'), 'must allow insert permission for testelsuser to ' + TEST_ENTITY)
    relogon({user: 'testelsuser', pwd: 'testElsPwd'})
    assert.ok(conn.Repository(TEST_ENTITY).attrs('ID').select(), 'must allow select permission for testelsuser ' + TEST_ENTITY)
    domainInfo = conn.getDomainInfo()
    assert.deepEqual(Object.keys(domainInfo.get(TEST_ENTITY).entityMethods).sort(), ['select', 'addnew'].sort(), 'testelsuser have only ' + TEST_ENTITY + '.select & addnew permission')

    console.debug('Add Compliment rule for testElsRole to' + TEST_ENTITY + '.addnew and verify it')
    relogon()
    ok(addUBSAuditPermission('addnew', 'C'), 'must allow insert permission for testelsuser to ' + TEST_ENTITY)
    relogon({user: 'testelsuser', pwd: 'testElsPwd'})
    domainInfo = conn.getDomainInfo()
    assert.deepEqual(Object.keys(domainInfo.get(TEST_ENTITY).entityMethods), ['select'], 'testelsuser have only ' + TEST_ENTITY + '.select permission')

    relogon()
    console.debug('Check beforeinsert indirect execution if insert is granted')
    ok(addUBSAuditPermission('insert', 'A'), 'add insert permission for testelsuser to ' + TEST_ENTITY)
    relogon({user: 'testelsuser', pwd: 'testElsPwd'})
    ok(conn.insert({
      entity: 'uba_role',
      fieldList: ['ID'],
      execParams: {
        name: 'testRole2',
        sessionTimeout: 10,
        allowedAppMethods: 'ubql'
      }
    }), 'must allow insert for testelsuser to ' + TEST_ENTITY)

    console.debug('Add', UBA_COMMON.ROLES.ADMIN.NAME, 'role for testelsuser and verify addnew method, complimented for role testElsRole is accessible via admin allow role')
    relogon()
    let adminRoleID = conn.lookup('uba_role', 'ID', {expression: 'name', condition: 'equal', values: {nameVal: UBA_COMMON.ROLES.ADMIN.NAME}})
    ok(adminRoleID, `role "${UBA_COMMON.ROLES.ADMIN.NAME}" not found in uba_role`)
    ok(grantRoleToUser(adminRoleID, testUserID), `role "${UBA_COMMON.ROLES.ADMIN.NAME}" not added for user testelsuser`)
    relogon({user: 'testelsuser', pwd: 'testElsPwd'})
    domainInfo = conn.getDomainInfo()
    assert.deepEqual(Object.keys(domainInfo.get(TEST_ENTITY).entityMethods).sort(), ['select', 'insert', 'update', 'addnew', 'delete'].sort(), TEST_ENTITY + ' permission for 5 method')

    console.debug('Add Deny rule for', UBA_COMMON.ROLES.ADMIN.NAME, 'role to', TEST_ENTITY, '.update and test neither admin no testelsuser have access to ', TEST_ENTITY + '.update')
    ok(conn.insert({
      entity: 'uba_els',
      fieldList: ['ID'],
      execParams: {
        entityMask: TEST_ENTITY,
        methodMask: 'update',
        ruleType: 'D',
        ruleRole: adminRoleID,
        description: 'deny ' + TEST_ENTITY + '.update for user with admin role'
      }
    }), 'D rule for ' + TEST_ENTITY + '.update not added for role' + UBA_COMMON.ROLES.ADMIN.NAME)
    relogon()
    domainInfo = conn.getDomainInfo()
    assert.deepEqual(Object.keys(domainInfo.get(TEST_ENTITY).entityMethods).sort(), ['select', 'insert', 'addnew', 'delete'].sort(), TEST_ENTITY + ' permission do not have addnew for admin')

    relogon({user: 'testelsuser', pwd: 'testElsPwd'})
    domainInfo = conn.getDomainInfo()
    assert.deepEqual(Object.keys(domainInfo.get(TEST_ENTITY).entityMethods).sort(), ['select', 'insert', 'addnew', 'delete'].sort(), +TEST_ENTITY + ' permission do not have addnew for testelsuser')

    // cleanup
    relogon()
    addedArray.forEach(function (permissionID) {
      conn.query({
        entity: 'uba_els',
        fieldList: ['ID'],
        method: 'delete',
        execParams: {
          ID: permissionID
        }
      })
    })
  }
}

