/**
 * UnityBase default endpoints implementation.
 * In UB <=4 these endpoints have been defined in the native code
 * @author pavel.mash on 13.10.2016.
 */

const {relToAbs} = process.binding('fs')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const mime = require('mime-types')
const WebSockets = require('./web-sockets')
const UBDomain = require('@unitybase/base').UBDomain

/**
 * @param {THTTPResponse} resp
 * @param {string} reason
 * @return {boolean}
 * @private
 */
function badRequest (resp, reason) {
  resp.statusCode = 400
  resp.writeEnd('Bad request')
  if (reason) console.error('Bad request.', reason)
  return false
}

/**
 * @param {THTTPResponse} resp
 * @param {string} reason
 * @return {boolean}
 * @private
 */
function notFound (resp, reason) {
  resp.statusCode = 404
  resp.writeEnd('Not found')
  if (reason) console.error('Not found', reason)
  return false
}

/**
 *
 * @param {string} reqPath
 * @param {THTTPResponse} resp
 * @private
 */
function resolveModelFile (reqPath, resp) {
  let entry = {
    fullPath: ''
  }
  // cache actual file path & type for success models/* request
  let cached = App.globalCacheGet(`UB_MODELS_REQ${reqPath}`)
  if (!cached) {
    let parts = reqPath.replace(/\\/g, '/').split('/')
    let modelName = parts.shift()
    if (!modelName) {
      return badRequest(resp, 'first part of path must be model name')
    }
    let model = App.domainInfo.models[modelName]
    if (!model) {
      return badRequest(resp, 'no such model ' + modelName)
    }
    entry.fullPath = relToAbs(model.realPublicPath, parts.join('\\'))
    if (!entry.fullPath) {
      return badRequest(resp, 'cant resolve relative path')
    }
    if (!entry.fullPath.startsWith(model.realPublicPath)) {
      return badRequest(resp, `resolved path "${entry.fullPath}" is not inside model folder ${model.realPublicPath}`)
    }
    if (!fs.existsSync(entry.fullPath)) {
      return notFound(resp, `"${entry.fullPath}"`)
    }
    let ct = mime.contentType(parts.pop())
    if (ct) {
      entry.mimeHead = 'Content-Type: ' + ct
    }
    App.globalCachePut(`UB_MODELS_REQ${reqPath}`, JSON.stringify(entry))
  } else {
    entry = JSON.parse(cached)
  }
  resp.writeEnd(entry.fullPath)
  resp.writeHead('Content-Type: !STATICFILE')
  if (entry.mimeHead) {
    resp.writeHead(entry.mimeHead)
  }
  resp.statusCode = 200
}

/**
 * The `models` endpoint. Responsible for return a static files content from a model publicPath folders
 *
 * For example request `GET http://host:port/models/modelName/fileName`
 * will return a file from a public folder of a model `modelName`
 *
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 * @member {App}
 */
function models (req, resp) {
  if ((req.method !== 'GET') && (req.method !== 'HEAD')) {
    return badRequest(resp, 'invalid request method ' + req.method)
  }
  let reqPath = req.decodedUri
  if (!reqPath || !reqPath.length || (reqPath.length > 250)) {
    return badRequest(resp, 'path too long (max is 250) ' + reqPath.length)
  }
  resolveModelFile(reqPath, resp)

  // cache forever - do not cache index*.html
    // resp.writeHead('Content-Type: text/html\r\nCache-Control: no-cache, no-store, max-age=0, must-revalidate\r\nPragma: no-cache\r\nExpires: Fri, 01 Jan 1990 00:00:00 GMT');
}

const MODULES_ROOT = path.join(process.configPath, 'node_modules')

/**
 * The `clientRequire` endpoint. Used by client side loaders (SystemJS for example) to emulate commonJS require
 *
 * **Security note**: It is __very important__ to prevent loading a server-side logic to the client - server-side logic MUST be hidden from clients
 *
 * To do this `clientRequire` endpoint:
 *
 *   - allow access only to modules inside application `node_modules` folder
 *   - in case requested module is a UnityBase model (present in ubConfig.json) then restrict access to non-public part of such model
 *
 * So developer MUST listen all modules what contains a sensitive server-side business logic in the application
 * config and set a `moduleName` parameter correctly for such models
 *
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
function clientRequire (req, resp) {
  console.log(`Call clientRequire`)
  if ((req.method !== 'GET') && (req.method !== 'HEAD')) {
    return badRequest(resp, 'invalid request method ' + req.method)
  }
  let reqPath = req.decodedUri
  // cache actual file path & type for success clientRequire/* request
  let cached = App.globalCacheGet(`UB_CLIENT_REQ${reqPath}`)
  let entry = {
    fullPath: ''
  }
  if (!cached) {
    if (!reqPath || !reqPath.length || (reqPath.length > 250)) {
      return badRequest(resp, 'path too long (max is 250) ' + reqPath.length)
    }

    if (reqPath.startsWith('models/')) {
      resolveModelFile(reqPath.slice('models/'.length), resp)
      return
    }

    if (reqPath.indexOf('..') !== -1) { // prevent clientRequire/../../../secret.txt attack
      return badRequest(resp, `Relative path (${reqPath}) not allowed`)
    }
    if (path.isAbsolute(reqPath)) { // prevent clientRequire/d:/secret.txt attack
      return badRequest(resp, `Absolute path (${reqPath}) not allowed`)
    }
    let resolvedPath
    try {
      console.debug(`Try to resolve ${reqPath}`)
      resolvedPath = require.resolve(reqPath)
    } catch (e) {
      resolvedPath = undefined
    }
    if (!resolvedPath) {
      console.error(`Package ${reqPath} not found`)
      return notFound(resp, `"${reqPath}"`)
    }
    if (!resolvedPath.startsWith(MODULES_ROOT)) {
      return badRequest(resp, `Path (${reqPath}) must be inside application node_modules folder but instead resolved to ${resolvedPath}`)
    }

    let models = App.domainInfo.models
    let restrictAccess = false
    // allow access to package.json for dynamically load a module from UI
    if (! reqPath.endsWith('/package.json')) {
      // in case this is request to UnityBase model - check resolved file is inside model public folder
      _.forEach(models, (model) => {
        if (model.moduleName &&
          // do not compare req @unitybase/ub-pub with module @unitybase/ub
          ((reqPath === model.moduleName) || reqPath.startsWith(model.moduleName + '/')) &&
          !resolvedPath.startsWith(model.realPublicPath)
        ) {
          restrictAccess = true
          return false
        }
      })
    }

    if (restrictAccess) {
      return badRequest(resp, `Request to UnityBase model ${reqPath} resolved to (${resolvedPath}) which is not inside any of public models folder`)
    }
    entry.fullPath = resolvedPath
    let ct = mime.contentType(path.extname(resolvedPath))
    if (ct) {
      entry.mimeHead = 'Content-Type: ' + ct
    }
    App.globalCachePut(`UB_CLIENT_REQ${reqPath}`, JSON.stringify(entry))
    console.debug(`Resolve ${reqPath} -> ${resolvedPath}`)
  } else {
    entry = JSON.parse(cached)
    console.debug(`Retrieve cached ${reqPath} -> ${entry.fullPath}`)
  }
  resp.writeEnd(entry.fullPath)
  resp.writeHead('Content-Type: !STATICFILE')
  if (entry.mimeHead) {
    resp.writeHead(entry.mimeHead)
  }
  resp.statusCode = 200
}

/**
 * The `getAppInfo` endpoint. Responsible for return a information about application required for a
 * initial client side connectivity and UI setup
 *
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
function getAppInfo (req, resp) {
  const serverConfig = App.serverConfig
  let DSTU = serverConfig.security && serverConfig.security.dstu

  let appInfo = {
    serverVersion: process.version,
    defaultLang: serverConfig.application.defaultLang || 'en',
    simpleCertAuth: !!serverConfig.security.simpleCertAuth,

    trafficEncryption: DSTU ? DSTU.trafficEncryption : false,
    serverCertificate: (DSTU && DSTU.trafficEncryption) ? App.serverPublicCert : '',
    encryptionKeyLifetime: (DSTU && DSTU.trafficEncryption) ? DSTU.encryptionKeyLifeTime : 0,

    authMethods: serverConfig.security.authenticationMethods || [],

    supportedLanguages: serverConfig.application.domain.supportedLanguages || ['en'],

    supportedWSProtocols: process.isWebSocketEnabled ? WebSockets.registeredProtocols() : [],

    uiSettings: serverConfig.uiSettings || {}
  }
  resp.writeEnd(appInfo)
  resp.statusCode = 200
  resp.validateETag()
}

// const RESTRICTED_ENTITY_PROPS = ['connectionConfig', 'dbExtensions', 'mapping'] // adv allow mapping
// const RESTRICTED_ATTRIBUTES_PROPS = ['physicalDataType', 'generateFK', 'mapping'] // adv allow mapping
// const RESTRICTED_MODEL_PROPS = ['realPublicPath'] // adv allow realPublicPath
// const advancedDomainInfoEntityProps = []
//
// function domainReplacer (key, val) {
//   if (!this) return undefined
//   if (this instanceof UBDomain.UBEntity) {
//     // at last one of entity method is accessible
//     if (!this.haveAccessToAnyMethods(Object.keys(this.entityMethods))) return undefined
//     // serialize only allowed properties
//     return RESTRICTED_ENTITY_PROPS.find(elm => elm === key) ? undefined : val
//   } else if (this instanceof UBDomain.UBEntity.UBEntityAttribute) {
//     // skip empty string
//     if ((typeof val === 'string') && !val) return undefined
//     if ((key === 'customSettings') && !Object.keys(val).length) return undefined
//     return RESTRICTED_ATTRIBUTES_PROPS.find(elm => elm === key) ? undefined : val
//   } else if (this instanceof UBDomain.UBModel) {
//     return RESTRICTED_MODEL_PROPS.find(elm => elm === key) ? undefined : val
//   } else {
//     return val
//   }
// }

const UBA_COMMON = require('@unitybase/base').uba_common
const queryString = require('querystring')
const appBinding = process.binding('ub_app')
const authenticationHandled = appBinding.handleAuthentication
const nativeGetDomainInfo = appBinding.getDomainInfo
/**
 * The `getDomainInfo` endpoint.
 * Return JSON representation of application Domain according to caller rights
 *
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
function getDomainInfo (req, resp) {
  // implementation below is SLOW. The bottlenack is JSON.stringify() for huge JSON
  // let restrictedDomain = {
  //   domain: App.domainInfo.entities, // _.filter(App.domainInfo.entities, (e) => e.code.startsWith('ubm')),
  //   models: App.domainInfo.models
  // }
  // let res = JSON.stringify(restrictedDomain, domainReplacer)

  let params = queryString.parse(req.parameters);
  let isExtended = (params['extended'] === 'true')
  if (isExtended && authenticationHandled && !UBA_COMMON.isSuperUser()) {
    return badRequest(resp, 'Extended domain info allowed only for member of admin group of if authentication is disabled')
  }
  if (!params['userName'] || params['userName'] !== Session.uData.login) {
    return badRequest(resp, 'userName=login parameter is required')
  }

  let res = nativeGetDomainInfo(isExtended)
  // let res = nativeGetDomainInfo(false)

  resp.writeEnd(res)
  resp.statusCode = 200
  resp.validateETag()
}

module.exports = {
  models,
  getAppInfo,
  clientRequire,
  getDomainInfo
}
