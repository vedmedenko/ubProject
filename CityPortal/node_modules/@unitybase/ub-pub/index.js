/**
 * Created by pavel.mash on 03.09.2016.
 */

const localization = require('./i18n')
const utils = require('./utils')
const transport = require('./transport')
const conn = require('./UBConnection')
const injection = require('./injection')
const ClientRepository = require('./ClientRepository')
const UBCache = require('./UBCache')
const LocalDataStore = require('@unitybase/base/LocalDataStore')
const SHA256 = require('@unitybase/cryptojs/sha256')
const MD5 = require('@unitybase/cryptojs/md5')
const UBNativeMessage = require('./UBNativeMessage')

module.exports = {
  i18n: localization.i18n,
  i18nExtend: localization.i18nExtend,

  format: utils.format,
  apply: utils.apply,
  ns: utils.ns,
  booleanParse: utils.booleanParse,
  iso8601Parse: utils.iso8601Parse,
  iso8601ParseAsDate: utils.iso8601ParseAsDate,

  base64FromAny: utils.base64FromAny,
  base64toArrayBuffer: utils.base64toArrayBuffer,

  UBError: utils.UBError,
  UBAbortError: utils.UBAbortError,

  xhr: transport.xhr,
  get: transport.get,
  post: transport.post,

  UBNativeMessage: UBNativeMessage,
  UBConnection: conn,
  UBCache: UBCache,

  connect: conn.connect,
  ClientRepository: ClientRepository,
  LocalDataStore: LocalDataStore,

  log: utils.log,
  logError: utils.logError,
  logWarn: utils.logWarn,
  logDebug: utils.logDebug,

  userAgent: utils.userAgent,
  isChrome: utils.isChrome,
  isWebKit: utils.isWebKit,
  isGecko: utils.isGecko,
  isOpera: utils.isOpera,
  isMac: utils.isMac,
  isSecureBrowser: utils.isSecureBrowser,

  inject: injection.inject,
  addResourceVersion: injection.addResourceVersion,

  SHA256: SHA256,
  MD5: MD5
}
