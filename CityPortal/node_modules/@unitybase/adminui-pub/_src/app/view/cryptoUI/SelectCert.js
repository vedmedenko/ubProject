/**
 * Created by xmax on 21.08.2017.
 */

Ext.define('UB.view.cryptoUI.SelectCert', {
  extend: 'Ext.window.Window',
  alias: 'widget.selectcertwindow',

  uses: [
    'UB.core.UBApp',
    'UB.core.UBAppConfig'
  ],

  statics: {
    /**
     * Perform UnityBase `adminUI` form select certificate.
     * @return {Promise}
     */
    getCertificates: function () {
      var form = Ext.create('UB.view.cryptoUI.SelectCert', {})

      var promise = new Promise(function (resolve, reject) {
        form.deferred = {resolve: resolve, reject: reject}
      })
      form.show()

      return promise
    }
  },

  layout: 'anchor',
  buttonAlign: 'center',
  width: 500,
  plain: true,
  modal: true,
  closable: false,
  header: false,
  resizable: false,

  listeners: {
    afterRender: function (thisForm, options) {
      this.keyNav = Ext.create('Ext.util.KeyNav', this.el, {
        enter: this.submitForm,
        scope: this
      })
    }
  },

  initComponent: function () {
    var
      me = this

    me.items = []
    me.buttons = [{
      text: UB.i18n('enter'),
      scope: this,
      minWidth: 150,
      margins: '0 0 10 0',
      handler: function () {
        this.submitForm()
      }
    },{
      text: UB.i18n('Cancel'),
      scope: this,
      minWidth: 150,
      margins: '0 0 10 0',
      handler: function () {
        me.deferred.reject(new UB.UBAbortError)
        me.close()
      }
    }]

    me.fieldFile = Ext.create('Ext.form.field.File', {
      margin: '10 80 10 80',
      name: 'document',
      allowBlank: false,
      //inputType: 'file',
      //labelClsExtra: 'fa fa-user-secret fa-2x',
      blankText: UB.i18n('obazatelnoePole'),
      labelWidth: 40,
      labelSeparator: '',
      fieldLabel: UB.i18n('Certificates '),
      // fieldLabel: UB.i18n('privateKeyFile'),
      anchor: '100%',
      buttonText: '',
      buttonConfig: {
        iconCls:'iconAttach'
      },
      listeners: {
        afterrender: function( sender ){
          sender.getEl().dom.addEventListener('change', me.onFileSelect, false);
          sender.inputEl.on('click',function(){
            this.button.fileInputEl.dom.click();
          },sender);
        },
        scope: this
      }
    });

    me.pnl = Ext.create('Ext.panel.Panel', {
      //title: UB.i18n('useUBAuthenticationTitle'),
      header: false,
      padding: '20 50 30 50',
      layout: {
        type: 'vbox',
        align: 'stretch'
      },
      items: [
        me.fieldFile,
        {
          xtype: 'component',
          padding: '50 0 0 0',
          autoEl: {
            tag: 'div',
            html: UB.i18n('useCertAuthenticatinUploadCert')
          }
        }
      ]
    })

    me.items.push(me.pnl)

    me.callParent(arguments)

  },

  onFileSelect: function(files){

  },

  submitForm: function () {
    var me = this

    me.deferred.resolve({
      certFiles: me.fieldFile.fileInputEl.dom.files
    })

    me.close()
  }
})
