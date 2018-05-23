module.exports = function(session){
var
    loader = require('@unitybase/base').dataLoader,
    localizationConfig = {
        entity: 'ubm_desktop',
        keyAttribute: 'code',
        localization: [
            {keyValue: 'CityReq_desktop',  execParams: {caption: 'Міські заявки'}}
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);


    localizationConfig = {
        entity: 'ubm_navshortcut',
        keyAttribute: 'code',
        localization: [
            {keyValue: 'req_departments_folder',  execParams: {caption: 'Департаменти'}},
            {keyValue: 'req_depart',  execParams: {caption: 'Департаменти'}},
            {keyValue: 'req_subDepart',  execParams: {caption: 'Підрозділи'}},
            {keyValue: 'req_reqList',  execParams: {caption: 'Заявки'}}
        ]
    };

    loader.localizeEntity(session, localizationConfig, __filename);
};
