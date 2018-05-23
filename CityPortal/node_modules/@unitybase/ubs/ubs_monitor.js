/*jshint multistr:true */
/*global TubAttrDataType, TubCacheType, TubDocumentRequest, TubLoadContentBody, ubs_report, require*/
var
    me = ubs_monitor,
    fs = require('fs'),
    mon = require('@unitybase/ubs/modules/monitor').Monitor;

me.entity.addMethod('getStatInfo');
me.entity.addMethod('getServerInfo');
me.entity.addMethod('getConfigFileContent');
me.entity.addMethod('getRemoteConfigFileContent');

/**
 * Retrieve server statistic
 *
 *      $App.connection.run({entity: 'ubs_monitor', method: 'getStatInfo', params: {host: 'locxalhost:888', app:'autotest'}}).done(UB.logDebug);
 *
 * @param {ubMethodParams} ctxt
 * @param {Object} ctxt.mParams
 * @param {Object} ctxt.mParams.params
 * @param {String} ctxt.mParams.params.host
 */
me.getStatInfo = function (ctxt) {
    var
        params = ctxt.mParams.params;
    ctxt.mParams.data = {};
    ctxt.mParams.data.statInfo = mon.getStatInfo(params.host, params.app);

};
me.getServerInfo = function (ctxt) {
    var
        params = ctxt.mParams.params;
    ctxt.mParams.data = {};
    ctxt.mParams.data.serverInfo = mon.getServerInfo();
    return ctxt.mParams.data.serverInfo;
};
me.getConfigFileContent = function (ctxt) {
        var
            me = this,
            svrInfo = mon.getServerInfo(),
            fs = require('fs'),
            fileContent = fs.readFileSync(svrInfo.configFileName);
    ctxt.mParams.data = {
        fileContent: fileContent
    };
    return fileContent;
};
me.getConnectionInfo = function (ctxt) {

};



me.getRemoteConfigFileContent = function (ctxt) {
    var
        params = ctxt.mParams.params,
        conn = mon.monConnect(params.host, params.app),
        result;
    ctxt.mParams.data = {};
    if (conn.errorMsg) {
        ctxt.mParams.data.errorMsg = conn.errorMsg;
    } else {
       try {
           result = conn.run({
               entity: 'ubs_monitor',
               method: 'getConfigFileContent'
           });
           ctxt.mParams.data.fileContent = result.data.fileContent;
       } catch(e) {
           ctxt.mParams.data.errorMsg = e.message;
       } finally {
           mon.logout(conn);
       }
    }
};



