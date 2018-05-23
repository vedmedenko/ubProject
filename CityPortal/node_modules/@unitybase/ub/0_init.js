// noinspection JSUndeclaredVariable
/**
 * Instance of lodash library. Follow <a href="http://lodash.com/docs">this link</a> to see documentation on the official site.
 * @global
 */
_ = require('lodash')

const argv = require('@unitybase/base').argv

const {ServerRepository} = require('@unitybase/base').ServerRepository // for backward compatibility with UB 1.7
/**
 * Create new instance of {@link ServerRepository}
 *
 * @param {String} entityName
 * @param {Object} [cfg]
 * @param {UBConnection} [connection] Pass in case of remote UnityBase server connection.
 * @returns {ServerRepository}
 */
UB.Repository = function (entityName, cfg, connection) {
  connection = connection || global.conn
  if (connection) {
    return new ServerRepository(connection, entityName, cfg)
  } else {
    return new ServerRepository(null, entityName, cfg)
  }
}

if (process.isServer || process.isWebSocketServer) {
 /**
   * Server configuration (result of argv.getServerConfiguration() execution)
   * @type {Object}
   * @memberOf App
   */
  App.serverConfig = undefined
  try {
    App.serverConfig = argv.getServerConfiguration()
  } catch (e) {
    console.error(e)
  }

  // TODO - this hack is required for register UB.getWSNotifier. Must be rewrited
  const ws = require('./modules/web-sockets')
  UB.getWSNotifier = ws.getWSNotifier
}
