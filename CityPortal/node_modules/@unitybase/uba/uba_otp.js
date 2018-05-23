/**
 * One-time passwords
 *
 * @autor v.orel
 * @module @unitybase/uba/uba_otp
 */

var me = uba_otp
/**
 * Generate one-time-password (OTP), insert record into table and returns new OTP
 *
 * @method generateOtp
 * @param {String} otpKind Must be one of 'EMail' or 'SMS'
 * @param {Number} userID
 * @param {Object} [uData]
 * @param {Number} [lifeTime] life time of otp in seconds
 * @return {String}
 */
me.generateOtp = function (otpKind, userID, uData, lifeTime) {
  var lifeTimeOfEMail = 30 * 24 * 60 * 60, // 30 days
    lifeTimeOfSMS = 20 * 60, // 30 minutes
    expiredDate = new Date(),
    uDataStr,
    otp
  if (otpKind === 'EMail') {
    otp = createGuid()
    if (!lifeTime) lifeTime = lifeTimeOfEMail
  } else if (otpKind === 'SMS') {
    otp = createGuid()
    if (!lifeTime) lifeTime = lifeTimeOfSMS
  } else {
    throw new Error('invalid otpKind')
  }
  expiredDate.setTime(expiredDate.getTime() + lifeTime * 1000)
  if (uData) uDataStr = JSON.stringify(uData)
  else uDataStr = ''
  var inst = UB.Repository('uba_otp').attrs(['ID', 'otp'])
        .where('[otp]', '=', otp)
        .select()
  var res = inst.run('insert', {
    execParams: {
      otp: otp,
      userID: userID,
      otpKind: otpKind,
      expiredDate: expiredDate,
      uData: uDataStr
    }
  }
    )
  if (!res) {
    throw inst.lastError
  }
  return otp
}

/**
 * Switch session to user from OTP or execute callback in session of user from OTP
 *
 * @method auth
 * @deprecated use authAndExecute instead
 * @param {String} otp
 * @param {String} otpKind
 * @param {Function} [fCheckUData] function for check OTP from uData
 * @param {Object} [checkData] value for check OTP from uData
 * @param {Function} [call] This function will be called in user's session. If defined then restore original user session after call it.
 * @returns {Boolean}
 */
me.auth = function (otp, otpKind, fCheckUData, checkData, call) {
  var repo
  var inst

  repo = UB.Repository('uba_otp').attrs(['userID', 'ID', 'uData'])
        .where('[otp]', '=', otp).where('[expiredDate]', '>=', new Date())
  if (otpKind) {
    repo = repo.where('[otpKind]', '=', otpKind)
  }
  inst = repo.select()
  if (inst.eof) {
    return false
  } else {
    var res = inst.run('delete', {
      execParams: {ID: inst.get('ID')}
    })
    if (!res) {
      throw inst.lastError
    }
    if ((!fCheckUData) || (fCheckUData(inst.get('uData'), checkData))) {
      if (call)
              { Session.runAsUser(inst.get('userID'), call.bind(null, inst.get('uData'))) }
      else
                { // noinspection JSDeprecatedSymbols
        Session.setUser(inst.get('userID'))
      }
      return true
    } else return false
  }
}

/**
 * Check given otp, and when it is correct then run callback
 *
 * Sample
 *          // generation otp
 *          var userID = 100000000122,
 *              uData = {size: {width: 100, height: 50}};
 *          var otp = uba_otp.generateOtp('EMail', userID, uData);
 *          // send this otp via EMail
 *          //............................
 *          // after receiving this otp
 *          var isOtpCorrect =  uba_otp.authAndExecute('EMail', otp, function(uData){
 *              var params = JSON.parse(uData);
 *              console.log('user ID is', Session.userID);//'user ID is 100000000122';
 *              console.log('width is', params.width);//'width is 100';
 *          }));
 *
 * @method authAndExecute
 * @param {String} otp
 * @param {String} otpKind
 * @param {Function} callBack This function will be called in user's session with uData parameter from otp if otp is correct.
 * @returns {Boolean} Is otp correct
 */
me.authAndExecute = function (otp, otpKind, callBack) {
  const store = UB.Repository('uba_otp').attrs(['userID', 'ID', 'uData'])
        .where('[otp]', '=', otp).where('[otpKind]', '=', otpKind).where('[userID.disabled]', '=', 0).where('[expiredDate]', '>=', new Date()).select()
  if (store.eof) {
    return false
  } else {
    if (!store.run('delete', {execParams: {ID: store.get('ID')}})) {
      throw store.lastError
    }
    Session.runAsUser(store.get('userID'), callBack.bind(null, store.get('uData')))
    return true
  }
}
