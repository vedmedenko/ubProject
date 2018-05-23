/*
 * Created by pavel.mash on 14.03.2016.
 */
const _ = require('lodash')
const EventEmitter = require('./events')

const WS_PROTOCOL = 'ubNotifier'
const MAX_BUFFERED_COMMANDS = 100

/**
 * @classdesc
 *
 * WebSocket connection to UnityBase server using ubNotifier protocol.
 * The property `supported` indicate `ubNotifier` protocol is supported by server.
 * Class mixes an EventEmitter. After got a command from a server the event with command code
 * is fired.
 *
 * The event flow are:
 *
 *  - just after webSocket connection is established `connected` event are fired, when
 *  - after server accept (verify a user credential) `accepted` are fired - here you can got
 *    a connectionID of a current connection
 *  - next is a series of protocol events ( `test_command` for example )
 *  - in case of protocol error `error` are fired
 *  - when WebSocket connection are closed `disconnected` event are fired
 *
 * You do not need to **connect** or **reconnect** a WebSocket manually - UBNotifierWSProtocol recreate
 * a WebSocket automatically just after corresponding UBConnection fires a `authorized` event.
 *
 * For `adminUI` instance of this class is accessible from $App.ubNotifier just after $App.launch
 *
 * Usage sample:
 *
 *      // Server side
 *      const WebSockets = require('@unitybase/ub/modules/web-sockets');
 *      var notifier = WebSockets.getWSNotifier();
 *      if (notifier) {
 *          notifier.broadcast('test_command', {name: 'Homer', like: 'donuts'});
 *      }
 *
 *      // Client side
 *      // Will output 'Homer like donuts' after got a `test_command` from server
 *      $App.ubNotifier.on('test_command', function(params}{
 *          console.debug(params.name, 'like', params.like)
 *      }
 *
 * @class
 * @mixes EventEmitter
 * @param {UBConnection} connection Warning - only one instance of UBNotifierWSProtocol for a connection is valid.
 */
function UBNotifierWSProtocol (connection) {
  var notifier = this
  var supported = (connection.supportedWSProtocols.indexOf(WS_PROTOCOL) !== -1) && (typeof WebSocket !== 'undefined')
  /**
   * Indicate `ubNotifier` protocol is supported by server.
   * If not supported all calls to send() will be ignored.
   * @type {boolean}
   */
  this.supported = supported

  EventEmitter.call(this)
  _.assign(this, EventEmitter.prototype)

  var
    doDebug = function () {},
    inDebug = false
    /**
     * Enable output all webSocket interaction to console
     * @property {boolean} debugMode
     */
  Object.defineProperty(notifier, 'debugMode', {
    get: function () { return inDebug },
    set: function (newValue) {
      if (inDebug !== newValue) {
        inDebug = newValue
        doDebug = inDebug ? console.debug.bind(console, 'ubNotifier') : function () {}
      }
    },
    enumerable: true,
    configurable: true
  })

  var wsURL = 'ws' + connection.serverUrl.slice(4) + 'ws' // remove http part, so in case http://.. we got ws://.., in case https://.. -> wss://..
  var $ws = null
  var isConnectionAccepted = false
  var bufferedCommands = []

  function _createWSConnection (session) {
    if (supported) {
      $ws = new WebSocket(wsURL + '?SESSION_SIGNATURE=' + session.signature(), 'ubNotifier')

      $ws.onopen = function (e) {
        doDebug('connected to', e.target.url, 'protocol:', e.target.protocol)
                /**
                 * Emitted for {@link UBNotifierWSProtocol} just after WS connection is established, but before it accepted by server.
                 * Params: url, protocol
                 * @event connected
                 */
        notifier.emit('connected', e.target.url, e.target.protocol)
      }

      $ws.onmessage = function (e) {
        var msg
        doDebug('Got a raw data', e.data)
        try {
          msg = JSON.parse(e.data)
        } catch (err) {
          console.error('ubNotifier: Invalid command from server:', e.data)
        }
        var
          command = msg.command,
          params = msg.params,
          delayedCmd

        doDebug('Got a command', command, 'with params', params)
        switch (command) {
          case 'accepted': // send a buffered request if any
            isConnectionAccepted = true
            while ((delayedCmd = bufferedCommands.shift()) && isConnectionAccepted) {
              notifier.sendCommand(delayedCmd.command, delayedCmd.params)
            }
            bufferedCommands = []
            /**
             * If server accept a ubNotifier WS connection this event will be emitted for {@link UBNotifierWSProtocol} with `connectionID` parameter
             * @event accepted
             */
            notifier.emit('accepted', params.connectionID)
            break
          case 'error':
            doDebug('Got an error from server', params)
            notifier.emit('error', params)
            break
          default:
            doDebug('Emit event ', command, 'with params', params)
            notifier.emit(command, params)
            break
        }
      }

      $ws.onclose = function (e) {
        isConnectionAccepted = false
        doDebug('Connection closed. Code:', e.code, 'Reason:', e.reason)
        notifier.emit('disconnected', e.code, e.reason)
      }
    }
  }

    /**
     * Sand a command to server
     *
     *  - if WS connection is not accepted yet will buffer the commands and send it just after connection is accepted
     *  - if `ubNotifier` protocol not supported by server will do nothing
     *
     * @method
     * @param {string} command
     * @param {*} params
     */
  this.sendCommand = function (command, params) {
    if (supported) {
      if (isConnectionAccepted) {
        $ws.send(JSON.stringify({command: command, params: params}))
      } else { // add to delayed buffer
        bufferedCommands.push({command: command, params: params})
        if (bufferedCommands.length > MAX_BUFFERED_COMMANDS) bufferedCommands.shift()
      }
    }
  }

  function _onUBConnectionAuthorized (ubConnection, session) {
    isConnectionAccepted = false
    if (connection.supportedWSProtocols.indexOf(WS_PROTOCOL) !== -1) {
      _createWSConnection(session)
    } else {
      console.warn('ubNotifier: protocol not supported')
    }
  }
  connection.on('authorized', _onUBConnectionAuthorized)
}
module.exports = UBNotifierWSProtocol
