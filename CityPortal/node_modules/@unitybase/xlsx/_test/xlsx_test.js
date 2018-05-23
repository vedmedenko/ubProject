'use strict'

var me = xlsx_test
me.entity.addMethod('test')

/**
 * @param {ubMethodParams} ctxt null in current REST method realisation!
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
me.test = function (ctxt, req, resp) {
  console.debug('Call JS method: xlsx_test.test')
  // auth by url:  http://localhost:888/m3ora/rest/test?&session_signature=00df33ef
  try {
    var wb = Ext.create(XLSX.csWorkbook)
    wb.useSharedString = false
    var defFont = wb.style.fonts.add({code: 'def', name: 'Calibri', fontSize: 11, scheme: 'minor' })
    var borderFull = wb.style.borders.add({left: {style: 'thin'}, right: {style: 'thin'}, top: {style: 'thin'}, bottom: {style: 'thin'} })

    var fstyle = wb.style.getStyle({font: defFont})
    var fstyleborderFull = wb.style.getStyle({font: defFont, border: borderFull})
    // this.style.fonts.named.def
    var ws = wb.addWorkSheet({})
    var columnTemplate = [
      { column: 1, style: fstyle },
      { column: 3, style: fstyle },
      { column: 4, style: fstyleborderFull }
    ]
    ws.addRow([{value: 'test'}, {value: '2'}, {value: 256}], columnTemplate)
    ws.addRow([{value: 'test'}, {value: '2'}, {value: 256}], columnTemplate)
    ws.addRow([{value: 'test'}, {value: '2'}, {value: 256}], columnTemplate)

    var data = wb.render()
    writeFile('D:\\m3\\Work\\xlsx\\server.xlsx', data, false)
    // resp.writeBinary(data);
    resp.writeBinaryBase64(btoa(data))
    resp.writeEnd('')
    resp.writeHead('Content-type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    resp.statusCode = 200
  } catch (error) {
    console.error('@@@@@@@@@@@@@@@err Test')
    if (error) {
      console.error(error.message)
      console.error(error.name)
      console.error(error.stack)
    }
    resp.statusCode = 404
  }
}
