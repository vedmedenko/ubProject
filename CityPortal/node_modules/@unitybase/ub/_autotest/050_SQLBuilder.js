/**
 * User: felix
 * Date: 26.01.14
 * This test connect to UB server and do select for all entities
 */
const assert = require('assert')
const fs = require('fs')
const cmdLineOpt = require('@unitybase/base').options
const argv = require('@unitybase/base').argv
const TEST_NAME = 'SQL builder test'

module.exports = function runTest (options) {
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
    testCommon(conn)
  } finally {
    // session.logout()
  }

  function testCommon (conn) {
    let res

    console.debug('Test where item condition "LIKE"')

    assert.doesNotThrow(
      function () {
        conn.Repository('uba_user').attrs('ID', 'name').where('name', 'in', [ 'as:da', 'admin' ]).selectAsArray()
      },
      'string parameters with : inside must not throw'
    )

    // 1
    res = conn.Repository('uba_user')
      .attrs([ 'ID' ])
      .where('[name]', 'like', 'admin')
      .limit(1)
      .selectAsArray()

    assert.equal(res.resultData.rowCount, 1, 'LIKE not work (1)')

    // 2
    res = conn.Repository('uba_user')
      .attrs([ 'ID' ])
      .where('[name]', 'like', 'ADMIN')
      .limit(1)
      .selectAsArray()

    assert.equal(res.resultData.rowCount, 1, 'LIKE not work (2)')

    // 3
    res = conn.Repository('uba_user')
      .attrs([ 'ID' ])
      .where('[name]', 'like', 'Admin')
      .limit(1)
      .selectAsArray()

    assert.equal(res.resultData.rowCount, 1, 'LIKE not work (3)')

    // 4
    res = conn.Repository('uba_user')
      .attrs([ 'ID' ])
      .where('[ID]', 'in', [ 10, 20 ])
      .limit(3)
      .selectAsArray()

    // in subquery
    res = conn.Repository('uba_user')
      .attrs([ 'ID' ])
      // .where('[ID]', 'in', [10, 20])
      .where('ID', 'in', conn.Repository('uba_user').attrs([ 'ID' ]).limit(1))
      .limit(3)
      .selectAsArray()

    // exists
    // who do not login during this year
    res = conn.Repository('uba_user')
      .attrs([ 'ID' ])
      .notExists(
        conn.Repository('uba_audit')
          .correlation('actionUser', 'name')  // not a simple expression!
          .where('[actionTime]', '>', new Date(2016, 1, 1))
          .where('[actionType]', '=', 'LOGIN')
      )
      // but modify some data
      .exists(
        conn.Repository('uba_auditTrail')
          .where('[{master}.ID] =[ID]', 'custom') // here we link to uba_user.ID
          .where('[actionTime]', '>', new Date(2016, 1, 1))
      ).select()
  }
}
