/**
 * Fill UBM model enums
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session){
    "use strict";
    var
        csvLoader = require('@unitybase/base').dataLoader,
        conn = session.connection;

    console.info('\tFill enumeration for UBM model');
    csvLoader.loadSimpleCSVData(conn, __dirname + '/ubm_enum-UBM.csv', 'ubm_enum', 'eGroup;code;name;sortOrder'.split(';'), [0, 1, 2, 3], 1);
};