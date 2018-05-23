/**
 * @author pavel.mash
 * Navigation shortcuts localization to Ukrainian for UBM model
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
            {keyValue: 'adm_folder_UI',  execParams: {caption: 'Інтерфейс'}},
                {keyValue: 'ubm_enum',  execParams: {caption: 'Переліки'}},
                {keyValue: 'ubm_desktop',  execParams: {caption: 'Робочі столи'}},
                {keyValue: 'ubm_navshortcut',  execParams: {caption: 'Ярлики'}},
				{keyValue: 'ubm_form',  execParams: {caption: 'Форми'}},
                {keyValue: 'ubm_diagram',  execParams: {caption: 'ER діаграми'}}
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);
};