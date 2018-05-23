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
			{keyValue: 'UBS_MESSAGE_TYPE;user',  execParams: {name: 'İstifadəçi'}},
			{keyValue: 'UBS_MESSAGE_TYPE;system',  execParams: {name: 'Sistem'}},
			{keyValue: 'UBS_MESSAGE_TYPE;warning',  execParams: {name: 'Xəbərdarlıq'}},
			{keyValue: 'UBS_MESSAGE_TYPE;information',  execParams: {name: 'Məlumat'}}	
        ]
    };
    loader.localizeEntity(session, localizationConfig, __filename);
};
