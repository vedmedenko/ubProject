/**
 * @author pavel.mash
 * Navigation shortcuts localization to Ukrainian for UBS model
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
		name: 'Автоматично використовувати видалені номери',
		description: 'При генерації номеру в першу чергу береться значення з довідника `Видалені/зарезервовані номери` для даного ключа'}
	    }
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);
};