/**
 * Created by pavel.mash on 01.12.2016.
 */

const _ = require('lodash')

const __i18n = {
  monkeyRequestsDetected: 'Your request has been processed, but we found that it is repeated several times. Maybe you key fuse?'
}

/**
 * Return locale-specific resource from it identifier.
 * localeString must be either previously defined dy call to {i18nExtend} or
 * or be a combination of entity and attribute names so that `UB.i18n('uba_user')`
 * or `UB.i18n('uba_role.description')` would be resolved to localized entity caption or entity attribute caption
 * @param {String} localeString
 * @returns {*}
 */
function i18n (localeString) {
  let res = __i18n[localeString]
  if (res !== undefined || localeString == null) return res

  // $App is accessible only inside adminUI
  if (typeof $App === 'undefined') return localeString

  if ($App.domainInfo == null) {
    // Domain is not loaded yet, cannot resolve string to entity or entity attribute's name
    return localeString
  }

  // Try to resolve string as entity name or entity attribute name
  let parts = localeString.split('.')

  if (parts.length > 2) {
    // String contain more than one dots, that is not what can be resolved to entity or entity attribute name
    return localeString
  }

  let entity = $App.domainInfo.entities[parts[0]]
  if (!entity) {
    // First part shall be a valid entity name
    return localeString
  }

  if (parts.length === 1) {
    // A valid entity name, resolve to the entity's caption
    // Remember in __i18n for performance
    __i18n[localeString] = entity.caption
    return entity.caption
  }

  let attr = entity.attributes[parts[1]]
  if (!attr) {
    // Expecting the second part to be a valid entity attribute name
    return localeString
  }

  // A valid entity attribute name, resolve to the entity attribute's caption
  // Remember in __i18n for performance
  __i18n[localeString] = attr.caption
  return attr.caption
}

/**
 * Merge localizationObject to UB.i18n. Usually called form modelPublic/locale/lang-*.js scripts
 * @param {Object} localizationObject
 */
function i18nExtend (localizationObject) {
  _.merge(__i18n, localizationObject)
}

module.exports = {
  i18n,
  i18nExtend
}
