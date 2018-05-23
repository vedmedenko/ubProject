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
        entity: 'ubm_navshortcut',
        keyAttribute: 'code',
        localization: [
			{keyValue: 'adm_folder_misc',  execParams: {caption: 'Müxtəlif'}},
            {keyValue: 'ubs_settings',  execParams: {caption: 'Sazlamalar'}},
            {keyValue: 'ubs_filter',  execParams: {caption: 'Yadda saxlanılmış filtrlər'}},
            {keyValue: 'ubs_numcounter',  execParams: {caption: 'Numeratorlar'}},
			{keyValue: 'ubs_numcounterreserv',  execParams: {caption: 'Numeratorlar (Rezerv)'}},
			{keyValue: 'ubs_softLock',  execParams: {caption: 'Bloklamalar (SoftLocks)'}},
			{keyValue: 'ubs_report',  execParams: {caption: 'Hesabatlar'}},
			{keyValue: 'ubs_message',  execParams: {caption: 'İsmarışlar'}}
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);
};