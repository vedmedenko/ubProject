/**
 * @license
 * Licensed under the <a href="http://www.opensource.org/licenses/mit-license.php">MIT license</a>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * Author Greg Kindel (twitter @gkindel), 2013
 */
 /**
 * CSV-JS - A Comma-Separated Values parser for JS
 *
 * Built to rfc4180 standard, with options for adjusting strictness:
 *
 *    - optional carriage returns for non-microsoft sources
 *    - automatically type-cast numeric an boolean values
 *    - relaxed mode which: ignores blank lines, ignores gargabe following quoted tokens, does not enforce a consistent record length
 *
 * Adopted for UnityBase by pavel.mash
 *
 * Usage sample:
 *
 *       var csv = require('@unitybase/base').csv;
 *       // simple
 *       var rows = csv.parse('one,two,three\nfour,five,six')
 *       // rows equals [["one","two","three"],["four","five","six"]]
 *       // or read from file system
 *       var fs = require('fs'), f = fs.readFileSync('c:/csv.txt');
 *       var rows = csv.parse(f);
 *       for( var i =0; i < rows.length; i++){
 *          console.log(rows[i]);
 *       }
 *
 * @module @unitybase/base/csv1
 */

var QUOTE = '"',
  CR = '\r',
  LF = '\n',
  COMMA = ';',
  SPACE = ' ',
  TAB = '\t'

// implemented as a singleton because JS is single threaded
var CSV = {}
CSV.RELAXED = false
CSV.IGNORE_RECORD_LENGTH = false
CSV.IGNORE_QUOTES = false
CSV.LINE_FEED_OK = true
CSV.CARRIAGE_RETURN_OK = true
CSV.DETECT_TYPES = true
CSV.IGNORE_QUOTE_WHITESPACE = true
CSV.DEBUG = false
CSV.QUOTE = QUOTE
CSV.COMMA = COMMA

CSV.ERROR_EOF = 'UNEXPECTED_END_OF_FILE'
CSV.ERROR_CHAR = 'UNEXPECTED_CHARACTER'
CSV.ERROR_EOL = 'UNEXPECTED_END_OF_RECORD'
CSV.WARN_SPACE = 'UNEXPECTED_WHITESPACE' // not per spec, but helps debugging

// states
var PRE_TOKEN = 0,
  MID_TOKEN = 1,
  POST_TOKEN = 2,
  POST_RECORD = 4
/**
 * <a href="http://www.ietf.org/rfc/rfc4180.txt">rfc4180</a> standard csv parse
 * with options for strictness and data type conversion
 * By default, will automatically type-cast numeric an boolean values.
 *
 * @method parse
 * @param {String} str A CSV string
 * @param {String} [comma=";"] column separator
 * @return {Array} An array records, each of which is an array of scalar values.
 */
CSV.parse = function (str, comma) {
  if (comma) {
    CSV.COMMA = comma
  }
  var result = CSV.result = []
  CSV.offset = 0
  CSV.str = str
  CSV.record_begin()

  CSV.debug('parse()', str)

  var c
  while (1) {
        // pull char
    c = str[CSV.offset++]
    CSV.debug('c', c)

        // detect eof
    if (c == null) {
      if (CSV.escaped)
              { CSV.error(CSV.ERROR_EOF) }

      if (CSV.record) {
        CSV.token_end()
        CSV.record_end()
      }

      CSV.debug('...bail', c, CSV.state, CSV.record)
      CSV.reset()
      break
    }

    if (CSV.record == null) {
            // if relaxed mode, ignore blank lines
      if (CSV.RELAXED && (c == LF || c == CR && str[CSV.offset + 1] == LF)) {
        continue
      }
      CSV.record_begin()
    }

        // pre-token: look for start of escape sequence
    if (CSV.state == PRE_TOKEN) {
      if ((c === SPACE || c === TAB) && CSV.next_nonspace() == CSV.QUOTE) {
        if (CSV.RELAXED || CSV.IGNORE_QUOTE_WHITESPACE) {
          continue
        }
        else {
                    // not technically an error, but ambiguous and hard to debug otherwise
          CSV.warn(CSV.WARN_SPACE)
        }
      }

      if (c == CSV.QUOTE && !CSV.IGNORE_QUOTES) {
        CSV.debug('...escaped start', c)
        CSV.escaped = true
        CSV.state = MID_TOKEN
        continue
      }
      CSV.state = MID_TOKEN
    }

        // mid-token and escaped, look for sequences and end quote
    if (CSV.state == MID_TOKEN && CSV.escaped) {
      if (c == CSV.QUOTE) {
        if (str[CSV.offset] == CSV.QUOTE) {
          CSV.debug('...escaped quote', c)
          CSV.token += CSV.QUOTE
          CSV.offset++
        }
        else {
          CSV.debug('...escaped end', c)
          CSV.escaped = false
          CSV.token_escaped = true
          CSV.state = POST_TOKEN
        }
      }
      else {
        CSV.token += c
        CSV.debug('...escaped add', c, CSV.token)
      }
      continue
    }

        // fall-through: mid-token or post-token, not escaped
    if (c == CR) {
      if (str[CSV.offset] == LF)
              { CSV.offset++ }
      else if (!CSV.CARRIAGE_RETURN_OK)
              { CSV.error(CSV.ERROR_CHAR) }
      CSV.token_end()
      CSV.record_end()
    }
    else if (c == LF) {
      if (!(CSV.LINE_FEED_OK || CSV.RELAXED))
              { CSV.error(CSV.ERROR_CHAR) }
      CSV.token_end()
      CSV.record_end()
    }
    else if (c == CSV.COMMA) {
      CSV.token_end()
    }
    else if (CSV.state == MID_TOKEN) {
      CSV.token += c
      CSV.debug('...add', c, CSV.token)
    }
    else if (c === SPACE || c === TAB) {
      if (!CSV.IGNORE_QUOTE_WHITESPACE)
              { CSV.error(CSV.WARN_SPACE) }
    }
    else if (!CSV.RELAXED) {
      CSV.error(CSV.ERROR_CHAR)
    }
  }
  return result
}

CSV.reset = function () {
  CSV.state = null
  CSV.token = null
  CSV.escaped = null
  CSV.record = null
  CSV.offset = null
  CSV.result = null
  CSV.str = null
}

CSV.next_nonspace = function () {
  var i = CSV.offset
  var c
  while (i < CSV.str.length) {
    c = CSV.str[i++]
    if (!(c == SPACE || c === TAB)) {
      return c
    }
  }
  return null
}

CSV.record_begin = function () {
  CSV.escaped = false
  CSV.record = []
  CSV.token_begin()
  CSV.debug('record_begin')
}

CSV.record_end = function () {
  CSV.state = POST_RECORD
  if (!(CSV.IGNORE_RECORD_LENGTH || CSV.RELAXED)
        && CSV.result.length > 0 && CSV.record.length != CSV.result[0].length) {
    CSV.error(CSV.ERROR_EOL)
  }
  CSV.result.push(CSV.record)
  CSV.debug('record end', CSV.record)
  CSV.record = null
}

CSV.resolve_type = function (token) {
  if (token.match(/^\d+(\.\d+)?$/)) {
    token = parseFloat(token)
  }
  else if (token.match(/^true|false$/i)) {
    token = Boolean(token.match(/true/i))
  }
  else if (token === 'undefined') {
    token = undefined
  }
  else if (token === 'null') {
    token = null
  }
  return token
}

CSV.token_begin = function () {
  CSV.state = PRE_TOKEN
    // considered using array, but http://www.sitepen.com/blog/2008/05/09/string-performance-an-analysis/
  CSV.token = ''
}

CSV.token_end = function () {
  if (CSV.DETECT_TYPES && !CSV.token_escaped) {
    CSV.token = CSV.resolve_type(CSV.token)
  }
  CSV.token_escaped = false
  CSV.record.push(CSV.token)
  CSV.debug('token end', CSV.token)
  CSV.token_begin()
}

CSV.debug = function () {
  if (CSV.DEBUG)
      { console.log(arguments) }
}

CSV.dump = function (msg) {
  return [
    msg, 'at char', CSV.offset, ':',
    CSV.str.substr(CSV.offset - 50, 50)
            .replace(/\r/mg, '\\r')
            .replace(/\n/mg, '\\n')
            .replace(/\t/mg, '\\t')
  ].join(' ')
}

CSV.error = function (err) {
  var msg = CSV.dump(err)
  CSV.reset()
  throw msg
}

CSV.warn = function (err) {
  var msg = CSV.dump(err)
  try {
    console.warn(msg)
    return
  } catch (e) {}

  try {
    console.log(msg)
  } catch (e) {}
}

module.exports = CSV
