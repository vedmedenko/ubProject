var me = uba_user

const UBA_COMMON = require('@unitybase/base').uba_common
const http = require('http')

me.entity.addMethod('changeLanguage')

/**
 * Do not allow user with same name but in different case
 * @param {ubMethodParams} ctxt
 */
function checkDuplicateUser (ctxt) {
  var params = ctxt.mParams.execParams,
    newName = params.name,
    ID = params.ID
  if (newName) {
    let repo = UB.Repository('uba_user').attrs('ID').where('name', '=', newName.toLowerCase())
    if (ID) {
      repo = repo.where('ID', '<>', ID)
    }
    let store = repo.select()
    if (!store.eof) {
      throw new UB.UBAbort('<<<Duplicate user name (may be in different case)>>>')
    }
    params.name = newName.toLowerCase() // convert user name to lower case
  }
}
me.on('insert:before', checkDuplicateUser)
me.on('update:before', checkDuplicateUser)

/**
 * Set fullName = name in case fullName is missing
 * Set lastPasswordChangeDate = maxDate in case user is domainUser
 * @param {ubMethodParams} ctxt
 */
function fillFullNameIfMissing (ctxt) {
  let params = ctxt.mParams.execParams
  if (!params.fullName) {
    params.fullName = params.name
  };
  if (params.name && params.name.indexOf('\\') !== -1) {
      params.lastPasswordChangeDate = new Date(2099,12,31);
  }
}
me.on('insert:before', fillFullNameIfMissing)

/**
 * @param {Number} userID
 * @param {String} userName  One of the parameters userName or userID must be specified
 * @param  {String} password
 * @param {Boolean} [needChangePassword=false] If true the password will by expired
 * @param {String} [oldPwd] Optional for optimisation
 */
me.changePassword = function (userID, userName, password, needChangePassword, oldPwd) {
  var newPwd = password || '',
    store = new TubDataStore('uba_user'),
    passwordPolicy

  if ((!userID && !userName) || !password) {
    throw new Error('Invalid parameters.')
  }
  if (userID && (!userName || !oldPwd)) {
    UB.Repository('uba_user').attrs(['ID', 'name', 'uPasswordHashHexa']).where('[ID]', '=', userID).select(store)
    userName = store.get('name')
    oldPwd = store.get('uPasswordHashHexa')
  } else if (userName && (!userID || !oldPwd)) {
    UB.Repository('uba_user').attrs(['ID', 'name', 'uPasswordHashHexa']).where('[name]', '=', userName.toLowerCase()).select(store)
    userID = store.get('ID')
    oldPwd = store.get('uPasswordHashHexa')
  }

  passwordPolicy = ubs_settings ? {
    minLength: ubs_settings.getSettingValue('UBA.passwordPolicy.minLength'),
    checkCmplexity: ubs_settings.getSettingValue('UBA.passwordPolicy.checkCmplexity'),
    checkDictionary: ubs_settings.getSettingValue('UBA.passwordPolicy.checkDictionary'),
    allowMatchWithLogin: ubs_settings.getSettingValue('UBA.passwordPolicy.allowMatchWithLogin'),
    checkPrevPwdNum: ubs_settings.getSettingValue('UBA.passwordPolicy.checkPrevPwdNum')
  } : {}
  if (passwordPolicy.minLength == null) passwordPolicy.minLength = 3
  if (passwordPolicy.checkCmplexity == null) passwordPolicy.checkCmplexity = false
  if (passwordPolicy.checkDictionary == null) passwordPolicy.checkDictionary = false
  if (passwordPolicy.allowMatchWithLogin == null) passwordPolicy.allowMatchWithLogin = false
  if (passwordPolicy.checkPrevPwdNum == null) passwordPolicy.checkPrevPwdNum = 4

    // minLength
  if (passwordPolicy.minLength > 0) {
    if (newPwd.length < passwordPolicy.minLength) {
      throw new Error('<<<Password is too short>>>')
    }
  }

    // checkCmplexity
  if (passwordPolicy.checkCmplexity) {
    if (!(/[A-Z]/.test(newPwd) && /[a-z]/.test(newPwd) && /[0-9]/.test(newPwd) && /[~!@#$%^&*()_+|\\=\-\/'":;<>]/.test(newPwd))) {
      throw new Error('<<<Password is too simple>>>')
    }
  }
    // checkDictionary
  if (passwordPolicy.checkDictionary) {
    // todo - check password from dictionary
    if (false) {
      throw new Error('<<<Password is dictionary word>>>')
    }
  }

    // allowMatchWithLogin
  if (!passwordPolicy.allowMatchWithLogin) {
    if (userName === newPwd) {
      throw new Error('<<<Password matches with login>>>')
    }
  }

  newPwd = nsha256('salt' + newPwd)
    // checkPrevPwdNum
  if (passwordPolicy.checkPrevPwdNum > 0) {
    UB.Repository('uba_prevPasswordsHash').attrs('uPasswordHashHexa').where('userID', '=', userID)
            .limit(passwordPolicy.checkPrevPwdNum).orderBy('mi_createDate', 'desc').select(store)
    store.first()
    while (!store.eof) {
      if (store.get('uPasswordHashHexa') === newPwd) {
        throw new Error('<<<Previous password is not allowed>>>')
      }
      store.next()
    }
  }

    // since attribute uPasswordHashHexa is not defined in entity metadata for security reason we need to execute SQL. It is always better to not use execSQL at all!
  store.execSQL('update uba_user set uPasswordHashHexa=:newPwd:, lastPasswordChangeDate=:lastPasswordChangeDate: where id = :userID:',
        {newPwd: newPwd, lastPasswordChangeDate: needChangePassword ? new Date(2000, 1, 1) : new Date(), userID: userID})
    // store oldPwd
  if (oldPwd) {
    store.run('insert', {
      entity: 'uba_prevPasswordsHash',
      execParams: {
        userID: userID,
        uPasswordHashHexa: oldPwd
      }
    })
  }
}

App.registerEndpoint('changePassword',
    /**
     * Change (or set) user password.
     * For users with `admins` group we allow to change password for everyone,
     * in this case `forUser` parameter required.
     * @param {THTTPRequest}req
     * @param {THTTPResponse}resp
     */
    function (req, resp) {
      var params = JSON.parse(req.read()),
        forUser = params.forUser,
        newPwd = params.newPwd || '',
        pwd = params.pwd || '',
        needChangePassword = params.needChangePassword || false,
        store = new TubDataStore('uba_user'),
        roles, userID, oldPwd

      if (!newPwd) {
        throw new Error('newPwd parameter is required')
      }

      let failException = null
      try {
        if (forUser) {
          roles = (Session.userRoleNames || '').split(',')
          if ((roles.indexOf(UBA_COMMON.ROLES.ADMIN.NAME) === -1) && (roles.indexOf('accountAdmins') === -1)) {
            throw new Error(`Change password for other users allowed only for "${UBA_COMMON.ROLES.ADMIN.NAME}" or "accountAdmins" group members`)
          }
          UB.Repository('uba_user').attrs('ID', 'uPasswordHashHexa').where('[name]', '=', '' + forUser.toLowerCase()).select(store)
          if (store.eof) {
            throw new Error('User not found')
          }
          userID = store.get('ID')
          oldPwd = store.get('uPasswordHashHexa')
        } else {
          userID = Session.userID
          UB.Repository('uba_user').attrs('name', 'uPasswordHashHexa').where('ID', '=', userID).select(store)
          if (!store.eof) {
            forUser = store.get('name')
            oldPwd = store.get('uPasswordHashHexa')
          }
              // checkPrevPwd
          if (pwd !== oldPwd) {
            throw new UB.UBAbort('<<<Incorrect old password>>>')
          }
        }
        me.changePassword(userID, forUser, newPwd, needChangePassword, oldPwd)
      } catch (e) {
        failException = e
      }

      // make uba_audit record
      if (App.domainInfo.has('uba_audit')) {
        // var store = new TubDataStore('uba_audit');
        /** @type uba_user_object */
        store.run('insert', {
          entity: 'uba_audit',
          execParams: {
            entity: 'uba_user',
            entityinfo_id: userID, // Session.userID,
            actionType: failException  ? 'SECURITY_VIOLATION' : 'UPDATE',
            actionUser: Session.uData.login,
            actionTime: new Date(),
            remoteIP: Session.callerIP,
            targetUser: forUser.toLowerCase(),
            toValue: failException
              ? JSON.stringify({action: 'changePassword', reason: failException.message})
              : JSON.stringify({action: 'changePassword'})
          }
        })
        App.dbCommit()
      }
      if (failException) throw failException
      resp.statusCode = 200
    }
)

/**
 * Change (or set) current user language.
 * After call to this method UI must logout user and reload itself.
 *
 * @param {ubMethodParams} ctxt
 * @param {String} ctxt.mParams.newLang new user language
 *
 */
function changeLanguage (ctxt) {
  let params = ctxt.mParams
  const newLang = params.newLang

  if (!newLang) {
    throw new Error('newLang parameter is required')
  }
  let userID = Session.userID
  let user = UB.Repository('uba_user').attrs(['name', 'uData', 'mi_modifyDate']).where('ID', '=', userID).select()
  if (user.eof) {
    throw new Error('user is unknown or not logged in')
  }

  let supportedLangs = user.entity.connectionConfig.supportLang
  if (_.indexOf(supportedLangs, newLang) < 0) {
    throw new Error('Language "' + newLang + '" not supported')
  }

  let uData
  try {
    uData = JSON.parse(user.get('uData'))
  } catch (e) {
    uData = {}
  }
  if (!uData) {
    uData = {}
  }
  uData.lang = newLang
  user.run('update', {
    execParams: {
      ID: userID,
      uData: JSON.stringify(uData),
      mi_modifyDate: user.get('mi_modifyDate')
    }
  })
}
me.changeLanguage = changeLanguage

/**
 * After inserting new user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditNewUser (ctx) {
  if (!App.domainInfo.has('uba_audit')) {
    return
  }

  let params = ctx.mParams.execParams
  let store = new TubDataStore('uba_audit')
  store.run('insert', {
    execParams: {
      entity: 'uba_user',
      entityinfo_id: params.ID, // Session.userID,
      actionType: 'INSERT',
      actionUser: Session.uData.login,
      actionTime: new Date(),
      remoteIP: Session.callerIP,
      targetUser: params.name,
      toValue: JSON.stringify(params)
    }
  })
}
me.on('insert:after', ubaAuditNewUser)

/**
 * After updating user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditModifyUser (ctx) {
  if (!App.domainInfo.has('uba_audit')) {
    return
  }
  var
    params = ctx.mParams.execParams,
    store = new TubDataStore('uba_audit'),
    origStore = ctx.dataStore,
    origName = origStore.currentDataName,
    oldValues, oldName

  try {
    origStore.currentDataName = 'selectBeforeUpdate'
    oldValues = origStore.asJSONObject
    oldName = origStore.get('name')
  } finally {
    origStore.currentDataName = origName
  }

  if (params.name) {
    store.run('insert', {
      execParams: {
        entity: 'uba_user',
        entityinfo_id: params.ID,
        actionType: 'DELETE',
        actionUser: Session.uData.login,
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetUser: oldName,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
    store.run('insert', {
      execParams: {
        entity: 'uba_user',
        entityinfo_id: params.ID,
        actionType: 'INSERT',
        actionUser: Session.uData.login,
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetUser: params.name,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
  } else {
    store.run('insert', {
      execParams: {
        entity: 'uba_user',
        entityinfo_id: params.ID,
        actionType: 'UPDATE',
        actionUser: Session.uData.login,
        actionTime: new Date(),
        remoteIP: Session.callerIP,
        targetUser: oldName,
        fromValue: oldValues,
        toValue: JSON.stringify(params)
      }
    })
  }
}
me.on('update:after', ubaAuditModifyUser)

/**
 * After deleting user - log event to uba_audit
 * @param {ubMethodParams} ctx
 */
function ubaAuditDeleteUser (ctx) {
  if (!App.domainInfo.has('uba_audit')) return

  let params = ctx.mParams.execParams
  let store = new TubDataStore('uba_audit')
  let origStore = ctx.dataStore
  let origName = origStore.currentDataName
  let oldValues, oldName

  try {
    origStore.currentDataName = 'selectBeforeDelete'
    oldValues = origStore.asJSONObject
    oldName = origStore.get('name')
  } finally {
    origStore.currentDataName = origName
  }

  store.run('insert', {
    execParams: {
      entity: 'uba_user',
      entityinfo_id: params.ID,
      actionType: 'DELETE',
      actionUser: Session.uData.login,
      actionTime: new Date(),
      remoteIP: Session.callerIP,
      targetUser: oldName,
      fromValue: oldValues
    }
  })
}
me.on('delete:after', ubaAuditDeleteUser)

/**
 * Prevent delete a build-in user
 * @param {ubMethodParams} ctx
 */
function denyBuildInUserDeletion (ctx) {
  var
    params = ctx.mParams.execParams,
    ID = params.ID

  for (let user in UBA_COMMON.USERS) {
    if (UBA_COMMON.USERS[user].ID === ID) {
      throw new UB.UBAbort('<<<Removing of built-in user is prohibited>>>')
    }
  }
}
me.on('delete:before', denyBuildInUserDeletion)

const EMAIL_VALIDATION_RE = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
/**
 * Check provided Email is look like Email address
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail (email) {
  return email && (email.length < 60) && EMAIL_VALIDATION_RE.test(email)
}

const RECAPTCHA_SECRET_KEY = App.serverConfig.application.customSettings && App.serverConfig.application.customSettings.reCAPTCHA ?
    App.serverConfig.application.customSettings.reCAPTCHA.secretKey : ''
/**
 * Validate a reCAPTCHA from client request. See <a href="https://developers.google.com/recaptcha/docs/verify"reCAPTCHA doc</a>
 * App.serverConfig.application.customSettings.reCAPTCHA.secretKey must be defined
 * @param {string} recaptcha
 * @returns {boolean}
 */
function validateRecaptcha (recaptcha) {
  if (!RECAPTCHA_SECRET_KEY) return true
  var data, resp
  resp = http.request({
    URL: 'https://www.google.com/recaptcha/api/siteverify' + '?' + 'secret=' + RECAPTCHA_SECRET_KEY + '&response=' + recaptcha,
    method: 'POST',
    sendTimeout: 30000,
    receiveTimeout: 30000,
    keepAlive: true,
    compressionEnable: true
  }).end('')
  data = JSON.parse(resp.read())
  return data.success
}

me.entity.addMethod('publicRegistration')

const confirmationRedirectURI = App.serverConfig.application.customSettings &&
    App.serverConfig.application.customSettings.publicRegistration &&
    App.serverConfig.application.customSettings.publicRegistration.confirmationRedirectURI ?
    App.serverConfig.application.customSettings.publicRegistration.confirmationRedirectURI : '/'

const QueryString = require('querystring')

/**
 * Process a user registration step 2 - OneTime password received
 * @param {THTTPResponse} resp
 * @param {string} otp One Time Passwoed
 * @param {string} login user login
 */
function processRegistrationStep2 (resp, otp, login) {
  let userID, userOtpData = null
  let store = new TubDataStore(me.entity)
  uba_otp.authAndExecute(otp, 'EMail', function (uData) {
    userID = Session.userID
    userOtpData = uData
  })
  if (userID) {
    Session.runAsAdmin(function () {
      UB.Repository('uba_user').attrs(['name', 'mi_modifyDate']).where('ID', '=', userID).select(store)

      store.run('update', {
        execParams: {
          ID: userID,
          isPending: false,
          lastPasswordChangeDate: new Date(),
          mi_modifyDate: store.get('mi_modifyDate')
        }
      })
    })

    login = store.get('name')

    Session.emit('registration', {
      authType: 'UB',
      publicRegistration: true,
      userID,
      login,
      userOtpData
    })
  } else {
        // check that login is correct
    Session.runAsAdmin(function () {
      UB.Repository('uba_user').attrs(['ID']).where('name', '=', login).select(store)
    })

    if (store.eof) {
      throw new UB.UBAbort('Invalid OTP')
    }
  }
  resp.writeHead(`Location: ${App.serverURL + confirmationRedirectURI}?login=${encodeURIComponent(login)}`)
  resp.statusCode = 302
}

/**
 * 2-step new user public registration rest endpoint.
 *
 * 1-st step: web page pass a registration parameters as JSON:
 *
 *      POST /rest/uba_user/publicRegistration
 *      {email: "<email>", phone: "", utmSource: '', utmCampaign: '', recaptca: "googleRecaptchaValue"}
 *
 * will:
 *
 *  - create a new uba_user (in pending state isPending===true) and generate a password for user
 *  - generate OTP, and put a optional `utmSource` and `utmCampaign` parameters to the OTP uData
 *  - create a e-mail using using report code, provided by `uba.user.publicRegistrationReportCode` ubs_setting key.
 *    Report take a parameters {login, password, activateUrl, appConfig}
 *  - schedule a confirmation e-mail for user
 *
 * 2-nd step: user folow the link from e-mail
 *
 *      GET /rest/uba_user/publicRegistration?otp=<one time pwd value>&login=<user_login>
 *
 * will:
 *
 *  - check the provided OTP and if it is valud
 *  - remove a `pending` from uba_user row
 *  - fire a `registration` event for {@link Session}
 *
 * Access to endpoint is restricted by default. To enable public registration a ELS rule for Anonymous role for `uba_user.publicRegistration` must be defined in your application.
 *
 *
 * GET if has otp and login get parameter - then activate user
 * else - expect body in kind
 * @param fake
 * @param {THTTPRequest} req
 * @param {THTTPResponse} resp
 */
me.publicRegistration = function (fake, req, resp) {
/*
- if otp parameter present
1. check otp
2. activate user
3. get redirect page address
4. answer redirect
*/

  const mailQueue = require('@unitybase/ubq/modules/mail-queue')
  const UBReport = require('@unitybase/ubs/modules/UBServerReport')

  const publicRegistrationSubject = ubs_settings.loadKey('uba.user.publicRegistrationSubject'),
    publicRegistrationReportCode = ubs_settings.loadKey('uba.user.publicRegistrationReportCode')

  const {otp, login} = QueryString.parse(req.parameters, null, null, {maxKeys: 3}),
    store = new TubDataStore(me.entity)

  if (otp && login) {
    processRegistrationStep2(resp, otp, login)
  } else {
    let body = req.read('utf-8')
    let {email, phone, utmSource, utmCampaign, recaptcha} = JSON.parse(body)
    if (!validateEmail(email)) {
      throw new UB.UBAbort('Provided email address is invalid')
    }
    if (!validateRecaptcha(recaptcha)) {
      throw new UB.UBAbort('reCAPTCTA check fail')
    }
    Session.emit('registrationStart', {
            authType: 'UB',
            publicRegistration: true,
            params: {email, phone, utmSource, utmCampaign, recaptcha}
        });
    Session.runAsAdmin(function () {
      store.run('insert', {
        execParams: {
          name: email,
          email: email,
          phone: phone,
          isPending: true,
          lastPasswordChangeDate: new Date()
        },
        fieldList: ['ID']
      })
      const userID = store.get(0)
      const password = (Math.random() * 100000000000 >>> 0).toString(24)
      me.changePassword(userID, email, password)
      const userOtp = uba_otp.generateOtp('EMail', userID, {utmSource, utmCampaign})

      const registrationAddress = `${App.serverURL}rest/uba_user/publicRegistration?otp=${encodeURIComponent(userOtp)}&login=${encodeURIComponent(email)}`

      let reportResult = UBReport.makeReport(publicRegistrationReportCode, 'html', {
        login: email,
        password: password,
        activateUrl: registrationAddress,
        appConfig: App.serverConfig
      })
      let mailBody = reportResult.reportData;

      mailQueue.queueMail({
        to: email,
        subject: publicRegistrationSubject,
        body: mailBody
      })
    })
    resp.statusCode = 200
    resp.writeEnd({success: true, message: '<strong>Thank you for your request!</strong> We have sent your access credentials via email. You should receive them very soon.'})
  }
}
