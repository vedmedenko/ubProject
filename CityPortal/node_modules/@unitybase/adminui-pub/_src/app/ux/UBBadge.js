const _ = require('lodash')

/**
 * @class Display a value as a badge.
 * The class plays well with BasePanel and enum attribute type. It also has static methods, which helps displaying
 * badges as a grid columns.
 * The class contain static methods for registering badge classes for enum groups, so that badges may be applied for
 * any entity attribute.
 *
 * @example
 * Display an enum attribute as a badge on a form:
 * {attributeName: 'status', xtype: 'ub-badge'}
 *
 * For this to work, an `initModel.js` file (there must be one for your model) shall contain the following initialization code:
 *  ```
 *  UB.ux.UBBadge.setCssMap(
 *    'MY_ENTITY_STATUS',
 *    {
 *      'pending': 'blue',
 *      'in-progress': 'yellow',
 *      'error': 'red',
 *    },
 *    // Use invert style
 *    true
 *  )
 * ```
 * This will let the control know which style to apply to each enumeration value.
 *
 * @example
 * When need to use badge as a static label, not linked to attribute and / or enum,
 * use configuration like the following:
 *  {
 *    xtype: 'ub-badge',
 *    itemId: 'overdueBadge',
 *    text: UB.i18n('bpm_Task_overdue'),
 *    invert: true,
 *    cssClass: 'red'
 *  }
 *
 *  The possible cssClass is listed in TODO
 */
Ext.define('UB.ux.UBBadge', {
  extend: Ext.Component,
  mixins: [Ext.form.field.Field],
  alias: 'widget.ub-badge',

  statics: {
    /**
     * Replace a field into field description and put in the list "format" function, which will draw the badge.
     *
     * @param {Array<string|object>} fieldList
     * @param {string} fieldName
     * @param {string} enumGroup
     * @param {boolean} [invert]
     * @param {object.<string,string>} [map]  Optional
     *
     * This "patches" the "fieldList" config of grid, so it shall be done before initComponent call or inside it,
     * but before callParent execution.
     *
     * @example
     *   initComponent: function () {
     *     var myGridComponent = this.items[5]
     *     var fieldList = UB.Utils.convertFieldListToExtended(myGridComponent.fieldList)
     *     UB.ux.UBBadge.setupRenderer(fieldList, 'status', 'MY_ENTITY_STATUS')
     *     this.callParent(arguments)
     *   },
     */
    setupRenderer: function (fieldList, fieldName, enumGroup, invert, map) {
      let field = _.find(fieldList, ['name', fieldName])
      if (!field) return

      if (!map) map = UB.ux.UBBadge.getCssMap(enumGroup)
      let invertValue = invert == null ? UB.ux.UBBadge._invertedEnums[enumGroup] : invert
      field.format = UB.ux.UBBadge.formatEnum(enumGroup, map, invertValue)
    },

    /**
     * Create a formatter function for entity grid.
     * @param {string} enumGroup     Enumeration group of the column.
     * @param {object} map           Key-value map between column value and css classes.
     * @param {boolean} invert   If true, use invert styles for badges.
     * @return {Function}
     */
    formatEnum: function (enumGroup, map, invert) {
      if (!map) map = UB.ux.UBBadge.getCssMap(enumGroup)

      return function (text, columnInstance) {
        if (text == null) return null

        UB.ux.UBBadge.styleBadgeColumn(columnInstance)

        return UB.ux.UBBadge.renderEnum(enumGroup, text, map, invert)
      }
    },

    /**
     * Modify style of container of the badge control inside a grid.
     * @param {object} columnInstance    object that represent cell inside of grid where badge control
     *                                   should be placed.
     * @param {string} className         css class name for the parent of the badge
     */
    styleBadgeColumn: function (columnInstance, className) {
      columnInstance.innerCls = className || 'ub-badge-parent-paddings'
    },

    renderEnum: function (enumGroup, text, map, invert) {
      let enumMember = enumGroup ? UB.core.UBEnumManager.getById(enumGroup, text) : null
      return UB.ux.UBBadge.renderBadge(
        enumMember ? enumMember.data.name : text,
        (map && map[text]) ? map[text] : 'default',
        invert
      )
    },

    renderBadge: function (text, style, invert) {
      if (text == null) return null
      return Ext.String.format(
        '<span style="margin-left: 3px; " class="ub-badge-component {2}ub-badge-{0}">{1}</span>',
        style, _.escape(UB.i18n(text)), invert ? 'ub-badge-invert ' : ''
      )
    },

    /**
     * Get CSS map for an enum group.
     * @param {string} enumGroup
     * @return {object.<string, string>}
     */
    getCssMap: function (enumGroup) {
      if (!UB.ux.UBBadge._enumClasses.hasOwnProperty(enumGroup)) {
        throw new Error('Cannot setup renderer for field, because no css maps available for enum group ' +
     enumGroup + '.')
      }
      return UB.ux.UBBadge._enumClasses[enumGroup]
    },

    /**
     * Check if enum group has inverted stype.
     * @param {string} enumGroup
     * @return {boolean}
     */
    isEnumInverted: function (enumGroup) {
      return !!UB.ux.UBBadge._invertedEnums[enumGroup]
    },

    /**
     * Register CSS map for an enum group.  Executed before usage, for example in "initModel.js"
     * CSS map is an object with enum item code as a key and css class suffix for badge as a value.  It is used
     * to determine styles for badges.
     * @param {string} enumGroup
     * @param {object.<string, string>} maps
     * @param {boolean} invert  Should the badge be displayed in inverted mode.
     * @example
     *  ```
     *  UB.ux.UBBadge.setCssMap(
     *    'MY_ENTITY_STATUS', // enum group
     *    {
     *     'pending': 'blue',
     *     'in-progress': 'yellow',
     *     'error': 'red',
     *    },
     *    true
     *  )
     * ```
     */
    setCssMap: function (enumGroup, maps, invert) {
      UB.ux.UBBadge._enumClasses[enumGroup] = maps
      if (invert) UB.ux.UBBadge._invertedEnums[enumGroup] = true
    },

    /**
     * @private
     */
    _enumClasses: {},

    /**
     * @private
     */
    _invertedEnums: {}
  },

  tpl: '<tpl>' +
 '<span' +
 '<tpl if="invert"> class="ub-badge-component ub-badge-field ub-badge-{cssClass} ub-badge-invert"></tpl>' +
 '<tpl if="!invert"> class="ub-badge-component ub-badge-field ub-badge-{cssClass}"></tpl>' +
 '{text}</span>' +
 '</tpl>',

  /**
   * @cfg {string} Optional.  Specify which enum to use to display value.  If not specified, control will try
   *               to automatically determine enum group basing on entity used by BasePanel and provide value of
   *               attributeName.
   */
  enumGroup: '',

  /**
   * @cfg {Object} Optional.  Key-value map, which resolves value to css class.
   *               If value not provided, will try to get value form UB.ux.UBBadge class - by enumGroup
   *               (see code of that component).
   * @example
   *  {
   *    'open': 'green',
   *    'close': 'grey',
   *    'invalid': 'error'
   * }
   */
  cssMap: null,

  /**
   * @cfg {string} The css class to be used, if map does not contain the provided key.
   */
  defaultCssClass: 'default',

  /**
   * @cfg {boolean|null} Optional.  If true, badge will be displayed in invert style.
   * If value not specified, control will try to get default settings for enum group.
   */
  invert: null,

  config: {
    value: null,

    /**
     * @cfg {boolean} Always true.  Despite this control does not need it, UnityBase forms expect each form field
     * to have such a property.
     */
    readOnly: true
  },

  /**
   * Set "true" to readonly regardless of what is passed as input.
   * @return {boolean}
   */
  applyReadOnly () {
    return true
  },

  initComponent: function () {
    this.on('added', function () {
      if (this.up().componentCls !== 'x-toolbar') {
        this.addCls('ub-badge-parent-paddings')
      }
    }, this, {single: true})
    this.callParent(arguments)
    if (this.text && this.cssClass) {
      this.update({
        cssClass: this.cssClass,
        text: this.text,
        invert: this.invert
      })
    }
  },

  applyValue: function (newValue) {
    if (!this.enumGroup && this.attributeName) {
      this.enumGroup = this._determineEnumGroup()
    }

    if (this.invert == null) {
      this.invert = !!UB.ux.UBBadge._invertedEnums[this.enumGroup]
    }

    let enumItem = this.enumGroup ? UB.core.UBEnumManager.getById(this.enumGroup, newValue) : null
    let cssMap = this.cssMap || this.enumGroup ? UB.ux.UBBadge.getCssMap(this.enumGroup) : {}

    this.update({
      cssClass: cssMap[newValue] || this.defaultCssClass,
      text: enumItem ? enumItem.data.name : newValue,
      invert: this.invert
    })

    return newValue
  },

  /**
   * @private
   * @returns {string|null}
   */
  _determineEnumGroup: function () {
    let basePanel = this.up('basepanel')

    if (!basePanel || !basePanel.domainEntity) {
      console.warn('Impossible to determine enumGroup, because control is not inside basepanel or the panel' +
        'does not have entity set.')
      return null
    }

    let entityAttribute = basePanel.domainEntity.attributes[this.attributeName]
    if (!entityAttribute) {
      console.warn('Impossible to determine enumGroup, because entity does not have attribute ' + this.attributeName)
      return null
    }

    if (!entityAttribute.enumGroup) {
      console.warn('Impossible to determine enumGroup, because attribute ' +
    this.attributeName + ' is no enum')
      return null
    }

    return entityAttribute.enumGroup
  }
})

/**
 * Display a form field value as a badge.
 * Difference between this class and 'UB.ux.UBBadge' is that this control is a form control and renders field label
 * and have layout like other form field controls.
 * @class
 */
Ext.define('UB.ux.UBBadgeField', {
  extend: Ext.form.field.Base,
  alias: 'widget.ub-badge-field',

  /**
   * @cfg {string} Optional.  Specify which enum to use to display value.  If not specified, control will try
   *               to automatically determine enum group basing on entity used by BasePanel and provide value of
   *               attributeName.
   */
  enumGroup: '',

  /**
  * @cfg {Object} Optional.  Key-value map, which resolves value to css class.
  *               If value not provided, will try to get value form UB.ux.UBBadge class - by enumGroup
  *               (see code of that component).
  * @example
  * {
  *    'open': 'green',
  *    'close': 'grey',
  *    'invalid': 'error'
  * }
  */
  cssMap: null,

  /**
  * @cfg {string} The css class to be used, if map does not contain the provided key.
  */
  defaultCssClass: 'default',

  /**
  * @cfg {boolean|null} Optional.  If true, badge will be displayed in invert style.
  * If value not specified, control will try to get default settings for enum group.
  */
  invert: null,

  initComponent: function () {
    this.callParent(arguments)

    if (!this.map && this.enumGroup) this.map = UB.ux.UBBadge.getCssMap(this.enumGroup)
    if (this.invert === null) this.invert = this.enumGroup && UB.ux.UBBadge.isEnumInverted(this.enumGroup)

    this.on('afterrender', function () {
      this._node = this.inputEl.dom.parentNode
      this._renderBadge()
    })
    this.on('change', function () {
      this._renderBadge()
    })
  },

  /**
  * Destroy the viewer component.
  */
  beforeDestroy: function () {
    delete this._node
    this.callParent(arguments)
  },

  _renderBadge: function () {
    this._node.innerHTML = UB.ux.UBBadge.renderEnum(this.enumGroup, this.getValue(), this.map, this.invert)
  }
})
