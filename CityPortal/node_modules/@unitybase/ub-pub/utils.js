/**
 * Created by pavel.mash on 01.12.2016.
 */
/* global FileReader, Blob */
const _ = require('lodash')
/**
 * Copies all the properties of one or several objectsFrom to the specified objectTo.
 * Non-simple type copied by reference!
 * @param {Object} objectTo The receiver of the properties
 * @param {...Object} objectsFrom The source(s) of the properties
 * @return {Object} returns objectTo
 */
module.exports.apply = function (objectTo, objectsFrom) {
  Array.prototype.forEach.call(arguments, function (obj) {
    if (obj && obj !== objectTo) {
      Object.keys(obj).forEach(function (key) {
        objectTo[key] = obj[key]
      })
    }
  })
  return objectTo
}

const FORMAT_RE = /{(\d+)}/g
/**
 * Allows you to define a tokenized string and pass an arbitrary number of arguments to replace the tokens.  Each
 * token must be unique, and must increment in the format {0}, {1}, etc.  Example usage:
 *
 *     var s = UB.format('{1}/ext-lang-{0}.js', 'en', 'locale');
 *     // s now contains the string: ''locale/ext-lang-en.js''
 *
 * @param {String} stringToFormat The string to be formatted.
 * @param {...*} values The values to replace tokens `{0}`, `{1}`, etc in order.
 * @return {String} The formatted string.
 */
module.exports.format = function (stringToFormat, values) {
  let args = _.toArray(arguments).slice(1)
  return stringToFormat.replace(FORMAT_RE, function (m, i) {
    return args[i]
  })
}

/**
 * Creates namespaces to be used for scoping variables and classes so that they are not global.
 * @example
 *     UB.ns('DOC.Report');
 *
 *     DOC.Report.myReport = function() { ... };
 *
 * @method
 * @param {String} namespacePath
 * @return {Object} The namespace object.
 */
module.exports.ns = function (namespacePath) {
  let root = window
  let parts, part, j, subLn

  parts = namespacePath.split('.')

  for (j = 0, subLn = parts.length; j < subLn; j++) {
    part = parts[j]
    if (!root[part]) root[part] = {}
    root = root[part]
  }
  return root
}

/**
 * Convert UnityBase server dateTime response to Date object
 * @param value
 * @returns {Date}
 */
module.exports.iso8601Parse = function (value) {
  return value ? new Date(value) : null
}

/**
 * Convert UnityBase server date response to Date object.
 * date response is a day with 00 time (2015-07-17T00:00Z), to get a real date we must add current timezone shift
 * @param value
 * @returns {Date}
 */
module.exports.iso8601ParseAsDate = function (value) {
  let res = value ? new Date(value) : null
  if (res) {
    res.setTime(res.getTime() + res.getTimezoneOffset() * 60 * 1000)
  }
  return res
}

/**
 * Convert UnityBase server Boolean response to Boolean (0 = false & 1 = trhe)
 * @param v Value to convert
 * @returns {Boolean|null}
 */
module.exports.booleanParse = function (v) {
  if (typeof v === 'boolean') return v
  if ((v === undefined || v === null || v === '')) return null
  return v === 1
}

/**
 * Fast async transformation of data to base64 string
 * @method
 * @param {File|ArrayBuffer|String|Blob|Array} data
 * @returns {Promise<string>} resolved to data converted to base64 string
 */
module.exports.base64FromAny = function (data) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader()
    let blob = (data instanceof Blob) ? data : new Blob([data])
    reader.addEventListener('loadend', function () {
      resolve(reader.result.split(',', 2)[1]) // remove data:....;base64, from the beginning of string //TODO -use indexOf
    })
    reader.addEventListener('error', function (event) {
      reject(event)
    })
    reader.readAsDataURL(blob)
  })
}

const BASE64STRING = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BASE64ARR = [];
(function () {
  for (let i = 0, l = BASE64STRING.length - 1; i < l; i++) {
    BASE64ARR.push(BASE64STRING[i])
  }
})()

const BASE64DECODELOOKUP = new Uint8Array(256);
(function () {
  for (let i = 0, l = BASE64STRING.length; i < l; i++) {
    BASE64DECODELOOKUP[BASE64STRING[i].charCodeAt(0)] = i
  }
})()

/**
 * Convert base54 encoded string to decoded array buffer
 * @param {String} base64
 * @returns {ArrayBuffer}
 */
module.exports.base64toArrayBuffer = function (base64) {
  let bufferLength = base64.length * 0.75
  let len = base64.length
  let p = 0
  let encoded1, encoded2, encoded3, encoded4

  if (base64[ base64.length - 1 ] === '=') {
    bufferLength--
    if (base64[ base64.length - 2 ] === '=') bufferLength--
  }

  let arrayBuffer = new ArrayBuffer(bufferLength)
  let bytes = new Uint8Array(arrayBuffer)

  for (let i = 0; i < len; i += 4) {
    encoded1 = BASE64DECODELOOKUP[ base64.charCodeAt(i) ]
    encoded2 = BASE64DECODELOOKUP[ base64.charCodeAt(i + 1) ]
    encoded3 = BASE64DECODELOOKUP[ base64.charCodeAt(i + 2) ]
    encoded4 = BASE64DECODELOOKUP[ base64.charCodeAt(i + 3) ]

    bytes[ p++ ] = (encoded1 << 2) | (encoded2 >> 4)
    bytes[ p++ ] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
    bytes[ p++ ] = ((encoded3 & 3) << 6) | (encoded4 & 63)
  }

  return arrayBuffer
}

/**
 * UnityBase client-side exception.
 * Such exceptions are will not be showed as unknown error in {@link UB.showErrorWindow}
 *
 * message Can be either localized message or locale identifier - in this case UB#showErrorWindow translate message using {@link UB#i18n}
 *
 *      @example
 *      throw new UB.UBError('lockedBy'); // will show message box "Record was locked by other user. It\'s read-only for you now"
 *
 * @param {String} message Message
 * @param {String} [detail] Error details
 * @param {Number} [code] Error code (for server-side errors)
 * @extends {Error}
 */
function UBError (message, detail, code) {
  this.name = 'UBError'
  this.detail = detail
  this.code = code
  this.message = message || 'UBError'
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, UBError)
  } else {
    this.stack = (new Error()).stack
  }
}
UBError.prototype = new Error()
UBError.prototype.constructor = UBError

module.exports.UBError = UBError

/**
 * UnityBase still error. Global error handler does not show this error for user. Use it for still reject promise.
 * @param {String} [message] Message
 * @param {String} [detail] Error details
 * @extends {Error}
 */
function UBAbortError (message, detail) {
  this.name = 'UBAbortError'
  this.detail = detail
  this.code = 'UBAbortError'
  this.message = message || 'UBAbortError'
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, UBAbortError)
  } else {
    this.stack = (new Error()).stack
  }
}
UBAbortError.prototype = new Error()
UBAbortError.prototype.constructor = UBAbortError

module.exports.UBAbortError = UBAbortError

/**
 * Log message to console (if console available)
 * @method
 * @param {...*} msg
 */
module.exports.log = function log (msg) {
  if (console) console.log.apply(console, arguments)
}

/**
 * Log error message to console (if console available)
 * @method
 * @param {...*} msg
 */
module.exports.logError = function logError (msg) {
  if (console) {
    console.error.apply(console, arguments)
  }
}

/**
 * Log warning message to console (if console available)
 * @method
 * @param {...*} msg
 */
module.exports.logWarn = function logWarn (msg) {
  if (console) {
    console.warn.apply(console, arguments)
  }
}

/**
 * Log debug message to console.
 * Since it binded to console, can also be used to debug Promise resolving in this way:
 *
 *      UB.get('timeStamp').then(UB.logDebug);
 *
 * @method
 * @param {...*} msg
 */
module.exports.logDebug = console.info.bind(console)

const userAgent = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent.toLowerCase() : 'nodeJS'
/** @type {String} */
module.exports.userAgent = userAgent.toLowerCase()
/** @type {Boolean} */
module.exports.isChrome = /\bchrome\b/.test(userAgent)
/** @type {Boolean} */
module.exports.isWebKit = /webkit/.test(userAgent)
/** @type {Boolean} */
module.exports.isGecko = !/webkit/.test(userAgent) && /gecko/.test(userAgent)
/** @type {Boolean} */
module.exports.isOpera = /opr|opera/.test(userAgent)
/** @type {Boolean} */
module.exports.isMac = /macintosh|mac os x/.test(userAgent)
/** @type {Boolean} */
module.exports.isSecureBrowser = /\belectron\b/.test(userAgent)
