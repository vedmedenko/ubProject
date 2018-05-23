/**
 * Fill ELS for UBM model
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session) {
    "use strict";
    var csvLoader = require('@unitybase/base').dataLoader, conn = session.connection;

    console.info('\tFill ELS for UBM model');
    csvLoader.loadSimpleCSVData(conn, __dirname + '/ubm_els.csv', 'uba_els', 'code;entityMask;methodMask;ruleType;ruleRole;description'.split(';'), [
        0, 1, 2, 3,
        function(row){
            if( typeof row[4] === 'number' ) {
                return 	row[4];
            } else {
                return conn.lookup('uba_role', 'ID', {expression: 'name', condition: 'equal', values: {name: row[4]}});
            }
        },
        5], 1
    );
};