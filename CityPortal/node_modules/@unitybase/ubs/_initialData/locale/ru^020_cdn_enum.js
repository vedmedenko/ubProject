/**
 * @author pavel.mash
 * Enumeration localization to Ukrainian for CDN model
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session){
var
    loader = require('@unitybase/base').dataLoader,
    localizationConfig = {
        entity: 'ubm_enum',
        keyAttribute: 'eGroup;code',
        localization: [
            // UBS_MESSAGE_TYPE
			{keyValue: 'UBS_MESSAGE_TYPE;user',  execParams: {name: 'Пользователя'}},
			{keyValue: 'UBS_MESSAGE_TYPE;system',  execParams: {name: 'Система'}},
			{keyValue: 'UBS_MESSAGE_TYPE;warning',  execParams: {name: 'Предупреждение'}},
			{keyValue: 'UBS_MESSAGE_TYPE;information',  execParams: {name: 'Информация'}}	
        ]
    };
    loader.localizeEntity(session, localizationConfig, __filename);
};
