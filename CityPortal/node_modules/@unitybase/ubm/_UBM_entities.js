// This file is generated automatically and contain definition for code insight.
// Ignored by UnityBase server because name start from "_".
// Do not modify this file directly. Run ub cmd/createCodeInsightHelper -help for details

/**
* Commands
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_command = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Commands"
* @class
*/
function ubm_command_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Command code 
    * @type {String}
    */
    this.code = '';
    /**
    * Command description 
    * @type {String}
    */
    this.description = '';
    /**
    * Entity 
    * @type {String}
    */
    this.entity = '';
    /**
    * Command type 
    * @type {String}
    */
    this.cmdType = '';
    /**
    * Is default? 
    * @type {Boolean}
    */
    this.isDefault = undefined;
    /**
    * Is public 
    * @type {Boolean}
    */
    this.isPublic = undefined;
    /**
    * Command definition 
    * @type {String}
    */
    this.cmdData = '';
    /**
    * Command parameters 
    * @type {String}
    */
    this.cmdParams = '';
    /**
    * Method of parameters specifying 
    * Defines script or form to specify command parameters
    * @type {String}
    */
    this.paramsFiller = '';
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
* Desktops
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_desktop = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Desktops"
* @class
*/
function ubm_desktop_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Desktop name 
    * @type {String}
    */
    this.caption = '';
    /**
    * Code 
    * @type {String}
    */
    this.code = '';
    /**
    * URL 
    * Static server page URL which is displayed in screen centre of selected desktop
    * @type {String}
    */
    this.url = '';
    /**
    * Dy default? 
    * @type {Boolean}
    */
    this.isDefault = undefined;
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
* Administering of desktops
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_desktop_adm = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Administering of desktops"
* @class
*/
function ubm_desktop_adm_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Desktop (ref -> ubm_desktop)
    * @type {Number}
    */
    this.instanceID = 0;
    /**
    * Admin subject (ref -> uba_subject)
    * @type {Number}
    */
    this.admSubjID = 0;
}

/**
* Entity diagrams
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_diagram = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Entity diagrams"
* @class
*/
function ubm_diagram_object()  {
    /**
    *  
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Model 
    * Model code where to store diagram
    * @type {String}
    */
    this.model = '';
    /**
    * Name 
    * @type {String}
    */
    this.name = '';
    /**
    * Diagram 
    * Diagram
    * @type {String}
    */
    this.document = '';
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
* Enumerated values
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_enum = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Enumerated values"
* @class
*/
function ubm_enum_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Group 
    * Group of enumeration
    * @type {String}
    */
    this.eGroup = '';
    /**
    * Code 
    * Value code
    * @type {String}
    */
    this.code = '';
    /**
    * Short name 
    * @type {String}
    */
    this.shortName = '';
    /**
    * Value name 
    * @type {String}
    */
    this.name = '';
    /**
    * N order 
    * @type {Number}
    */
    this.sortOrder = 0;
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
* Form
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_form = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Form"
* @class
*/
function ubm_form_object()  {
    /**
    *  
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Form code 
    * @type {String}
    */
    this.code = '';
    /**
    * Description 
    * @type {String}
    */
    this.description = '';
    /**
    * Form caption 
    * @type {String}
    */
    this.caption = '';
    /**
    * Form type 
    * @type {String}
    */
    this.formType = '';
    /**
    * Form definition 
    * Form interface definition
    * @type {String}
    */
    this.formDef = '';
    /**
    * Form script 
    * JS form client logic
    * @type {String}
    */
    this.formCode = '';
    /**
    * Entity 
    * Entity code
    * @type {String}
    */
    this.entity = '';
    /**
    * Is default 
    * Is this is default entity form
    * @type {Boolean}
    */
    this.isDefault = undefined;
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
* Shortcut
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_navshortcut = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Shortcut"
* @class
*/
function ubm_navshortcut_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Desktop (ref -> ubm_desktop)
    * @type {Number}
    */
    this.desktopID = 0;
    /**
    * Shortcut folder (ref -> ubm_navshortcut)
    * 
    * @type {Number}
    */
    this.parentID = 0;
    /**
    * Code 
    * @type {String}
    */
    this.code = '';
    /**
    * Is this folder? 
    * @type {Boolean}
    */
    this.isFolder = undefined;
    /**
    * Shortcut name 
    * @type {String}
    */
    this.caption = '';
    /**
    * Command code 
    * @type {String}
    */
    this.cmdCode = '';
    /**
    * In new window 
    * Display command result in new window or inside panel
    * @type {Boolean}
    */
    this.inWindow = undefined;
    /**
    * Collapsed 
    * Show collapsed at the first start
    * @type {Boolean}
    */
    this.isCollapsed = undefined;
    /**
    * № order 
    * Display order (in current folder)
    * @type {Number}
    */
    this.displayOrder = 0;
    /**
    * icon css class name 
    * @type {String}
    */
    this.iconCls = '';
    /**
    *  
    * 
    * @type {String}
    */
    this.mi_treePath = '';
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
* Administering of navigation panel
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_navshortcut_adm = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Administering of navigation panel"
* @class
*/
function ubm_navshortcut_adm_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Navshortcut (ref -> ubm_navshortcut)
    * @type {Number}
    */
    this.instanceID = 0;
    /**
    * Subject of administration (ref -> uba_subject)
    * @type {Number}
    */
    this.admSubjID = 0;
}

/**
* Scripts
* @mixes EventEmitter
* @mixes RequiredModule
*/
var ubm_script = {
  /** 
   * Reference to entity metadata
   * @type {TubEntity} 
   */
  entity: null
};

/**
* Attributes of "Scripts"
* @class
*/
function ubm_script_object()  {
    /**
    *  
    * 
    * @type {Number}
    */
    this.ID = 0;
    /**
    * Code 
    * Code
    * @type {String}
    */
    this.code = '';
    /**
    * Caption 
    * Caption
    * @type {String}
    */
    this.caption = '';
    /**
    * Description 
    * @type {String}
    */
    this.description = '';
    /**
    * Entity 
    * @type {String}
    */
    this.entity = '';
    /**
    * Script body 
    * @type {String}
    */
    this.scriptCode = '';
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

