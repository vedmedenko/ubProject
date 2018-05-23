/**
 * Thin wrapper around CodeMirror for JS editing.
 * @author UnityBase core team (pavel.mash) on 12.2016
 */
Ext.define('UB.ux.UBCodeMirror', {
  extend: 'Ext.Component',
  mixins: {
    field: 'Ext.form.field.Field'
  },
  statics: {
    editorQTip: [
      '<h5>Helpers</h5>',
      '<ul>' +
      '<li>Ctrl+Q - code templates</li>',
      '<li>Ctrl+Space - code competition</li>',
      '<li>Ctrl+B - Beautify content</li>',
      '</ul>',
      '<h5>Search</h5><ul>',
      '<li>Ctrl-F  - Start searching</li>',
      '<li>Ctrl-G  - Find next</li>',
      '<li>Shift-Ctrl-G - Find previous</li>',
      '<li>Shift-Ctrl-F - Replace</li>',
      '<li>Shift-Ctrl-R - Replace all</li>',
      '<li>Alt-F - Persistent search (dialog does not autoclose, enter to find next, Shift-Enter to find previous)</li>',
      '<li>Alt-G - Jump to line</li>',
      '</ul>',
      '<h5>Edit</h5><ul>',
      '<li>Ctrl-A - Select the whole content of the editor</li>',
      '<li>Ctrl-D - Deletes the whole line under the cursor</li>',
      '<li>Ctrl-Z - Undo the last change</li>',
      '<li>Ctrl-Y - Redo the last undone change</li>',
      '<li>Ctrl-U - Undo the last change to the selection</li>',
      '<li>Alt-Left / Alt-Right - Move the cursor to the start/end  of the line</li>',
      '<li>Tab / Shift + Tab - If something is selected, indent/dedent it</li></ul>'
    ].join('')
  },
  alias: 'widget.ubcodemirror',
  border: 1,
  // html: '<textarea></textarea>',
  codeMirrorInstance: undefined,
  /**
   * @cfg A function(multilinePrefix) what return a code snippets user see if press Ctrl + Q
   * multilinePrefix is a prefix (tabs) to prepend to the multiline snippets (starting from 2-nd)
   *
   * Function must return a array of object as described https://codemirror.net/doc/manual.html#addon_show-hint
   * for exapmle: [{text: 'abra'}, {text: 'cadabra'}]
   */
  codeSnippetsGetter: null,

  /**
   * CodeMirror editor mode ( `javascript` or `yaml` in current implementation)
   */
  editorMode: 'javascript',

  getValue: function () {
    return this.codeMirrorInstance ? this.codeMirrorInstance.getValue() : this.rawValue
  },

  setValue: function (value) {
    this.rawValue = value
    if (this.codeMirrorInstance) {
      this.codeMirrorInstance.setValue('' + value)
      if (this.editorMode !== this.codeMirrorInstance.getOption('mode')) {
        this.codeMirrorInstance.setOption('mode', this.editorMode)
      }
    }
  },

  /**
   * @param {Object} cfg
   * @param {Blob|File} [cfg.blobData]
   * @param {String} [cfg.rawValue]
   * @param {Boolean} [cfg.resetOriginalValue=false] Reset original value if true.
   * @param {Object} [cfg.params] The parameters necessary to obtain the document
   * @returns {Promise}
   */
  setSrc: function (cfg) {
    var me = this
    var blobData = cfg.blobData
    var resetOriginalValue = cfg.resetOriginalValue

    function onDataReady (response) {
      me.setValue(response)
      if (resetOriginalValue) {
        me.resetOriginalValue()
        me.fireEvent('setOriginalValue', response, me)
      }
      return response
    }

    if (cfg.contentType && cfg.contentType.endsWith('yaml')) {
      this.editorMode = 'yaml'
    } else {
      this.editorMode = 'javascript'
    }

    if (blobData) {
      return new Promise(function (resolve, reject) {
        var reader = new window.FileReader()
        reader.addEventListener('loadend', function () {
          resolve(onDataReady(reader.result))
        })
        reader.addEventListener('error', function () {
          reject(onDataReady(reader.error))
        })
        reader.readAsText(blobData)
      })
    } else if (cfg.params) {
      return UB.core.UBService.getDocument(cfg.params)
        .then(function (response) {
          return onDataReady(response)
        })
    } else {
      return Promise.resolve(onDataReady(cfg.rawValue))
    }
  },

  initComponent: function () {
    this.callParent(arguments)
  },

  onShowSnippets: function (cm) {
    var me = this
    if (me.codeSnippetsGetter) {
      cm.showHint({
        hint: function () {
          var cur = cm.getCursor()
          var tabSize = cm.options.tabSize || 2
          var multilinePrefix = (cur.ch / tabSize > 1) ? '\t'.repeat(cur.ch / 2) : ''
          var snippets = me.codeSnippetsGetter(multilinePrefix)
          return {
            list: snippets,
            from: CodeMirror.Pos(cur.line, cur.ch),
            to: CodeMirror.Pos(cur.line, cur.ch)
          }
        }
      })
    }
  },

  doBeautify: function () {
    var me = this
    if (!this.codeMirrorInstance) return

    System.import('js-beautify/js/lib/beautify').then(function (beautify) {
      var txt = me.codeMirrorInstance.getValue()
      txt = beautify.js_beautify(txt, {
        'indent_size': 2,
        'indent_char': ' '
      })
      me.codeMirrorInstance.setValue(txt)
    })
  },

  listeners: {
    render: function doRender () {
      var myElm = this.getEl().dom
      var me = this

      System.import('@unitybase/codemirror-full').then((CodeMirror) => {
        window.CodeMirror = CodeMirror
        CodeMirror.commands.codeSnippets = CodeMirror.showHint
        this.codeMirrorInstance = this.editor = CodeMirror(myElm, {
          mode: this.editorMode,
          value: this.rawValue || '',
          lineNumbers: true,
          lint: _.assign({asi: true}, $App.connection.appConfig.uiSettings.adminUI.linter),
          readOnly: false,
          tabSize: 2,
          highlightSelectionMatches: {annotateScrollbar: true},
          matchBrackets: true,
          foldGutter: true,
          gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
          extraKeys: {
            'Ctrl-Space': 'autocomplete',
            'Ctrl-Q': this.onShowSnippets.bind(this),
            'Ctrl-B': this.doBeautify.bind(this)
          }
        })
        // <i style="position: absolute;right: 15px;" class="fa fa-question fa-lg" aria-hidden="true"></i>
        var help = document.createElement('i')
        help.style = 'position: absolute;right: 15px; z-index: 10000'
        help.className = 'fa fa-question fa-border fa-2x'
        myElm.firstChild.insertBefore(help, myElm.firstChild.firstChild)
        me.editorTip = Ext.create('Ext.tip.ToolTip', {
          target: help,
          html: UB.ux.UBCodeMirror.editorQTip
        })
        me.on('destroy', function () {
          if (this.editorTip) this.editorTip.destroy()
        }, me)
        this.codeMirrorInstance.on('change', function () {
          me.checkChange()
        })
      })
    }
  }
})
