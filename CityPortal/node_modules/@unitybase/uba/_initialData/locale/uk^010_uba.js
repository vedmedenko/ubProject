/**
 * @author pavel.mash
 * Navigation shortcuts localization to Ukrainian for UBA model
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function (session) {
  var
    loader = require('@unitybase/base').dataLoader,
    localizationConfig = {
      entity: 'ubm_desktop',
      keyAttribute: 'code',
      localization: [
            {keyValue: 'adm_desktop', execParams: {caption: 'Адміністратор'}}
      ]
    }

  loader.localizeEntity(session, localizationConfig, __filename)

  localizationConfig = {
    entity: 'ubm_navshortcut',
    keyAttribute: 'code',
    localization: [
            {keyValue: 'uba_auditTrail',  execParams: {caption: 'Аудит'}},
            {keyValue: 'adm_folder_users', execParams: {caption: 'Користувачі'}},
                {keyValue: 'uba_user', execParams: {caption: 'Список користувачів'}},
                {keyValue: 'uba_userrole', execParams: {caption: 'Ролі користувачів'}},
		{keyValue: 'uba_advSecurity', execParams: {caption: 'Додаткова безпека'}},
                {keyValue: 'uba_group', execParams: {caption: 'Список груп'}},
                {keyValue: 'uba_usergroup', execParams: {caption: 'Групи користувачів'}},
                {keyValue: 'uba_usercertificate', execParams: {caption: 'Сертифікати'}},
            {keyValue: 'adm_folder_security', execParams: {caption: 'Безпека'}},
                {keyValue: 'uba_role', execParams: {caption: 'Системні ролі'}},
                {keyValue: 'uba_els', execParams: {caption: 'Права на методи (ELS)'}},
		{keyValue: 'uba_audit', execParams: {caption: 'Аудит безпеки'}},
		{keyValue: 'uba_audit-securityDashboard', execParams: {caption: 'Консоль безпеки'}},
            {keyValue: 'uba_als', execParams: {caption: 'Права на атрибути (ALS)'}},
            {keyValue: 'uba_otp', execParams: {caption: 'Одноразові паролі (OTP)'}}
    ]
  }

  loader.localizeEntity(session, localizationConfig, __filename)
}
