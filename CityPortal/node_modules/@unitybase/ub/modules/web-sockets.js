/**
 * High level WebSocket protocols implementation
 *
 * @module @unitybase/ub/web-sockets
 * @author pavel.mash
 */
const EventEmitter = require('events').EventEmitter
const util = require('util')

let registeredWSProtocols = {}

/**
 * @classdesc
 *  Internal server-side WebSocket transport layer, which communicates with clients using low-level binding classes.
 *  Usually there is no need to use this class directly, it is better to use an instance of {@link JsonMessagesProtocol} from {@link UB.wsNotifier}
 *
 *  Server emits three types of event on the protocol level:
 *
 *   - `connect`, parameters are: ({WebSocketConnection} wsConn)
 *   - `disconnect`, parameters are: ({WebSocketConnection} wsConn, {String} closeReason, {Number} closeStatus) http://tools.ietf.org/html/rfc6455#section-7.4
 *   - `message`, parameters are: ({WebSocketConnection} wsConn, {String|ArrayBudder} message)
 *
 * @param {Object} props
 * @param {String} props.name
 * @param {String} props.handledAs
 * @class WebSocketTransport
 * @protected
 * @extends EventEmitter
 */
function WebSocketTransport (props) {
  const wsBinding = process.binding('ub_ws')
  let wsProtocol, protocolIndex

  if (registeredWSProtocols.hasOwnProperty(props.name)) {
    wsProtocol = registeredWSProtocols[props.name]
  } else {
    if (process.isWebSocketServer) {
      wsProtocol = wsBinding.addProtocol(props)
      EventEmitter.call(wsProtocol)
      util._extend(wsProtocol, EventEmitter.prototype)
      registeredWSProtocols[props.name] = wsProtocol
    } else {
      wsProtocol = wsBinding.retrieveProtocol(props)
      registeredWSProtocols[props.name] = wsProtocol // memorize null in case WS not supported
    }
    if (wsProtocol) {
      protocolIndex = wsProtocol.index
      /**
       * Returns the IDs of all the sessions with established WebSocket connections
       * @memberOf WebSocketTransport
       * @param {Number} userID uba_user identifier
       * @return {Array<Number>}
       */
      wsProtocol.getUserSessions = function (userID) {
        return wsBinding.getUserSessions(userID, protocolIndex)
      }
      /**
       * Send a data package to specified session ID.
       * Return true on success, false in case WS connection for the specified session is lost or closed/closing
       *
       * @param {Number} sessionID
       * @param {String|Object|ArrayBuffer} data
       * @return {Boolean}
       */
      wsProtocol.sendTo = function (sessionID, data) {
        return wsBinding.send(sessionID, protocolIndex, data)
      }

      /**
       *
       * @param {Number} sessionID
       * @param {String} reason
       */
      wsProtocol.closeSession = function (sessionID, reason) {
        let data = (typeof reason === 'string') ? reason : JSON.stringify(reason)
        wsBinding.close(sessionID, protocolIndex, data)
      }

      /**
       * Send a data package to all protocol sessions.
       *
       * @param {String|Object|ArrayBuffer} data
       */
      wsProtocol.broadcast = function (data) {
        wsBinding.broadcast(protocolIndex, data)
      }
    }
  }
  return wsProtocol
}

/**
 * @classdesc
 * Simple protocol for exchanging JSON commands.
 *
 * Each message transferred by a web socket is a JSON with two attributes
 *
 *      {command: {String}, params: {*}}
 *
 * Inside WebSocket threads, the class can be used to subscribe to messages arrived from clients
 * and assign handlers to it (if you need to receive web socket messages in server):

      const WebSockets = require('@unitybase/ub/modules/web-sockets')
      var wsNotifier = WebSockets.getWSNotifier()
      if (wsNotifier) {
        console.debug('Start subscribing to wsNotifier tsts_* events')
        wsNotifier.on('tst_echo', function (connection, params) {
          connection.send({
            command: 'tst_message',
            params: {from: connection.session.userID, message: params}
          })
        })
      }

 * Inside http threads can be used as follows:
 *
      const WebSockets = require('@unitybase/ub/modules/web-sockets')
      function notifyAboutNewRecord(rowID){
        let notifier = WebSockets.getWSNotifier()
        if (notifier) {
          //send message to ALL connected sessions
          notifier.broadcast('ub_entityModification', {action: 'insert', ID: rowID})

          //Send to specific user
          var userSessions = notifier.getUserSessions(Session.userID)
          userSessions.forEach(function(sessionID){
              notifier.sendCommand('test_command', sessionID, {action: 'inserted', ID: rowID})
          })
        }
      }
 *
 *  If WebSocket support are enabled in server config then instance of this protocol is accessible via {@link UB#wsNotifier UB.wsNotifier}
 *
 * @class JsonMessagesProtocol
 * @param {String} namedAs The name of a resulting protocol
 * @extends EventEmitter
 */
function JsonMessagesProtocol (namedAs) {
  let me = this

  let _jsonProtocol = new WebSocketTransport({name: namedAs, handledAs: 'Json'})

  /**
   * Send specified command to recipient. Return `true` if data has been successfully sent (no guaranty it is received by client)
   * @param {String} command Command to send
   * @param {Number} recipient User Session identifier
   * @param {*} params Any value
   * @return {Boolean}
   */
  this.sendCommand = function (command, recipient, params) {
    return _jsonProtocol.sendTo(recipient, {command: command, params: params})
  }

  /**
   * Returns the IDs of all the sessions with established WebSocket connections
   *
   * @param {Number} userID User identifier (from uba_user)
   * @return {Array<Number>}
   */
  this.getUserSessions = function (userID) {
    return _jsonProtocol.getUserSessions(userID)
  }

  /**
   * Send specified command to all user sessions connected using this protocol
   *
   * @param {String} command Command to send
   * @param {*} params Any value
   */
  this.broadcast = function (command, params) {
    return _jsonProtocol.broadcast({command: command, params: params})
  }

  if (process.isWebSocketServer) {
    EventEmitter.call(me)
    util._extend(me, EventEmitter.prototype)

    /**
     * Handle incoming messages
     * @protected
     * @param {WebSocketConnection} connection
     * @param {String|ArrayBuffer} rawData
     */
    me.onWSMessage = function (connection, rawData) {
      var msg

      console.debug('New WebSocket message from ', connection.session.id, rawData)
      try {
        msg = JSON.parse(rawData)
      } catch (err) {
        connection.send({command: 'error', params: {description: 'Invalid params: ' + rawData}})
        return
      }
      if (!me.emit(msg.command, connection, msg.params)) {
        connection.send({command: 'error', params: {description: 'Invalid command: ' + msg.command}})
      }
    }

    /**
     * @param {WebSocketConnection} connection
     * @protected
     */
    me.onWSConnect = function (connection) {
      console.debug('Web socket connected: ', connection.session.id)
      /**
       * Emited for {@link JsonMessagesProtocol} just after client is connected
       * @event connect
       */
      me.emit('connect', connection)
      connection.send({
        command: 'accepted', params: {connectionID: connection.session.id}
      })
    }
    /**
     * @param {WebSocketConnection} connection
     * @param {String} reason
     * @param {Number} status
     * @protected
     */
    me.onWSDisconnect = function (connection, reason, status) {
      console.debug('WS Disconnected ', connection.session.id, 'reason', reason, 'status', status)
      /**
       * Emited for {@link JsonMessagesProtocol} just after client is disconnected
       * @event disconnect
       */
      me.emit('disconnect', connection, reason, status)
    }

    _jsonProtocol.on('connect', me.onWSConnect)
    _jsonProtocol.on('message', me.onWSMessage)
    _jsonProtocol.on('disconnect', me.onWSDisconnect)
  }
}

/**
 * Return array of currently registered WS protocol names
 * @returns {Array<string>}
 */
function registeredProtocols () {
  let wsBinding = process.binding('ub_ws')
  return wsBinding.getProtocols()
}

let _ubNotifierInstance = process.isWebSocketEnabled ? undefined : null

/**
 * Return an instance of {@link JsonMessagesProtocol} named `ubNotifier` for Server<->Client communication using WebSocket
 *
 * In case `ubNotifier` protocol is not registered during WebSocket thread initialization
 * or not configured in config - will return `null`
 *
 * Returned {@link JsonMessagesProtocol} instance methods is limited
 * by {@link WSProtocol#getUserSessions}, {@link WSProtocol#sendTo} and {@link WSProtocol#broadcast}
 *
 * See {@tutorial web_sockets.md } for detailed descripiuon
 *
 * @return {JsonMessagesProtocol}
 */
function getWSNotifier () {
  if (_ubNotifierInstance || _ubNotifierInstance === null) { return _ubNotifierInstance }

  _ubNotifierInstance = new JsonMessagesProtocol('ubNotifier')
  return _ubNotifierInstance
}

module.exports = {
  protocols: {
    JsonMessages: JsonMessagesProtocol
  },
  Transport: WebSocketTransport,
  registeredProtocols,
  getWSNotifier
}
