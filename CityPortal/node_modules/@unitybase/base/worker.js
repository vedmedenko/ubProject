/**
 * Execute a script in a dedicated thread.
 *
 * The flow:
 *
        const Worker = require('@unitybase/base').Worker
        // create a new thread in suspended state.
        // Evaluate a body of a function runSomething into newly created JavaScript context
        let w =  new Worker({name: 'WorkerName', onmessage: runSomething});
        // resume the thread and call a `onmessage` function with parameter, passed to postMessage
        w.postMessage({action: 'start', param: 'bla-bla'}); // wake up the thread and call a

 * If *onmessage* handler execution fail then worker call *onerror* handler.
 * When thread terminates and Terminate handler assigned worker thread call *onterminate* handler.
 *
 * In handlers you can use 2 methods:
 *  - *postMessage(message)* for posting messages from worker thread. You can get this message by function getMessage of worker object
 *  - *terminate()* for terminating current worker thread
 *
 * @author v.orel
 * @module @unitybase/base/worker
 */

const bindings = process.binding('worker')
const {sleep} = process.binding('syNode')

/**
 * @class
 * Worker implementation.
 * Warning!!! All defined workers MUST be terminated until application shut down. In opposite case you can get AV.
 * @param {Object|Number} paramsObj Parameters object for create new Worker or WorkerID for use existing Worker
 * @param {String} [paramsObj.name='Worker'] Name of Worker for debugger
 * @param {String|Function} paramsObj.onmessage Message handler. Accept 1 parameter - message
 * @param {String|Function} paramsObj.onterminate Terminate handler. Accept no parameters
 * @param {String|Function} paramsObj.onerror Error handler. Accept 2 parameters - message and exception
 * @param paramsObj.message Message. If assigned then post this message after start thread
 */
function Worker (paramsObj) {
  if (typeof (paramsObj) === 'object') {
    if (!paramsObj.name) paramsObj.name = 'Worker'
    this.workerID = bindings.createThread(paramsObj)
  } else if (typeof (paramsObj) === 'number') {
    this.workerID = paramsObj
  }
  if (paramsObj.hasOwnProperty('message')) {
    this.postMessage(paramsObj.message)
  }
}
module.exports = Worker

/**
 * Get message from the worker thread
 * @return {*}
 */
Worker.prototype.getMessage = function () {
  let mes = bindings.getMessage(this.workerID)
  if (mes) {
    return JSON.parse(mes)
  } else {
    return mes
  }
}

/**
 * Try get message from worker thread. Wait until message received or timeout expired
 * @param {Number} timeout Timeout in milliseconds
 * @param {Number} [checkEveryMS=10] Sleep duration before next try get message
 * @return {*}
 */
Worker.prototype.waitMessage = function (timeout, checkEveryMS) {
  let mes
  let start = new Date().getTime()
  if (!checkEveryMS) checkEveryMS = 10
  while ((!(mes = this.getMessage())) && (new Date().getTime() - start < timeout)) {
    sleep(checkEveryMS)
  }
  return mes
}

/**
 * Terminate worker thread
 */
Worker.prototype.terminate = function () {
  bindings.terminate(this.workerID)
}

/**
 * Post message to worker thread. Message are stringified before send
 * @param {*} message
*/
Worker.prototype.postMessage = function (message) {
  bindings.postMessage(this.workerID, JSON.stringify(message))
}
