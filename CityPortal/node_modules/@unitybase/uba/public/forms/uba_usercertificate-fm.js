function walk (el, searchCode, callback) {
  if (el.valueBlock) {
    if (el.valueBlock.toString() === searchCode) {
      callback(el)
      return false
    } else {
      if (Array.isArray(el.valueBlock.value)) {
        return el.valueBlock.value.every(function (dt) {
          return walk(dt, searchCode, callback)
        })
      }
    }
  }
  return true
}

var typeNames = {
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'T',
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.41': 'NAME',
  '2.5.4.31': 'MEMBER',
  '2.5.4.42': 'G',
  '2.5.4.43': 'I',
  '2.5.4.5': 'SERIALNUMBER',
  '2.5.4.20': 'TELEPHONENUMBER',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'S',
  '2.5.4.9': 'STREET',
  '1.2.840.113549.1.9.1': 'E-MAIL',
  '2.5.4.16': 'POSTALADDRESS',
  '2.5.4.17': 'POSTALCODE',
  '2.5.4.26': 'REGISTEREDADDRESS'
}


exports.formCode = {
  initUBComponent: function () {
    var me = this, uploadCertBtn, downloadCertBtn
    if (me.parentContext.userID) {
      me.getField('userID').hide()
      me.getField('userID').oldHidden = true
    }
    uploadCertBtn = me.down('#uploadCertBtn')
    // return;
    uploadCertBtn.on('click', function uploadCertBtnClick () {
      Ext.create('UB.view.UploadFileAjax', {
        entityName: 'uba_usercertificate',
        scope: this,
        upLoad: function (btn) {
          var
            w = btn.up('window'), inputDom, ffile

          inputDom = this.fieldFile.fileInputEl.dom // getEl()

          if (inputDom.files.length === 0) { // !form.isValid()
            return
          }
          btn.disable()
          ffile = inputDom.files[0]

          var rComplete = 0
          var reader = new FileReader()
          reader.onloadend = function () {
            var certBuff = reader.result
            Promise.all([
              System.import('asn1js/build/asn1.js'),
              System.import('pkijs/build/Certificate.js')
            ]).then(function (res) {
              var asn1js = res[0], Certificate = res[1].default
              var asn1 = asn1js.fromBER(certBuff)
              // skip PrivateKeyUsagePeriod 2.5.29.16
              walk(asn1.result, '2.5.29.16', function (el) {
                //console.debug(el)
                el.valueBlock.value[2].valueDec = 64
              })
              var certificate = new Certificate({schema: asn1.result})
              var subject = certificate.subject.typesAndValues.map(function (e) {
                return (typeNames[e.type] || e.type) + '=' + e.value.valueBlock.value
              }).join(', ')
              var issuer = certificate.issuer.typesAndValues.map(function (e) {
                return (typeNames[e.type] || e.type) + '=' + e.value.valueBlock.value
              })
              issuer = issuer.join(', ')

              var serial = '';
              var bytesArr = new Uint8Array(certificate.serialNumber.valueBlock.valueHex)
              bytesArr.forEach(function (e) {
                let n = Number(e).toString(16).toUpperCase()
                if (n.length === 1) n = '0' + n
                serial += n
              })
              me.record.set('issuer_serial', issuer)
              me.record.set('serial', serial)
              me.record.set('description', subject)
              rComplete++
              if (rComplete > 1) w.close()
            })
          }
          reader.readAsArrayBuffer(ffile)

          UB.base64FromAny(ffile)
            .then(function (certBase64) {
              me.addExtendedDataForSave({'certificate': certBase64})
              me.updateActions()
              rComplete++
              if (rComplete > 1) {
                w.close()
              }
            })
        }
      })
    })
    downloadCertBtn = me.down('#downloadCertBtn')
    downloadCertBtn.on('click', function () {
      $App.connection.query({
        entity: 'uba_usercertificate',
        method: 'getCertificate',
        ID: me.record.get('ID')
      }).done(function (res) {
        var data = UB.LocalDataStore.selectResultToArrayOfObjects(res)
        var blobData = new Blob(
          [UB.base64toArrayBuffer(data[0].certificate)],
          {type: 'application/x-x509-ca-cert'}
        )
        saveAs(blobData, me.record.get('serial') + '.cer')
      })
    })
  }
}
