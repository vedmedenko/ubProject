/**
 * Parse a command line options & environment variables and create a configuration object.
 *
     const cmdLineOpt = require('cmd/options')
     const argv = require('cmd/argv')

     let paramsDescription = cmdLineOpt.describe('cmd/generateDDL',
      'Check database structure for application domain. ' +
      'Generate DDL (both create and alter) if need and optionally run it'
     ).add(
        argv.establishConnectionFromCmdLineAttributes._cmdLineParams
     ).add({
       short: 'm',  long: 'models', param: 'modelsList', defaultValue: '*',
       help: 'Comma separated model names for DDL generation. If -e specified this options is ignored'
     }).add({
       short: 'e',  long: 'entities', param: 'entitiesList', defaultValue: '*',
       help: 'Comma separated entity names list for DDL generation'
     }).add({
       short: 'out',  long: 'out', param: 'outputPath', defaultValue: process.cwd(),
       help: 'Folder to output generated DDLs (one file per connection)'
     }).add({
       short: 'autorun',  long: 'autorun', defaultValue: false,
       help: 'execute DDL statement after generation. BE CAREFUL! DO NOT USE ON PRODUCTION'
     })
     let passedOptions = paramsDescription.parseVerbose({}, true)

 *
 * @author pavel.mash
 * @module @unitybase/base/options
 */

// [{short: 'u', long: 'user', param: 'userName', defaultValue: true, searchInEnv: true, help: 'A user name for server connection'}]
const _ = require('lodash')

/**
 * @class
 * @param commandName
 * @param commandDescription
 * @param {String} [cli='ub'] An executable used to execute a command `commandName`. For example: `ubcli`
 * @constructor
 */
function Options (commandName, commandDescription, cli) {
  this.commandName = commandName || ''
  this.commandDescription = commandDescription || ''
  this.cli = cli
  this.options = []
}

/**
 * @typedef {Object} Option
 * @property {String} short - a short option name
 * @property {String} long - a long option name. This name are used in `parse` result
 * @property {String} [param] - if parameter has a value - help string for a parameter name `-short param`
 * @property {*} [defaultValue] - a default value for a property. For a string properties what allow empty value set it to `*`
 * @property {Boolean} [searchInEnv=false] - if property do not passed as a cmd line switch then
 *    perform search of `UB_`+long.toUpperCase() in environment variables
 * @property {String} help - a help string for a `usage()` call
 */
/**
 * Add a option(s) definition.
 * @param {Option|Array.<Option>} otherOptions
 * @return {Options}
 */
Options.prototype.add = function add (otherOptions) {
  if (Array.isArray(otherOptions)) {
    this.options = this.options.concat(otherOptions)
  } else {
    this.options.push(otherOptions)
  }
  return this
}

/**
 *
 * Parse a command line & env variables for a options and create a configuration object.
 * Return `undefined` in case options is not valid or a object with keys - options.long & values
 * @param {Object} [defaults] Override for a command line attributes. If any - this one will be used
 * @param {Array} [errors] If passed will bw filled by a errors in passed parameters
 */
Options.prototype.parse = function parse (defaults, errors) {
  let result = Object.assign({}, defaults)
  // [{short: 'u', long: 'user', param: 'userName', defaultValue: true, searchInEnv: true, help: 'A user name for server connection'}]
  let valid = true
  this.options.forEach(function (option) {
    let val, t
    if (!result.hasOwnProperty(option.long)) { // not passed in defaults
      if (option.param) { // option with parameter `-http register`
        val = switchValue(option.short)
        if (typeof val === 'undefined') {
          val = switchValue(option.long)
        }
        if ((typeof val === 'undefined') && option.searchInEnv) {
          val = process.env['UB_' + option.long.toUpperCase()]
        }
      } else { // boolean option without parameter `-createDB`
        if (switchIndex(option.short) !== -1) {
          val = true
        } else if (switchIndex(option.long) !== -1) {
          val = true
        } else if (option.searchInEnv) {
          t = process.env['UB_' + option.long.toUpperCase()]
          if (typeof t !== 'undefined') {
            val = (t === 'true') || (t === 'TRUE')
          }
        }
      }
      if ((typeof val === 'undefined')) {
        val = option.defaultValue
      }
      if ((typeof val === 'undefined')) {
        valid = false
        if (errors) {
          errors.push('expected parameter "' + option.long + '" not found')
        }
      } else {
        result[option.long] = (val === '*' ? '' : val)
      }
    }
  })
  return valid ? result : undefined
}

/**
 * In case `-help` or '-?' command line switch found or passed options not match a options set
 * will output a usage help to console and return `undefined`, else - return a parsed options
 *
 * @param {Object} [defaults] - Override passed parameter values by this one
 * @param {Boolean} [outputParsed=false] output a parsed parameters to a log
 */
Options.prototype.parseVerbose = function parseVerbose (defaults, outputParsed) {
  let result
  let errors = []
  if (switchIndex('?') !== -1 || switchIndex('help') !== -1) {
    console.log(this.usage())
  } else {
    result = this.parse(defaults, errors)

    if (!result) console.log(this.usage())
    if (errors.length) {
      console.error('\nInvalid usage')
      console.error('\t' + errors.join('\n\t'))
    }
    if (outputParsed) {
      console.info('Run a command "%s" using %j', this.commandName, result)
    }
  }
  return result
}

Options.prototype.howParamsAppearInCommandLine = function () {
  let res = []
  this.options.forEach(function (option) {
    let elm = '-' + option.short + (option.param ? ' ' + option.param : '')
    if (option.defaultValue) elm = '[' + elm + ']'
    res.push(elm)
  })
  return res.join('  ')
}

/**
 * Output a usage info to console
 */
Options.prototype.usage = function usage () {
  const PARAM_IDENT = 15

  if (this.commandDescription) {
    console.info('\n' + this.commandDescription)
  }
  console.info(`\n${this.cli} ${this.commandName} ` + this.howParamsAppearInCommandLine())
  console.info('\nwhere:')
  let envs = []
  let res = []
    // create a parameters description
  this.options.forEach(function (option) {
    let elm = '-' + option.short
    if (option.short !== option.long) elm += ' | ' + option.long
    if (option.searchInEnv) elm += '*'
    elm += ' '.repeat(elm.length > PARAM_IDENT - 1 ? 1 : PARAM_IDENT - elm.length) + option.help
    res.push(elm)
    if (typeof option.defaultValue !== 'undefined') {
      res.push(' '.repeat(PARAM_IDENT + 5) + 'Default: ' + ((option.defaultValue === '') ? '""' : option.defaultValue))
    }
    if (option.searchInEnv) {
      envs.push('UB_' + option.long.toUpperCase())
    }
  })
  res = '  ' + res.join('\n  ')
  if (envs.length) {
    res += '\n\n* will lookup a environment variable in case switch omitted: ' + JSON.stringify(envs)
  }
  return res
}

/**
 * Create a new options definition.
 * @example

 const cmdLineOpt = require('cmd/options')
 let paramsDescription = cmdLineOpt.describe('cmd/createStore',
   'Create internal store structure (folders) for specifies FileSystem store'
 ).add({
   short: 'cfg',  long: 'cfg', param: 'serverConfig', defaultValue: 'ubConfig.json',
   help: 'Server config'
 }).add({
   short: 'store',  long: 'store', param: 'storesList', defaultValue: '*',
   help: 'Comma separated blob stores list'
 })
 let options = paramsDescription.parseVerbose({}, true);

 * @param {String} commandName Name of a command then executed from a command line
 * @param {String} [commandDescription] Command description for help (-help switch)
 * @param {String} [cli] Command line interpretator
 * @return {Options}
 */
exports.describe = function describe (commandName = '', commandDescription = '', cli = 'ub') {
  return new Options(commandName, commandDescription, cli)
}

/**
 * Determines whether a switchName was passed as a command-line argument to the application
 * Switch may be specified in the following ways on the command line:
 *      -switchName
 *      or
 *      /switchName
 * @param switchName
 * @returns {Number} switch index if found or -1 otherwise
 */
exports.switchIndex = function switchIndex (switchName) {
  let res = process.argv.indexOf('-' + switchName)
  return (res === -1) ? process.argv.indexOf('/' + switchName) : res
}
const switchIndex = exports.switchIndex
/**
 * Determines whether a switchName was passed as a command-line argument to the application and have VALUE
 * Switch values may be specified in the following ways on the command line:
 *      -switchName Value
 *      or
 *      /switchName Value
 * @param switchName
 * @returns {String|undefined} switch value or `undefined` in case switch not found or switch not have value
 */
exports.switchValue = function switchValue (switchName) {
  let idx = switchIndex(switchName) + 1
  let val
  return (idx && (val = process.argv[idx]) && val.charAt !== '-' && val.charAt !== '/') ? process.argv[idx] : undefined
}
const switchValue = exports.switchValue
