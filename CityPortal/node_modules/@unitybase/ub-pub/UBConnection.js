/*
  Rewritten to ES6 from UB 1.12 sources by pavel.mash on 12.2016
 */

/* global localStorage */
const _ = require('lodash')
const EventEmitter = require('./events')
const ubUtils = require('./utils')
const i18n = require('./i18n').i18n
const transport = require('./transport')
const UBSession = require('@unitybase/base/UBSession')
const LocalDataStore = require('@unitybase/base/LocalDataStore')
const UBDomain = require('@unitybase/base/UBDomain')
const UBCache = require('./UBCache')
const CryptoJSCore = require('@unitybase/cryptojs/core')
const SHA256 = require('@unitybase/cryptojs/sha256')
const MD5 = require('@unitybase/cryptojs/md5')
const UBNotifierWSProtocol = require('./UBNotifierWSProtocol')
const ClientRepository = require('./ClientRepository')
// regular expression for URLs server not require authorization.
const NON_AUTH_URLS_RE = /(\/|^)(auth|getAppInfo)(\/|\?|$)/
// all request passed in this timeout to run will be send into one runList server method execution
const BUFFERED_DELAY = 20

const AUTH_METHOD_URL = 'auth'

const ANONYMOUS_USER = 'anonymous'
const AUTH_SCHEMA_FOR_ANONYMOUS = 'None'

/**
 * Default anonymous credential
 * @param {UBConnection} conn
 * @param {Boolean} isRepeat
 * @returns {*}
 */
function anonymousRequestAuthParams (conn, isRepeat) {
  if (isRepeat) {
    throw new ubUtils.UBError('Access deny')
  } else {
    return Promise.resolve({authSchema: AUTH_SCHEMA_FOR_ANONYMOUS, login: ANONYMOUS_USER})
  }
}

function parseUBErrorMessage(errMsg) {
  return JSON.parse('"' + errMsg.match(/<<<(.*)>>>/)[1] + '"')
}

/**
 * @classdesc
 *
 * Connection to the UnityBase server.
 *
 * In case host set to value other then `location.host` server must be configured to accept
 * <a href="https://developer.mozilla.org/en-US/docs/HTTP/Access_control_CORS">CORS</a> requests.
 * Usually it done via "HTTPAllowOrigin" server configuration option.
 *
 * Usage sample:
 *
       // connect using UBIP schema
       let conn = new UBConnection({
           host: 'http://127.0.0.1:888',
           requestAuthParams: function(conn, isRepeat){
               if (isRepeat){
                   throw new UB.UBAbortError('invalid credential')
               } else {
                   return Promise.resolve({authSchema: 'UBIP', login: 'admin'})
               }
            }
       });
       conn.query({entity: 'uba_user', method: 'select', fieldList: ['ID', 'name']}).then(UB.logDebug);

       // Anonymous connect. Allow access to entity methods, granted by ELS rules to `Anonymous` role
       // Request below will be success if we grant a `ubm_navshortcut.select` to `Anonymous` on the server side
       let conn = new UBConnection({
         host: 'http://127.0.0.1:888'
       });
       conn.query({entity: 'ubm_navshortcut', method: 'select', fieldList: ['ID', 'name']}).then(UB.logDebug);

 * This class mixes an EventEmitter, so you can subscribe for `authorized` and `authorizationFail` events:
 *
       conn.on('authorizationFail', function(reason){
            // indicate user credential is wrong
       });

       conn.on('authorized', function(ubConnection, session, authParams){console.debug(arguments)} );
 *
 * @class
 * @mixes EventEmitter
 * @param {Object} connectionParams connection parameters
 * @param {String} connectionParams.host UnityBase server host
 * @param {String} [connectionParams.appName='/'] UnityBase application to connect to
 * @param {Function} [connectionParams.requestAuthParams] Handler to log in.
 *      Must return promise & fulfill it by authorization parameters: {authSchema: authType, login: login, password: password }
 *          for openIDConnect must be fulfilled with  {data: uData, secretWord: ???}
 *      Called with arguments: {UBConnection} conn, {Boolean} isRepeat;
 *      isRepeat === true in case first auth request is invalid.
 *
 *      For Anonymous requests can be either omitted, or return promise, resolved to  `{authSchema: 'None'}`
 * @param {String} [connectionParams.protocol] either 'https' or 'http' (default)
 * @param {boolean} [connectionParams.allowSessionPersistent=false] See {@link connect} for details
 */
function UBConnection (connectionParams) {
  let host = connectionParams.host || 'http://localhost:888'
  let appName = connectionParams.appName || '/'
  let requestAuthParams = connectionParams.requestAuthParams
  let baseURL, serverURL
  /*
   * Current session (Promise). Result of {@link UBConnection#auth auth} method
   * {@link UBConnection#xhr} use this promise as a first `then` in call chain. In case of 401 response
   * authPromise recreated.
   */
  let currentSession

  EventEmitter.call(this)
  _.assign(this, EventEmitter.prototype)

  /**
   * Fired for {@link UBConnection} instance in case authenticaion type CERT and simpleCertAuth is true.
   * Here you can extract user name from certificate. By default it EDPOU or DRFO or email.
   * Accept 3 args (conn: UBConnection, urlParams: Object, certInfo: Object)
   * @event defineLoginName
   */

  /**
   * WebSocket `ubNotifier` protocol instance
   * @type {UBNotifierWSProtocol}
   */
  this.ubNotifier = null

  /**
   * Application settings transferred form a server
   * @type {{}}
   */
  this.appConfig = {}

  /**
   * The preferred (used in previous user session if any or a default for application) locale
   * @type {string}
   */
  this.preferredLocale = 'en'

  /**
   * Domain information. Initialized after promise, returned by by function {@link UBConnection#getDomainInfo getDomainInfo} isresolved
   * @type {UBDomain}
   */
  this.domain = null

  if (appName.charAt(0) !== '/') {
    appName = '/' + appName
  }
  if (!requestAuthParams) {
    requestAuthParams = anonymousRequestAuthParams
  }
  serverURL = host + appName
  /** UB Server URL with protocol and host.
   * @type {string}
   * @readonly
   */
  this.serverUrl = serverURL
  baseURL = ((typeof window !== 'undefined') && (window.location.origin === host)) ? appName : serverURL
  if (baseURL.charAt(baseURL.length - 1) !== '/') baseURL = baseURL + '/'
  /**
   * The base of all urls of your requests. Will be prepend to all urls while call UB.xhr
   * @type {String}
   * @readonly
   */
  this.baseURL = baseURL
  /** UB application name
   * @type {String}
   * @readonly
   */
  this.appName = appName

  this.allowSessionPersistent = connectionParams.allowSessionPersistent && (typeof localStorage !== 'undefined')
  if (this.allowSessionPersistent) this.__sessionPersistKey = this.serverUrl + ':storedSession'

  this.cache = null

  /**
   * Store a cached entities request.
   *  - keys is calculated from attributes using this.cacheKeyCalculate
   *  - values is a xhr promise
   *  UBConnection use this map internally to prevent duplicate requests to server for cached entities data,
   *  for example in case we put several combobox on form with the same cached entity
   * TODO - rewrite to WeekMap when IE 11 become popular
   * @private
   * @type {Object<string, Promise>}
   */
  this._pendingCachedEntityRequests = {}

  /**
   * Last successful login name. Filled AFTER first 401 response
   * @type {String}
   */
  this.lastLoginName = ''

  this._bufferedRequests = []
  this._bufferTimeoutID = 0

  /**
   * Is user currently logged in. There is no guaranty what session actually exist in server.
   * @returns {boolean}
   */
  this.isAuthorized = function () {
    return (currentSession !== undefined)
  }
  /**
   * Return current user logon name or 'anonymous' in case not logged in
   * @returns {String}
   */
  this.userLogin = function () {
    return this.userData('login')
  }

  /**
   * Return current user language or 'en' in case not logged in
   * @returns {String}
   */
  this.userLang = function () {
    return this.userData('lang')
  }

  /**
   * Return custom data for logged in user, or {lang: 'en', login: 'anonymous'} in case not logged in
   *
   * If key is provided - return only key part of user data:
   *
   *      $App.connection.userData('lang');
   *      // or the same but dedicated alias
   *      $App.connection.userLang()
   *
   * @param {String} [key] Optional key
   * @returns {*}
   */
  this.userData = function (key) {
    let uData = this.isAuthorized()
      ? currentSession.userData
      : { lang: 'en', login: ANONYMOUS_USER }

    return key ? uData[ key ] : uData
  }

  /**
   *
   * @param data
   * @param secretWord
   * @param authSchema
   * @return {UBSession}
   */
  function doCreateNewSession (data, secretWord, authSchema) {
    let ubSession = new UBSession(data, secretWord, authSchema)
    let userData = ubSession.userData
    if (!userData.lang || this.appConfig.supportedLanguages.indexOf(userData.lang) === -1) {
      userData.lang = this.appConfig.defaultLang
    }
    return ubSession
  }
  /**
   * The starter method for all authorized requests to UB server. Return authorization promise resolved to {@link UBSession}.
   * In case unauthorized:
   *
   *  - call requestAuthParams method passed to UBConnection constructor to retrieve user credentials
   *  - call {@link UBConnection#doAuth} method
   *
   * Used inside {@link UBConnection#xhr}, therefore developer rarely call it directly.
   * @method
   * @param {boolean} [isRepeat] in case user provide wrong credential - we must show logon window
   * @returns {Promise<UBSession>} Resolved to {UBSession} if auth success or rejected to `{errMsg: string, errCode: number, errDetails: string}` if fail
   */
  this.authorize = function (isRepeat) {
    let me = this
    if (currentSession) return Promise.resolve(currentSession)

    if (this.allowSessionPersistent && !isRepeat) {
      let storedSession = localStorage.getItem(this.__sessionPersistKey)
      if (storedSession) {
        try {
          let parsed = JSON.parse(storedSession)
          currentSession = doCreateNewSession.call(this, parsed.data, parsed.secretWord, parsed.authSchema)
          me.emit('authorized', me, currentSession)
          return Promise.resolve(currentSession)
        } catch (e) {
          localStorage.removeItem(this.__sessionPersistKey) // wrong session persistent data
        }
      }
    }

    if (this._pendingAuthPromise) return this._pendingAuthPromise

    this.exchangeKeysPromise = null
    this._pendingAuthPromise = requestAuthParams(this, isRepeat)
      .then(function (authParams) {
        return me.doAuth(authParams).then(function (session) {
          me._pendingAuthPromise = null // must be before event emit to clear pending even in case of error in event handler
          currentSession = session
          /**
           * Fired for {@link UBConnection} instance after success authorization. Accept 3 args (conn: UBConnection, session: UBSession, authParams)
           * @event authorized
           */
          me.emit('authorized', me, session, authParams)
          return session
        }).catch(function (reason) {
          me._pendingAuthPromise = null // must be before event emit to clear pending even in case of error in event handler
          if (!reason || !(reason instanceof ubUtils.UBAbortError)) {
            /**
             * Fired for {@link UBConnection} instance in case of bad authorization Accept 2 args (reason, connection)
             * @event authorizationFail
             */
            me.emit('authorizationFail', reason, me)
          }
          return me.authorize(true)
        })
      })
    return this._pendingAuthPromise
  }

  /**
   * Clear current user authorization promise. Next request repeat authorization
   * @private
   */
  this.authorizationClear = function () {
    this.lastLoginName = this.userLogin()
    currentSession = undefined
  }

  /**
   * UBIP Auth schema implementation
   * @param authParams
   * @returns {Promise}
   */
  this.authHandshakeUBIP = function (authParams) {
    if (!authParams.login) {
      return Promise.reject({errMsg: 'invalid user name'})
    }

    return this.post(AUTH_METHOD_URL, '', {headers: {Authorization: authParams.authSchema + ' ' + authParams.login}})
  }

  /**
   * openID Connect auth schema.
   * This function act as a proxy but change authSchema back to 'UB' for authorization token generation
   * @param authParams
   * @return {*}
   */
  this.authHandshakeOpenIDConnect = function (authParams) {
    return Promise.resolve(authParams).then(function (authParams) {
      authParams.authSchema = 'UB'
      return authParams
    })
  }

  /**
   * UB Auth schema implementation
   * @param authParams
   * @returns {Promise}
   */
  this.authHandshakeUB = function (authParams) {
    let me = this
    let secretWord

    if (!authParams.login || !authParams.password) {
      return Promise.reject({errMsg: 'invalid user name or password'})
    }

    return this.post(AUTH_METHOD_URL, '', {
      params: {
        AUTHTYPE: authParams.authSchema,
        userName: authParams.login
      }
    }).then(function (resp) {
      let serverNonce, pwdHash, pwdForAuth
      let request = {
        params: {
          AUTHTYPE: authParams.authSchema,
          userName: authParams.login,
          password: ''
        }
      }
      let clientNonce = SHA256(new Date().toISOString().substr(0, 16)).toString()
      request.params.clientNonce = clientNonce
      if (resp.data.connectionID) {
        request.params.connectionID = resp.data.connectionID
      }
      // LDAP AUTH?
      let realm = resp.data.realm
      if (realm) {
        serverNonce = resp.data.nonce
        if (!serverNonce) {
          throw new Error('invalid LDAP auth response')
        }
        if (resp.data.useSasl) {
          pwdHash = MD5(authParams.login.split('\\')[1].toUpperCase() + ':' + realm + ':' + authParams.password)
          // we must calculate md5(login + ':' + realm + ':' + password) in binary format
          pwdHash.concat(CryptoJSCore.enc.Utf8.parse(':' + serverNonce + ':' + clientNonce))
          pwdForAuth = MD5(pwdHash).toString()
          secretWord = pwdForAuth // :( medium unsecured
        } else {
          pwdForAuth = window.btoa(authParams.password)
          secretWord = pwdForAuth // todo -  very unsecured!!
        }
      } else {
        serverNonce = resp.data.result
        if (!serverNonce) {
          throw new Error('invalid auth response')
        }
        pwdHash = SHA256('salt' + authParams.password).toString()
        let appForAuth = appName === '/' ? '/' : appName.replace(/\//g, '')
        pwdForAuth = SHA256(appForAuth.toLowerCase() + serverNonce + clientNonce + authParams.login + pwdHash).toString()
        secretWord = pwdHash
      }
      request.params.password = pwdForAuth
      return me.post(AUTH_METHOD_URL, '', request).then(function (response) {
        response.secretWord = secretWord
        return response
      })
    })
  }

  /**
   * CERT auth schema implementation
   * @returns {Promise}
   */
  this.authHandshakeCERT = function () {
    throw new Error('authHandshakeCERT should be injected by "nm-dstu" model')
  }
  /**
   * Do authentication in UnityBase server. Usually called from UBConnection #authorize method in case authorization expire or user not authorized.
   * Resolve to {@link UBSession} session object.
   *
   * @private
   * @param {Object} authParams
   * @param {String} [authParams.authSchema] Either 'UB' (default) or 'CERT'. On case of CERT UBDesktop service NPI extension must be installed in browser
   * @param {String} [authParams.login] Optional login
   * @param {String} [authParams.password] Optional password
   * @returns {Promise} Authentication promise. Resolved to {@link UBSession} is auth success or rejected to {errMsg: string, errCode: number, errDetails: string} if fail
   */
  this.doAuth = function (authParams) {
    authParams.authSchema = authParams.authSchema || 'UB'

    if (this.isAuthorized()) {
      return Promise.reject({errMsg: 'invalid auth call', errDetails: 'contact developers'})
    }

    let promise
    switch (authParams.authSchema) {
      case AUTH_SCHEMA_FOR_ANONYMOUS:
        promise = Promise.resolve({data: {result: '0+0', uData: JSON.stringify({login: ANONYMOUS_USER})}, secretWord: ''})
        break
      case 'UB':
        promise = this.authHandshakeUB(authParams)
        break
      case 'CERT':
        promise = this.authHandshakeCERT(authParams)
        break
      case 'UBIP':
        promise = this.authHandshakeUBIP(authParams)
        break
      case 'OpenIDConnect':
        promise = this.authHandshakeOpenIDConnect(authParams)
        break
      case 'Negotiate':
        promise = this.post(AUTH_METHOD_URL, '', {
          params: {
            USERNAME: '',
            AUTHTYPE: authParams.authSchema
          }
        }).then(function (resp) {
          resp.secretWord = resp.data.logonname
          return resp
        })
        break
      default:
        promise = Promise.reject({errMsg: 'invalid authentication schema ' + authParams.authSchema})
        break
    }
    promise = promise.then(
      (authResponse) => {
        let ubSession = doCreateNewSession.call(this, authResponse.data, authResponse.secretWord, authParams.authSchema)
        if (this.allowSessionPersistent) {
          localStorage.setItem(
            this.__sessionPersistKey,
            JSON.stringify({data: authResponse.data, secretWord: authResponse.secretWord, authSchema: authResponse.authSchema})
          )
        }
        return ubSession
      },

      (rejectReason) => {
        if (!(rejectReason instanceof Error)) {
          let errDescription = rejectReason.data || rejectReason // in case of server-side error we got a {data: {errMsg: ..}..}
          let errInfo = {
            errMsg: errDescription.errMsg,
            errCode: errDescription.errCode,
            errDetails: errDescription.errMsg
          }
          if (rejectReason.status === 403) {
            errInfo.errMsg = (authParams.authSchema === 'UB') ? 'msgInvalidUBAuth' : 'msgInvalidCertAuth'
          } else {
            if (!errInfo.errMsg) { errInfo.errMsg = 'unknownError' } // internalServerError
          }
          if (rejectReason.status === 0) {
            errInfo.errDetails = 'network error'
          }
          if (/<<<.*>>>/.test(errInfo.errMsg)) {
            errInfo.errMsg = parseUBErrorMessage(errInfo.errMsg)
          }

          let codeMsg = this.serverErrorByCode(errInfo.errCode)
          if (codeMsg) {
            errInfo.errDetails = codeMsg + ' ' + errInfo.errDetails
            if (i18n(codeMsg) !== codeMsg) {
              errInfo.errMsg = codeMsg
            }
          }
          if (this.allowSessionPersistent) localStorage.removeItem(this.__sessionPersistKey)
          throw new ubUtils.UBError(errInfo.errMsg, errInfo.errDetails, errInfo.errCode)
        } else {
          throw rejectReason // rethrow error
        }
      }
    )
    return promise
  }

  this.recordedXHRs = []
  /**
   * Set it to `true` for memorize all requests to recordedXHRs array (for debug only!).
   * @type {Boolean}
   */
  this.recorderEnabled = false
}

/**
 * Initialize client cache. Called from application after obtain userDbVersion
 *
 * - recreate Indexed Db database if version changed
 * - create instance of UBCache (accessible via {@link UBConnection#cache UBConnection.cache} property) and clear UBCache.SESSION store.
 *
 * @param {Number} userDbVersion Indexed DB database version required for current application
 * @returns {Promise}
 */
UBConnection.prototype.initCache = function (userDbVersion) {
  /**
   * @property {UBCache} cache
   * @readonly
   * @type {UBCache}
   */
  this.cache = new UBCache(this.baseURL, userDbVersion)
  /**
   * List of keys, requested in the current user session.
   * Cleared each time login done
   * @property {Object} cachedSessionEntityRequested
   */
  this.cachedSessionEntityRequested = {}
  // clear use session store
  return this.cache.clear(UBCache.SESSION)
}

/**
 * Calculate cache key for request. This key is used to store data inside UBCache
 * @param {String} root This is usually entity name
 * @param {Array<string>} [attributes] if present - add attributes hash. This is usually array of entity attributes we want to put inside cache
 * @returns {String}
 */
UBConnection.prototype.cacheKeyCalculate = function (root, attributes) {
  let keyPart = [this.userLogin().toLowerCase(), this.userLang(), root]
  if (Array.isArray(attributes)) {
    keyPart.push(MD5(JSON.stringify(attributes)).toString())
  }
  return keyPart.join('#').replace(/[\\:.]/g, '#') // replace all :, \ -> #;
}

/**
 * Refresh all cache occurrence for root depending on cacheType:
 *
 * - if `Session` - clear indexedDB for this root.
 * - if `SessionEntity` - remove entry in {@link UBConnection#cachedSessionEntityRequested}
 * - else - do nothing
 * @param {String} root Root part of cache key. The same as in {@link UBConnection#cacheKeyCalculate}
 * @param {UBCache.cacheTypes} cacheType
 * @returns {Promise}
 */
UBConnection.prototype.cacheOccurrenceRefresh = function (root, cacheType) {
  let me = this
  let promise = Promise.resolve(true)

  if (cacheType === UBCache.cacheTypes.Session || cacheType === UBCache.cacheTypes.SessionEntity) {
    let entity = this.domain.get(root)
    if (entity && entity.hasMixin('unity')) {
      let unityMixin = entity.mixin('unity')
      let unityEntity = this.domain.get(unityMixin.entity)
      if (unityEntity && (unityMixin.entity !== root) && (unityEntity.cacheType !== UBCache.cacheTypes.None)) {
        promise = promise.then(
          () => me.cacheOccurrenceRefresh(unityMixin.entity, unityEntity.cacheType)
        )
      }
    }
    let cacheKey = me.cacheKeyCalculate(root)
    let machRe = new RegExp('^' + cacheKey)
    let machKeys = Object.keys(me.cachedSessionEntityRequested).filter(function (item) {
      return machRe.test(item)
    })
    machKeys.forEach(function (key) {
      delete me.cachedSessionEntityRequested[key]
    })
    if (cacheType === UBCache.cacheTypes.Session) {
      promise = promise.then(function () {
        return me.cache.removeIfMach(machRe, UBCache.SESSION)
      })
    }
  }
  return promise
}

/**
 * Remove all cache occurrence for root depending on cacheType:
 *
 * - clear indexedDB for this root.
 * - remove entry in {@link UBConnection#cachedSessionEntityRequested}

 * @param {String} root Root part of cache key. The same as in {@link UBConnection#cacheKeyCalculate}
 * @param {String} cacheType One of {@link UBCache#cacheTypes}
 * @returns {Promise}
 */
UBConnection.prototype.cacheOccurrenceRemove = function (root, cacheType) {
  let me = this

  let cacheKey = me.cacheKeyCalculate(root)
  let machRe = new RegExp('^' + cacheKey)
  let machKeys = Object.keys(me.cachedSessionEntityRequested).filter(function (item) {
    return machRe.test(item)
  })
  machKeys.forEach(function (key) {
    delete me.cachedSessionEntityRequested[key]
  })
  let cacheStore = (cacheType === UBCache.cacheTypes.Session) ? UBCache.SESSION : UBCache.PERMANENT
  return me.cache.removeIfMach(machRe, cacheStore)
}

/**
 * Clear all local cache (indexedDB session & permanent and UBConnection.cachedSessionEntityRequested)
 * @returns {Promise}
 */
UBConnection.prototype.cacheClearAll = function () {
  let me = this
  Object.keys(me.cachedSessionEntityRequested).forEach(function (item) {
    delete me.cachedSessionEntityRequested[item]
  })
  return Promise.all([me.cache.clear(UBCache.SESSION), me.cache.clear(UBCache.PERMANENT)])
}

/**
 * Shortcut method to perform authorized `GET` request to application we connected
 * @param {string} url Relative or absolute URL specifying the destination of the request
 * @param {Object=} [config] Optional configuration object as in {xhr}
 * @returns {Promise} Future object
 */
UBConnection.prototype.get = function (url, config) {
  return this.xhr(_.assign({}, config, {
    method: 'GET',
    url: url
  }))
}

/**
 * Shortcut method to perform authorized `POST` request to application we connected
 * @param {string} url Relative or absolute URL specifying the destination of the request
 * @param {*} data Request content
 * @param {Object=} [config] Optional configuration object as in {xhr}
 * @returns {Promise} Future object
 */
UBConnection.prototype.post = function (url, data, config) {
  return this.xhr(_.assign({}, config, {
    method: 'POST',
    url: url,
    data: data
  }))
}

/**
 *
 * @param {UBSession} session
 * @param {Object} cfg
 * @return {boolean}
 */
UBConnection.prototype.checkChannelEncryption = function (session, cfg) {
  return true
}
/**
 * Shortcut method to perform authorized/encrypted request to application we connected.
 * Will:
 *
 *  - add Authorization header for non-anonymous sessions
 *  - add {@link UBConnection#baseURL} to config.url
 *  - call {@link transport.xhr}
 *  - in case server return 401 clear current authorization,
 *  call {UBConnection#authorize) and repeat the request
 *
 * @param config Request configuration as described in {transport.xhr}
 * @return {Promise}
 */
UBConnection.prototype.xhr = function (config) {
  let me = this
  let cfg = _.assign({headers: {}}, config)
  let url = cfg.url
  let promise

  if (me.recorderEnabled) {
    me.recordedXHRs.push(config)
  }
  // prepend baseURl only if not already prepended
  if (url.length < me.baseURL.length || url.substring(0, me.baseURL.length) !== me.baseURL) {
    cfg.url = me.baseURL + cfg.url
  }

  if (NON_AUTH_URLS_RE.test(url)) { // request not require authentication - pass is as is
    promise = transport.xhr(cfg)
  } else {
    promise = me.authorize().then((session) => me.checkChannelEncryption(session, cfg))

    promise = promise.then(function () {
      // we must repeat authorize to obtain new session key ( because key exchange may happens before)
      return me.authorize().then(/** @param {UBSession} session */ function (session) {
        let head = session.authHeader()
        if (head) cfg.headers.Authorization = head // do not add header for anonymous session
        return transport.xhr(cfg)
      })
    }).catch(function (reason) { // in case of 401 - do auth and repeat request
      let errMsg = ''
      if (reason.status === 401) {
        if (me.allowSessionPersistent) localStorage.removeItem(me.__sessionPersistKey) // addled session persisted data
        ubUtils.logDebug('unauth: %o', reason)
        if (me.isAuthorized()) {
          me.authorizationClear()
        }
        // reason.config.url: "/bla-bla/logout"
        if (reason.config.url && /\/logout/.test(reason.config.url)) {
          me.lastLoginName = ''
        } else {
          transport.xhr.allowRequestReiteration() // prevent a monkeyRequestsDetected error during relogon [UB-1699]
          return me.xhr(config)
        }
      }

      if (reason.data && reason.data.hasOwnProperty('errCode')) { // this is server side error response
        let errCode = reason.data.errCode
        let errDetails = errMsg = reason.data.errMsg

        if (/<<<.*>>>/.test(errMsg)) { // this is custom error
          errMsg = i18n(parseUBErrorMessage(errMsg)) // extract rear message and translate
        }
        /**
         * Fired for {@link UBConnection} instance in case user password is expired.
         * The only valid endpoint after this is `changePassword`
         * Accept 1 arg (connection)
         * @event passwordExpired
         */
        if ((errCode === 72) && me.emit('passwordExpired', me)) {
          throw new ubUtils.UBAbortError()
        }
        throw new ubUtils.UBError(errMsg, errDetails, errCode)
      } else {
        throw reason //! Important - rethrow the reason is important. Do not create a new Error here
      }
    })
  }
  return promise
}

/**
 * Base64 encoded server certificate
 * @property {String} serverCertificate
 * @readonly */
/** Lifetime (in second) of session encryption
 * @property {Number} encryptionKeyLifetime
 * @readonly */
/**
 * Possible server authentication method
 * @property {Array.<string>} authMethods
 * @readonly */
/**
 * Retrieve application information. Usually this is first method developer must call after create connection
 * @method
 * @returns {Promise}  Promise resolved to result of getAppInfo method
 */
UBConnection.prototype.getAppInfo = function () {
  let me = this
  return me.get('getAppInfo') // non-auth request
    .then(function (resp) {
      let appInfo = resp.data
      /** Is server require content encryption
       * @property {Boolean} trafficEncryption
       * The base of all urls of your requests. Will be prepend to all urls.
       * @readonly */
      Object.defineProperty(me, 'trafficEncryption', {enumerable: true, writable: false, value: appInfo.trafficEncryption || false})
      /** The server certificate for cryptographic operations (base46 encoded)
       * @property {Boolean} serverCertificate
       * @readonly */
      Object.defineProperty(me, 'serverCertificate', {enumerable: true, writable: false, value: appInfo.serverCertificate || ''})
      Object.defineProperty(me, 'encryptionKeyLifetime', {enumerable: true, writable: false, value: appInfo.encryptionKeyLifetime || 0})
      Object.defineProperty(me, 'authMethods', {enumerable: true, writable: false, value: appInfo.authMethods})
      Object.defineProperty(me, 'simpleCertAuth', {enumerable: true, writable: false, value: appInfo.simpleCertAuth || false})

      /**
       * An array of WebSocket protocol names supported by server
       * @property {Array<String>} supportedWSProtocols
       */
      Object.defineProperty(me, 'supportedWSProtocols', {enumerable: true, writable: false, value: appInfo.supportedWSProtocols || []})
      /** UnityBase server version
       * @property {String} serverVersion
       * @readonly
       */
      Object.defineProperty(me, 'serverVersion', {enumerable: true, writable: false, value: appInfo.serverVersion || ''})
      ubUtils.apply(me.appConfig, appInfo.uiSettings.adminUI)
      return appInfo
    })
}

/**
 * Retrieve domain information from server. Promise resolve instance of UBDomain.
 * @returns {Promise}
 */
UBConnection.prototype.getDomainInfo = function () {
  let me = this
  return me.get('getDomainInfo', {params: {
    v: 4, userName: this.userLogin()}
  }).then(function (response) {
    let result = response.data
    let domain = new UBDomain(result)
    me.domain = domain
    return domain
  })
}

/**
 * Process buffered requests from this._bufferedRequests
 * @private
 */
UBConnection.prototype.processBuffer = function processBuffer () {
  let bufferCopy = this._bufferedRequests
  // get ready to new buffer queue
  this._bufferTimeoutID = 0
  this._bufferedRequests = []

  this.post('ubql', _.map(bufferCopy, 'request')).then(
    (responses) => {
      // we expect responses in order we send requests to server
      bufferCopy.forEach(function (bufferedRequest, num) {
        bufferedRequest.deferred.resolve(responses.data[num])
      })
    },
    (failReason) => {
      bufferCopy.forEach(function (bufferedRequest) {
        bufferedRequest.deferred.reject(failReason)
      })
    }
  )
}

/**
 * Promise of running UBQL command(s) (asynchronously).
 * The difference from {@link UBConnection.post} is:
 *
 * - ability to buffer request: can merge several `query` in the 20ms period into one ubql call
 *
 * For well known UnityBase methods use aliases (addNew, select, insert, update, doDelete)
 * @param {Object} ubq    Request to execute
 * @param {String} ubq.entity Entity to execute the method
 * @param {String} ubq.method Method of entity to executed
 * @param {Array.<String>} [ubq.fieldList]
 * @param {Object} [ubq.whereList]
 * @param {Object} [ubq.execParams]
 * @param {Number} [ubq.ID]
 * @param {Object} [ubq.options]
 * @param {String} [ubq.lockType]
 * @param {Boolean} [ubq.__skipOptimisticLock] In case this parameter true and in the buffered
 * @param {Boolean} [ubq.__nativeDatasetFormat]
 * @param {Boolean} [allowBuffer] Allow buffer this request to single runList. False by default
 * @method
 * @returns {Promise}
 *
 * Example:
 *
 *      //this two execution is passed to single ubql server execution
 *      $App.connection.query({entity: 'uba_user', method: 'select', fieldList: ['*']}, true).then(UB.logDebug);
 *      $App.connection.query({entity: 'ubm_navshortcut', method: 'select', fieldList: ['*']}, true).then(UB.logDebug);
 *
 *      //but this request is passed in separate ubql (because allowBuffer false in first request
 *      $App.connection.query({entity: 'uba_user', method: 'select', fieldList: ['*']}).then(UB.logDebug);
 *      $App.connection.query({entity: 'ubm_desktop', method: 'select', fieldList: ['*']}, true).then(UB.logDebug);
 */
UBConnection.prototype.query = function query (ubq, allowBuffer) {
  let me = this
  if (!allowBuffer || !BUFFERED_DELAY) {
    return me.post('ubql', [ubq]).then(function (response) {
      return response.data[0]
    })
  } else {
    if (!this._bufferTimeoutID) {
      this._bufferTimeoutID = setTimeout(me.processBuffer.bind(me), BUFFERED_DELAY)
    }
    return new Promise(function (resolve, reject) {
      me._bufferedRequests.push({ request: ubq, deferred: { resolve, reject } })
    })
  }
}

/**
 * @deprecated Since UB 1.11 use `query` method
 * @private
 */
UBConnection.prototype.run = UBConnection.prototype.query

/**
 * Convert raw server response data to javaScript data according to attribute types.
 * Called by {@link UBConnection#select}
 * Currently only Data/DateTime & boolean conversion done
 * If resultLock present - resultLock.lockTime also converted
 *
 *      // convert all string representation of date/dateTime to Date object, integer representation of bool to Boolean
 *      return me.query({entity: 'my_entity', method: 'select'}, true)
 *          .then(me.convertResponseDataToJsTypes.bind(me));
 *
 * @method
 * @param serverResponse
 * @returns {*}
 */
UBConnection.prototype.convertResponseDataToJsTypes = function (serverResponse) {
  if (serverResponse.entity && // fieldList &&  serverResponse.fieldList
      serverResponse.resultData &&
      !serverResponse.resultData.notModified &&
      serverResponse.resultData.fields &&
      serverResponse.resultData.data && serverResponse.resultData.data.length
  ) {
    let convertRules = this.domain.get(serverResponse.entity).getConvertRules(serverResponse.resultData.fields)
    let rulesLen = convertRules.length
    let data = serverResponse.resultData.data
    if (rulesLen) {
      for (let d = 0, dataLen = data.length; d < dataLen; d++) {
        for (let r = 0; r < rulesLen; r++) {
          let column = convertRules[r].index
          data[d][column] = convertRules[r].convertFn(data[d][column])
        }
      }
    }
  }
  if (serverResponse.resultLock && serverResponse.resultLock.lockTime) {
    serverResponse.resultLock.lockTime = ubUtils.iso8601Parse(serverResponse.resultLock.lockTime)
  }
  return serverResponse
}

/**
 * Call a {@link LocalDataStore#doFilterAndSort} - see a parameters there
 * @protected
 * @param {TubCachedData} cachedData
 * @param {TubSelectRequest} ubRequest
 * @returns {Object}
 */
UBConnection.prototype.doFilterAndSort = function (cachedData, ubRequest) {
  return LocalDataStore.doFilterAndSort(cachedData, ubRequest)
}

/**
 * Promise of running UBQL command with `addNew` method (asynchronously).
 * Two difference from {@link UBConnection.query}:
 *
 * - ubRequest.method set to 'addnew'
 * - requests is always buffered in the 20ms period into one ubql call
 * - `Date` & 'DateTime' entity attributes are converted from ISO8601 text representation to javaScript Date object
 *
 * Example:
 *
 *      $App.connection.addNew({entity: 'uba_user', fieldList: ['*']}).then(UB.logDebug);
 *
 * @param {Object} serverRequest    Request to execute
 * @param {String} serverRequest.entity Entity to execute the method
 * @param {String} [serverRequest.method] Method of entity to executed. Default to 'select'
 * @param {Array.<string>} serverRequest.fieldList
 * @param {Object} [serverRequest.execParams]
 * @param {Object} [serverRequest.options]
 * @param {String} [serverRequest.lockType]
 * @param {Boolean} [serverRequest.alsNeed]
 * @returns {Promise}
 */
UBConnection.prototype.addNew = function (serverRequest) {
  let me = this
  serverRequest.method = 'addnew'
  return me.query(serverRequest, true)
    .then(me.convertResponseDataToJsTypes.bind(me))
}

/**
 * Called in update/insert/delete methods and if request entity is cached then clear cache
 * @private
 * @param serverResponse
 * @return {Promise} Promise resolved to serverResponse
 */
UBConnection.prototype.invalidateCache = function (serverResponse) {
  let me = this
  let cacheType = me.domain.get(serverResponse.entity).cacheType
  if (cacheType === UBCache.cacheTypes.none) {
    return serverResponse
  }
  return me.cacheOccurrenceRefresh(serverResponse.entity, cacheType).then(function () {
    return serverResponse
  })
}

/**
 * Promise of running UBQL command with `update` method (asynchronously).
 * Difference from {@link UBConnection.query}:
 *
 * - ubRequest.method set to 'update'
 * - `Date` & 'DateTime' entity attributes are converted from ISO8601 text representation to javaScript Date object
 * - if necessary it will clear cache
 *
 * Example:
 *
 *      $App.connection.update({entity: 'uba_user', fieldList: ['ID','name'], execParams: {ID: 1, name:'newName'}}).then(UB.logDebug);
 *
 * @param {Object} serverRequest    Request to execute
 * @param {String} serverRequest.entity Entity to execute the method
 * @param {String} [serverRequest.method] Method of entity to executed. Default to 'update'
 * @param {Array.<string>} serverRequest.fieldList
 * @param {Object} [serverRequest.execParams]
 * @param {Object} [serverRequest.options]
 * @param {String} [serverRequest.lockType]
 * @param {Boolean} [serverRequest.alsNeed]
 * @param {Boolean} [allowBuffer] Default - false. Allow several "in the same time" request to be buffered to one transaction.
 * @returns {Promise}
 */
UBConnection.prototype.update = function (serverRequest, allowBuffer) {
  let me = this
  serverRequest.method = serverRequest.method || 'update'
  return me.query(serverRequest, allowBuffer)
    .then(me.convertResponseDataToJsTypes.bind(me))
    .then(me.invalidateCache.bind(me))
}

/**
 * Promise of running UnityBase UBQL command with `insert` method (asynchronously).
 * Difference from {@link UBConnection.query}:
 *
 * - ubRequest.method set to 'insert'
 * - `Date` & 'DateTime' entity attributes are converted from ISO8601 text representation to javaScript Date object
 * - if necessary it will clear cache
 *
 * @param {Object} serverRequest    Request to execute
 * @param {String} serverRequest.entity Entity to execute the method
 * @param {String} [serverRequest.method] Method of entity to executed. Default to 'insert'
 * @param {Array.<string>} serverRequest.fieldList
 * @param {Object} [serverRequest.execParams]
 * @param {Object} [serverRequest.options]
 * @param {String} [serverRequest.lockType]
 * @param {Boolean} [serverRequest.alsNeed]
 *
 * @param {Boolean} [allowBuffer] Default - false. Allow several "in the same time" request to be buffered to one transaction.
 *
 * @method
 * @returns {Promise}
 *
 * Example:
 *
 *      $App.connection.insert({entity: 'uba_user', fieldList: ['ID','name'], execParams: {ID: 1, name:'newName'}).then(UB.logDebug);
 *
 */
UBConnection.prototype.insert = function (serverRequest, allowBuffer) {
  let me = this
  serverRequest.method = serverRequest.method || 'insert'
  return me.query(serverRequest, allowBuffer)
    .then(me.convertResponseDataToJsTypes.bind(me))
    .then(me.invalidateCache.bind(me))
}

/**
 * Promise of running UBQL command with delete method (asynchronously).
 * Difference from {@link UBConnection.query}:
 *
 * - ubRequest.method set to 'delete' by default
 * - if necessary it will clear cache
 *
 * @param {Object} serverRequest    Request to execute
 * @param {String} serverRequest.entity Entity to execute the method
 * @param {String} [serverRequest.method] Method of entity to executed. Default to 'delete'
 * @param {Object} [serverRequest.execParams]
 * @param {Object} [serverRequest.options]
 * @param {String} [serverRequest.lockType]
 * @param {Boolean} [serverRequest.alsNeed]
 *
 * @param {Boolean} [allowBuffer] Default - false. Allow several "in the same time" request to be buffered to one transaction.
 *
 * @method
 * @returns {Promise}
 *
 * Example:
 *
 *      $App.connection.doDelete({entity: 'uba_user', fieldList: ['ID','name'], execParams: {ID: 1, name:'newName'}).then(UB.logDebug);
 *
 */
UBConnection.prototype.doDelete = function (serverRequest, allowBuffer) {
  let me = this
  serverRequest.method = serverRequest.method || 'delete'
  return me.query(serverRequest, allowBuffer)
    .then(me.invalidateCache.bind(me))
}

/**
 * Promise of running UBQL (asynchronously).
 * Two difference from {@link UBConnection.query}:
 *
 * - ubRequest.method by default set to 'select'
 * - requests is always buffered in the 20ms period into one ubql call
 * - `Date` & 'DateTime' entity attributes are converted from ISO8601 text representation to javaScript Date object
 * - if request entity is cached - cache used
 *
 * @param {Object} serverRequest    Request to execute
 * @param {String} serverRequest.entity Entity to execute the method
 * @param {String} [serverRequest.method] Method of entity to executed. Default to 'select'
 * @param {Number} [serverRequest.ID] if passed - request bypass cache, where & order list is ignored. Can be used to load single record from server
 * @param {Array.<string>} serverRequest.fieldList
 * @param {Object} [serverRequest.whereList]
 * @param {Object} [serverRequest.execParams]
 * @param {Object} [serverRequest.options]
 * @param {String} [serverRequest.lockType]
 * @param {Boolean} [serverRequest.alsNeed]
 * @param {Boolean} [serverRequest.__skipOptimisticLock] In case this parameter true and in the buffered
 * @param {Boolean} [bypassCache=false] Do not use cache while request even if entity cached.
 *   If  `__mip_disablecache: true` is passed in serverRequest cache is also disabled.
 * @method
 * @returns {Promise}
 *
 * Example:
 *
 *      //retrieve users
 *      $App.connection.select({entity: 'uba_user', fieldList: ['*']}).then(UB.logDebug);
 *
 *      //retrieve users and desktops and then both done - do something
 *      Promise.all($App.connection.select({entity: 'uba_user', fieldList: ['ID', 'name']})
 *        $App.connection.select({entity: 'ubm_desktop', fieldList: ['ID', 'code']})
 *      ).then(UB.logDebug);
 */
UBConnection.prototype.select = function (serverRequest, bypassCache) {
  let me = this
  let dataPromise

  bypassCache = bypassCache || (serverRequest.__mip_disablecache === true)
  let cacheType = bypassCache || serverRequest.ID || serverRequest.bypassCache
    ? UBCache.cacheTypes.None
    : me.domain.get(serverRequest.entity).cacheType

  if (!serverRequest.method) {
    serverRequest.method = 'select'
  }
  // if exist expression where ID = ... bypass cache
  //        if (idInWhere(serverRequest.whereList)){
  //            cacheType = cacheTypes.None;
  //        }
  if (cacheType === UBCache.cacheTypes.None) { // where & order is done by server side
    dataPromise = this.query(serverRequest, true)
      .then(this.convertResponseDataToJsTypes.bind(this))
      .then(response => {
        let responseWithTotal = {}
        ubUtils.apply(responseWithTotal, response)
        if (response.__totalRecCount) {
          responseWithTotal.total = response.__totalRecCount
        } else if (response.resultData && response.resultData.data) {
          let resRowCount = response.resultData.data.length
          if (!serverRequest.options) {
            responseWithTotal.total = resRowCount
          } else {
            let opt = serverRequest.options || {}
            let start = opt.start ? opt.start : 0
            let limit = opt.limit || 0
            // in case we fetch less data then requested - this is last page and we know total
            responseWithTotal.total = (resRowCount < limit) ? start + resRowCount : -1
          }
        }
        return responseWithTotal
      })
  } else { // where & order is done by client side
    return this._doSelectForCacheableEntity(serverRequest, cacheType)
  }
  return dataPromise
}

/**
 * @private
 * @param {Object} serverRequest    Request to execute
 * @param {UBCache.cacheTypes} cacheType
 */
UBConnection.prototype._doSelectForCacheableEntity = function (serverRequest, cacheType) {
// TODO check all filtered attribute is present in whereList - rewrite me.checkFieldList(operation);
  let cKey = this.cacheKeyCalculate(serverRequest.entity, serverRequest.fieldList)
  let cacheStoreName = (cacheType === UBCache.cacheTypes.Session) ? UBCache.SESSION : UBCache.PERMANENT
  // retrieve data either from cache or from server
  return this.cache.get(cKey + ':v', cacheStoreName).then((version) => {
    let cachedPromise
    if (!version || // no data in cache or invalid version
      // or must re-validate version
      (version && cacheType === UBCache.cacheTypes.Entity) ||
      // or SessionEntity cached not for current cache version
      (version && cacheType === UBCache.cacheTypes.SessionEntity && this.cachedSessionEntityRequested[cKey] !== version)
    ) {
      // remove where order & limits
      let serverRequestWOLimits = {}
      Object.keys(serverRequest).forEach(function (key) {
        if (['whereList', 'orderList', 'options'].indexOf(key) === -1) {
          serverRequestWOLimits[key] = serverRequest[key]
        }
      })
      serverRequestWOLimits.version = version || '-1'
      let pendingCachedEntityRequest = this._pendingCachedEntityRequests[cKey]
        ? this._pendingCachedEntityRequests[cKey]
        : this._pendingCachedEntityRequests[cKey] = this.query(serverRequestWOLimits, true)
      cachedPromise = pendingCachedEntityRequest
        .then( // delete pending request in any case
          (data) => {
            delete this._pendingCachedEntityRequests[cKey]
            return data
          },
          (reason) => {
            delete this._pendingCachedEntityRequests[cKey]
            throw reason
          }
        )
        .then(this.convertResponseDataToJsTypes.bind(this))
        .then(response => this._cacheVersionedResponse(response, cacheStoreName, cKey))
    } else { // retrieve data from cache
      cachedPromise = this.cache.get(cKey, cacheStoreName)
    }
    return cachedPromise
  }).then(cacheResponse => {
    return this.doFilterAndSort(cacheResponse, serverRequest)
  })
}

/**
 * Put response to cache
 * @private
 * @param {Object} serverResponse
 * @param {Object} serverResponse.resultData
 * @param {Boolean} [serverResponse.resultData.notModified]
 * @param {String} storeName
 * @param {String} cKey Cache key
 * @returns {*}
 */
UBConnection.prototype._cacheVersionedResponse = function (serverResponse, storeName, cKey) {
  if (serverResponse.resultData.notModified) {
    // in case we refresh cachedSessionEntityRequested or just after login - put version to cachedSessionEntityRequested
    this.cachedSessionEntityRequested[cKey] = serverResponse.version
    return this.cache.get(cKey, storeName)
  } else {
    return this.cache.put([
      {key: cKey + ':v', value: serverResponse.version},
      {key: cKey, value: serverResponse.resultData}
    ], storeName).then(() => {
      this.cachedSessionEntityRequested[cKey] = serverResponse.version
      return serverResponse.resultData
    })
  }
}
/**
 * Alias to {@link LocalDataStore#selectResultToArrayOfObjects LocalDataStore.selectResultToArrayOfObjects}
 *
 * @param {{resultData: {data: Array.<Array>, fields: Array.<String>}}} selectResult
 * @returns {Array.<*>}
 * @private
 * @deprecated Use LocalDataStore.selectResultToArrayOfObjects
 */
UBConnection.selectResultToArrayOfObjects = LocalDataStore.selectResultToArrayOfObjects

/**
 * Execute numbers of ubRequest in one server request (one transaction)
 *
 *      $App.connection.runTrans([
 *           { entity: 'my_entity', method: 'update', ID: 1, execParams: {code: 'newCode'} },
 *           { entity: 'my_entity', method: 'update', ID: 2, execParams: {code: 'newCodeforElementWithID=2'} },
 *       ]).then(UB.logDebug);
 *
 * @method
 * @param {Array.<ubRequest>} ubRequestArray
 * @returns {Promise} Resolved to response.data
 */
UBConnection.prototype.runTrans = function run (ubRequestArray) {
  return this.post('ubql', ubRequestArray).then((response) => response.data)
}

const ALLOWED_GET_DOCUMENT_PARAMS = ['entity', 'attribute', 'ID', 'id', 'isDirty', 'forceMime', 'fileName', 'store', 'revision']
/**
 * Retrieve content of `document` type attribute field from server. Usage samples:
 *
 *      //Retrieve content of document as string using GET
 *      $App.connection.getDocument({
 *          entity:'ubm_form',
 *          attribute: 'formDef',
 *          ID: 100000232003
 *       }).then(function(result){console.log(typeof result)}); // string
 *
 *      //The same, but using POST for bypass cache
 *      $App.connection.getDocument({
 *          entity:'ubm_form',
 *          attribute: 'formDef',
 *          ID: 100000232003
 *       }, {
 *          bypassCache: true
 *       }).then(function(result){console.log(typeof result)}); // string
 *
 *
 *      //Retrieve content of document as ArrayBuffer and bypass cache
 *      $App.connection.getDocument({
 *          entity:'ubm_form',
 *          attribute: 'formDef',
 *          ID: 100000232003
 *       }, {
 *          bypassCache: true, resultIsBinary: true
 *       }).then(function(result){
 *          console.log('Result is', typeof result, 'of length' , result.byteLength, 'bytes'); //output: Result is object of length 2741 bytes
 *       });
 *
 * @param {Object} params
 * @param {String} params.entity Code of entity to retrieve from
 * @param {String} params.attribute `document` type attribute code
 * @param {Number} params.id Instance ID
 * @param {String} [params.forceMime] If passed and server support transformation from source MIME type to `forceMime` server perform transformation and return documenRt representation in the passed MIME
 * @param {Number} [params.revision] Optional revision of the documnet (if supported by server-side store configuration). Default is current revision.
 * @param {String} [params.fileName] ????
 * @param {Boolean} [params.isDirty=false] Optional ability to retrieve document in **dirty** state
 * @param {String} [params.store] ????
 *
 * @param {Object} [options] Additional request options
 * @param {Boolean} [options.resultIsBinary=false] if true - return document content as arrayBuffer
 * @param {Boolean} [options.bypassCache] HTTP POST verb will be used instead of GET for bypass browser cache
 * @returns {Promise} Resolved to document content (either ArrayBuffer in case options.resultIsBinary===true or text/json)
 */
UBConnection.prototype.getDocument = function (params, options) {
  let opt = _.defaults({}, options)
  let reqParams = {
    url: 'getDocument',
    method: opt.bypassCache ? 'POST' : 'GET'
  }
  if (options && options.resultIsBinary) {
    reqParams.responseType = 'arraybuffer'
  }
  if (opt.bypassCache) {
    reqParams.data = _.clone(params)
    Object.keys(reqParams.data).forEach(function (key) {
      if (ALLOWED_GET_DOCUMENT_PARAMS.indexOf(key) === -1) {
        delete reqParams.data[key]
        ubUtils.logDebug('invalid parameter "' + key + '" passed to getDocument request')
      }
    })
  } else {
    reqParams.params = params
  }
  return this.xhr(reqParams).then((response) => response.data)
}

/**
 * Alias to {@link UBSession.hexa8 UBSession.hexa8}
 * @private
 * @deprecated since 1.8 use UBSession.prototype.hexa8 instead
 */
UBConnection.prototype.hexa8 = UBSession.prototype.hexa8

/**
 * Alias to {@link UBSession.hexa8 UBSession.crc32}
 * @private
 * @deprecated since 1.8 use UBSession.prototype.crc32 instead
 */
UBConnection.prototype.crc32 = UBSession.prototype.crc32

/**
 * Log out user from server
 */
UBConnection.prototype.logout = function () {
  if (this.allowSessionPersistent) localStorage.removeItem(this.__sessionPersistKey)
  if (!this.isAuthorized()) return Promise.resolve(true)

  let logoutPromise = this.post('logout', {})
  if (this._pki) { // unload encryption private key
    let me = this
    logoutPromise = logoutPromise.then(
      () => new Promise((resolve) => { setTimeout(() => { me._pki.closePK(); resolve(true) }, 20) })
    )
  }
  return logoutPromise
}

/**
 * Known server-side error codes
 * @enum
 * @private
 */
UBConnection.prototype.serverErrorCodes = {
  1: 'ubErrNotImplementedErrnum',
  2: 'ubErrRollbackedErrnum',
  3: 'ubErrNotExecutedErrnum',
  4: 'ubErrInvaliddataforrunmethod',
  5: 'ubErrInvaliddataforrunmethodlist',
  6: 'ubErrNoMethodParameter',
  7: 'ubErrMethodNotExist',
  8: 'ubErrElsAccessDeny',
  9: 'ubErrElsInvalidUserOrPwd',
  10: 'ubErrElsNeedAuth',
  11: 'ubErrNoEntityParameter',
  13: 'ubErrNoSuchRecord',
  14: 'ubErrInvalidDocpropFldContent',
  15: 'ubErrEntityNotExist',
  16: 'ubErrAttributeNotExist',
  17: 'ubErrNotexistEntitymethod',
  18: 'ubErrInvalidSetdocData',
  19: 'ubErrSoftlockExist',
  20: 'ubErrNoErrorDescription',
  21: 'ubErrUnknownStore',
  22: 'ubErrObjdatasrcempty',
  23: 'ubErrObjattrexprbodyempty',
  24: 'ubErrNecessaryfieldNotExist',
  25: 'ubErrRecordmodified',
  26: 'ubErrNotexistnecessparam',
  27: 'ubErrNotexistfieldlist',
  28: 'ubErrUpdaterecnotfound',
  29: 'ubErrNecessaryparamnotexist',
  30: 'ubErrInvalidstoredirs',
  31: 'ubErrNofileinstore',
  32: 'ubErrAppnotsupportconnection',
  33: 'ubErrAppnotsupportstore',
  34: 'ubErrDeleterecnotfound',
  35: 'ubErrNotfoundlinkentity',
  36: 'ubErrEntitynotcontainmixinaslink',
  37: 'ubErrEssnotinherfromessaslink',
  38: 'ubErrInstancedatanameisreadonly',
  39: 'ubErrManyrecordsforsoftlock',
  40: 'ubErrNotfoundidentfieldsl',
  41: 'ubErrInvalidlocktypevalue',
  42: 'ubErrLockedbyanotheruser',
  43: 'ubErrInvalidwherelistinparams',
  44: 'ubErrRecnotlocked',
  45: 'ubErrManyrecordsforchecksign',
  46: 'ubErrNotfoundparamnotrootlevel',
  47: 'ubErrCantcreatedirlogmsg',
  48: 'ubErrCantcreatedirclientmsg',
  49: 'ubErrConnectionNotExist',
  50: 'ubErrDirectUnityModification',
  51: 'ubErrCantdelrecthisvalueusedinassocrec',
  52: 'ubErrAssocattrnotfound',
  53: 'ubErrAttrassociationtoentityisempty',
  54: 'ubErrNotfoundconforentityinapp',
  55: 'ubErrNewversionrecnotfound',
  56: 'ubErrElsAccessDenyEntity',
  57: 'ubErrAlsAccessDenyEntityattr',
  58: 'ubErrDatastoreEmptyentity',
  // 59: "ubErrCustomerror"
  67: 'ubErrTheServerHasExceededMaximumNumberOfConnections',
  69: 'ubErrFtsForAppDisabled',
  72: 'ubErrElsPwdIsExpired',
  73: 'ELS_USER_NOT_FOUND',
  74: 'VALUE_MUST_ME_UNIQUE'
}

/**
 * Return server-side error message by error number
 * @param {Number} errorNum
 * @return {String}
 */
UBConnection.prototype.serverErrorByCode = function (errorNum) {
  return this.serverErrorCodes[errorNum]
}

/**
 * Create a new instance of repository
 * @param {String} entityName name of Entity we create for
 * @returns {ServerRepository}
 */
UBConnection.prototype.Repository = function (entityName) {
  return new ClientRepository(this, entityName)
}

/**
 * Calc SHA256 from string
 *
 *    var shaAsSting = SHA256('something').toString()
 */
UBConnection.prototype.SHA256 = SHA256

const LDS = (typeof window !== 'undefined') && window.localStorage
/**
 * Connect to UnityBase server
 *
 * Example:
 *
 const UB = require('@unitybase/ub-core')
 let conn = UB.connect({
    host: window.location.origin,
    path: window.location.pathname,
    onCredentialRequired: function(conn, isRepeat){
        if (isRepeat){
            throw new UB.UBAbortError('invalid')
        } else {
            return Promise.resolve({authSchema: 'UB', login: 'admin', password: 'admin'})
        }
    },
    onAuthorizationFail:  function(reason){
        alert(reason);
    }
 });
 conn.then(function(conn){
    conn.get('stat').then(function(statResp){
        document.getElementById('ubstat').innerText = JSON.stringify(statResp.data, null, '\t');
    });

    conn.Repository('ubm_navshortcut').attrs(['ID', 'code', 'caption']).selectAsArray().then(function(data){
        let tmpl = _.template(document.getElementById('repo-template').innerHTML);
        let result = tmpl(data.resultData);
        // document.getElementById('ubnav').innerText = JSON.stringify(data.resultData);
        document.getElementById('ubnav').innerHTML = result;
    });
 });

 * Preferred locale tip: to set a connection preferredLocale parameter to, for example 'uk', use

    localStorage.setItem((path || '/') + 'preferredLocale', 'uk')

 * **before** call to UBConnection.connect
 *
 * @param cfg
 * @param {string} cfg.host Server host
 * @param {string} [cfg.path] API path - the same as in Server config `httpServer.path`
 * @param cfg.onCredentialRequired Callback for requesting a user credentials. See {@link UBConnection} constructor `requestAuthParams` parameter description
 * @param {boolean} [cfg.allowSessionPersistent=false] For a non-SPA browser client allow to persist a Session in the local storage between reloading of pages.
 *  In case user logged out by server side this type persistent not work and UBConnection will call onCredentialRequired handler,
 *  so user will be prompted for credentials
 * @param [cfg.onAuthorizationFail] Callback for authorization failure. See {@link authorizationFail} event.
 * @param [cfg.onAuthorized] Callback for authorization success. See {@link authorized} event.
 * @param [cfg.onNeedChangePassword] Callback for a password expiration. See {@link passwordExpired} event
 * @param [cfg.onGotApplicationConfig] Called just after application configuration retrieved from server.
 *  Accept one parameter - connection: UBConnection
 *  Usually on this stage application inject some scripts required for authentication (locales, cryptography etc).
 *  Should return a promise then done
 * @param [cfg.onGotApplicationDomain]
 * @return Promise<UBConnection>
 */
function connect (cfg) {
  let config = this.config = _.clone(cfg)

  let connection = new UBConnection({
    host: config.host,
    appName: config.path || '/',
    requestAuthParams: config.onCredentialRequired,
    allowSessionPersistent: cfg.allowSessionPersistent
  })
  if (config.onAuthorizationFail) {
    connection.on('authorizationFail', config.onAuthorizationFail)
  }
  if (config.onNeedChangePassword) {
    connection.on('passwordExpired', config.onNeedChangePassword)
  }
  if (config.onAuthorized) {
    connection.on('authorized', config.onAuthorized)
  }

  return connection.getAppInfo().then(function (appInfo) {
    // apply a default app settings to the gerAppInfo result
    connection.appConfig = _.defaults(_.clone(appInfo), {
      applicationName: 'UnityBase',
      applicationTitle: 'UnityBase',
      loginWindowTopLogoURL: '',
      loginWindowBottomLogoURL: '',
      themeName: 'UBGrayTheme',
      userDbVersion: null,
      defaultLang: 'en',
      supportedLanguages: ['en'],
      uiSettings: {}
    })
    // create ubNotifier after retrieve appInfo (we need to know supported WS protocols)
    connection.ubNotifier = new UBNotifierWSProtocol(connection)
    // try to determinate default user language
    let preferredLocale = null
    if (LDS) {
      preferredLocale = LDS.getItem(connection.appName + 'preferredLocale')
    }
    if (!preferredLocale) {
      preferredLocale = connection.appConfig.defaultLang
    }
    // is language supported by application?
    if (connection.appConfig.supportedLanguages.indexOf(preferredLocale) === -1) {
      preferredLocale = connection.appConfig.defaultLang
    }
    connection.preferredLocale = preferredLocale
    return config.onGotApplicationConfig ? config.onGotApplicationConfig(connection) : true
  }).then(function () {
    return connection.initCache(connection.appConfig.userDbVersion)
  }).then(function () {
    return connection.authorize()
  }).then(function () {
    // here we authorized and know a user-related data
    let myLocale = connection.userData('lang')
    LDS && LDS.setItem(connection.appName + 'preferredLocale', myLocale)
    connection.preferredLocale = myLocale
    let domainPromise = connection.getDomainInfo()
    if (config.onGotApplicationDomain) {
      domainPromise = domainPromise.then((domain) => config.onGotApplicationDomain(domain))
    }
    return domainPromise
  }).then(function (domain) {
    connection.domain = domain
    return connection
  })
}

module.exports = {
  UBConnection,
  connect
}
