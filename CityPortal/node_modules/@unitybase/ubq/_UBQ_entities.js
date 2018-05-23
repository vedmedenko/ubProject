// This file is generated automatically and contain definition for code insight.
// Ignored by UnityBase server because name start from "_".
// Do not modify this file directly. Run ub cmd/createCodeInsightHelper -help for details

/**
* Message queue
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubq_messages = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Message queue"
* @class
*/
function ubq_messages_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Queue code
    * Consumer determinate handler by this code. for each queCode must be consumer which handle it
    * @type {String}
    */
  this.queueCode = ''
    /**
    * Command
    * Command for receiver. Contain JSON serialized object with command parameters. Command must contain attributes receiver understand
    * @type {String}
    */
  this.msgCmd = ''
    /**
    * Message data
    * Additional data for message. May contain Base64 encoded binary data
    * @type {String}
    */
  this.msgData = ''
    /**
    * Priority
    * Priority of messages. 1&#x3D;High, 0&#x3D;Low, default 0
    * @type {Number}
    */
  this.msgPriority = 0
    /**
    * Complete date
    * @type {Date}
    */
  this.completeDate = new Date()
    /**
    *  (ref -> uba_user)
    * Row owner
    *
    * @type {Number}
    */
  this.mi_owner = 0
    /**
    *
    * Creation date
    *
    * @type {Date}
    */
  this.mi_createDate = new Date()
    /**
    *  (ref -> uba_user)
    * User who create row
    *
    * @type {Number}
    */
  this.mi_createUser = 0
    /**
    *
    * Modification date
    *
    * @type {Date}
    */
  this.mi_modifyDate = new Date()
    /**
    *  (ref -> uba_user)
    * User who modify row
    *
    * @type {Number}
    */
  this.mi_modifyUser = 0
}

/**
* Scheduler run statistic
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubq_runstat = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Scheduler run statistic"
* @class
*/
function ubq_runstat_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Application name
    * @type {String}
    */
  this.appName = ''
    /**
    * Scheduler name
    * @type {String}
    */
  this.schedulerName = ''
    /**
    * Time of start scheduler item
    * Time of start scheduler item
    * @type {Date}
    */
  this.startTime = new Date()
    /**
    * Time of end scheduler item
    * Time of end scheduler item
    * @type {Date}
    */
  this.endTime = new Date()
    /**
    * Log from runned script about all actions
    * Log from runned script about all actions
    * @type {String}
    */
  this.logText = ''
    /**
    * Result error code. 0&#x3D;No error
    * @type {Number}
    */
  this.resultError = 0
    /**
    * Error text message if resultError &gt; 0
    * @type {String}
    */
  this.resultErrorMsg = ''
}

/**
* Schedulers
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubq_scheduler = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Schedulers"
* @class
*/
function ubq_scheduler_object () {
    /**
    *
    * crc32(name)
    * @type {Number}
    */
  this.ID = 0
    /**
    * Job name
    * Unique job name. Models will override a jobs with the same name in order models are listen in server configuration
    * @type {String}
    */
  this.name = ''
    /**
    * Condition to schedule a job
    * Expression to be evaluated during server startup. In case result is empty or evaluated to &#x60;true&#x60; job will be scheduled
    * @type {String}
    */
  this.schedulingCondition = ''
    /**
    * Cron record
    * A cron for job as in unix systems. Format: &#39;Seconds(0-59) Minutes(0-59) Hours(0-23) DayOfMonth(1-31) Months(0-11) DayOfWeek(0-6)&#39;
    * @type {String}
    */
  this.cron = ''
    /**
    * Description
    * Job description
    * @type {String}
    */
  this.description = ''
    /**
    * Command
    * Name of function to be executed in a server context
    * @type {String}
    */
  this.command = ''
    /**
    * Singleton
    * If &#x60;1&#x60; - only single instance of a running job is allowed
    * @type {Boolean}
    */
  this.singleton = undefined
    /**
    * runAs
    * A user name for a job execution
    * @type {String}
    */
  this.runAs = ''
    /**
    * Log a Successful execution
    * If 1 (default) then successful job execution result will be logged into &#x60;ubq_runstat&#x60;, otherwise - only errors
    * @type {Boolean}
    */
  this.logSuccessful = undefined
    /**
    * Overridden
    * Indicate original job is overridden by other models
    * @type {Boolean}
    */
  this.overridden = undefined
    /**
    * OriginalModel
    * A model name where original job definition file is stored
    * @type {String}
    */
  this.originalModel = ''
    /**
    * Actual model
    * A name of model where actual job definition file is stored. Can de not equal to &#x60;originalModel&#x60; if someone overrides the job
    * @type {String}
    */
  this.actualModel = ''
}

