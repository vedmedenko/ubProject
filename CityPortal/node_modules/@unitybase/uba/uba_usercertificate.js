/**
 * Created by xmax.
 */

const me = uba_usercertificate

function setBlob (ctxt) {
  const execParams = ctxt.mParams.execParams
  Object.keys(execParams)
  if (execParams.certificate) {
    let cert = Buffer.from(execParams.certificate) // 'base64'
    cert = cert.buffer.slice(cert.byteOffset, cert.byteOffset + cert.byteLength)
    execParams.setBLOBValue('certificate', cert) // base64
  }
}
me.on('insert:before', setBlob)
me.on('update:before', setBlob)

function clearBlob (ctxt) {
  let execParams = ctxt.mParams.execParams
  if (execParams.certificate) {
    execParams.certificate = ''
  }
}
me.on('insert:after', clearBlob)
me.on('update:after', clearBlob)

me.getCertificate = function (ctxt) {
  let store = UB.Repository('uba_usercertificate').attrs(['ID', 'certificate'])
  .where('ID', '=', ctxt.mParams.ID).select()

  let certificate = store.getAsBuffer('certificate')
  certificate = Buffer.from(certificate)
  certificate = certificate.toString('base64')
  ctxt.dataStore.initFromJSON({fieldCount: 1, values: ['certificate', certificate], rowCount: 1})
}

me.entity.addMethod('getCertificate')
