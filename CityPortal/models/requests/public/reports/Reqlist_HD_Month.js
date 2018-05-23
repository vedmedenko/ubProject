 
exports.reportCode = {
buildReport: function(reportParams){
  var me = this

  var today = new Date(),
  curMonth = today.getMonth();
  var mBegin = new Date(today.getFullYear(), today.getMonth(), 1) //Get first date of current month
  var mEnd = new Date(today.getFullYear(), today.getMonth()+1, 1) //Get first date of next month

  return UB.Repository('req_reqList')
    .attrs(['reqDate', 'applicantInfo', 'reqText','answer','status'])
    .where('department','equal', 331308542722153) //Set your departments ID from Departmments form!!
    .where('status', 'equal', 'CLOSED') //get closed requests
    .where('reqDate', '>=', mBegin) //get requests in current month
    .where('reqDate', '<', mEnd)
    .selectAsObject()
    .then( function (resp) {
      var data = {
        req_reqList: resp,
                curMonth: curMonth + 1
      }
      var result = me.buildHTML(data);
       if (me.reportType === 'pdf') {
          result = me.transformToPdf(result);
      }
      return result;
    })
}
};

