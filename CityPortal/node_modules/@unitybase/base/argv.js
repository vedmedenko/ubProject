/**
 * Utils for connecting to a local UnityBase server
 *
 * In case you need to work with command line use a {@link module:@unitybase/base/options @unitybase/base.options} module
 *
 * @example

  const argv = require('@unitybase/base').argv
  // connect to server
  let session = argv.establishConnectionFromCmdLineAttributes()
  console.log('Session.uData:', session.uData, typeof session.uData, session.uData.lang)

  let userLang = session.uData.lang
  let conn = session.connection
  // obtain domain information
  const domainInfo = conn.getDomainInfo()

 * @module @unitybase/base/argv
 */
/* global removeCommentsFromJSON, startServer, stopServer */
const _ = require('lodash')
const options = require('./options')
const fs = require('fs')
const path = require('path')
const http = require('http')
const UBConnection = require('./UBConnection')

/**
 * Get config file name. if -cfg switch passed then use this switch value, else use default
 * @return {String}
 */
function getConfigFileName () {
  let cfgFile = options.switchValue('cfg') || process.env.UB_CFG

  if (cfgFile) {
    if (!path.isAbsolute(cfgFile)) cfgFile = path.join(process.cwd(), cfgFile)
    if (!fs.isFile(cfgFile)) {
      console.warn('passed -cfg file not exist ' + cfgFile)
      cfgFile = ''
    }
  }
  if (!cfgFile) {
    cfgFile = process.cwd() + 'ubConfig.json'
    cfgFile = fs.isFile(cfgFile) ? cfgFile : ''
  }
  if (!cfgFile) {
    cfgFile = path.resolve(path.dirname(process.execPath), 'ubConfig.json')
    cfgFile = fs.isFile(cfgFile) ? cfgFile : ''
  }
  if (!cfgFile) throw new Error('Server configuration file not found')
  return cfgFile
}

let verboseMode = options.switchIndex('noLogo') === -1

/**
 * @class ServerSession
 */
function ServerSession (config) {
    /**
     * @type {String}
     * @readonly
     */
  this.HOST = config.host
    /**
     * @type {String}
     * @readonly
     */
  this.USER = config.user
    /**
     * @type {String}
     * @readonly
     */
  this.PWD = config.pwd
    /**
     * Custom user data returned by server login method
     * @type {String}
     * @readonly
     */
  this.uData = null
  this.__serverStartedByMe = false
    /**
     * @type {UBConnection}
     */
  this.connection = null
    /**
     * Shut down server in case it started during connection establish or logout from remote server
     * @method
     */
  this.logout = function () {
    if (this.__serverStartedByMe) {
      if (verboseMode) console.info('Shut down local server')
      stopServer()
    } else {
      this.connection.logout()
    }
  }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Result of `getAppInfo` endpoint execution
     * @type {Object}
     */
  this.appInfo = {}
}

/**
 * Parse cmd line and environment variables for command line parameters expected by UnityBase `cmd` mode
 * @return {ServerSession}
 */
function serverSessionFromCmdLineAttributes (config) {
  if (!config) {
    config = options.describe('', '').add(establishConnectionFromCmdLineAttributes._cmdLineParams).parse()
  }

  return new ServerSession(config)
}

/**
 * Service function for establish UnityBase server connection from client-side command line script.
 * Parse command line attributes for switches `host`, `u`, `p` and:
 *
 *  - Check specified server is started (simple request to `host`) and if not started then
 *      start server locally with local config
 *  - Establish connection to specified host
 *  - Retrieve application information and in case authorization is required then call login method using `u` and `p` params
 *  - Return serverSession object with connection in case of success or throw assertion error
 * @param {Object} [config]
 * @param {String} [config.host]
 * @param {String} [config.user]
 * @param {String} [config.pwd]
 * @param {Boolean} [config.forceStartServer=false} If we sure local server not started - start it without checking. Faster because check take near 2 sec.
 * @return {ServerSession}
 */
function establishConnectionFromCmdLineAttributes (config) {
  if (!config) { // for a backward compatibility with UB 1.11
    config = options.describe('', '').add(establishConnectionFromCmdLineAttributes._cmdLineParams).parseVerbose()
    if (!config) throw new Error('Invalid command line arguments')
  }
  let serverSession = serverSessionFromCmdLineAttributes(config)

  // if ((hostStart === 'localhost') || (hostStart === '127') || (hostStart === '10')) {
  if (config.forceStartServer) {
    console.info('Force server starting')
    if (startServer()) {
      console.log('Local server started')
    } else {
      throw new Error('Can\'t start server')
    }
    serverSession.__serverStartedByMe = true
  } else {
    let serverStarted = checkServerStarted(serverSession.HOST)
    if (serverStarted) {
      if (verboseMode) console.info('Server is running - use started server instance')
    } else {
      if (verboseMode) console.info('Server not started - start local server instance')
      if (startServer()) {
        console.log('Local server started')
      } else {
        throw new Error('Can\'t start server')
      }
      serverSession.__serverStartedByMe = true
    }
  }

  if (config.timeout) {
    http.setGlobalConnectionDefaults({receiveTimeout: parseInt(config.timeout, 10)})
  }
  let conn = serverSession.connection = new UBConnection({ URL: serverSession.HOST })
  let appInfo = conn.getAppInfo()
  // allow anonymous login in case no UB auth method for application
  if (appInfo.authMethods.indexOf('UB') !== -1) {
    conn.onRequestAuthParams = function () {
      return {login: serverSession.USER, password: serverSession.PWD}
    }
  }
  serverSession.appInfo = appInfo
  if (verboseMode) {
    console.info('Connected to ', serverSession.HOST)
  }

  return serverSession
}

/**
 * Options config for establishing connection from command line parameters
 * @type {Array<Object>}
 */
establishConnectionFromCmdLineAttributes._cmdLineParams = [
  {short: 'host', long: 'host', param: 'fullServerURL', defaultValue: 'http://localhost:888', searchInEnv: true, help: 'Server URL to connect, including protocol'},
  {short: 'u', long: 'user', param: 'userName', searchInEnv: true, help: 'User name'},
  {short: 'p', long: 'pwd', param: 'password', searchInEnv: true, help: 'User password'},
  {short: 'cfg', long: 'cfg', param: 'localServerConfig', defaultValue: 'ubConfig.json', searchInEnv: true, help: 'Path to server config'},
  {short: 'timeout', long: 'timeout', param: 'timeout', defaultValue: 120000, searchInEnv: true, help: 'HTTP Receive timeout in ms'}
]

/**
 * Perform check somebody listen on URL
 * @param {String} URL
 * @return {boolean}
 */
function checkServerStarted (URL) {
  const http = require('http')
  if (verboseMode) console.info('Check server is running...')
  try {
    let resp = http.get({URL: URL + '/getAppInfo', connectTimeout: 1000, receiveTimeout: 1000, sendTimeout: 1000}) // dummy
    if (verboseMode) console.info('STATUS', resp.statusCode)
    return resp.statusCode === 200
  } catch (e) {}
  return false
}

 /**
 * Will replace placeholders %VAR_NAME% to environment variable value
 * @private
 * @param {String} content
 * @return {String}
 */
function replaceEnvironmentVariables (content) {
  return content.replace(/%(.*?)%/gm, function replacer (match, p1) {
    return process.env[p1] ? process.env[p1].replace(/\\/g, '\\\\') : 'NOT_FOUND_ENV_VAR(' + match + ')'
  })
}

/**
 * Will replace placeholders "#include(pathToFile) to file content
 * @private
 * @param {String} content
 * @return {String}
 */
function replaceIncludeVariables (content) {
  return content.replace(/"#include\((.*)\)"/gm, function replacer (match, p1) {
    let filePath
    try {
      filePath = JSON.parse('{"f": "' + p1 + '"}')['f'] // hack to decode JSON string
    } catch (e) {
      return 'INVALID INCLUDE ' + p1
    }
    if (!path.isAbsolute(filePath)) filePath = path.join(process.configPath, filePath)
    if (!fs.statSync(filePath)) {
      return 'INVALID INCLUDE ' + filePath
    }
    let content = removeCommentsFromJSON(fs.readFileSync(filePath))
    if (!content) {
      return 'EMPTY INCLUDE ' + filePath
    }
    return replaceEnvironmentVariables(content)
  })
}

/**
 * Read server configuration using file, resolved by argv.getConfigFileName
 * parse it in safe mode, replace environment variables by it values and return parsed config
 *
 * @return {Object}
 */
function getServerConfiguration () {
  let cfgFileName = getConfigFileName()
  if (verboseMode) console.debug('Used config:', cfgFileName)

  // var content = removeCommentsFromJSON(fs.readFileSync(cfgFileName))
  // content = replaceIncludeVariables(replaceEnvironmentVariables(content))

  let result = safeParseJSONfile(cfgFileName, true, (content) => replaceIncludeVariables(replaceEnvironmentVariables(content)))
    // add name attribute for applications
  if (!result.application) {
    result.application = {}
  }
  result.application.name = result['httpServer'].path ? result['httpServer'].path : '/'
  if (!result.application.defaultLang) {
    result.application.defaultLang = 'en'
  }
  if (!result.application.domain) {
    result.application.domain = {models: []}
  }
  if (!result.application.domain.supportedLanguages) {
    let conns = result.application.connections
    if (conns) {
      result.application.domain.supportedLanguages = _(conns).map('supportLang').flatten().uniq().value()
    } else {
      result.application.domain.supportedLanguages = [result.application.defaultLang]
    }
  }
  if (!result.application.customSettings) {
    result.application.customSettings = {}
  }
  return result
}

 /**
 * Return a URL server actually listen on
 * @param {Object} config Server configuration
 */
function serverURLFromConfig (config) {
  let httpCfg = config['httpServer'] || {}
  let rUrl = (httpCfg.protocol && httpCfg.protocol === 'https') ? 'https://' : 'http://'
    // in case of serverDomainNames in [+, *] replace it to localhost
  rUrl += httpCfg.host ? (httpCfg.host.length === 1 ? 'localhost' : httpCfg.host) : 'localhost'
  rUrl += httpCfg.port ? ':' + httpCfg.port : ':80'
  if (httpCfg.path) rUrl += '/' + httpCfg.path
  return rUrl
}

/**
 * JSON file parsing, allow to parse semi-JSON files with comments. In case of errors inside JSON show detailed error description
 * @param {String} fileName
 * @param {Boolean} [allowMultiLineString=false] Replace `\n` before parse (not compatible with JSON format, but multiline string is useful)
 * @param {Function} [preprocessor] Optional function accept file content transform it and return new content
 * @return {Object}
 */
function safeParseJSONfile (fileName, allowMultiLineString, preprocessor) {
  let content = removeCommentsFromJSON(fs.readFileSync(fileName))
  if (allowMultiLineString) {
    content = content.replace(/[\n\r\t]/gm, ' ')
  }
  if (preprocessor) content = preprocessor(content)
  try {
    return JSON.parse(content)
  } catch (e) {
    console.error('Error parsing JSON file', fileName, e.message)
    fs.writeFileSync(fileName + '.bak', content)
    console.error('Processed file is saved to "' + fileName + '.bak"')
    throw e
  }
}

module.exports = {
  safeParseJSONfile: safeParseJSONfile,
    /**
     * @deprecated Use `options.switchIndex' instead
     * @param switchName
     * @returns {Number} switch index if found or -1 otherwise
     */
  findCmdLineSwitch: options.switchIndex,
    /**
     * @deprecated Use `options.switchValue' instead
     * @param switchName
     * @returns {String} switch value or `undefined` in case switch not found or switch not have value
     */
  findCmdLineSwitchValue: options.switchValue,
  getConfigFileName: getConfigFileName,
  serverSessionFromCmdLineAttributes: serverSessionFromCmdLineAttributes,
  establishConnectionFromCmdLineAttributes: establishConnectionFromCmdLineAttributes,
  checkServerStarted: checkServerStarted,
  getServerConfiguration,
  serverURLFromConfig: serverURLFromConfig
}
