// This file is generated automatically and contain definition for code insight.
// Ignored by UnityBase server because name start from "_".
// Do not modify this file directly. Run ub cmd/createCodeInsightHelper -help for details

/**
* Audit
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_audit = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Audit"
* @class
*/
function ubs_audit_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Entity code 
    * @type {String}
    */
    this.entity = '';
    /**
    * Instance ID 
    * @type {Number}
    */
    this.entityinfo_id = 0;
    /**
    * Action 
    * @type {String}
    */
    this.actionType = '';
    /**
    * User (ref -> uba_user)
    * @type {Number}
    */
    this.actionUser = 0;
    /**
    * Action time 
    * @type {Date}
    */
    this.actionTime = new Date();
    /**
    * Remote IP 
    * @type {String}
    */
    this.remoteIP = '';
    /**
    * Old values 
    * @type {String}
    */
    this.fromValue = '';
    /**
    * New values 
    * @type {String}
    */
    this.toValue = '';
    /**
    * Parent entity name 
    * @type {String}
    */
    this.parentEntity = '';
    /**
    * Parent instance ID 
    * @type {Number}
    */
    this.parentEntityInfo_id = 0;
}

/**
* Stored UI filters
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_filter = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Stored UI filters"
* @class
*/
function ubs_filter_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Code 
    * Code of filter group
    * @type {String}
    */
    this.code = '';
    /**
    * Name 
    * Filter name
    * @type {String}
    */
    this.name = '';
    /**
    * Filter definition 
    * filter
    * @type {String}
    */
    this.filter = '';
    /**
    * Is global? 
    * Is global?
    * @type {Boolean}
    */
    this.isGlobal = undefined;
    /**
    * Filter owner (ref -> uba_user)
    * Filter owner
    * @type {Number}
    */
    this.owner = 0;
    /**
    *  (ref -> uba_user)
    * Row owner
    * 
    * @type {Number}
    */
    this.mi_owner = 0;
    /**
    *  
    * Creation date
    * 
    * @type {Date}
    */
    this.mi_createDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who create row
    * 
    * @type {Number}
    */
    this.mi_createUser = 0;
    /**
    *  
    * Modification date
    * 
    * @type {Date}
    */
    this.mi_modifyDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who modify row
    * 
    * @type {Number}
    */
    this.mi_modifyUser = 0;
}

/**
* Message
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_message = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Message"
* @class
*/
function ubs_message_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Message 
    * @type {String}
    */
    this.messageBody = '';
    /**
    * complete 
    * @type {Boolean}
    */
    this.complete = undefined;
    /**
    * Type 
    * @type {String}
    */
    this.messageType = '';
    /**
    * Start date 
    * @type {Date}
    */
    this.startDate = new Date();
    /**
    * Expire date 
    * @type {Date}
    */
    this.expireDate = new Date();
    /**
    * recipients (ref -> ubs_message_recipient)
    * @type {Number}
    */
    this.recipients = 0;
    /**
    *  (ref -> uba_user)
    * Row owner
    * 
    * @type {Number}
    */
    this.mi_owner = 0;
    /**
    *  
    * Creation date
    * 
    * @type {Date}
    */
    this.mi_createDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who create row
    * 
    * @type {Number}
    */
    this.mi_createUser = 0;
    /**
    *  
    * Modification date
    * 
    * @type {Date}
    */
    this.mi_modifyDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who modify row
    * 
    * @type {Number}
    */
    this.mi_modifyUser = 0;
    /**
    *  
    * Deletion date
    * 
    * @type {Date}
    */
    this.mi_deleteDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who delete row
    * 
    * @type {Number}
    */
    this.mi_deleteUser = 0;
}

/**
* Message
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_message_edit = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Message"
* @class
*/
function ubs_message_edit_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Message 
    * @type {String}
    */
    this.messageBody = '';
    /**
    * Redy to send 
    * @type {Boolean}
    */
    this.complete = undefined;
    /**
    * Type 
    * @type {String}
    */
    this.messageType = '';
    /**
    * Start date 
    * @type {Date}
    */
    this.startDate = new Date();
    /**
    * Expire date 
    * @type {Date}
    */
    this.expireDate = new Date();
    /**
    *  (ref -> uba_user)
    * Row owner
    * 
    * @type {Number}
    */
    this.mi_owner = 0;
    /**
    *  
    * Creation date
    * 
    * @type {Date}
    */
    this.mi_createDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who create row
    * 
    * @type {Number}
    */
    this.mi_createUser = 0;
    /**
    *  
    * Modification date
    * 
    * @type {Date}
    */
    this.mi_modifyDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who modify row
    * 
    * @type {Number}
    */
    this.mi_modifyUser = 0;
    /**
    *  
    * Deletion date
    * 
    * @type {Date}
    */
    this.mi_deleteDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who delete row
    * 
    * @type {Number}
    */
    this.mi_deleteUser = 0;
}

/**
* Message recipient
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_message_recipient = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Message recipient"
* @class
*/
function ubs_message_recipient_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Message (ref -> ubs_message)
    * @type {Number}
    */
    this.messageID = 0;
    /**
    * User (ref -> uba_user)
    * @type {Number}
    */
    this.userID = 0;
    /**
    * Accept date 
    * @type {Date}
    */
    this.acceptDate = new Date();
}

/**
* Monitor
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_monitor = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Monitor"
* @class
*/
function ubs_monitor_object()  {
}

/**
* Registration key counter
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_numcounter = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Registration key counter"
* @class
*/
function ubs_numcounter_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Registration key 
    * Registration key
    * @type {String}
    */
    this.regKey = '';
    /**
    * Counter 
    * Counter
    * @type {Number}
    */
    this.counter = 0;
}

/**
* Reserved counters for registration keys
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_numcounterreserv = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Reserved counters for registration keys"
* @class
*/
function ubs_numcounterreserv_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Reg key 
    * Registration key
    * @type {String}
    */
    this.regKey = '';
    /**
    * Counter 
    * Reserved counter value
    * @type {Number}
    */
    this.counter = 0;
    /**
    * Reserved date 
    * Reserved date for document
    * @type {String}
    */
    this.reservedDate = '';
    /**
    * Note 
    * Description of reserved number (Department name, etc)
    * @type {String}
    */
    this.note = '';
}

/**
* Report templates
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_report = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Report templates"
* @class
*/
function ubs_report_object()  {
    /**
    *  
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Model 
    * Model code where to store report
    * @type {String}
    */
    this.model = '';
    /**
    * Report code 
    * @type {String}
    */
    this.report_code = '';
    /**
    * Name 
    * @type {String}
    */
    this.name = '';
    /**
    * Template 
    * Template
    * @type {String}
    */
    this.template = '';
    /**
    * Javascript code 
    * Javascript code
    * @type {String}
    */
    this.code = '';
    /**
    *  (ref -> uba_user)
    * Row owner
    * 
    * @type {Number}
    */
    this.mi_owner = 0;
    /**
    *  
    * Creation date
    * 
    * @type {Date}
    */
    this.mi_createDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who create row
    * 
    * @type {Number}
    */
    this.mi_createUser = 0;
    /**
    *  
    * Modification date
    * 
    * @type {Date}
    */
    this.mi_modifyDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who modify row
    * 
    * @type {Number}
    */
    this.mi_modifyUser = 0;
}

/**
* Settings
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_settings = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Settings"
* @class
*/
function ubs_settings_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Key 
    * Setting key. To prevent key conflicts key name must start with a model code where key is used. &#x60;ubs.numcounter.autoRegWithDeletedNumber&#x60;
    * @type {String}
    */
    this.settingKey = '';
    /**
    * Name 
    * Setting name
    * @type {String}
    */
    this.name = '';
    /**
    * Description 
    * Description
    * @type {String}
    */
    this.description = '';
    /**
    * Type 
    * Value type
    * @type {String}
    */
    this.type = '';
    /**
    * Value 
    * Value
    * @type {String}
    */
    this.settingValue = '';
    /**
    * Default value 
    * Default value (setted by developer)
    * @type {String}
    */
    this.defaultValue = '';
    /**
    *  (ref -> uba_user)
    * Row owner
    * 
    * @type {Number}
    */
    this.mi_owner = 0;
    /**
    *  
    * Creation date
    * 
    * @type {Date}
    */
    this.mi_createDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who create row
    * 
    * @type {Number}
    */
    this.mi_createUser = 0;
    /**
    *  
    * Modification date
    * 
    * @type {Date}
    */
    this.mi_modifyDate = new Date();
    /**
    *  (ref -> uba_user)
    * User who modify row
    * 
    * @type {Number}
    */
    this.mi_modifyUser = 0;
}

/**
* Soft lock
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubs_softLock = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Soft lock"
* @class
*/
function ubs_softLock_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Entity code 
    * Entity code
    * @type {String}
    */
    this.entity = '';
    /**
    * Instance ID 
    * Locked dataStore ID
    * @type {Number}
    */
    this.lockID = 0;
    /**
    * User (ref -> uba_user)
    * User who made a lock
    * @type {Number}
    */
    this.lockUser = 0;
    /**
    * Lock type 
    * Lock type
    * @type {String}
    */
    this.lockType = '';
    /**
    * Lock time 
    * Time when lock is made
    * @type {Date}
    */
    this.lockTime = new Date();
}

/**
* 
* @mixes EventEmitter
* @mixes RequiredModule
*/
var fts_ftsDefault = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of ""
* @class
*/
function fts_ftsDefault_object()  {
    /**
    *  
    * @type {String}
    */
    this.ID = '';
    /**
    *  
    * @type {Number}
    */
    this.rowid = 0;
    /**
    *  
    * @type {String}
    */
    this.entity = '';
    /**
    *  
    * @type {String}
    */
    this.ftsentity = '';
    /**
    *  
    * @type {String}
    */
    this.dy = '';
    /**
    *  
    * @type {String}
    */
    this.dm = '';
    /**
    *  
    * @type {String}
    */
    this.dd = '';
    /**
    *  
    * @type {String}
    */
    this.datacode = '';
    /**
    *  
    * @type {String}
    */
    this.aclrls = '';
    /**
    *  
    * @type {String}
    */
    this.entitydescr = '';
    /**
    *  
    * @type {String}
    */
    this.databody = '';
    /**
    *  
    * @type {String}
    */
    this.snippet = '';
    /**
    *  
    * @type {Number}
    */
    this.rank = 0;
}

/**
* 
* @mixes EventEmitter
* @mixes RequiredModule
*/
var fts_tst_ftsentity_uk = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of ""
* @class
*/
function fts_tst_ftsentity_uk_object()  {
    /**
    *  
    * @type {String}
    */
    this.ID = '';
    /**
    *  
    * @type {Number}
    */
    this.rowid = 0;
    /**
    *  
    * @type {String}
    */
    this.entity = '';
    /**
    *  
    * @type {String}
    */
    this.ftsentity = '';
    /**
    *  
    * @type {String}
    */
    this.dy = '';
    /**
    *  
    * @type {String}
    */
    this.dm = '';
    /**
    *  
    * @type {String}
    */
    this.dd = '';
    /**
    *  
    * @type {String}
    */
    this.datacode = '';
    /**
    *  
    * @type {String}
    */
    this.aclrls = '';
    /**
    *  
    * @type {String}
    */
    this.entitydescr = '';
    /**
    *  
    * @type {String}
    */
    this.databody = '';
    /**
    *  
    * @type {String}
    */
    this.snippet = '';
    /**
    *  
    * @type {Number}
    */
    this.rank = 0;
}

/**
* 
* @mixes EventEmitter
* @mixes RequiredModule
*/
var fts_ftsDefault_uk = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of ""
* @class
*/
function fts_ftsDefault_uk_object()  {
    /**
    *  
    * @type {String}
    */
    this.ID = '';
    /**
    *  
    * @type {Number}
    */
    this.rowid = 0;
    /**
    *  
    * @type {String}
    */
    this.entity = '';
    /**
    *  
    * @type {String}
    */
    this.ftsentity = '';
    /**
    *  
    * @type {String}
    */
    this.dy = '';
    /**
    *  
    * @type {String}
    */
    this.dm = '';
    /**
    *  
    * @type {String}
    */
    this.dd = '';
    /**
    *  
    * @type {String}
    */
    this.datacode = '';
    /**
    *  
    * @type {String}
    */
    this.aclrls = '';
    /**
    *  
    * @type {String}
    */
    this.entitydescr = '';
    /**
    *  
    * @type {String}
    */
    this.databody = '';
    /**
    *  
    * @type {String}
    */
    this.snippet = '';
    /**
    *  
    * @type {Number}
    */
    this.rank = 0;
}

/**
* 
* @mixes EventEmitter
* @mixes RequiredModule
*/
var fts_ftsSubjectSearch = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of ""
* @class
*/
function fts_ftsSubjectSearch_object()  {
    /**
    *  
    * @type {String}
    */
    this.ID = '';
    /**
    *  
    * @type {Number}
    */
    this.rowid = 0;
    /**
    *  
    * @type {String}
    */
    this.entity = '';
    /**
    *  
    * @type {String}
    */
    this.ftsentity = '';
    /**
    *  
    * @type {String}
    */
    this.dy = '';
    /**
    *  
    * @type {String}
    */
    this.dm = '';
    /**
    *  
    * @type {String}
    */
    this.dd = '';
    /**
    *  
    * @type {String}
    */
    this.datacode = '';
    /**
    *  
    * @type {String}
    */
    this.aclrls = '';
    /**
    *  
    * @type {String}
    */
    this.entitydescr = '';
    /**
    *  
    * @type {String}
    */
    this.databody = '';
    /**
    *  
    * @type {String}
    */
    this.snippet = '';
    /**
    *  
    * @type {Number}
    */
    this.rank = 0;
}

/**
* 
* @mixes EventEmitter
* @mixes RequiredModule
*/
var fts_ftsSubjectSearch_uk = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of ""
* @class
*/
function fts_ftsSubjectSearch_uk_object()  {
    /**
    *  
    * @type {String}
    */
    this.ID = '';
    /**
    *  
    * @type {Number}
    */
    this.rowid = 0;
    /**
    *  
    * @type {String}
    */
    this.entity = '';
    /**
    *  
    * @type {String}
    */
    this.ftsentity = '';
    /**
    *  
    * @type {String}
    */
    this.dy = '';
    /**
    *  
    * @type {String}
    */
    this.dm = '';
    /**
    *  
    * @type {String}
    */
    this.dd = '';
    /**
    *  
    * @type {String}
    */
    this.datacode = '';
    /**
    *  
    * @type {String}
    */
    this.aclrls = '';
    /**
    *  
    * @type {String}
    */
    this.entitydescr = '';
    /**
    *  
    * @type {String}
    */
    this.databody = '';
    /**
    *  
    * @type {String}
    */
    this.snippet = '';
    /**
    *  
    * @type {Number}
    */
    this.rank = 0;
}

