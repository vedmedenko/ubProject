/**
 * @author pavel.mash
 * Navigation shortcuts localization to Azeri for UBS model
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
		name: 'Silinmiş nömrə ilə avtomatik qeydiyyata almaq',
		description: 'Qeydiyyat zamanı ilk növbədə bu açar üçün "silinmiş/ehtiyata salınmış nömrələr" sorğu kitabçasından nömrə götürülür'}
	    }
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);
};