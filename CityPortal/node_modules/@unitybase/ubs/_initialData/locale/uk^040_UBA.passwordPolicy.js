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
                {keyValue: 'UBA.passwordPolicy.maxDurationDays',  execParams: {name: 'Термін дії паролю', description: 'Період (у днях), після закінчення якого система вимагатиме зміну паролю. 0 - не обмежувати'}},
                {keyValue: 'UBA.passwordPolicy.checkPrevPwdNum',  execParams: {name: 'Не повторювати ... останніх паролів', description: 'Кількість попередніх паролів, які заборонено використовувати як новий пароль'}},
                {keyValue: 'UBA.passwordPolicy.minLength',  execParams: {name: 'Мінімальна довжина паролю', description: 'Мінімальна кількість символів в паролі'}},
                {keyValue: 'UBA.passwordPolicy.checkCmplexity',  execParams: {name: 'Складний пароль', description: 'Обов’язкова присутність в паролі символу верхнього регістру, нижнього регістру, цифри, спеціального символу'}},
                {keyValue: 'UBA.passwordPolicy.checkDictionary',  execParams: {name: 'Не дозволяти паролі з словника', description: 'Заборонити слабкі паролі з словника'}},
                {keyValue: 'UBA.passwordPolicy.allowMatchWithLogin',  execParams: {name: 'Дозволити співпадіння з логіном', description: 'Дозволити встановлення паролю, що співпадає з логіном'}},
                {keyValue: 'UBA.passwordPolicy.maxInvalidAttempts',  execParams: {name: 'Кількість невдалих спроб', description: 'Кількість невдалих спроб вводу паролю, після яких користувач блокується'}}
            ]
        };
    loader.localizeEntity(session, localizationConfig, __filename);
};