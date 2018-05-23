/**
 * Fill UBS model settings
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session){
    "use strict";
    var
        csvLoader = require('@unitybase/base').dataLoader,
        conn = session.connection;

    console.info('\tFill default settings for UBS model');
    csvLoader.loadSimpleCSVData(conn, __dirname + '/ubs_settings-UBS.csv', 'ubs_settings', 'settingKey;type;defaultValue;settingValue;name;description'.split(';'), [0, 1, 2, 3, 4, 5], 1);
};