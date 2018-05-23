/* global tinymce */

tinymce.PluginManager.add('templateEditor', function (editor, url) {

  function templateProps () {
    let dom = editor.dom
    let data = {}
    let trElm = dom.getParent(editor.selection.getStart(), 'tr')
    if (!trElm) {
      trElm = dom.getParent(editor.selection.getStart(), 'p') ||
        dom.getParent(editor.selection.getStart(), 'div') ||
        editor.selection.getStart()
    }
    if (!trElm) return

    if (trElm.previousSibling && trElm.previousSibling.nodeName === '#comment' &&
      trElm.previousSibling.nodeValue && /^{{[#\/]{0,1}?\w*?}}$/.test(trElm.previousSibling.nodeValue)
    ) {
      let match = trElm.previousSibling.nodeValue.match(/^{{[#\/]{0,1}?(\w*?)}}$/)
      if (match && match.length > 1) {
        data.templateType = match[1]
      }
    }

    editor.windowManager.open({
      title: 'Section',
      data: data,
      body: {
        type: 'form',
        layout: 'flex',
        direction: 'column',
        labelGapCalc: 'children',
        padding: 0,
        items: [
          {
            type: 'form',
            labelGapCalc: false,
            padding: 0,
            layout: 'grid',
            columns: 2,
            items: [
              {type: 'textbox', label: 'Key', name: 'templateType'},
              {type: 'checkbox', label: 'Remove section', name: 'removeSection'}
            ]
          }
        ]
      },
      onsubmit: function () {
        data = this.toJSON()

        editor.undoManager.transact(function () {
          let templateType = data.templateType ? data.templateType.trim() : null
          let prevT, nextT
          let doRemove = (data.removeSection === true) || !templateType
          if (doRemove) {
            editor.dom.removeClass(trElm, 'tinymce_templated')
            trElm.dataset['iterateOver'] = ''
            if (trElm.previousSibling && trElm.previousSibling.nodeName === '#comment') {
              prevT = trElm.previousSibling.nodeValue
            }
            if (trElm.nextSibling && trElm.nextSibling.nodeName === '#comment') {
              nextT = trElm.nextSibling.nodeValue
            }
            if (prevT && nextT && (prevT.substr(3) === nextT.substr(3))) { // compare keys by removing `{{#` prefix
              trElm.parentNode.removeChild(trElm.previousSibling)
              trElm.parentNode.removeChild(trElm.nextSibling)
            }
          } else {
            editor.dom.setAttribs(trElm, {
              templateType: templateType
            })
            editor.dom.addClass(trElm, 'tinymce_templated')
            trElm.dataset['iterateOver'] = templateType

            if (templateType) {
              trElm.insertAdjacentHTML('beforebegin', '<!--{{#' + templateType + '}}-->')
              trElm.insertAdjacentHTML('afterend', '<!--{{/' + templateType + '}}-->')
            }
          }
        })
        editor.save()
      }
    })
  }

  editor.addMenuItem('rowTemplate', {
    text: 'Section',
    shortcut: 'Ctrl+Alt+T',
    icon: 'row-template-icon',
    // tooltip: 'Add/remove template',
    context: 'edit',
    onPostRender: function () {},
    onclick: templateProps
  })

  editor.addButton('rowTemplate', {
    text: 'Section',
    shortcut: 'Ctrl+Alt+T',
    icon: 'row-template-icon',
    onclick: templateProps
  })

  editor.addButton('pageOrientation', {
    type: 'menubutton',
    title: 'Page orientation',
    text: 'Page orientation',
    menu: [
      {
        text: 'Portrait',
        onclick: function () {
          editor.settings.reportEditor.setOrientation('portrait')
        }
      },
      {
        text: 'Landscape',
        onclick: function () {
          editor.settings.reportEditor.setOrientation('landscape')
        }
      }
    ]
  })

  editor.on('init', function () {
    editor.dom.addStyle('.tinymce_templated{border-style: dashed; border-width: 2px; border-color: #8bd689;}')
    // FIXME - this broke tr: editor.dom.addStyle('.tinymce_templated:after{content: attr(data-iterate-over); position: relative; top: -0.8em; color: #8bd689;}')

    const alignElements = 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img'
    editor.formatter.register({
      // Change alignment formats to use the deprecated align attribute
      alignleftTe: {selector: alignElements, styles: {align: 'left'}},
      aligncenterTe: {selector: alignElements, styles: {align: 'center'}},
      alignrightTe: {selector: alignElements, styles: {align: 'right'}},
      alignjustifyTe: {selector: alignElements, styles: {align: 'justify'}}
    })
  })
  editor.on('dblclick', templateProps)
})

