require('./UBAppConfig')
require('./UBService')
require('./UBUtil')
require('./UBCommand')
const _ = require('lodash')
const UB = require('@unitybase/ub-pub')

/**
 * Load form View (formCode.def) and from controller (formCode*.js) if any from local cache or from model `public/forms` folder.
 * Evaluate both & return evaluation result. Used in $App.doCommand in case command type is `showForm`.
 */
Ext.define('UB.core.UBFormLoader', {
  uses: ['UB.core.UBApp'],
  singleton: true,
  formType: {
    auto: 'auto',
    custom: 'custom'
  },
  CACHE_PREFIX: 'ubm_form_formdata_',

  /**
   * Array of ExtJS class names, defined by UBFormLoader
   * This array is used by clearFormCache to **"undefine"** Pure Ext JS forms defined by form loader
   * @protected
   */
  definedClasses: [],
  /**
   *  For several-times evaluate we must generate unique file name (bug in chrome debugger?) TODO - check with Chrome version up to 39.0.
   */
  evaluatedNames: {},

  /**
   * @private
   * @param def
   * @return {*}
   */
  getComponentClassName: function (def) {
    return this.getComponentPart(def, /(?:Ext.define\s*?\(\s*?["'])([\w.]+?)(?=["'])/, 1)
  },

  /**
   * @private
   * @param def
   * @return {*}
   */
  getComponentRequires: function (def) {
    return this.getComponentPartAsArray(def, /(?:requires\s*?:\s*?\[)((\s*?.*?\s*?)*?)(?=])/m, 1)
  },

  /**
   * @private
   * @param def
   * @return {*}
   */
  getComponentUses: function (def) {
    return this.getComponentPartAsArray(def, /(?:uses\s*?:\s*?\[)((\s*?.*?\s*?)*?)(?=])/m, 1)
  },

  /**
   * @private
   * @param def
   * @param regexp
   * @param partNo
   * @return {*}
   */
  getComponentPartAsArray: function (def, regexp, partNo) {
    let p = UB.core.UBFormLoader.getComponentPart(def, regexp, partNo)
    return (p && p.length) ? Ext.JSON.decode('[' + p + ']') : []
  },

  /**
   * @private
   * @param def
   * @param regexp
   * @param partNo
   * @return {String}
   */
  getComponentPart: function (def, regexp, partNo) {
    let m = regexp.exec(def)

    return (m && m.length > partNo) ? UB.core.UBUtil.removeWhitespaces(m[partNo]) : undefined
  },

  /**
   * Return cache storage key from form with specified code
   * @protected
   * @param {String} formCode
   * @param {String} [part='formDef'] Either `formCode` or `formDef`
   */
  getFormCacheKey: function (formCode, part) {
    return UB.core.UBFormLoader.CACHE_PREFIX + formCode + '_' + (part || 'formDef')
  },

  /**
   * Lookup form in `ubm_form` store
   * @param {String} entity Entity code for search
   * @param {Boolean} [allForms=false] return array of all entity forms or only first form founded
   * @return {Ext.data.Model|Array<Ext.data.Model>}
   */
  getFormByEntity: function (entity, allForms) {
    let store = UB.core.UBStoreManager.getFormStore()
    let forms = []
    let defaultForm = null

    store.each(function (item) {
      if (item.get('entity') === entity) {
        forms.push(item)
        if (item.get('isDefault') === true && !defaultForm) {
          defaultForm = item
          if (!allForms) { // Not need all forms, just first default
            return false
          }
        }
      }
    })
    defaultForm = defaultForm || forms[0]
    return allForms ? forms : defaultForm
  },

  /**
   * Dirty hack to clear Ext-JS based forms. Do not use in production!
   * @protected
   * @param {string} className
   */
  undefineExtClass: function (className) {
    let parts = className.split('.')
    let root = window
    let c = Ext.ClassManager.get(className)
    let lastPart

    if (!c) return

    delete Ext.ClassManager.classes[className]
    // noinspection JSAccessibilityCheck
    delete Ext.ClassManager.existCache[className]
    if (parts.length) {
      lastPart = parts.pop()
      for (let i = 0, ln = parts.length; i < ln; i++) {
        root = root[parts[i]]
        if (!root) break
      }
      if (root) delete root[lastPart]
    }
  },

  /**
   *  Remove form with code = formCode from cache, or all form in case formCode is not passed.
   *  @param {String} [formCode]
   */
  clearFormCache: function (formCode) {
    let keysToRemove = []
    let prefix = UB.core.UBFormLoader.CACHE_PREFIX
    let regEx = new RegExp(prefix)
    if (formCode) {
      keysToRemove.push(prefix + formCode + '_' + 'formDef')
      keysToRemove.push(prefix + formCode + '_' + 'formCode')
    }
    for (let i = 0, len = window.localStorage.length; i < len; i++) {
      let key = window.localStorage.key(i)
      if (regEx.test(key)) {
        keysToRemove.push(key)
      }
    }
    _.forEach(keysToRemove, function (key) {
      window.localStorage.removeItem(key)
    })
    // dirty hack to clear Ext-JS based forms
    if (!formCode) {
      this.definedClasses.forEach(function (className) {
        UB.core.UBFormLoader.undefineExtClass(className)
      })
      this.definedClasses = []
    }
    this.unloadModule(formCode)
    UB.logDebug('Forms data was cleared ' + (formCode ? ('for form ' + formCode) : 'for all forms'))
  },

  unloadModule: function (moduleName) {
    if (moduleName) {
      delete this.evaluatedNames[moduleName]
    } else {
      this.evaluatedNames = {}
    }
  },

  reloadModule (source, sourceTail, fileName) {
    this.unloadModule(fileName)
    this.evaluateModule(source, sourceTail, fileName)
  },

  evaluateModule (source, sourceTail, fileName) {
    let exports

    let fullSrc = source
    if (sourceTail) fullSrc += '\n/**** UBFormLoader splitting point ****/\n' + sourceTail
    if (this.evaluatedNames[fileName]) {
      exports = this.evaluatedNames[fileName]
    } else {
      exports = {}
      fullSrc = '(function (exports) { ' + fullSrc + '\n});' + '\n//# sourceURL=forms/' + fileName + '.js'
      // eslint-disable-next-line no-eval
      let fn = eval(fullSrc)
      fn(exports)
      this.evaluatedNames[fileName] = exports
    }
    return exports
  },
  /**
   * Retrieve form view `def` and form module. Look in the localStore first and if not found - go to server.
   *
   * @param {Object} config
   * @param {String} config.formCode Code of form from `ubm_form.code`
   * @param {Function} [config.callback] Called with two parameter `callback(viewDefinition, codeDefinition)`
   * @param {Object} [config.scope] Scope to execute callback in
   * @return {Promise} Promise resolved to object {formView: ..., formController: ..., formType:..} object or function in case of ExtJS form
   */
  getFormViewAndController: function (config) {
    let me = this

    function getLocalOrRemote (id, code, attr, reference) {
      if (!reference || !reference.length) {
        return Promise.resolve('')
      }
      let data = window.localStorage.getItem(UB.core.UBFormLoader.getFormCacheKey(code, attr))
      if (data) {
        return Promise.resolve(data)
      } else {
        return UB.core.UBService.getDocument({
          id: id,
          entity: 'ubm_form',
          attribute: attr
        }, null, null, {usePostMethod: true}).then(function (data) {
          if (!data) { // prevent storing of undefined to localStore
            throw new Error('Error loading form "' + config.formCode + '"')
          }
          window.localStorage.setItem(UB.core.UBFormLoader.getFormCacheKey(code, attr), data)
          return data
        })
      }
    }

    let formStore = UB.core.UBStoreManager.getFormStore()
    let record = formStore.findRecord('code', config.formCode, 0, false, true, true)
    if (!record) throw new Error('Unknown form code "' + config.formCode + '"')

    let formType = record.get('formType').toString()
    let formDefReference = record.get('formDef').toString()
    let formJSReference = record.get('formCode') // null is possible here
    formJSReference = formJSReference === null ? '' : formJSReference.toString()

    if (!formDefReference) throw new Error('Form definition is empty for form with code ' + config.formCode)

    let formID = record.get('ID')
    return Promise.all([
      getLocalOrRemote(formID, config.formCode, 'formDef', formDefReference),
      getLocalOrRemote(formID, config.formCode, 'formCode', formJSReference)
    ]).then(function (arr) {
      let formViewStr = arr[0]
      let formControllerStr = arr[1]
      let parsed = {formType: formType}

      switch (formType) {
        case 'auto':
          let fullModule = me.evaluateModule(formControllerStr, formViewStr, config.formCode)
          parsed.formView = fullModule.formDef
          parsed.formController = fullModule.formCode
          if (parsed.formView && parsed.formView.requires && parsed.formView.requires.length) {
            return new Promise((resolve) => {
              Ext.Loader.require(parsed.formView.requires, () => { resolve(parsed) })
            })
          } else {
            return parsed
          }
        case 'custom':
          return UB.core.UBFormLoader.createExtClass(formViewStr, config.formCode)
        case 'vue':
          parsed.formView = formViewStr
          parsed.formController = me.evaluateModule(formControllerStr, null, config.formCode).formCode
          return parsed
        default:
          throw new Error('Unknown form type ' + formType + ' for form ' + config.formCode)
      }
    })
  },

  /**
   * Create ExtJS class from file. Parse definition - load all required  & uses first
   * @protected
   * @param {String} classScript String representation of script
   * @param {String} fileName Name to show in evaluated scripts list
   * @return {Promise}  Promise resolved to object {formView: Ext.Base reference}
   */
  createExtClass: function (classScript, fileName) {
    return new Promise((resolve, reject) => {
      function doOnRequiredLoaded () {
        try {
          // eslint-disable-next-line no-eval
          let extClass = eval(classScript + '\n//# sourceURL=' + fileName + '.js')
          resolve({formView: extClass})
        } catch (e) {
          reject(new Error('Errors in file ' + fileName + '.def\n' + e.message))
        }
      }
      let className = UB.core.UBFormLoader.getComponentClassName(classScript)
      let definedClass = Ext.ClassManager.get(className)
      if (definedClass) {
        resolve({formView: definedClass})
      } else {
        UB.core.UBFormLoader.definedClasses.push(className)
        // parse class definition and extract requires & uses
        let requires = Ext.Array.merge(UB.core.UBFormLoader.getComponentRequires(classScript), UB.core.UBFormLoader.getComponentUses(classScript))

        // filter only undefined classes
        let undefinedClasses = _.filter(requires, function (className) {
          return !Ext.ClassManager.get(className)
        })
        if (undefinedClasses.length) {
          Ext.Loader.require(undefinedClasses, doOnRequiredLoaded)
        } else {
          doOnRequiredLoaded()
        }
      }
    })
  }
})
