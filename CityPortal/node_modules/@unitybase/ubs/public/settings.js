/**
 * Created with IntelliJ IDEA.
 * User: mystetskyy
 * Date: 20.12.13
 * Time: 18:26
 * To change this template use File | Settings | File Templates.
 */

UB.ns('UBS.Settings');
(function() {
    var data = {};
    UB.Repository('ubs_settings')
        .attrs(['ID', 'settingKey', 'name', 'description', 'type', 'settingValue', 'defaultValue'])
        .selectAsObject()
        .done(function(response){
            data = response; //UBConnection.selectResultToArrayOfObjects(response);
            UBS.Settings.findByKey = function(key){
                var res = _.find(data, {settingKey: key});
                if (res === undefined){
                   UB.logDebug('value fom UBS.Settings['+key+'] not found');
                }
                return res;
            };
        })
})();
