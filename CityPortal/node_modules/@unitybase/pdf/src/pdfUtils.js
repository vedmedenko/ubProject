/**
 * Created by pavel.mash on 11.02.2017.
 */

/** Number.isFinite polyfill */
Number.isFinite = Number.isFinite || function (value) {
  return typeof value === 'number' && isFinite(value)
}

module.exports.checkNumberValid = function (value, required, messageContext) {
  if (!required && !value && value !== 0) return
  if (!this.isNumberValid(value)) {
    throw new Error(messageContext + ' (value = ' + value + ') is NaN or not a number')
  }
}

module.exports.isNumberValid = function (value) {
  return Number.isFinite(value)
}

/**
 * Copies all the properties of config to object if they don't already exist.
 * @param {Object} object The receiver of the properties
 * @param {Object} config The source of the properties
 * @return {Object} returns obj
 */
module.exports.applyIf = function (object, config) {
  if (object) {
    for (let property in config) {
      if (object[property] === undefined) {
        object[property] = config[property]
      }
    }
  }
  return object
}

/**
 *
 * @param {Number|null} value
 * @param {String} measure Possible values mm, cm, px, pt
 * @param {String} measureTo Possible values mm, cm, px, pt
 * @returns {Number}
 */
module.exports.convertToMeasure = function (value, measure, measureTo) {
  if (!value) return value

  switch (measure) {
    case 'px':
    case 'pt':
      switch (measureTo) {
        case 'px':
        case 'pt':
          return value
        case 'mm':
          return value * 25.4 / 72
        case 'cm':
          return value * 2.54 / 72
        default:
          throw new Error('Unknown measure ' + measureTo)
      }
    case 'cm':
    case 'mm':
      switch (measureTo) {
        case 'px':
        case 'pt':
          return value * 72 / (measureTo === 'cm' ? 2.54 : 25.4)
        case 'mm':
        case 'cm':
          return value
        default:
          throw new Error('Unknown measure ' + measureTo)
      }
    default:
      throw new Error('Unknown measure ' + measure)
  }
}

/**
 * @type {{BLACK: [*], RED: [*], WHITE: [*]}}
 */
module.exports.colors = {
  BLACK: [0, 0, 0],
  RED: [255, 0, 0],
  WHITE: [255, 255, 255]
}
