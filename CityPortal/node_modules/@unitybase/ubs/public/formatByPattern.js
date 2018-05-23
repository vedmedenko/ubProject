/*
* Created by xmax on 17.02.2018
*/
// {month:  '2-digit', day: 'numeric', year: 'numeric',  hour: '2-digit', minute: '2-digit', second: '2-digit'})
// todo describe pattern
const datePatterns = {
  date: {month: '2-digit', day: '2-digit', year: 'numeric'},
  dateFull: {month: '2-digit', day: '2-digit', year: '2-digit'},
  dateShort: {month: '2-digit', year: '2-digit'},
  dateFullLong: {month: 'long', day: '2-digit', year: '2-digit'},
  dateMYY: {month: '2-digit', year: 'numeric'},
  dateMYLong: {month: 'long', year: 'numeric'},
  time: {hour: '2-digit', minute: '2-digit'},
  timeFull: {hour: '2-digit', minute: '2-digit', second: '2-digit'},
  dateTime: {month: '2-digit', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'},
  dateTimeFull: {month: '2-digit', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'}
}
// {style: 'decimal', useGrouping: true, minimumIntegerDigits: 10, maximumFractionDigits: 2, minimumFractionDigits: 2, minimumSignificantDigits: 5}
const numberPatterns = {
  sum: {style: 'decimal', useGrouping: false, maximumFractionDigits: 2, minimumFractionDigits: 2},
  numberGroup: {style: 'decimal', useGrouping: true, maximumFractionDigits: 0},
  sumDelim: {style: 'decimal', useGrouping: true, maximumFractionDigits: 2, minimumFractionDigits: 2},
  number: {style: 'decimal', useGrouping: false, maximumFractionDigits: 0},
  decimal1: {style: 'decimal', useGrouping: true, maximumFractionDigits: 1, minimumFractionDigits: 1},
  decimal2: {style: 'decimal', useGrouping: true, maximumFractionDigits: 2, minimumFractionDigits: 2},
  decimal3: {style: 'decimal', useGrouping: true, maximumFractionDigits: 3, minimumFractionDigits: 3},
  decimal4: {style: 'decimal', useGrouping: true, maximumFractionDigits: 4, minimumFractionDigits: 4},
  decimal5: {style: 'decimal', useGrouping: true, maximumFractionDigits: 5, minimumFractionDigits: 5},
  decimal6: {style: 'decimal', useGrouping: true, maximumFractionDigits: 6, minimumFractionDigits: 6}
}

/**
 * Format date by pattern
 * @param value
 * @param patternName
 * @param lang
 * @return {string}
 */
function formatDate (value, patternName, lang) {
  if (!value) return
  if (!(value instanceof Date)) throw new Error('Value must be Date')
  const lng = (lang || 'en').toLowerCase()
  const locale = lng + '-' + lng.toUpperCase()
  const pattern = datePatterns[patternName]
  if (!pattern) throw new Error('Unknown date pattern ' + patternName)
  return value.toLocaleDateString(locale, pattern)
}

/**
 * Format number by pattern
 * @param value
 * @param patternName
 * @param lang
 * @return {string}
 */
function formatNumber (value, patternName, lang) {
  if (!value && value !== 0) return
  if (!(typeof value === 'number')) throw new Error('Value must be Number')
  if (Number.isNaN(value)) return 'NaN'
  const lng = (lang || 'en').toLowerCase()
  const locale = lng + '-' + lng.toUpperCase()
  const pattern = numberPatterns[patternName]
  if (!pattern) throw new Error('Unknown number pattern ' + patternName)
  return value.toLocaleString(locale, pattern)
}

module.exports = {
  formatDate: formatDate,
  formatNumber: formatNumber,
  datePatterns: Object.keys(datePatterns),
  numberPatterns: Object.keys(numberPatterns)
}
