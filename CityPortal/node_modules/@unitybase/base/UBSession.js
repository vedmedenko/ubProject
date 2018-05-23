/**
 * Internal class, returned as a result of {@link UBConnection#authorize UBConnection.authorize()}
 * @module @unitybase/base/UBSession
 */
/*
 @author pavel.mash
 */

/* global ncrc32 */

// ***********   !!!!WARNING!!!!! **********************
// Module shared between server and client code
/**
 * Internal class, returned as a result of {@link UBConnection#authorize UBConnection.authorize()}
 * The main method is {@link UBSession.signature UBSession.signature()}
 *
 * Developer never create this class directly.
 * @class
 * @protected
 */
function UBSession (authResponse, secretWord, authSchema) {
  let data = authResponse
  let hexa8ID = hexa8(data.result.split('+')[ 0 ])
  let userData = data.uData ? JSON.parse(data.uData) : { lang: 'en', login: 'anonymous' }
  let sessionWord = data.result
  let sessionPwdHash = secretWord || ''
  let sessionSaltCRC = (typeof ncrc32 !== 'undefined') ? ncrc32(0, sessionWord + sessionPwdHash) : null

  if (!userData.login) {
    userData.login = data.logonname
  }

  /** @property {String} sessionID user session id converted to {@link UBSession#hexa8}
   * @protected
   * @readonly
   */
  Object.defineProperty(this, 'sessionID', {enumerable: true, writable: false, value: hexa8ID})
  /**
   * User logon name. Better to access this value using {@link UBConnection#userLogin UBConnection.userLogin()} method.
   * @type {String}
   * @private
   * @readonly
   */
  this.logonname = data.logonname

  /** Contain custom user data. Usually filled inside **server** `onUserLogon` event handlers
   *
   * Do not use it directly, instead use helper method {@link UBConnection#userData UBConnection.userData()} instead.
   *
   * @type {Object}
   * @protected
   * @readonly
   */
  this.userData = userData

  /**
   * Name of authentication schema
   * @type {String}
   * @protected
   * @readonly
   */
  this.authSchema = authSchema || 'UB'

  /**
   * Session signature for authorized request. Can be added as LAST parameter in url, or to Authorization header (preferred way)
   *
   *      $App.connection.authorize().then(function(session){
   *          // for URL
   *          return 'session_signature=' + session.signature()
   *          //for header
   *          return {Authorization: session.authSchema + ' ' + session.signature()}
   *      });
   *
   * @returns {string}
   */
  this.signature = function () {
    switch (this.authSchema) {
      case 'None':
        return ''
      case 'UBIP':
        return this.logonname
      default:
        let timeStampI = Math.floor((new Date()).getTime() / 1000)
        let hexaTime = hexa8(timeStampI)
        return hexa8ID + hexaTime + hexa8((typeof ncrc32 !== 'undefined') ? ncrc32(sessionSaltCRC, hexaTime) : crc32(sessionWord + sessionPwdHash + hexaTime)) // + url?
    }
  }

  /**
   * Current session is anonymous session
   * @returns {boolean}
   */
  this.isAnonymous = function () {
    return (this.authSchema === 'None')
  }

  /**
   * Return authorization header
   *
   *      $App.connection.authorize().then(function(session){
   *          return {Authorization: session.authHeader()}
   *      });
   *
   * @returns {string}
   */
  this.authHeader = function () {
    return this.isAnonymous() ? '' : ((this.authSchema === 'Negotiate' ? 'UB' : this.authSchema) + ' ' + this.signature())
  }
}

/**
 * Return hexadecimal string of 8 character length from value
 * @param {String|Number} value
 * @returns {String}
 */
UBSession.prototype.hexa8 = function hexa8 (value) {
  let num = parseInt(value, 10)
  let res = isNaN(num) ? '00000000' : num.toString(16)
  while (res.length < 8) {
    res = '0' + res
  }
  return res
}
const hexa8 = UBSession.prototype.hexa8

const CRC32_POLYTABLES = {}
/* jslint bitwise: true */
/**
 * Calculate CRC32 checksum for string
 * @param {String} s string to calculate CRC32
 * @param {Number} [polynomial] polynomial basis. default to 0x04C11DB7
 * @param {Number} [initialValue] initial crc value. default to 0xFFFFFFFF
 * @param {Number} [finalXORValue] default to 0xFFFFFFFF
 * @returns {Number}
 */
UBSession.prototype.crc32 = function crc32 (s, polynomial, initialValue, finalXORValue) {
  s = String(s)
  polynomial = polynomial || 0x04C11DB7
  initialValue = initialValue || 0xFFFFFFFF
  finalXORValue = finalXORValue || 0xFFFFFFFF
  let crc = initialValue

  let table = CRC32_POLYTABLES[polynomial]
  if (!table) {
    table = CRC32_POLYTABLES[polynomial] = (function build () {
      let i, j, c
      let table = []
      let reverse = function (x, n) {
        let b = 0
        while (n) {
          b = b * 2 + x % 2
          x /= 2
          x -= x % 1
          n--
        }
        return b
      }
      for (i = 255; i >= 0; i--) {
        c = reverse(i, 32)

        for (j = 0; j < 8; j++) {
          c = ((c * 2) ^ (((c >>> 31) % 2) * polynomial)) >>> 0
        }

        table[i] = reverse(c, 32)
      }
      return table
    })()
  }

  for (let i = 0, l = s.length; i < l; i++) {
    let c = s.charCodeAt(i)
    if (c > 255) {
      throw new RangeError()
    }
    let j = (crc % 256) ^ c
    crc = ((crc / 256) ^ table[j]) >>> 0
  }
  return (crc ^ finalXORValue) >>> 0
}
const crc32 = UBSession.prototype.crc32

module.exports = UBSession
