/**
 * @author pavel.mash
 * Enumeration localization to English for CDN model
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
			{keyValue: 'UBS_MESSAGE_TYPE;user',  execParams: {name: 'By users'}},
			{keyValue: 'UBS_MESSAGE_TYPE;system',  execParams: {name: 'System'}},
			{keyValue: 'UBS_MESSAGE_TYPE;warning',  execParams: {name: 'Warning'}},
			{keyValue: 'UBS_MESSAGE_TYPE;information',  execParams: {name: 'Information'}}	
        ]
    };
    loader.localizeEntity(session, localizationConfig, __filename);
};
