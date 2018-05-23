 
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
    // this handler is used in template as onclick event 
    if (!window.openCountry) window.openCountry = function(ID){
      // $App.doCommand({cmdType: 'showForm', entity: 'cdn_country', instanceID: ID})
      $App.dialogInfo('You clicked on country with id ' + ID)
    }
    var data = {
      countries: [{ID: 10, name: 'Brasil'}, {ID: 20, name: 'Canada'}]
    }  
    var result = this.buildHTML(data) 
    return result
  } 
} 
