/**
 * @author v.orel
 * Enumeration localization to Russian for TRS model
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session){
    var
        loader = require('@unitybase/base').dataLoader,
        localizationConfig = {
            entity: 'ubs_settings',
            keyAttribute: 'settingKey',
            localization: [
                // UBS_MESSAGE_TYPE
                {keyValue: 'UBA.passwordPolicy.maxDurationDays',  execParams: {name: 'Password duration term', description: 'Period (number of days), at the end of which System will requires to change the password. 0 for unlimited'}},
                {keyValue: 'UBA.passwordPolicy.checkPrevPwdNum',  execParams: {name: "Don't repeat... previous passwords", description: 'Number of previous passwords which not allowed to use as the new password'}},
                {keyValue: 'UBA.passwordPolicy.minLength',  execParams: {name: 'Minimum length of password', description: 'Minimum of symbol number in password'}},
                {keyValue: 'UBA.passwordPolicy.checkCmplexity',  execParams: {name: 'Complex password', description: 'Presence in password uppercase and lowercase characters, numbers, special characters is necessary'}},
                {keyValue: 'UBA.passwordPolicy.checkDictionary',  execParams: {name: "Don't allow password from dictionsry", description: 'Deny lung passwords from dictionary'}},
                {keyValue: 'UBA.passwordPolicy.allowMatchWithLogin',  execParams: {name: 'Allow match with login', description: 'Allow to set password which matches with login'}},
                {keyValue: 'UBA.passwordPolicy.maxInvalidAttempts',  execParams: {name: 'Number of input password attempts', description: 'Maximum number of attempts before the user is locked'}}
            ]
        };
    loader.localizeEntity(session, localizationConfig, __filename);
};