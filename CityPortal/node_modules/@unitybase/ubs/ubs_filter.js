/**
 *
 * @param {ubMethodParams} ctxt
 * @returns {boolean}
 */
ubs_filter.on('insert:before', function (ctxt) {
  let execParams = ctxt.mParams.execParams
  execParams.owner = Session.userID
  return true
})
