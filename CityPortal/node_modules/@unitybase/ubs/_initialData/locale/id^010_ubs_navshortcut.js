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
        entity: 'ubm_navshortcut',
        keyAttribute: 'code',
        localization: [
			{keyValue: 'adm_folder_misc',  execParams: {caption: 'Misc'}},
            {keyValue: 'ubs_settings',  execParams: {caption: 'Settings'}},
            {keyValue: 'ubs_filter',  execParams: {caption: 'Saved filters'}},
            {keyValue: 'ubs_numcounter',  execParams: {caption: 'Numerators'}},
			{keyValue: 'ubs_numcounterreserv',  execParams: {caption: 'Numerators (reserve)'}},
			{keyValue: 'ubs_softLock',  execParams: {caption: 'Blocking (SoftLocks)'}},
			{keyValue: 'ubs_report',  execParams: {caption: 'Reports'}},
			{keyValue: 'ubs_message',  execParams: {caption: 'Messages'}}
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);
};