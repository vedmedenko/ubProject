/**
 * User login window.
 *
 * Static method DoLogon used by UBConnection to resolve current user credential.
 *
 * @protected
 * @author pavel.mash
 */

Ext.define('UB.view.LoginWindow', {
  extend: 'Ext.window.Window',
  alias: 'widget.loginwindow',

  uses: [
    'UB.core.UBApp',
    'UB.core.UBAppConfig'
  ],

  statics: {
    /**
     * Perform UnityBase `adminUI` client auth. Form must ask user for login/password/authMethod and call connection.auth
     * @param {UBConnection} connection
     * @return {Promise}
     */
    DoLogon: function (connection, isRepeat) {
      var loginWindow,
        silenceKerberosLogin = JSON.parse(window.localStorage.getItem('silenceKerberosLogin') || 'false'),
        userDidLogout = JSON.parse(window.localStorage.getItem('userDidLogout') || 'false'),
        loginPromise

      if (userDidLogout) {
        window.localStorage.setItem('userDidLogout', 'false')
      }

      if (!connection.authMethods.length) {
        return Promise.resolve({
          authSchema: 'None',
          login: 'anonymous'
        })
      }

      if (silenceKerberosLogin && !isRepeat && !userDidLogout && (connection.authMethods.indexOf('Negotiate') >= 0)) {
        return Promise.resolve({
          authSchema: 'Negotiate',
          login: '',
          password: '',
          registration: 0
        })
      }

      loginWindow = Ext.create('UB.view.LoginWindow', {connection: connection})

      loginPromise = new Promise(function (resolve, reject) {
        loginWindow.deferred = {resolve: resolve, reject: reject}
      })
            // user already authorized but session expire
            // disable userName & auth tabs so user can only repeat then same auth
      if (connection.lastLoginName) {
        loginWindow.textFieldLoginCert && loginWindow.textFieldLoginCert.setDisabled(true)
        loginWindow.textFieldLogin && loginWindow.textFieldLogin.setDisabled(true)
        if (loginWindow.authTabs) {
          loginWindow.authTabs.getTabBar().setDisabled(true)
        }
      }
      loginWindow.show()
      Ext.WindowManager.bringToFront(loginWindow)
      return loginPromise
    }
  },

  cls: 'ub-login-window',
  layout: 'anchor',
  buttonAlign: 'center',
  width: 500,
  plain: true,
  modal: true,
  closable: false,
  header: false,
  resizable: false,
  id: 'extClientLoginForm',

    /**
     * @type {UBConnection}
     */
  connection: null,
    /**
     *
     * @param {UBConnection} connection
     */
  constructor: function (connection) {
    this.callParent(arguments)
  },

  destroy: function () {
    this.connection = null
    this.poweredBy && this.poweredBy.destroy()
    if (this.keyNav) {
      this.keyNav.destroy(false)
    }
    this.callParent(arguments)
  },

  listeners: {
    afterRender: function (thisForm, options) {
      this.keyNav = Ext.create('Ext.util.KeyNav', this.el, {
        enter: this.submitLogin,
        scope: this
      })
    }
  },

  initComponent: function () {
    var
      me = this,
      authMethods = me.connection.authMethods,
      authItems = [],
      firstLogin, silenceKerberosLogin,
      minAuthTabsHeight = 265,
      lastSavedLogin = window.localStorage.getItem('lastLogin'),
      locale = this.connection.preferredLocale,
      applicationName
    var cfgAdminUI = UB.appConfig.uiSettings.adminUI
    firstLogin = JSON.parse(window.localStorage.getItem('firstLogin') || 'false')
    silenceKerberosLogin = JSON.parse(window.localStorage.getItem('silenceKerberosLogin') || 'false')

    me.items = []
    me.buttons = [{
      text: UB.i18n('enter'),
      cls: 'ub-login-btn',
      scope: this,
      minWidth: 150,
      margins: '0 0 10 0',
      handler: function () {
        this.submitLogin()
      }
    }]

    // Image
    if (cfgAdminUI && cfgAdminUI.loginWindowTopLogoURL) {
      me.items.push(Ext.create('Ext.Img', {
        src: cfgAdminUI.loginWindowTopLogoURL, // 'images/logo-top.png',
        autoEl: 'div',
        cls: 'logo-top'
      }))
    }
    // form caption
    if (cfgAdminUI && cfgAdminUI.applicationName) {
      if (typeof(cfgAdminUI.applicationName) === 'string')
        applicationName = cfgAdminUI.applicationName
      else if (_.isObject(cfgAdminUI.applicationName))
        applicationName = cfgAdminUI.applicationName[locale]
    }
    if (applicationName) {
      me.items.push({
        xtype: 'component',
        autoEl: {
          tag: 'h2',
          html: applicationName
        }
      })
    }

    // create auth tabs
    var haveCERT = (authMethods.indexOf('CERT') >= 0)
    if (haveCERT) {
      var authenticationCert = cfgAdminUI.authenticationCert || {}

      minAuthTabsHeight = 265 + 80
      me.textFieldLoginCert = Ext.create('Ext.form.field.Text', {
        margin: '0 80 0 80',
        allowBlank: false,
        cls: 'ub-login-input',
        labelClsExtra: 'fa fa-user fa-2x',
        requireText: UB.i18n('login'),
        fieldLabel: ' ',
        labelSeparator: '',
        regex: authenticationCert.userNameRE ? new RegExp(authenticationCert.userNameRE) : null,
        regexText: authenticationCert.userNameREMessage ? UB.i18n(authenticationCert.userNameREMessage): null,
        labelWidth: 40,
        value: me.connection.lastLoginName || lastSavedLogin
      })
      me.textFieldPasswordCert = Ext.create('Ext.form.field.Text', {
        margin: '10 80 10 80',
        allowBlank: false,
        cls: 'ub-login-input',

        labelClsExtra: 'fa fa-key fa-2x',
        requireText: UB.i18n('parol'),
        fieldLabel: ' ',
        labelSeparator: '',
        labelWidth: 40,

        inputType: 'password',
        name: 'password',
        anchor: '100%',
        value: cfgAdminUI.defaultPasswordForDebugOnly
      })

      me.chkFirstLogin = Ext.create('Ext.form.field.Checkbox', {
        margin: '10 80 10 125',
        xtype: 'checkbox',
        labelAlign: 'left',
        labelCls: 'ub-login-label',
        // boxLabelAlign: 'before',
        labelWidth: 80,
        checked: !!firstLogin,
        boxLabel: UB.i18n('isFirstLogin')
      })


      var certItem = []
      var useCertificateInfo = 'useCertificateInfoSimple'
      if (!me.connection.simpleCertAuth){
        useCertificateInfo = 'useCertificateInfo'
        certItem.push(
          me.textFieldLoginCert,
          me.textFieldPasswordCert
        )
      } else if (authenticationCert.requireUserName){
        useCertificateInfo = 'useCertificateInfoSimpleUserName'
        certItem.push(me.textFieldLoginCert)
      }
      if (authenticationCert.description) {
        useCertificateInfo = authenticationCert.description
      }
      certItem.push(
        me.chkFirstLogin,
        {
          xtype: 'component',
          padding: '20 0 0 0',
          autoEl: {
            tag: 'div',
            html: UB.i18n(useCertificateInfo)
          }
        }
      )
      me.pnlCert = Ext.create('Ext.panel.Panel', {
        title: UB.i18n('useCertificateTitle'),
        header: false,
        authType: 'CERT',
        padding: '20 50 0 50',

        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: certItem
      })
      authItems.push(me.pnlCert)
    }

    var haveUB = (authMethods.indexOf('UB') >= 0)
    if (haveUB) {
      me.textFieldLogin = Ext.create('Ext.form.field.Text', {
        margin: '0 80 0 80',
        allowBlank: false,
        cls: 'ub-login-input',
        labelClsExtra: 'fa fa-user fa-2x',
        requireText: UB.i18n('login'),
        fieldLabel: ' ',
        labelSeparator: '',
        labelWidth: 40,
        anchor: '100%',
        value: me.connection.lastLoginName || lastSavedLogin
      })
      me.textFieldPassword = Ext.create('Ext.form.field.Text', {
        margin: '10 80 10 80',
        allowBlank: false,
        cls: 'ub-login-input',
        labelClsExtra: 'fa fa-key fa-2x',
        requireText: UB.i18n('parol'),
        fieldLabel: ' ',
        labelSeparator: '',
        labelWidth: 40,
        inputType: 'password',
        anchor: '100%',
        value: UB.appConfig.uiSettings.adminUI.defaultPasswordForDebugOnly,
        listeners: {
          keyup: {
            fn: $App.passwordKeyUpHandler
          }
        },
        enableKeyEvents: true
      })

      me.pnlUB = Ext.create('Ext.panel.Panel', {
        title: UB.i18n('useUBAuthenticationTitle'),
        header: false,
        authType: 'UB',
        padding: '20 50 30 50',
        layout: {
          type: 'vbox',
          align: 'stretch'
        },
        items: [
          me.textFieldLogin,
          me.textFieldPassword,
          {
            xtype: 'component',
            padding: '50 0 0 0',
            autoEl: {
              tag: 'div',
              html: UB.i18n('useUBAuthenticatinInfo')
            }
          }
        ]
      })
      authItems.push(me.pnlUB)
    }

    var haveNegotiate = (authMethods.indexOf('Negotiate') >= 0)
    if (haveNegotiate) {
      me.chkSilenceLogint = Ext.create('Ext.form.field.Checkbox', {
        margin: '10 80 10 125',
        xtype: 'checkbox',
        labelAlign: 'left',
        labelCls: 'ub-login-label',
                // boxLabelAlign: 'before',
        labelWidth: 80,
        checked: !!silenceKerberosLogin,
        boxLabel: UB.i18n('chkSilenceLogin')
      })
      me.pnlOs = Ext.create('Ext.panel.Panel', {
        title: UB.i18n('useOSCredentialTitle'),
        header: false,
        authType: 'Negotiate',
        padding: '20 50 50 50',
        items: [me.chkSilenceLogint,
          {
            xtype: 'component',
            autoEl: {
              tag: 'div',
              html: UB.i18n('useOSCredentialInfo')
            }
          }]
      })
      authItems.push(me.pnlOs)
    }

    var haveOpenIDConnect = (authMethods.indexOf('OpenIDConnect') >= 0)
    if (haveOpenIDConnect) {
      UB.get('openIDConnect', {responceType: 'json'}).done(function (responce) {
        var OpenIDConnectProviders = responce.data
        var radioGroup = {
          xtype: 'radiogroup',
                    // Arrange radio buttons into two columns, distributed vertically
          columns: 1,
          id: 'extLoginOpenIDType',
          vertical: true,
          items: [
          ]
        }

        OpenIDConnectProviders.forEach(function (provider) {
          radioGroup.items.push({ boxLabel: UB.i18n(provider), name: 'providerName', inputValue: provider})
        })
        if (radioGroup.items.length) {
          radioGroup.items[0].checked = true
        }

        me.pnlOID.add(radioGroup)
      })
      me.pnlOID = Ext.create('Ext.panel.Panel', {
        title: UB.i18n('OpenIDConnect'),
        header: false,
        authType: 'OpenIDConnect',
        padding: '20 150 50 50'
      })
      authItems.push(me.pnlOID)
    }

    if (authItems.length > 1) {
      me.authTabs = Ext.create('Ext.tab.Panel', {
        height: minAuthTabsHeight,
        maxTabWidth: 140,
        tabBar: {
          layout: {
            pack: 'center',
            align: 'middle'
          },
          titleAlign: 'center',
          buttonAlign: 'center'
        },
        items: authItems
      })
      me.items.push(me.authTabs)
    } else {
      me.items.push(authItems[0])
    }

    if (UB.appConfig.uiSettings.adminUI && UB.appConfig.uiSettings.adminUI.loginWindowBottomLogoURL) {
      me.items.push(Ext.create('Ext.Img', {
        src: UB.appConfig.uiSettings.adminUI.loginWindowBottomLogoURL,
        cls: 'logo-bottom'
      }))
    }

    me.poweredByText = 'Powered by UnityBase ' + (me.connection.serverVersion ? me.connection.serverVersion : '')

    me.on('boxready', function () {
      this.poweredBy = Ext.create('Ext.Component', {
        html: this.poweredByText,
        top: '95%',
        style: {
          opacity: 0.5,
          fontSize: '0.9em'
        },
        shadow: false,
        floating: true
      })
      this.poweredBy.showBy(this, 'bl', [15, 4])
    })

    me.callParent(arguments)

    let authPanel
    if (me.authTabs) {
      let lastAuthType = window.localStorage.getItem('lastAuthType') || authMethods[0] // activate first auth method by default
      authPanel = me.query('panel[authType="' + lastAuthType + '"]')[0] || authItems[0]
      me.authTabs.setActiveTab(authPanel)
    } else {
      authPanel = authItems[0]
    }
    let panelInputs = authPanel.query('textfield')
    if (panelInputs[0] && panelInputs[0].getValue()) { // user name is defined - focus password
      me.defaultFocus = panelInputs[1]
    } else {
      me.defaultFocus = panelInputs[0]
    }
  },

  submitLogin: function () {
    var me = this,
      login = '', password = '',
      authType

    authType = me.authTabs ? me.authTabs.getActiveTab().authType : me.down('panel').authType
    if (authType === 'UB') {
      me.textFieldLogin.validate()
      me.textFieldPassword.validate()
      login = Ext.String.trim(me.textFieldLogin.getValue())
      password = Ext.String.trim(me.textFieldPassword.getValue())
      if (!password || password === '' || !login || login === '') {
        return
      }
    }
    if (authType === 'CERT') {
      me.textFieldLoginCert.validate()
      me.textFieldPasswordCert.validate()
      var authenticationCert = UB.appConfig.uiSettings.adminUI.authenticationCert || {}
      if ((!me.connection.simpleCertAuth || authenticationCert.requireUserName) &&
         !me.textFieldLoginCert.validate() ){
         return
      }
      if (!me.connection.simpleCertAuth &&
         !me.textFieldPasswordCert.validate() ){
        return
      }
      login = Ext.String.trim(me.textFieldLoginCert.getValue() || '')
      password = Ext.String.trim(me.textFieldPasswordCert.getValue() || '')
      window.localStorage.setItem('firstLogin', me.chkFirstLogin.checked)
      UB.inject('models/UBA/BigInteger.js').done(function () {
        /**
         * Build password hash as in ERC
         * @param pwd
         * @returns {string}
         * @private
         */
        function ERC_encodePassword (pwd) {
          var maxLen = 30, buff, i, c
          var res = bigInt.one // require('bigint').one;
          buff = pwd
          while (buff.length < maxLen) {
            buff = buff + pwd.length + pwd
          }
          buff = buff.substr(0, maxLen)
          for (i = 1; i <= 30; i++) {
            c = buff.charCodeAt(i - 1) - 15
            res = res.multiply(Math.ceil(c / 3)).add(c * i + i)
          }
          return res.toString().substr(0, maxLen)
        }

        me.deferred.resolve({
          authSchema: authType,
          login: login.toLowerCase(), // [UB-919],
          password: UB.MD5(login.toLowerCase() + ':' + ERC_encodePassword(password)).toString(),
          registration: me.chkFirstLogin.checked ? 1 : 0
        })
      })
    } else if (authType === 'OpenIDConnect') {
      var selectedBtn = Ext.getCmp('extLoginOpenIDType').getValue()
      var url = window.location.href
      url = url.substr(0, url.lastIndexOf('/')) + '/openIDConnect/' + selectedBtn.providerName

      function getWindowConfig () {
        var width = 600,
          height = 525,
          left = Math.floor(window.screenX + (window.outerWidth - width) / 2),
          top = Math.floor(window.screenY + (window.outerHeight - height) / 2)

        return 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0'
      }

      var loginWindowOpenID = window.open(url, 'login', getWindowConfig())
      function loginListener (event) {
        if (event.source === loginWindowOpenID) {
          window.removeEventListener('message', loginListener)
          if (event.origin.indexOf(window.location.origin) === 0) {
            var response = event.data

            if (response.success) {
              response.authSchema = 'OpenIDConnect'
              me.deferred.resolve(response)
              me.close()
            } else {
              $App.dialogError('authOpenIDConnectFail')
            }
          } else {
            $App.dialogError('authOpenIDConnectFail')
          }
        }
      }
      window.addEventListener('message', loginListener)
      window.localStorage.setItem('lastAuthType', authType)
      return
    } else {
      me.deferred.resolve({
        authSchema: authType,
        login: login.toLowerCase(), // [UB-919],
        password: password,
        registration: 0 // me.chkFirstLogin.checked ? 1: 0
      })
    }
    window.localStorage.setItem('lastAuthType', authType)
    window.localStorage.setItem('lastLogin', login)

    if (authType === 'Negotiate') {
      window.localStorage.setItem('silenceKerberosLogin', me.chkSilenceLogint.getValue())
    }

    me.close()
  }
})
