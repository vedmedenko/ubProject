/* global UB,Ext */
exports.reportCode = {
  /**
   * This function must be defined in report code block.
   *
   * Inside function you must:
   * 1) Prepare data
   * 2) Run method this.buildHTML(reportData); where reportData is data for mustache template
   * 3) If need create PDF run method this.transformToPdf(htmlReport); where htmlReport is HTML
   * 4) For server side function must return report as string otherwise Promise
   *
   * @cfg {function} buildReport
   * @params {[]|{}} reportParams
   * @returns {Promise|Object} If code run on server method must return report data.
   * Promise object must resolve report code
   */
  buildReport: function (reportParams) {
    var me = this

    if (UB.isServer) {
      return me.buildReportOnServer(reportParams)
    } else {
      return me.buildReportOnClient(reportParams)
    }
  },

  /**
   * Server-side report generation. On server-side UB is synchronous
   * @param reportParams
   * @return {String}
   */
  buildReportOnServer: function (reportParams) {
    let limit = reportParams.limitation || 1000
    const LocalDataStore = require('@unitybase/base').LocalDataStore
    let countries = UB.Repository('cdn_country')
      .attrs(['code', 'name', 'fullName', 'currencyID.name'])
      .limit(limit)
      .selectAsArray()
    let countriesAsObjects = LocalDataStore.selectResultToArrayOfObjects(countries, {
      'currencyID.name': 'currencyName'
    })

    let data = {
      countries: countriesAsObjects,
      myBirthday: reportParams.birthday ? reportParams.birthday.toLocaleDateString() : UB.i18n('undefined'),
      myArray: [1, 2, 3],
      area: null,
      boldIfLong: function () {
        return function (text, render) {
          return (text.length > 3) ? '<b>' + text + '</b>' : text
        }
      }
    }
    let result = this.buildHTML(data)
    if (this.reportType === 'pdf') {
      result = this.transformToPdf(result)
    }
    return result
  },

  buildReportOnClient: function (reportParams) {
    var me = this
    var limit = reportParams.limitation || 1000

    return UB.Repository('cdn_country')
      .attrs(['code', 'name', 'fullName', 'currencyID.name'])
      .limit(limit)
      .selectAsArray()
      .then(function (response) {
        return UB.LocalDataStore.selectResultToArrayOfObjects(response, {
          'currencyID.name': 'currencyName'
        })
      }).then(function (data) {
        var result
        data = {
          countries: data,
          myBirthday: reportParams.birthday ? reportParams.birthday.toLocaleDateString() : UB.i18n('undefined'),
          myArray: [1, 2, 3],
          area: null,
          boldIfLong: function () {
            return function (text, render) {
              return (text.length > 3) ? '<b>' + text + '</b>' : text
            }
          }
        }
        result = me.buildHTML(data)
        if (me.reportType === 'pdf') {
          result = me.transformToPdf(result)
        }
        return result
      })
  },

  onParamPanelConfig: function () {
    var paramForm = Ext.create('UBS.ReportParamForm', {
      items: [{
        xtype: 'textfield',
        name: 'name',
        fieldLabel: 'Name'
      }, {
        xtype: 'datefield',
        name: 'birthday',
        fieldLabel: 'Birthday',
        allowBlank: false,
        value: new Date()
      }, {
        xtype: 'numberfield',
        name: 'limitation',
        fieldLabel: 'Limit to'
      }
      ],
      getParameters: function (owner) {
        var frm = owner.getForm()
        return {
          name: frm.findField('name').getValue(),
          birthday: frm.findField('birthday').getValue(),
          limitation: frm.findField('limitation').getValue()
        }
      }
    })
    return paramForm
  }

}
