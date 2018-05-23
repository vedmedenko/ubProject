/*
* Created by xmax on 15.01.2018
*/
console.log('start')
const fs = require('fs')
const mustache = require('mustache')
const xmldom = require('xmldom')
//

const {
  XLSXWorkbook,
  XLSXfromHTML
} = require('../index')

const template = fs.readFileSync('./testReport.html', {encoding: 'utf-8'})
let data = {'organization': 'Основна організація', 'dateFrom': new Date(2018, 0, 25), 'dateTo': new Date(2018, 0, 25), 'balanceData': {'totals': {'dbS': 12312312312, 'crS': -12312312312, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': -12312312312}, 'data': [{'accCode': '00', 'accID': 3000000002225, 'isLeaf': true, 'dbS': 0, 'crS': -12312312312, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': -12312312312}, {'accCode': '23', 'accID': 3000000003094, 'isLeaf': false, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}, {'accCode': '231', 'accID': 3000000003095, 'isLeaf': false, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}, {'accCode': '2311', 'accID': 3000000003096, 'isLeaf': false, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}, {'accCode': '23111', 'accID': 3000000003097, 'isLeaf': true, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}]}, 'dtStartTotal': 0, 'ktStartTotal': 0, 'dtTurnoverTotal': 0, 'ktTurnoverTotal': 0, 'dtBalanceTotal': 0, 'ktBalanceTotal': 0}
data.crn = function () {
  return function (val, render) {
    let v = render(val)
    v = v ? Number(v) : v
    return XLSXfromHTML.formatValue(v, '#,##0.00')
  }
}

let html = XLSXfromHTML.mustacheRenderOptimization(template, data)
/*
XLSXfromHTML.addMustacheSysFunction(data)
let html = mustache.render(template, data)
*/

const wb = new XLSXWorkbook({useSharedString: false})
const converter = new XLSXfromHTML(xmldom.DOMParser, wb, [{name: 'Лист'}])
converter.writeHtml({html: html, sourceData: data})
console.log('1')
// sleep(100000)
// debugger
var f
wb.render().then(function (content) {
  console.log('2')
  content = Buffer.from(content)
  f = content
  fs.writeFileSync('./testReport.xlsx', content, 'binary')
})
//var b = f