let me = ubq_messages
me.entity.addMethod('addqueue')
// WTF me.entity.addMethod('sendmail');
me.entity.addMethod('success')
me.entity.addMethod('executeSchedulerTask')

/**
 * Mark queue task as successfully executed
 * @param {ubMethodParams} ctxt
 * @param {TubList} ctxt.mParams
 * @param {Number} ctxt.mParams.ID
 */
me.success = function (ctxt) {
  ctxt.dataStore.execSQL('update ubq_messages set completeDate = :completeDate: where ID = :ID:', {completeDate: new Date(), ID: ctxt.mParams.ID})
  return true
}

/**
 * Add item to queue.
 *
 * Used by server FTS mixin - do not remove
 * @param {ubMethodParams} ctxt
 * @param {String} ctxt.mParams.queueCode Queue code to add a item to
 * @param {String} ctxt.mParams.msgCmd Command
 * @param {String} ctxt.mParams.msgData Additional command data
 * @param {Number} [ctxt.mParams.msgPriority=0] Priority
 * @return {Boolean}
 */
me.addqueue = function (ctxt) {
  console.debug('Call JS method: ubq_messages.addqueue')
  let mparams = ctxt.mParams
  let fMethod = 'insert'
  let inst = new TubDataStore('ubq_messages')
  let fexecParams = {}

  fexecParams.ID = inst.generateID()
  fexecParams.queueCode = mparams.queueCode
  fexecParams.msgCmd = mparams.msgCmd
  fexecParams.msgData = mparams.msgData
  if (!mparams.msgPriority) {
    fexecParams.msgPriority = 0
  }

  let runobj = {
    entity: 'ubq_messages',
    method: fMethod,
    fieldList: ['*'],
    execParams: fexecParams
  }
  inst.run(fMethod, runobj)
  return true
}

/**
 * Take a `.` separated string and return a function it points to (starting from global)
 * Think about it as about safe eval
 * @param {String} path
 * @return {Function|undefined}
 */
function getFnFromNS (path) {
  let root = global
  if (typeof path !== 'string') {
    return undefined
  }

  let parts = path.split('.')

  for (let j = 0, subLn = parts.length; j < subLn; j++) {
    let part = parts[j]

    if (root[part]) {
      root = root[part]
    } else {
      return undefined
    }
  }
  return typeof root === 'function' ? root : undefined
}

/**
 * REST endpoint for executing a scheduler task.
 * Queue worker will sent the tasks in async mode to this endpoint according to a schedulers.
 * Endpoint wait a POST requests from a local IP with JSON:
 *
 *      {schedulerName: cfg.name, command: cfg.command, module: cfg.module, singleton: cfg.singleton !== false, logSuccessful: cfg.logSuccessful}
  *
 * `command` must be a function name (may including namespace), for example `UB.UBQ.sendQueueMail` or `ubs_message_edit.notifyAllRecipients`
 * in case `command` not passed `module` must be a module what export default a function, for example module: '@unitybase/myModule/schedTask'
 * and  in schedTask.js `module exports = function() {...}`
 *
 * In case `singleton` parameter is missing or === false scheduler can run a multiple instances of the same task,
 * otherwise - if previous task with the same name not finished yet current task will not be executed
 *
 * - If command executed success, record with resultError===0 will be written to `ubq_runstat` entity.
 * - If command executed **with exception**, record with resultError===1 will be written to `ubq_runstat` entity,
 * Exception text will be written written to `ubq_runstat.resultErrorMsg`.
 *
 * @param {null} nullCtxt
 * @param {THTTPRequest} req Name of a scheduler item
 * @param {THTTPResponse} resp Command to execute
 * @return {Boolean}
 */
me.executeSchedulerTask = function executeSchedulerTask (nullCtxt, req, resp) {
  let logText, err
  let statParams

  if (App.localIPs.indexOf(Session.callerIP) === -1) {
    throw new Error('SCHEDULER: remote execution is not allowed')
  }

  let task = JSON.parse(req.read())
  let taskName = task.schedulerName || 'unknownTask'
  let isSingleton = (task.singleton !== false)
  if (isSingleton && (App.globalCacheGet(taskName) === '1')) {
    console.warn('SCHEDULER: task %s is already running', taskName)
    return false
  }
  if (isSingleton) {
    App.globalCachePut(taskName, '1')
  }
  err = ''
  try {
    console.debug('SCHEDULER: got a task %j', task)
    let startTime = new Date()
    let entryPoint
    if (task.command) {
      entryPoint = getFnFromNS(task.command)
    } else if (task.module) {
      entryPoint = require(task.module)
    }

    if (!entryPoint) {
      err = `SCHEDULER: invalid command (function ${task.command || task.module} not found)`
    } else {
      try {
        logText = entryPoint()
        App.dbCommit()
      } catch (e) {
        err = e.toString()
        App.dbRollback()
      }
    }
    let endTime = new Date()
    let statInst = new TubDataStore(ubq_runstat.entity)
    if (task.logSuccessful || err !== '') {
      statParams = {
        appName: process.env['COMPUTERNAME'],
        schedulerName: taskName,
        startTime: startTime,
        endTime: endTime,
        resultError: err === '' ? 0 : 1
      }
      if (err !== '') {
        statParams.resultErrorMsg = err
      }
      if (logText) {
        statParams.logText = logText
      }
      statInst.run('insert', {
        execParams: statParams
      })
    }
  } finally {
    if (isSingleton) {
      App.globalCachePut(taskName, '0')
    }
  }
  resp.statusCode = 200
  console.debug('SCHEDULER: end a task %j with result %j', task, statParams)
  App.logout()
}
