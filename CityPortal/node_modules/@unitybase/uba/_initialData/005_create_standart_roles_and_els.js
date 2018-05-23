/**
 * User: pavel.mash
 * Create roles users / powerUsers / supervisors
 */

/**
 * Initial script for create UnityBase Administration desktop navigation shortcuts for UBA model
 * Used by ubcli initialize command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function (session) {
  var conn = session.connection

  var csvLoader = require('@unitybase/base').dataLoader

  console.info('\tFill ELS for UBA model')
  csvLoader.loadSimpleCSVData(conn, __dirname + '/uba_els.csv', 'uba_els', 'code;entityMask;methodMask;ruleType;ruleRole;description'.split(';'), [
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
