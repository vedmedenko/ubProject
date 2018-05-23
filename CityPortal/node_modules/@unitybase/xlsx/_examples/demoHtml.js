/*
* Created by xmax on 15.01.2018
*/
const fs = require('fs')
const mustache = require('mustache')
const xmldom = require('xmldom')
//

const {
  XLSXWorkbook,
  XLSXfromHTML
} = require('../index')

const template = fs.readFileSync('./demo.html', {encoding: 'utf-8'})
const data = {reportDate: new Date(), data: [{name: 'Marilyn Monroe', count: 40, sum: 44000351}, {name: 'Janet Joplin', count: 25, sum: 35000}, {name: 'Catherine Deneuve', count: 1, sum: 88}, {footer: true, name: 'Sum', count: 50000, sum: 91000000}]}

let html = XLSXfromHTML.mustacheRenderOptimization(template, data)
/*
XLSXfromHTML.addMustacheSysFunction(data)
let html = mustache.render(template, data)
*/

const wb = new XLSXWorkbook({useSharedString: false})
const converter = new XLSXfromHTML(xmldom.DOMParser, wb, [{name: 'Лист'}])
converter.writeHtml({html: html, sourceData: data})
wb.render().then(function (content) {
  content = Buffer.from(content)
  fs.writeFileSync('./testHtml.xlsx', content, 'binary')
})
