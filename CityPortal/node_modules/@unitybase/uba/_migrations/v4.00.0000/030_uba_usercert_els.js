/**
 * User: pavel.mash
 * Add ELS for uba_usercertificates
 */

const cmdLineOpt = require('@unitybase/base/options')
const argv = require('@unitybase/base/argv')
const csvLoader = require('@unitybase/base').dataLoader

/*
 * Used by ubcli initialize command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function (session) {
  if (!session) {
    let opts = cmdLineOpt.describe('', 'Execute migration script')
      .add(argv.establishConnectionFromCmdLineAttributes._cmdLineParams)
    let options = opts.parseVerbose({}, true)
    if (!options) return
    session = argv.establishConnectionFromCmdLineAttributes(options)
  }
  let conn = session.connection

  console.info('\tNew ELS for UBA model')
  csvLoader.loadSimpleCSVData(conn, __dirname + '/uba_usercert_els.csv', 'uba_els', 'code;entityMask;methodMask;ruleType;ruleRole;description'.split(';'), [
    0, 1, 2, 3,
    function (row) {
      if (typeof row[4] === 'number') {
        return 	row[4]
      } else {
        return conn.lookup('uba_role', 'ID', {expression: 'name', condition: 'equal', values: {name: row[4]}})
      }
    },
    5], 1)
}
