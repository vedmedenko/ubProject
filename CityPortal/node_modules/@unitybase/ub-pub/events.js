/*
 @author pavel.mash
 */

// ***********   !!!!WARNING!!!!! **********************
// This module is a modified copy of server-side EventEmitter
// to prevent conflicts in case on modification
// modify both file - this and \modules\events.js

/**
 * NodeJS like EventEmitter for Browser usage. See also <a href="http://nodejs.org/api/events.html">NodeJS events documentation</a>
 *
 * To add event emitting ability to any object:
 *

     var myObject = {},
     var EventEmitter = UB.EventEmitter;
     // add EventEmitter to myObject
     EventEmitter.call(myObject);
     _.assign(myObject, EventEmitter.prototype);

 * In case object created via constructor function

     var EventEmitter = UB.EventEmitter;
     function MyObject() {
        EventEmitter.call(this);
     }
     MyObject.prototype = _.create(EventEmitter.prototype);
     var myObject = new MyObject();
     myObject instanceof UB.EventEmitter; //true

 * Usage:

     myObject.on('myEvent', function(num, str){console.log(num, str) });

     myObject.emit('myEvent', 1, 'two'); // output: 1 "two"

 *
 * @class EventEmitter
 * @mixin
 */

function EventEmitter () {
  EventEmitter.init.call(this)
}

/**
 * Private collection of events.
 * @private
 */
EventEmitter.prototype._events = undefined
/**
 * Use set/get MaxListeners instead direct access
 * @private
 */
EventEmitter.prototype._maxListeners = undefined

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10

/**
 * @private
 */
EventEmitter.init = function () {
  if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
    this._events = {}
    this._eventsCount = 0
  }

  this._maxListeners = this._maxListeners || undefined
}

/**
 * Obviously not all Emitters should be limited to 10. This function allows
 * that to be increased. Set to zero for unlimited.
 * @param {Number} n
 */
EventEmitter.prototype.setMaxListeners = function setMaxListeners (n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    { throw new TypeError('n must be a positive number') }
  this._maxListeners = n
  return this
}

function $getMaxListeners (that) {
  if (that._maxListeners === undefined)
    { return EventEmitter.defaultMaxListeners }
  return that._maxListeners
}

/**
 *
 * @return {Number}
 */
EventEmitter.prototype.getMaxListeners = function getMaxListeners () {
  return $getMaxListeners(this)
}

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone (handler, isFn, self) {
  if (isFn)
    { handler.call(self) }
  else {
    var len = handler.length
    var listeners = arrayClone(handler, len)
    for (var i = 0; i < len; ++i)
      { listeners[i].call(self) }
  }
}
function emitOne (handler, isFn, self, arg1) {
  if (isFn)
    { handler.call(self, arg1) }
  else {
    var len = handler.length
    var listeners = arrayClone(handler, len)
    for (var i = 0; i < len; ++i)
      { listeners[i].call(self, arg1) }
  }
}
function emitTwo (handler, isFn, self, arg1, arg2) {
  if (isFn)
    { handler.call(self, arg1, arg2) }
  else {
    var len = handler.length
    var listeners = arrayClone(handler, len)
    for (var i = 0; i < len; ++i)
      { listeners[i].call(self, arg1, arg2) }
  }
}
function emitThree (handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    { handler.call(self, arg1, arg2, arg3) }
  else {
    var len = handler.length
    var listeners = arrayClone(handler, len)
    for (var i = 0; i < len; ++i)
      { listeners[i].call(self, arg1, arg2, arg3) }
  }
}

function emitMany (handler, isFn, self, args) {
  if (isFn)
    { handler.apply(self, args) }
  else {
    var len = handler.length
    var listeners = arrayClone(handler, len)
    for (var i = 0; i < len; ++i)
      { listeners[i].apply(self, args) }
  }
}

/**
 * Execute each of the listeners in order with the supplied arguments.
 * Returns true if event had listeners, false otherwise.
 *
 * @param {String} type Event name
 * @param {...*} eventArgs Arguments, passed to listeners
 * @return {boolean}
 */
EventEmitter.prototype.emit = function emit (type) {
  var er, handler, len, args, i, events/* UB domain */
  // UB var needDomainExit = false;
  var doError = (type === 'error')

  events = this._events
  if (events)
    { doError = (doError && events.error == null) }
  else if (!doError)
    { return false }

    // UB domain = this.domain;

  // If there is no 'error' event listener then throw.
  if (doError) {
    er = arguments[1]
    if (er instanceof Error) {
      throw er // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Uncaught, unspecified "error" event. (' + er + ')')
      err.context = er
      throw err
    }
  }

  handler = events[type]

  if (!handler)
    { return false }

  var isFn = typeof handler === 'function'
  len = arguments.length
  switch (len) {
    // fast cases
    case 1:
      emitNone(handler, isFn, this)
      break
    case 2:
      emitOne(handler, isFn, this, arguments[1])
      break
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2])
      break
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3])
      break
    // slower
    default:
      args = new Array(len - 1)
      for (i = 1; i < len; i++)
        { args[i - 1] = arguments[i] }
      emitMany(handler, isFn, this, args)
  }

  return true
}

/**
 * Adds a listener to the end of the listeners array for the specified event.
 * Will emit `newListener` event on success.
 *
 * Usage sample:
 *
 *      Session.on('login', function () {
 *          console.log('someone connected!');
 *      });
 *
 * Returns emitter, so calls can be chained.
 *
 * @param {String} type Event name
 * @param {Function} listener
 * @return {EventEmitter}
 */
EventEmitter.prototype.addListener = function addListener (type, listener) {
  var m
  var events
  var existing

  if (typeof listener !== 'function')
    { throw new TypeError('listener must be a function') }

  events = this._events
  if (!events) {
    events = this._events = {}
    this._eventsCount = 0
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      /** @event  newListener */
      this.emit('newListener', type,
                listener.listener ? listener.listener : listener)

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = this._events
    }
    existing = events[type]
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener
    ++this._eventsCount
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] = [existing, listener]
    } else {
      // If we've already got an array, just append.
      existing.push(listener)
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(this)
      if (m && m > 0 && existing.length > m) {
        existing.warned = true
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d %s listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      existing.length, type)
        console.trace()
      }
    }
  }

  return this
}

/**
 * Alias for {@link EventEmitter#addListener addListener}
 * @param {String} type Event name
 * @param {Function} listener
 * @return {EventEmitter}
 */
EventEmitter.prototype.on = EventEmitter.prototype.addListener

/**
 * Adds a one time listener for the event. This listener is invoked only the next time the event is fired, after which it is removed.
 * @param {String} type Event name
 * @param {Function} listener
 * @return {EventEmitter}
 */
EventEmitter.prototype.once = function once (type, listener) {
  if (typeof listener !== 'function')
    { throw new TypeError('listener must be a function') }

  var fired = false

  function g () {
    this.removeListener(type, g)

    if (!fired) {
      fired = true
      listener.apply(this, arguments)
    }
  }

  g.listener = listener
  this.on(type, g)

  return this
}

/**
 * Remove a listener from the listener array for the specified event.
 * Caution: changes array indices in the listener array behind the listener.
 * Emits a 'removeListener' event if the listener was removed.
 *
 * @param {String} type Event name
 * @param {Function} listener
 */
EventEmitter.prototype.removeListener =
    function removeListener (type, listener) {
      var list, events, position, i

      if (typeof listener !== 'function')
        { throw new TypeError('listener must be a function') }

      events = this._events
      if (!events)
        { return this }

      list = events[type]
      if (!list)
        { return this }

      if (list === listener || (list.listener && list.listener === listener)) {
        if (--this._eventsCount === 0)
          { this._events = {} }
        else {
          delete events[type]
          if (events.removeListener)
            /** @event removeListener */
            { this.emit('removeListener', type, listener) }
        }
      } else if (typeof list !== 'function') {
        position = -1

        for (i = list.length; i-- > 0;) {
          if (list[i] === listener ||
              (list[i].listener && list[i].listener === listener)) {
            position = i
            break
          }
        }

        if (position < 0)
          { return this }

        if (list.length === 1) {
          list[0] = undefined
          if (--this._eventsCount === 0) {
            this._events = {}
            return this
          } else {
            delete events[type]
          }
        } else {
          spliceOne(list, position)
        }

        if (events.removeListener)
          { this.emit('removeListener', type, listener) }
      }

      return this
    }

/**
 * Removes all listeners, or those of the specified event.
 * It's not a good idea to remove listeners that were added elsewhere in the code,
 * especially when it's on an emitter that you didn't create (e.g. sockets or file streams).
 *
 * Returns emitter, so calls can be chained.
 * @param {String} type Event name
 * @return {EventEmitter}
 */
EventEmitter.prototype.removeAllListeners =
    function removeAllListeners (type) {
      var listeners, events

      events = this._events
      if (!events)
        { return this }

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = {}
          this._eventsCount = 0
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            { this._events = {} }
          else
            { delete events[type] }
        }
        return this
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events)
        for (var i = 0, key; i < keys.length; ++i) {
          key = keys[i]
          if (key === 'removeListener') continue
          this.removeAllListeners(key)
        }
        this.removeAllListeners('removeListener')
        this._events = {}
        this._eventsCount = 0
        return this
      }

      listeners = events[type]

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners)
      } else if (listeners) {
        // LIFO order
        do {
          this.removeListener(type, listeners[listeners.length - 1])
        } while (listeners[0])
      }

      return this
    }

/**
 * Returns an array of listeners for the specified event.
 * @param {String} type Event name
 * @return {Array.<Function>}
 */
EventEmitter.prototype.listeners = function listeners (type) {
  var evlistener
  var ret
  var events = this._events

  if (!events)
    { ret = [] }
  else {
    evlistener = events[type]
    if (!evlistener)
      { ret = [] }
    else if (typeof evlistener === 'function')
      { ret = [evlistener] }
    else
      { ret = arrayClone(evlistener, evlistener.length) }
  }

  return ret
}

/**
 * Return the number of listeners for a given event.
 * @param {EventEmitter} emitter
 * @param {String} type
 * @return {Number}
 */
EventEmitter.listenerCount = function (emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type)
  } else {
    return listenerCount.call(emitter, type)
  }
}

EventEmitter.prototype.listenerCount = listenerCount
function listenerCount (type) {
  var events = this._events

  if (events) {
    var evlistener = events[type]

    if (typeof evlistener === 'function') {
      return 1
    } else if (evlistener) {
      return evlistener.length
    }
  }

  return 0
}

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne (list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    { list[i] = list[k] }
  list.pop()
}

function arrayClone (arr, i) {
  var copy = new Array(i)
  while (i--)
    { copy[i] = arr[i] }
  return copy
}

module.exports = EventEmitter
