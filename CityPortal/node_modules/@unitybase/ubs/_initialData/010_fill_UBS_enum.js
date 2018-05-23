/**
 * Fill UBS model enums
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session){
    var
        csvLoader = require('@unitybase/base').dataLoader,
        conn = session.connection;

  let domain = conn.getDomainInfo()
  if (!domain.has('ubm_enum')) {
    console.info('\tSkip adding UBS models enum - entity `ubm_enum` not in domain')
    return
  }
    console.info('\tFill enumeration for UBS model');
    csvLoader.loadSimpleCSVData(conn, __dirname + '/ubm_enum-UBS.csv', 'ubm_enum', 'eGroup;code;name;sortOrder'.split(';'), [0, 1, 2, 3], 1);
};