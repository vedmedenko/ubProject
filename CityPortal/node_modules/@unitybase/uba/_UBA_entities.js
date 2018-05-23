// This file is generated automatically and contain definition for code insight.
// Ignored by UnityBase server because name start from "_".
// Do not modify this file directly. Run ub cmd/createCodeInsightHelper -help for details

/**
* Attribute level security
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_als = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Attribute level security"
* @class
*/
function uba_als_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Entity
    * @type {String}
    */
  this.entity = ''
    /**
    * Attribute
    * @type {String}
    */
  this.attribute = ''
    /**
    * State code
    * @type {String}
    */
  this.state = ''
    /**
    * Role name
    * @type {String}
    */
  this.roleName = ''
    /**
    * Allow actions
    * @type {Number}
    */
  this.actions = 0
}

/**
* Security audit
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_audit = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Security audit"
* @class
*/
function uba_audit_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Entity code
    * @type {String}
    */
  this.entity = ''
    /**
    * Instance ID
    * @type {Number}
    */
  this.entityinfo_id = 0
    /**
    * Action
    * @type {String}
    */
  this.actionType = ''
    /**
    * User
    * User, who perform the action
    * @type {String}
    */
  this.actionUser = ''
    /**
    * Action time
    * @type {Date}
    */
  this.actionTime = new Date()
    /**
    * Remote IP
    * Caller remote IP address. NULL in case of localhost
    * @type {String}
    */
  this.remoteIP = ''
    /**
    * Target user
    * The user name for which the data has changed
    * @type {String}
    */
  this.targetUser = ''
    /**
    * Target role
    * The role name for which the data has changed
    * @type {String}
    */
  this.targetRole = ''
    /**
    * Old values
    * @type {String}
    */
  this.fromValue = ''
    /**
    * New values
    * @type {String}
    */
  this.toValue = ''
}

/**
* Entity Level Security(ELS)
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_els = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Entity Level Security(ELS)"
* @class
*/
function uba_els_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Rule code
    * Code for ELS rule
    * @type {String}
    */
  this.code = ''
    /**
    * Description
    * Rule description
    * @type {String}
    */
  this.description = ''
    /**
    * Disabled
    * Rule is disabled
    * @type {Boolean}
    */
  this.disabled = undefined
    /**
    * Entity mask
    * @type {String}
    */
  this.entityMask = ''
    /**
    * Method mask
    * @type {String}
    */
  this.methodMask = ''
    /**
    * Rule type
    * Is this ALLOW rule(A) or DENY rule(D) or Complements(C) rule
    * @type {String}
    */
  this.ruleType = ''
    /**
    * Role (ref -> uba_role)
    * Role for which the rule applies
    * @type {Number}
    */
  this.ruleRole = 0
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
* User groups
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_group = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "User groups"
* @class
*/
function uba_group_object () {
    /**
    *  (ref -> uba_subject)
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Code
    * Group code. Used by APIs and scripts
    * @type {String}
    */
  this.code = ''
    /**
    * Name
    * @type {String}
    */
  this.name = ''
    /**
    * Description
    * @type {String}
    */
  this.description = ''
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
* Group Roles
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_grouprole = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Group Roles"
* @class
*/
function uba_grouprole_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Group (ref -> uba_group)
    * @type {Number}
    */
  this.groupID = 0
    /**
    * Role (ref -> uba_role)
    * @type {Number}
    */
  this.roleID = 0
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
* One time passwords
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_otp = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "One time passwords"
* @class
*/
function uba_otp_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * OTP
    * Generated one time password
    * @type {String}
    */
  this.otp = ''
    /**
    * User (ref -> uba_user)
    * @type {Number}
    */
  this.userID = 0
    /**
    * uData
    * Additional  data
    * @type {String}
    */
  this.uData = ''
    /**
    * Expired date
    * @type {Date}
    */
  this.expiredDate = new Date()
    /**
    * Otp kind
    * Kind of otp(Email, SMS, etc)
    * @type {String}
    */
  this.otpKind = ''
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
    /**
    *
    * Deletion date
    *
    * @type {Date}
    */
  this.mi_deleteDate = new Date()
    /**
    *  (ref -> uba_user)
    * User who delete row
    *
    * @type {Number}
    */
  this.mi_deleteUser = 0
}

/**
* Previous passwords
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_prevPasswordsHash = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Previous passwords"
* @class
*/
function uba_prevPasswordsHash_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * User (ref -> uba_user)
    * @type {Number}
    */
  this.userID = 0
    /**
    * Previous password hash
    * @type {String}
    */
  this.uPasswordHashHexa = ''
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
* System roles
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_role = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "System roles"
* @class
*/
function uba_role_object () {
    /**
    *  (ref -> uba_subject)
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Role
    * @type {String}
    */
  this.name = ''
    /**
    * Description
    * @type {String}
    */
  this.description = ''
    /**
    * Session duration
    * Time after which the session is deleted by timeout (in minutes)
    * @type {Number}
    */
  this.sessionTimeout = 0
    /**
    * Which application level methods are allowed (comma separated list)
    * @type {String}
    */
  this.allowedAppMethods = ''
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
* Administration subjects
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_subject = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Administration subjects"
* @class
*/
function uba_subject_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Login
    * @type {String}
    */
  this.name = ''
    /**
    * Subject type
    * @type {String}
    */
  this.sType = ''
    /**
    *
    *
    * @type {String}
    */
  this.mi_unityEntity = ''
}

/**
* Users
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_user = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "Users"
* @class
*/
function uba_user_object () {
    /**
    *  (ref -> uba_subject)
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * Login
    * User login in lower case
    * @type {String}
    */
  this.name = ''
    /**
    * First Name
    * @type {String}
    */
  this.firstName = ''
    /**
    * Last Name
    * @type {String}
    */
  this.lastName = ''
    /**
    * User gender
    *
    * @type {String}
    */
  this.gender = ''
    /**
    * Email
    * User email (could be used for notifications)
    *
    * @type {String}
    */
  this.email = ''
    /**
    * Phone
    * User phone (could be used for sms)
    *
    * @type {String}
    */
  this.phone = ''
    /**
    * Avatar
    * User avatar image (recommended 128x128)
    *
    * @type {String}
    */
  this.avatar = ''
    /**
    * Description
    * Additional description of user account
    *
    * @type {String}
    */
  this.description = ''
    /**
    * uData
    * Additional user data
    *
    * @type {String}
    */
  this.uData = ''
    /**
    * Disabled
    * @type {Boolean}
    */
  this.disabled = undefined
    /**
    * Registration pending
    * The user is waiting for confirmation of registration
    * @type {Boolean}
    */
  this.isPending = undefined
    /**
    * trusted IPs
    *
    * @type {String}
    */
  this.trustedIP = ''
    /**
    * Password hash
    *
    * @type {String}
    */
  this.uPasswordHashHexa = ''
    /**
    * Last password change date
    *
    * @type {Date}
    */
  this.lastPasswordChangeDate = new Date()
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
* User certificates
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_usercertificate = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "User certificates"
* @class
*/
function uba_usercertificate_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * User (ref -> uba_user)
    * @type {Number}
    */
  this.userID = 0
    /**
    * Issuer
    * Issuer tag of cerificate
    * @type {String}
    */
  this.issuer_serial = ''
    /**
    * Issuer caption
    * @type {String}
    */
  this.issuer_cn = ''
    /**
    * Serial number
    * Serial number of cerificate
    * @type {String}
    */
  this.serial = ''
    /**
    * Certificate
    * Binary data of certificate
    * @type {ArrayBuffer}
    */
  this.certificate = undefined
    /**
    * Description
    * @type {String}
    */
  this.description = ''
    /**
    * Disabled
    * disabled
    * @type {Boolean}
    */
  this.disabled = undefined
    /**
    * Revoked
    * Revoked
    * @type {Boolean}
    */
  this.revoked = undefined
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
* User Groups
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_usergroup = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "User Groups"
* @class
*/
function uba_usergroup_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * User (ref -> uba_user)
    * @type {Number}
    */
  this.userID = 0
    /**
    * Group (ref -> uba_group)
    * @type {Number}
    */
  this.groupID = 0
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
* User Roles
* @mixes EventEmitter
* @mixes RequiredModule
*/
var uba_userrole = {
  /**
   * Reference to entity metadata
   * @type {TubEntity}
   */
  entity: null
}

/**
* Attributes of "User Roles"
* @class
*/
function uba_userrole_object () {
    /**
    *
    *
    * @type {Number}
    */
  this.ID = 0
    /**
    * User (ref -> uba_user)
    * @type {Number}
    */
  this.userID = 0
    /**
    * Role (ref -> uba_role)
    * @type {Number}
    */
  this.roleID = 0
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

