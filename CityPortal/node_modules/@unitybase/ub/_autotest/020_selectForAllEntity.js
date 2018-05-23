/**
 * User: pavel.mash
 * Date: 23.01.14
 * This test connect to UB server and do select for all entities
 */
const assert = require('assert')
const ok = assert.ok
const fs = require('fs')
const cmdLineOpt = require('@unitybase/base').options
const argv = require('@unitybase/base').argv
const TEST_NAME = 'Select from all entities'

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
    testAllSelect(conn)
  } finally {
    // session.logout()
  }

  /**
   *
   * @param {UBConnection} conn
   */
  function testAllSelect (conn) {
    let recCnt = 0
    let ettCnt = 0
    let domain = conn.getDomainInfo()
    domain.eachEntity(function (entity, eName) {
      if (entity.haveAccessToMethod('select')) {
        console.debug('run select for %s', eName)
        let res = conn.Repository(eName).attrs(Object.keys(entity.attributes)).limit(10).selectAsArray()
        ok(typeof res === 'object' && res.resultData &&
          res.resultData.data && Array.isArray(res.resultData.data) &&
          res.resultData.rowCount === +res.resultData.rowCount, 'result is dataStore in array representation. Entity: ' + eName)
        recCnt += res.resultData.rowCount
        ettCnt++
      } else {
        console.debug('run select for %s. No "select" method permission. Test skipped', eName)
      }
    })
    console.debug('Entity tested %d. Rows selected %d', ettCnt, recCnt)
  }
}

