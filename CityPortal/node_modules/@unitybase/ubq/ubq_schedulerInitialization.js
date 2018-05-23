const GLOBAL_CACHE_INITIALIZED_ENTRY = 'UBQ.schedulersInitialized'
const Worker = require('@unitybase/base').Worker

if (!App.globalCacheGet(GLOBAL_CACHE_INITIALIZED_ENTRY)) {
  if (process.startupMode === 'CmdLine') {
    App.globalCachePut(GLOBAL_CACHE_INITIALIZED_ENTRY, 'yes')
    console.debug('SCHEDULER: disabled for command line startup')
  } else if (App.serverConfig.application.schedulers && (App.serverConfig.application.schedulers.enabled === false)) {
    App.globalCachePut(GLOBAL_CACHE_INITIALIZED_ENTRY, 'yes')
    console.warn('SCHEDULER: disabled in application config (application.schedulers.enabled === false)')
  } else {
    App.once('domainIsLoaded', startSchedulers)
  }
}

/**
 * Read a schedulers configuration, calculate a apiKeys for all users and
 * pass a config to worker thread for starting
 */
function startSchedulers () {
  let cfgForWorker = []
  let usersApiKeys = {}

  if (App.globalCacheGet(GLOBAL_CACHE_INITIALIZED_ENTRY)) {
    console.debug('SCHEDULER: UBQ.initializeSchedulers already executed')
    return
  }

  App.globalCachePut(GLOBAL_CACHE_INITIALIZED_ENTRY, 'yes')
  console.debug('SCHEDULER: executing UBQ.initializeSchedulers')

  let store = new TubDataStore('uba_user')
  /** @type {Array<ubq_scheduler_object>} */
  let schedulers = UB.Repository('ubq_scheduler').attrs('*').selectAsObject()
  for (let i = 0, l = schedulers.length; i < l; i++) {
    let /** @type {ubq_scheduler_object} */ item = schedulers[i]
    if (item.schedulingCondition) {
      let canSchedule = false
      try {
        canSchedule = eval(item.schedulingCondition)
      } catch (e) {
        console.error('SCHEDULER: Invalid scheduleCondition for item', item.name, 'Item DISABLED')
      }
      if (!canSchedule) {
        console.info('SCHEDULER: scheduleCondition for item', item.name, 'evaluated to false. Item DISABLED')
        continue
      }
    }
    if (!usersApiKeys.hasOwnProperty(item.runAs)) {
      store.runSQL('select uPasswordHashHexa from uba_user where name = :user: AND disabled=0', {user: item.runAs})
      if (!store.eof) {
        usersApiKeys[item.runAs] = store.get(0)
      }
    }
    if (!usersApiKeys[item.runAs]) {
      console.error('SCHEDULER: Task owner', item.runAs, 'not found in uba_user or it\'s apiKey are empty. Item', item.name, 'DISABLED')
      continue
    }
    cfgForWorker.push({
      name: item.name,
      cron: item.cron,
      command: item.command,
      module: item.module,
      singleton: item.singleton,
      runAs: item.runAs,
      apiKey: usersApiKeys[item.runAs],
      logSuccessful: item.logSuccessful
    })
  }

  let w = new Worker({
    name: 'Scheduler',
    onmessage: runSchedulersCircle,
    onerror: onWorkerError
  })

    // MPV: in case engine expire worked MUST remain alive,
    // so we can't terminate it here
    // TODO - think what to do
    // process.on('exit', function(){
    //    w.terminate();
    // });

  w.postMessage({serverURL: App.serverURL, config: cfgForWorker})
  console.debug('SCHEDULER: leave queueWorkerInitialization')
}

function onWorkerError (message, exception) {
  console.error('SCHEDULER: ', message, exception)
}

/**
 * The Worker function. Function body is evaluated in the worker thread, so
 * reference from this function to anything from a module is NOT ALLOWED
 */
function runSchedulersCircle (message) {
  // boilerplate to stop debuger inside Worker 
  // put breakpoint on line  let p = 0 and change a value of i to 2 to go forward
  /* let i = 1
  while (i===1) { 
    let p = 0
  }
  */
  const Module = require('module')
  let parent = new Module('internal/preload', null)
  // TODO this hack is temporary solution for require.resolve. 
  // The problem here: we lost a folder for where runSchedulersCircle and replace it with process.configPath
  // process.cwd() not work for case server started as a service
  // so all modules what required inside worker must be either global or in application node_modules folder
  parent.paths = Module._nodeModulePaths(process.configPath)
  const UBConnection = parent.require('@unitybase/base').UBConnection
  const cron = parent.require('node-cron')
  const serverURL = message.serverURL
  const config = message.config
  let jobs = [], job

  function safeSendAsyncRequest (cfgIdx) {
    try {
      let conn = new UBConnection(serverURL)
      let cfg = config[cfgIdx]
      conn.onRequestAuthParams = function () {
        return {authSchema: 'UB', login: cfg.runAs, apiKey: cfg.apiKey}
      }
      console.log('SCHEDULER: Job', cfg.name, 'started at', new Date())
      console.debug('Job defined as:', cfg)
      conn.xhr({
        endpoint: 'rest/ubq_messages/executeSchedulerTask',
        method: 'POST',
        URLParams: {async: true},
        data: {schedulerName: cfg.name, command: cfg.command, module: cfg.module, singleton: cfg.singleton == 1, logSuccessful: cfg.logSuccessful == 1}
      })
    } catch (e) {
      console.error(e)
    }
  }

  function cronJobStopped (cfgIdx) {
    console.log('SCHEDULER: Job', config[cfgIdx].name, 'stopped')
  }

  console.debug('SCHEDULER: start initializeSchedulers..')

  console.debug('SCHEDULER: Got a init config %j', config)
  for (let i = 0, l = config.length; i < l; i++) {
    console.debug('SCHEDULER: add a job for', config[i].name, 'scheduled as', config[i].cron)
    job = cron.schedule(
      config[i].cron,
      safeSendAsyncRequest.bind(null, i),
      // OBSOLETE cronJobStopped.bind(null, i),
      true /* Start the job right now */
      // OBSOLETE '' /* local timezone */
    )
    jobs.push(job)
  }
  global._timerLoop.setTimeoutWithPriority(
      function () {
        console.log('SCHEDULER: end timer loop')
        terminate()
      },
      0,
      1000
  )
}

