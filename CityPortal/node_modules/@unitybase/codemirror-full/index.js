const CodeMirror = require('codemirror/lib/codemirror')
const JSHINT = require('jshint')
window.JSHINT = JSHINT.JSHINT // for CodeMirror javascript-hint
// fix a lodash 4 compatribility
const _ = require('lodash')
if (!_.contains) _.contains = _.includes.bind(_)
require('codemirror/lib/codemirror.css')
require('codemirror/addon/edit/matchbrackets')
require('codemirror/addon/edit/closebrackets')
require('codemirror/addon/edit/trailingspace')

require('codemirror/addon/fold/foldcode')
require('codemirror/addon/fold/foldgutter')
require('codemirror/addon/fold/foldgutter.css')
require('codemirror/addon/fold/brace-fold')
require('codemirror/addon/fold/xml-fold')
require('codemirror/addon/fold/comment-fold')
require('codemirror/addon/dialog/dialog')

require('codemirror/addon/dialog/dialog.css')
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/yaml/yaml')

require('codemirror/addon/hint/show-hint')
//require('codemirror/addon/hint/show-hint.css')
require('./CodeMirror-show-hint.css') // override a hint z-index to be on top of modal forms
require('codemirror/addon/hint/javascript-hint')

require('codemirror/addon/lint/lint')
// require('codemirror/addon/lint/lint.css') 
require('./CodeMirror-lint.css') // override a tooltip z-index to be on top of modal forms
require('codemirror/addon/lint/javascript-lint')

require('codemirror/addon/search/search')
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/search/jump-to-line')
require('codemirror/addon/scroll/annotatescrollbar')
require('codemirror/addon/search/matchesonscrollbar')
require('codemirror/addon/search/match-highlighter')
require('./CodeMirror-match.css')
require('codemirror/addon/comment/comment')

module.exports = CodeMirror