/**
 * UnityBase default endpoints registration.
 * @author pavel.mash on 17.10.2016.
 */

const {clientRequire, models, getAppInfo, getDomainInfo} = require('./modules/endpoints')

App.registerEndpoint('getAppInfo', getAppInfo, false)
App.registerEndpoint('models', models, false)
App.registerEndpoint('clientRequire', clientRequire, false)
App.registerEndpoint('getDomainInfo', getDomainInfo, true)

// this block will create endpoints for onlyOffice if it configured
const {getOnlyOfficeConfiguration, getDocumentOffice, notifyDocumentSaved, setOnlyOfficeDocumentToTempStore} = require('./modules/onlyOfficeEndpoints')
if (getOnlyOfficeConfiguration().isConfigured) {
  App.registerEndpoint('getDocumentOffice', getDocumentOffice, false)
  App.registerEndpoint('notifyDocumentSaved', notifyDocumentSaved, false)
  App.registerEndpoint('setOnlyOfficeDocumentToTempStore', setOnlyOfficeDocumentToTempStore, false)
}
