/**
 * @classdesc
 * File store with automatic conversion MS Word, MS Excel and MS Power Point documents into \*.pdf format.
 *
 * Require MS Office installed on the server - see <a href="https://enviance.softline.kiev.ua/confluence/pages/viewpage.action?pageId=65274525#Installation(requirements)-UsingMicrosoftWordasservice"> requirement </a>
 *
 * @class
 * @extends UB.virtualStores.fileVirtual
 * @singleton
 */
UB.virtualStores.fileVirtualWritePDF = Object.create(UB.virtualStores.fileVirtual)
/**
 * Save content to temp store and convert it to \*.pdf if content is MS Word, MS Excel or MS Power Point document.
 * If file has been converted then original file and original \*.ubfti file is in the same temp directory path with
 * the same name but with \*.orig extension
 *
 * See {@link UB.virtualStores.fileVirtual#saveContentToTempStore} for details
 */
UB.virtualStores.fileVirtualWritePDF.saveContentToTempStore = function (handler) {
  var
    word2Pdf = function (message) {
      var wdExportFormatPDF = 17,
        w = require('UBComBridge').createCOMObject('Word.Application'),
        winApi = require('winApi'),
        winCaption = createGuid(),
        ffi_winCaption = new winApi.types.PWideChar(),
        ffi_processID = new winApi.types.PDWORD(1)

      w.caption = winCaption
      ffi_winCaption.setStr(winCaption)
      winApi.user32.GetWindowThreadProcessId(winApi.user32.FindWindowW(winApi.nil, ffi_winCaption), ffi_processID)
      if (ffi_processID.get() === 0) throw new Error(winApi.kernel32.GetLastError())

      postMessage({processID: ffi_processID.get()})

      w.DisplayAlerts = 0
      w.CheckLanguage = false
      w.Options.CheckSpellingAsYouType = false

      var doc = w.Documents.Open({
        filename: message.inFileName,
        ConfirmConversions: false,
        readonly: true,
        AddToRecentFiles: false,
        Visible: false,
        NoEncodingDialog: true,
        Revert: true,
        OpenAndRepair: true
      })
      doc.ExportAsFixedFormat({
        ExportFormat: wdExportFormatPDF,
        OutputFileName: message.outFileName
      })
      doc.close({SaveChanges: false})
      doc = null
      w.Quit()
      w = null
      postMessage({done: true})
      terminate()
    },
    excel2Pdf = function (message) {
      var
        xlTypePDF = 0, xlQualityStandard = 0,
        e = require('UBComBridge').createCOMObject('Excel.Application'),
        wb,
        winApi = require('winApi'),
        ffi_processID = new winApi.types.PDWORD(1)
      winApi.user32.GetWindowThreadProcessId(e.Hwnd, ffi_processID)
      postMessage({processID: ffi_processID.get()})
      wb = e.Workbooks.Open(message.inFileName)
      wb.ExportAsFixedFormat({
        Type: xlTypePDF,
        Filename: message.outFileName,
        Quality: xlQualityStandard,
        IncludeDocProperties: true,
        IgnorePrintAreas: false,
        OpenAfterPublish: false
      })
      wb.close(false)
      wb = null
      e.quit()
      e = null
      postMessage({done: true})
      terminate()
    },
    pp2Pdf = function (message) {
      var ppSaveAsPDF = 32,
        p = require('UBComBridge').createCOMObject('PowerPoint.Application'),
        winApi = require('winApi'),
        winCaption = createGuid(),
        ffi_winCaption = new winApi.types.PWideChar(),
        ffi_processID = new winApi.types.PDWORD(1)
      p.DisplayAlerts = 0

      p.caption = winCaption
      ffi_winCaption.setStr(winCaption)
      winApi.user32.GetWindowThreadProcessId(winApi.user32.FindWindowW(winApi.nil, ffi_winCaption), ffi_processID)
      if (ffi_processID.get() === 0) throw new Error(winApi.kernel32.GetLastError())

      postMessage({processID: ffi_processID.get()})

      var pr = p.Presentations.Open({
        filename: message.inFileName,
        readonly: true,
        WithWindow: false
      })
      pr.SaveAs({
        Filename: message.outFileName,
        FileFormat: ppSaveAsPDF
      })
      pr.close()
      pr = null
      p.quit()
      p = null
      postMessage({done: true})
      terminate()
    }

  var
    convertors = {
      'application\/msword': word2Pdf,
      'application\/vnd.openxmlformats-officedocument.wordprocessingml.document': word2Pdf,
      'application\/vnd.ms-excel': excel2Pdf,
      'application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet': excel2Pdf,
      'application/vnd.ms-powerpoint': pp2Pdf,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': pp2Pdf
    },
    fs = require('fs'),
    path = require('path'),
    fn = this.saveContentToTempFileStore(handler),
    fnUbfti = fn + '.ubfti',
    convertor = convertors[handler.content.ct]
  if (convertor) {
    var
      origFn = fn + '.orig',
      origFnUbfti = fnUbfti + '.orig'
    console.debug('fileVirtualWritePDF: Start transformation of file', origFn, 'to PDF')
    moveFile(fn, origFn)
    moveFile(fnUbfti, origFnUbfti)
    var
      Worker = require('@unitybase/base').Worker,
      w = new Worker({
        onmessage: convertor,
        onerror: function (message, error) { postMessage({convertFailed: true}); terminate() },
        message: {
          inFileName: origFn,
          outFileName: fn
        }
      }),
      mes,
      processID,
      processHandle,
      winApi = require('winApi'),
      PROCESS_ALL_ACCESS = 0x1FFFFF
    if (mes = w.waitMessage(5000, 100)) {
      if (mes.convertFailed)
              { throw new Error('<<<convertationToPDFAborted>>>') }
      processID = mes.processID
    }
    if ((mes = w.waitMessage(20000, 1000)) && (mes.done)) {
      console.debug('fileVirtualWritePDF: file', fn, 'successfully converted to PDF. Saving...')
      moveFile(fn + '.pdf', fn)
      handler.request.loadBodyFromFile(fn)
      handler.loadContentFromRequest(0)
      handler.content.fName = handler.content.fName.slice(0, -path.extname(handler.content.fName).length) + '.pdf'
      handler.content.origName = handler.content.fName.slice(0, -path.extname(handler.content.origName).length) + '.pdf'
      handler.content.ct = 'application/pdf'
      handler.content.isDirty = true
      fs.writeFileSync(fnUbfti, handler.content)
      console.debug('fileVirtualWritePDF: file', fn, 'converted to PDF and saved')
      return fn
    }
    if (processID) {
      processHandle = winApi.kernel32.OpenProcess(PROCESS_ALL_ACCESS, 0, processID)
      if (processHandle === 0) {
        console.error(winApi.kernel32.GetLastError())
      }
      winApi.kernel32.TerminateProcess(processHandle, 100)
      winApi.kernel32.CloseHandle(processHandle)
    }
    w.terminate()
    throw new Error('<<<convertationToPDFAborted>>>')
  } else {
    console.debug('fileVirtualWritePDF: SKIP transformation of file', origFn, 'to PDF - unknown format')
  }
}
