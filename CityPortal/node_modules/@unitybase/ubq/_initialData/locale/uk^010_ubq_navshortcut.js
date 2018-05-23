/**
 * @author pavel.mash
 * Navigation shortcuts localization to Ukrainian for UBQ model
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function (session) {
  var
    loader = require('@unitybase/base').dataLoader,

    localizationConfig = {
      entity: 'ubm_navshortcut',
      keyAttribute: 'code',
      localization: [
            {keyValue: 'adm_folder_UBQ', execParams: {caption: 'Черги повідомлень'}},
			{keyValue: 'ubq_messages', execParams: {caption: 'Черга'}},
			{keyValue: 'ubq_runstat', execParams: {caption: 'Статистика'}},
            {keyValue: 'ubq_scheduler', execParams: {caption: 'Планувальники задач'}}
      ]
    }

  loader.localizeEntity(session, localizationConfig, __filename)
}
