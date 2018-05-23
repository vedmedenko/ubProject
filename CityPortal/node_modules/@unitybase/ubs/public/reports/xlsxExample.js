 
exports.reportCode = { 
  /** 
  * This function must be defined in report code block. 
  * 
  * Inside function you must: 
  * 1) Prepare data 
  * 2) Run method this.buildHTML(reportData); where reportData is data for mustache template 
  * 3) If need create PDF run method this.transformToPdf(htmlReport); where htmlReport is HTML 
  * 4) If is server side function must return report as string otherwise Promise or string 
  * 
  * @cfg {function} buildReport 
  * @params {[]|{}} reportParams 
  * @returns {Promise|Object} If code run on server method must return report data. 
  * Promise object must be resolved report code 
  */ 
  buildReport: function(reportParams){ 
     var result
    var data = {organization: 'Основна організація', 
                dateFrom: new Date(2018, 0, 25), 
                dateTo: new Date(2018, 0, 25), 
                reportDate: new Date(), 
                data: [{name: 'Marilyn Monroe', count: 40, sum: 44000351}, {name: 'Janet Joplin', count: 25, sum: 35000}, {name: 'Catherine Deneuve', count: 1, sum: 88}, {footer: true, name: 'Sum', count: 50000, sum: 91000000}],
                balanceData: {'totals': {'dbS': 12312312312, 'crS': -12312312312, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': -12312312312}, 'data': [{'accCode': '00', 'accID': 3000000002225, 'isLeaf': true, 'dbS': 0, 'crS': -12312312312, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': -12312312312}, {'accCode': '23', 'accID': 3000000003094, 'isLeaf': false, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}, {'accCode': '231', 'accID': 3000000003095, 'isLeaf': false, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}, {'accCode': '2311', 'accID': 3000000003096, 'isLeaf': false, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}, {'accCode': '23111', 'accID': 3000000003097, 'isLeaf': true, 'dbS': 12312312312, 'crS': 0, 'dbT': 0, 'crT': 0, 'dbE': 0, 'crE': 0}]}, 'dtStartTotal': 0, 'ktStartTotal': 0, 'dtTurnoverTotal': 0, 'ktTurnoverTotal': 0, 'dtBalanceTotal': 0, 'ktBalanceTotal': 0}
   
    data.crn = function () {
      return function (val, render) {
        return XLSXfromHTML.formatValue(v, '#,##0.00')
      }
    }
    reportParams = data
    switch (this.reportType) {
      case 'pdf': 
        result = this.buildHTML(reportParams)
        result = this.transformToPdf(result)
        break
      case 'html': 
        result = this.buildHTML(reportParams)
        break
      case 'xlsx':           
        result = this.buildXLSX(reportParams)
        break
    }        
    return result 
  } 
} 
