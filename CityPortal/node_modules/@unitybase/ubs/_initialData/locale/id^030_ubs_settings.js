/**
 * @author pavel.mash
 * Navigation shortcuts localization to English for UBS model
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session){
var
    loader = require('@unitybase/base').dataLoader;

    localizationConfig = {
        entity: 'ubs_settings',
        keyAttribute: 'settingKey',
        localization: [
            {keyValue: 'ubs.numcounter.autoRegWithDeletedNumber',  execParams: {
		name: 'Automatically register within deleted number',
		description: 'When registering in the first place system takes the number from dictionary `Deleted and reserved numbers` for this key'}
	    }
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);
};