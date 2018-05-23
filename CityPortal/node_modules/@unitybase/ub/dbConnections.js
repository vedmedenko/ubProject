/*
 * Created by v.orel on 22.12.2016.
 */
const binding = process.binding('ub_dbConnection')
const bindingDatabases = binding.databases
const QueryString = require('querystring')
const databases = {}
const dbIndexSymbol = Symbol('dbIndex')
const chDblQuote = 34
const chQuote = 39
const chColon = 58
const chLRoundBrac = 40
const chRRoundBrac = 41
const chLBrac = 91
const chZero = 48
const chNine = 57
const chPlus = 43
const chMinus = 45
const chQuestionMark = 63
const chPoint = 46
const chN = 110
const chU = 117
const chL = 108
const chEGr = 69
const chELw = 101
const chSpace = 32
const chLF = 10
const chCR = 13
/**
 * @typedef {Object} parseSQLResult
 * @property {string} parsedSql
 * @property {Array} parsedParams
 */

/**
 * Class for database access. Databases are defined in config file
 */
class TubDatabase_ {
  /**
   * @private
   * @param {number} index
   */
  constructor (index) {
    /**
     * @private
     * @property dbIndexSymbol
     */
    Object.defineProperty(this, dbIndexSymbol, {value: index})
  }
  /**
   * Is database in transaction
   * @returns {boolean}
   */
  get inTransaction () {
    return binding.inTransaction(this[dbIndexSymbol])
  }
  /**
   * Start transaction. If transaction is already started return false
   * @returns {boolean}
   */
  startTransaction () {
    return binding.startTransaction(this[dbIndexSymbol])
  }
  /**
   * Commit transaction. If transaction is not started return false
   * @returns {boolean}
   */
  commit () {
    return binding.commit(this[dbIndexSymbol])
  }
  /**
   * Rollback transaction. If transaction is not started return false
   * @returns {boolean}
   */
  rollback () {
    return binding.rollback(this[dbIndexSymbol])
  }
  /**
   * Run select sql and return result
   * @param {string} sql
   * @param {Object} params
   * @returns {string}
   */
  run (sql, params) {
    const {parsedSql, parsedParams} = this.parseSQL(sql, params)
    return binding.run(this[dbIndexSymbol], parsedSql, parsedParams)
  }
  /**
   * Execute sql
   * @param {string} sql
   * @param {Object} params
   * @returns {boolean}
   */
  exec (sql, params) {
    const {parsedSql, parsedParams} = this.parseSQL(sql, params)
    return binding.exec(this[dbIndexSymbol], parsedSql, parsedParams)
  }
  /**
   * Generate ID for entity
   * @param {string} entity
   * @returns {number}
   */
  genID (entity) {
    return binding.genID(entity)
  }

  /**
   * @private
   * @param {string} sql
   * @param {Object} params
   * @returns {parseSQLResult}
   */
  parseSQL (sql, params) {
    const parsedParams = []
    const paramPositions = []
    let unnamedParamsCount = 0
    params = params || {}
    for (let i = 0, ch = sql.charCodeAt(0), L = sql.length; i < L; ch = sql.charCodeAt(++i)) {
      if (ch === chDblQuote) {
        while ((i < L) && (sql.charCodeAt(++i) !== chDblQuote)) {}
      } else if (ch === chQuote) {
        while ((i < L) && (sql.charCodeAt(++i) !== chQuote)) {}
      } else if (ch === chColon) {
        // while ((i< L) && (sql.charCodeAt(++i) !== chQuote)) {}
        if ((ch = sql.charCodeAt(++i)) === chColon) {
        // MSSQL ALTER AUTHORIZATION ON database::testdb
        } else if (ch === chLRoundBrac) {
          // syn inline :(value):
          let inlineParamValue, paramStart, paramEnd
          ch = sql.charCodeAt(++i)
          paramStart = i
          if ((ch === chQuote) || (ch === chDblQuote)) {
            const quote = ch
            let curPosition = i + 1
            inlineParamValue = []
            while (i < L) {
              ch = sql.charCodeAt(++i)
              if (ch === quote) {
                inlineParamValue.push(sql.slice(curPosition, i))
                if ((ch = sql.charCodeAt(++i)) === quote) {
                  // allow double quotes inside string
                  curPosition = i
                } else {
                  break
                }
              }
            }
            inlineParamValue = inlineParamValue.join('')
          } else if ((ch === chPlus) || (ch === chMinus) || ((ch >= chZero) && (ch <= chNine))) {
            while (((ch = sql.charCodeAt(++i)) >= chZero) && (ch <= chNine)) {}
            if (ch === chPoint) {
              while (((ch = sql.charCodeAt(++i)) >= chZero) && (ch <= chNine)) {}
            }
            if ((ch === chEGr) || (ch === chELw)) {
              ch = sql.charCodeAt(++i)
              if ((ch === chPlus) || (ch === chMinus)) {
                ch = sql.charCodeAt(++i)
              }
              while (((ch = sql.charCodeAt(++i)) >= chZero) && (ch <= chNine)) {}
            }
            inlineParamValue = Number.parseFloat(sql.slice(paramStart, paramEnd))
          } else if (ch === chLBrac) {
            let arraySearchPosition = paramStart
            while (i < L) {
              i = sql.indexOf(']):', arraySearchPosition)
              i++
              try {
                inlineParamValue = JSON.parse(sql.slice(paramStart, i))
              } catch (e) {
                arraySearchPosition = i
              }
              if (inlineParamValue !== undefined) {
                if (inlineParamValue.length === 0) {
                  throw new Error('Empty array binding')
                }
                const requiredType = typeof inlineParamValue[0]
                if ((requiredType !== 'number') && (requiredType !== 'string')) {
                  throw new Error('Only String or Int64 array binding allowed')
                }
                for (let element of inlineParamValue) {
                  if (typeof element !== requiredType) {
                    throw new Error(`Array binding ${requiredType} type required`)
                  }
                }
                break
              }
            }
          } else if (ch === chN) {
            if (((ch = sql.charCodeAt(++i)) === chU) && ((ch = sql.charCodeAt(++i)) === chL) && ((ch = sql.charCodeAt(++i)) === chL)) {
              ch = sql.charCodeAt(++i)
              inlineParamValue = null
            }
          }
          paramEnd = i
          while ((ch = sql.charCodeAt(i)) <= chSpace) {
            i++
          }

          if ((ch !== chRRoundBrac) || ((ch = sql.charCodeAt(++i)) !== chColon)) {
            throw new Error('Error parsing SQL')
          }
          if (inlineParamValue === undefined) {
            throw new Error('Error parsing inline parameter')
          }
          parsedParams.push(inlineParamValue)
          paramPositions.push({paramStart: paramStart - 2, paramEnd: paramEnd + 2})
        } else {
          // UB :paramName: - replace by ? and add a named param to AOutParams
          const paramStart = i
          while ((ch = sql.charCodeAt(++i)) !== chColon) {}
          const paramEnd = i
          const paramName = sql.slice(paramStart, paramEnd)
          const paramValue = params[paramName]
          if (paramValue === undefined) {
            throw new Error(`Param ${paramName} not found`)
          } else {
            parsedParams.push(paramValue)
          }
          paramPositions.push({paramStart: paramStart - 1, paramEnd: paramEnd + 1})
        }
      } else if (ch === chQuestionMark) {
        const unnamedParamValue = params[unnamedParamsCount++]
        if (unnamedParamValue === undefined) {
          throw new Error(`Param ${unnamedParamsCount - 1} not found`)
        } else {
          parsedParams.push(unnamedParamValue)
        }
      } else if (ch === chMinus) {
        if ((ch = sql.charCodeAt(++i)) === chMinus) {
        // comments
          while ((i < L) && ((ch = sql.charCodeAt(++i)) !== chLF) && (ch !== chCR)) {}
        }
      }
    }
    let startPos = 0
    let sqlParts = []
    for (let curParam = 0, L = paramPositions.length; curParam < L; curParam++) {
      sqlParts.push(sql.slice(startPos, paramPositions[curParam].paramStart))
      sqlParts.push('?')
      startPos = paramPositions[curParam].paramEnd
    }
    if (sqlParts.length === 0) {
      return {parsedSql: sql, parsedParams: parsedParams}
    } else {
      sqlParts.push(sql.slice(startPos, sql.length))
      return {parsedSql: sqlParts.join(''), parsedParams: parsedParams}
    }

  }
}

for (let index in bindingDatabases) {
  Object.defineProperty(databases, bindingDatabases[index], {value: new TubDatabase_(Number.parseInt(index)), enumerable: true})
}
/**
 * Databases of application
 * @memberOf App
 * @property databases_
 * @type {Object<string,TubDatabase_>}
 */
App.databases_ = databases

/**
 * Default database of application
 * @memberOf App
 * @property defaultDatabase_
 * @type {TubDatabase_}
 */
App.defaultDatabase_ = databases[binding.defaultDb]

/**
 * Run sql on server side
 * Allowed from localIP
 * Connection name is in `connection` uri parameter (or default connection if not set)
 * If HTTP method is GET then allowed inline parameters only
 *   sql is in `sql` uri parameter
 * If Http method is not GET then
 *   sql is in request body
 *   parameters is uri parameters except `connection`
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 * @private
 */
function runSQL_ (req, resp) {
  if (App.localIPs.indexOf(Session.callerIP) === -1) {
    throw new Error(`Only local execution allowed. Caller remoteIP="${Session.callerIP}"`)
  }

  let database,
    sql,
    sqlParams

  if (Object.keys(App.databases_).length === 0) {
    throw new Error('Application dose not support connections')
  }

  const parameters = QueryString.parse(req.parameters, null, null)
  const connectionName = parameters.connection || parameters.CONNECTION
  if (connectionName) {
    database = App.databases_[connectionName]
  } else {
    database = App.defaultDatabase_
  }

  if (!database) { throw new Error('Unknown connection name') }

  if (req.method === 'GET') {
    sql = parameters.sql
    sqlParams = null
  } else {
    sql = req.read()
    delete parameters.connection
    sqlParams = parameters
  }

  if (!sql) { throw new Error('Empty SQL statement passed') }

  let upperStmt = sql.toUpperCase()
  if (upperStmt.startsWith('SELECT') || upperStmt.startsWith('PRAGMA')) {
    let result = database.run(sql, sqlParams)
    resp.writeEnd(result)
  } else {
    database.exec(sql, sqlParams)
    resp.writeEnd('[]')
  }
  resp.statusCode = 200
}

App.registerEndpoint('runSQL_', runSQL_, true)

