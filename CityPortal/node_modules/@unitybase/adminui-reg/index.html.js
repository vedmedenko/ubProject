/* global App */

/**
 * Return models config for `admin-UI` web client
 * The purpose is to load model initialization script BEFORE application start
 */
const mustache = require('mustache')
const fs = require('fs')
const path = require('path')
 /**
 *
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 * @param {String} indexName
 * @param {boolean} [addCSP=true] Add a CSP header
 */
function generateIndexPage (req, resp, indexName, addCSP=true) {
  let indexTpl, compiledIndex, compiledIndexKey
  let models, mCnt, mName, i, uiSettings

  function md5 (fileName) {
    let realPath = App.resolveStatic(fileName)
    if (!realPath) {
      console.error('invalid path %s', fileName)
    }
    // realMD5 = App.globalCacheGet('UB_STATIC.fileMD5_' + realPath);
    let checksum = App.fileChecksum(realPath)
    return checksum
      ? fileName + '?ver=' + checksum
      : fileName
  }

  compiledIndexKey = 'UB_STATIC.compiled_index_' + indexName + App.globalCacheGet('UB_STATIC.staticFoldersModifyDate') + App.globalCacheGet('UB_STATIC.modelsModifyDate')
  compiledIndex = App.globalCacheGet(compiledIndexKey)
  if (!compiledIndex) {
    uiSettings = JSON.parse(App.getUISettings() || '{}')
    if (!uiSettings.adminUI) {
      uiSettings.adminUI = {themeName: 'UBGrayTheme'}
    } else if (!uiSettings.adminUI.themeName) {
      uiSettings.adminUI.themeName = 'UBGrayTheme'
    }
    let adminUIPath = path.dirname(require.resolve('@unitybase/adminui-pub'))
    indexTpl = fs.readFileSync(path.join(adminUIPath, indexName))

    // create view for mustache
    // noinspection JSUnusedGlobalSymbols
    let view = {
      uiSettings: uiSettings,
      modelVersions: [],
      staticVersion: App.globalCacheGet('UB_STATIC.modelsModifyDate'), // prev. App.folderChecksum(App.staticPath),
      UB_API_PATH: App.serverConfig.httpServer.path || '/', //  serverURL.replace(/\/$/, ''),
      md5template: function () {
        return function (template) {
          return md5(mustache.render(template, view))
        }
      },
      md5: function () {
        return md5
      }
    }

    // fill model versions
    models = App.domain.config.models
    mCnt = models.count
    for (i = 0; i < mCnt; i++) {
      mName = models.items[i].name
      view.modelVersions.push({
        modelName: mName,
        modelVersion: App.folderChecksum(models.items[i].publicPath)
      })
    }

    compiledIndex = mustache.render(indexTpl, view)
    if (compiledIndex) {
      App.globalCachePut(compiledIndexKey, compiledIndex)
    }
    console.log(`Generate ${indexName} from template ${path.join(adminUIPath, indexName)}`)
  } else {
    console.debug('Use compiled %s', indexName)
  }
  if (compiledIndex) {
    resp.writeEnd(compiledIndex)
    // resp.writeEnd(index_tpl);
    resp.statusCode = 200
    // cache forever - do not cache index*.html
    let cspHeader = ''
    if (addCSP) {
      let wsSrc = 'ws' + App.serverURL.slice(4)
      if (!uiSettings) {
        uiSettings = JSON.parse(App.getUISettings() || '{}')
      }
      let onlyOfficeServer = (uiSettings.adminUI.onlyOffice && uiSettings.adminUI.onlyOffice.serverIP) || ''
      let cspHeaders =
        // "default-src * data: blob:;" +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' " + onlyOfficeServer + ';' +
        "style-src data: 'unsafe-inline' *;" +
        "connect-src 'self' " + wsSrc + ' blob: ' + onlyOfficeServer + ';' +
        'plugin-types application/pdf'
      cspHeader = '\r\nContent-Security-Policy: ' + cspHeaders
    }
    resp.writeHead('Content-Type: text/html\r\nCache-Control: no-cache, no-store, max-age=0, must-revalidate\r\nPragma: no-cache\r\nExpires: Fri, 01 Jan 1990 00:00:00 GMT' + cspHeader)
  } else {
    resp.statusCode = 404
  }
}

let adminUIEndpointName
if (App.serverConfig.uiSettings && App.serverConfig.uiSettings.adminUI) {
  adminUIEndpointName = App.serverConfig.uiSettings.adminUI.endpoint
}
adminUIEndpointName = adminUIEndpointName || App.serverConfig.application.rootHandler || 'index.html'
/**
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
App.registerEndpoint(adminUIEndpointName, function (req, resp) {
  if (req.url.endsWith('/')) {
    resp.statusCode = 301 // HTTP_MOVEDPERMANENTLY
    resp.writeHead(`Location: ${App.serverURL}${adminUIEndpointName}`)
    return
  }
  generateIndexPage(req, resp, 'index.mustache')
}, false)

/**
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
App.registerEndpoint(adminUIEndpointName + '-dev', function (req, resp) {
  if (process.isDebug) {
    if (req.url.endsWith('/')) {
      resp.statusCode = 301 // HTTP_MOVEDPERMANENTLY
      resp.writeHead(`Location: ${App.serverURL}${adminUIEndpointName}`)
      return
    }
    generateIndexPage(req, resp, 'index-dev.mustache', false)
  } else {
    resp.writeEnd('Server working in production mode')
    resp.statusCode = 404
  }
}, false)
