/*
* Created by xmax on 22.11.2017
*/
const fs = require('fs')
const {
  XLSXWorkbook,
  XLSXStyle
} = require('../index')

function startTest () {
  // Use shared string only if you sure that the number of repeating strings is large. By default all strings are inline
  const wb = new XLSXWorkbook({useSharedString: false})
  // first added font will be default
  let defFont = wb.style.fonts.add({code: 'def', name: 'Calibri', fontSize: 11, scheme: 'minor'})
  let borderFull = wb.style.borders.add({
    left: {style: 'thin'},
    right: {style: 'thin'},
    top: {style: 'thin'},
    bottom: {style: 'thin'}
  })

  // let fillBG = wb.style.fills.add('FFCFE39D')
  let fillBG1 = wb.style.fills.add('fff100')
  // you can write this as
  // let fillBG1 = wb.style.fills.add({fgColor: {rgb: 'fff100'}})

  let alig1 = wb.style.alignments.add({horizontal: 'center', vertical: 'center', wrapText: '1'})
  let formatStyle = wb.style.formats.add('#,##0.000_ ;[Red]\\-#,##0.000\\ ')

  let fstyle = wb.style.getStyle({font: defFont})

  // You can set style parameters as config but it will require additional search costs
  let fstyle1 = wb.style.getStyle({font: {fontSize: 22, name: 'Times New Roman'}, fill: 'FFCFE39D'})

  // It is fastest way put style parts as objects
  let fstyleAligBG = wb.style.getStyle({font: defFont, fill: fillBG1, alignment: alig1, format: formatStyle})
  let fstyleborderFull = wb.style.getStyle({font: defFont, border: borderFull})

  let ws = wb.addWorkSheet()

  // Setup column width
  ws.setColsProperties([
    {column: 0, width: 1},
    {column: 1, width: 30},
    {column: 2, width: 2},
    {column: 3, width: 20},
    {column: 4, width: 40}
  ])

  let columnTemplate = [
    {column: 1, style: fstyle},
    {column: 3, style: fstyle},
    {column: 4, style: fstyleborderFull}
  ]
  ws.addRow([{value: 'test'}, {value: '2'}, {value: 256}], columnTemplate)
  ws.addMerge([1, 2, ws.getRowNum() - 1, ws.getRowNum() - 1])

  // You can set values as array
  ws.addRow(['You can set values as array', '3', 512], columnTemplate)

  // And without columnTemplate
  ws.addRow([
    {value: 'And without columnTemplate', column: 1, style: fstyle},
    {value: '2', column: 3, style: fstyle},
    {value: 1024, column: 4, style: fstyleborderFull}
  ])

  columnTemplate[2].style = fstyle1
  ws.addRow(['Change style and Row height', '445', 2048], columnTemplate, {height: 50})

  let columnTemplateAligBG = [
    {column: 1, style: fstyle},
    {column: 3, style: fstyleAligBG},
    {column: 4, style: fstyleborderFull}
  ]
  ws.addRow(['align background', '2', 4096], columnTemplateAligBG)

  ws.addRow([10, 200, 40000], columnTemplate)

  // you can create clone style with compounded configuration
  let fstyleDate = fstyle.compound({format: XLSXStyle.predefinedFormats.date})
  let fstyleDateFull = fstyle.compound({format: XLSXStyle.predefinedFormats.dateFull})
  ws.addRow(['demo XLSXStyle.predefinedFormats for Date'], [{column: 1, colSpan: 4, style: fstyle.compound({font: {bold: true, fontSize: 18}})}])
  let columnTemplate1 = [
    {column: 1, style: fstyle},
    {column: 3, style: fstyle},
    {column: 4, style: fstyle}
  ]
  ws.addRow(['date', 'dateFull', 'dateShort'], columnTemplate1)
  let columnTemplateT = [
    {column: 1, style: fstyleDate},
    {column: 3, style: fstyleDateFull},
    {column: 4, style: fstyle.compound({format: XLSXStyle.predefinedFormats.dateShort})}
  ]
  ws.addRow([new Date(), new Date(), new Date()], columnTemplateT)

  ws.addRow(['dateMY', 'timeShortPM', 'timeFullPM'], columnTemplate1)
  columnTemplateT = [
    {column: 1, style: fstyle.compound({format: XLSXStyle.predefinedFormats.dateMY})},
    {column: 3, style: fstyle.compound({format: XLSXStyle.predefinedFormats.timeShortPM})},
    {column: 4, style: fstyle.compound({format: XLSXStyle.predefinedFormats.timeFullPM})}
  ]
  ws.addRow([new Date(), new Date(), new Date()], columnTemplateT)

  ws.addRow(['time', 'timeFull', 'dateTime'], columnTemplate1)
  columnTemplateT = [
    {column: 1, style: fstyle.compound({format: XLSXStyle.predefinedFormats.time})},
    {column: 3, style: fstyle.compound({format: XLSXStyle.predefinedFormats.timeFull})},
    {column: 4, style: fstyle.compound({format: XLSXStyle.predefinedFormats.dateTime})}
  ]
  ws.addRow([new Date(), new Date(), new Date()], columnTemplateT)

  ws.addRow(['demo XLSXStyle.predefinedFormats for Number'], [{column: 1, colSpan: 4, style: fstyle.compound({font: {bold: true, fontSize: 18}})}])

  const pi = Math.PI
  const pim = Math.PI * 1000000
  ws.addRow(['sum', 'number', 'sumDelim'], columnTemplate1)
  columnTemplateT = [
    {column: 1, style: fstyle.compound({format: XLSXStyle.predefinedFormats.sum})},
    {column: 3, style: fstyle.compound({format: XLSXStyle.predefinedFormats.number})},
    {column: 4, style: fstyle.compound({format: XLSXStyle.predefinedFormats.sumDelim})}
  ]
  ws.addRow([pi, pi, pim], columnTemplateT)

  ws.addRow(['percent', 'percentDec', 'numF'], columnTemplate1)
  columnTemplateT = [
    {column: 1, style: fstyle.compound({format: XLSXStyle.predefinedFormats.percent})},
    {column: 3, style: fstyle.compound({format: XLSXStyle.predefinedFormats.percentDec})},
    {column: 4, style: fstyle.compound({format: XLSXStyle.predefinedFormats.numF})}
  ]
  ws.addRow([pi, pi, pim], columnTemplateT)

  ws.addRow(['numRedF', 'sumF', 'sumRedF'], columnTemplate1)
  columnTemplateT = [
    {column: 1, style: fstyle.compound({format: XLSXStyle.predefinedFormats.numRedF})},
    {column: 3, style: fstyle.compound({format: XLSXStyle.predefinedFormats.sumF})},
    {column: 4, style: fstyle.compound({format: XLSXStyle.predefinedFormats.sumRedF})}
  ]
  ws.addRow([pi, pi, pim], columnTemplateT)

  ws.addRow(['Rowspan and text transform'], [{column: 1, cellStyle: {rowSpan: 5}, style: fstyle.compound({alignment: {textRotation: 119}})}])
  ws.setRowNum(ws.getRowNum() + 5)
  ws.addRow([Math.PI * 1000], [{column: 1, colSpan: 4, style: fstyle.compound({format: '#,######0.000000_ ;[Red]\\-#,######0.000000\\ '})}])

  // Table Example
  ws = wb.addWorkSheet({title: 'Table example', name: 'SheetTab'})
  ws.setRowNum(2)
  // Setup column width

  ws.setColsProperties([
    {column: 0, width: 1},
    {column: 1, width: 15},
    {column: 2, width: 30},
    {column: 3, width: 10},
    {column: 4, width: 10},
    {column: 5, width: 14},
    {column: 6, width: 10},
    {column: 7, width: 14}
  ])
  // Header
  let baseHdrStyle = wb.style.getStyle({
    font: defFont.compound({bold: true, fontSize: 12, color: '4E4D4F'}),
    fill: 'EAE9F0',
    alignment: {horizontal: 'center', vertical: 'center', wrapText: '1'},
    border: borderFull}
  )
  ws.addRow([
    {column: 1, value: 'Object', style: baseHdrStyle, cellStyle: {colSpan: 2}},
    {column: 3, value: 'Operations', style: baseHdrStyle, cellStyle: {colSpan: 5}}
  ])
  ws.addRow([
    {column: 1, value: 'Code', style: baseHdrStyle, cellStyle: {rowSpan: 2}},
    {column: 2, value: 'Name', style: baseHdrStyle, cellStyle: {rowSpan: 2}},
    {column: 3, value: 'Date', style: baseHdrStyle, cellStyle: {rowSpan: 2}},
    {column: 4, value: 'Debet', style: baseHdrStyle, cellStyle: {colSpan: 2}},
    {column: 6, value: 'Credit', style: baseHdrStyle, cellStyle: {colSpan: 2}}
  ])
  ws.addRow([
    {column: 4, value: 'Quantity', style: baseHdrStyle},
    {column: 5, value: 'Sum', style: baseHdrStyle},
    {column: 6, value: 'Quantity', style: baseHdrStyle},
    {column: 7, value: 'Sum', style: baseHdrStyle}
  ])
  const baseCellStyle = wb.style.getStyle({
    font: defFont.compound({fontSize: 8, color: '4C4954'}),
    alignment: {horizontal: 'center'},
    border: borderFull
  })
  const baseCellStyleText = baseCellStyle.compound({alignment: {wrapText: true}})
  const baseCellStyleQ = baseCellStyle.compound({alignment: {horizontal: 'right'}, format: XLSXStyle.predefinedFormats.numRedF})
  const baseCellStyleSum = baseCellStyleQ.compound({format: XLSXStyle.predefinedFormats.sumRedF})
  const rowStyle = [
    {column: 1, style: baseCellStyleText},
    {column: 2, style: baseCellStyleText},
    {column: 3, style: baseCellStyle.compound({format: XLSXStyle.predefinedFormats.date})},
    {column: 4, style: baseCellStyleQ},
    {column: 5, style: baseCellStyleSum},
    {column: 6, style: baseCellStyleQ},
    {column: 7, style: baseCellStyleSum}
  ]
  const rowStyleBalance = [
    {column: 1, style: baseCellStyleText.compound({fill: 'D7EAF7'}), cellStyle: {colSpan: 2}},
    {column: 3, style: baseCellStyle.compound({format: XLSXStyle.predefinedFormats.date})},
    {column: 4, style: baseCellStyleQ.compound({fill: 'D7EAF7'})},
    {column: 5, style: baseCellStyleSum.compound({fill: 'D7EAF7'})},
    {column: 6, style: baseCellStyleQ.compound({fill: 'D7EAF7'})},
    {column: 7, style: baseCellStyleSum.compound({fill: 'D7EAF7'})}
  ]
  tableData.forEach(f => {
    ws.addRow(f, f.length === 7 ? rowStyle : rowStyleBalance)
  })
  wb.render().then(function (content) {
    content = Buffer.from(content)
    fs.writeFileSync('./test.xlsx', content, 'binary')
  })
}

const tableData = [
  [ '001', 'piglet', new Date(2010, 0, 1), 5, 505.11, 0, 0 ],
  [ '001', 'piglet', new Date(2010, 0, 3), 0, 0, 1, 100.02 ],
  [ '001', 'piglet', new Date(2010, 0, 4), 0, 0, -1, -100.02 ],
  [ 'Balance', new Date(2010, 11, 28), 5, 505.11, 0, 0 ],
  [ '002', 'plain', new Date(2010, 1, 1), 3, 430000023, 0, 0 ],
  [ 'Balance', new Date(2010, 11, 28), 3, 430000023, 0, 0 ]
]

module.exports = startTest()
