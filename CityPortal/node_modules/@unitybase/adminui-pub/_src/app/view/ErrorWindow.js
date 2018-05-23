/**
 * Various functions for error visualization. Almost all aliased to UB namespace.
 *
 *      // show error window. 'translateThis' wil be translated using UB.i18n
 *      UB.showErrorWindow('translateThis');
 *      // show error window with details
 *      UB.showErrorWindow('translate this', null, null, 'this text is shown in details section');
 *
 * @class UB.view.ErrorWindow
 * @singleton
 */
//@define UB.view.ErrorWindow
if (!UB.view){
    UB.view = {};
}

UB.view.ErrorWindow = {
  errList: [],

    /**
     *
     * @param {Object} config
     * @param {String} config.errMsg
     * @param {String} [config.errCode]  (optional)
     * @param {String} [config.entityCode] (optional)
     * @param {String} [config.detail]  (optional)
     */
  showError: function(config){
      var me = this;
      config.errMsg = UB.i18n(config.errMsg);

      if (!me.isInited){
          me.init();
      }
      if (me.inProcessInit){
          me.errList.push(config);
      } else {
         me.renderErr(config);
      }
  },

  renderErr: function(config){
      var
          me = this, eDiv,  msgDiv, detailDiv, showDetail, closeMenu, detailCloseBtn, menuOpened = false;

      if (me.lastError && (me.lastError.errMsg === config.errMsg) && (me.lastError.detail === config.detail) ) {
          return;
      }
      me.lastError = config;

      me.mask.style.display = 'inline';
      me.main.style.display = 'inline';

      eDiv  = document.createElement('div');
      eDiv.className = 'ub-error-win-c-item';

      msgDiv = document.createElement('div');
      msgDiv.style.width = '100%';
      msgDiv.style.padding = '5px';
      msgDiv.style.display = 'table-cell';
      msgDiv.innerHTML = config.errMsg;
      eDiv.appendChild(msgDiv);

      msgDiv.oncontextmenu = function(event){
          //debugger;
          var removeCtxMenu = function(){
              me.removeEvent(document.body, "click", closeMenu);
              document.body.removeChild(msgDiv);
              menuOpened = false;
          };
          if (menuOpened){
              removeCtxMenu();
          }
          msgDiv = document.createElement('button');
          msgDiv.className = 'ub-error-win-detail-btn';
          msgDiv.innerHTML = UB.i18n('showDeveloperDetail');
          msgDiv.style.position = 'absolute';
          msgDiv.style.left = event.clientX + 'px';
          msgDiv.style.top = event.clientY + 'px';
          msgDiv.onclick = function(e){
              showDetail(arguments);
              removeCtxMenu();
          };
          document.body.appendChild(msgDiv);
          closeMenu = function(e){
              if (e.target !== msgDiv ){
                  removeCtxMenu();
              }
          };

          //document.addEventListener("click", closeMenu);
          me.addEvent(document.body, 'click', closeMenu);
          menuOpened = true;
      };

      detailDiv = document.createElement('div');
      detailDiv.className = 'ub-error-win-c-detail';
      detailDiv.style.width = '100%';
      detailDiv.style.display = 'none';
      eDiv.appendChild(detailDiv);

      msgDiv = document.createElement('div');
      msgDiv.style.padding = '5px';
      msgDiv.innerHTML = config.detail || config.errMsg;
      msgDiv.style.display = 'table-cell';
      msgDiv.style.width = '100%';
      detailDiv.appendChild(msgDiv);

      msgDiv = document.createElement('div');
      msgDiv.style.padding = '5px';
      msgDiv.style.width = 'auto';
      msgDiv.style.display = 'table-cell';
      msgDiv.style.cursor = 'pointer';
      detailCloseBtn = document.createElement('a');
      detailCloseBtn.className = 'ub-error-win-btn-detail-close fa fa-times';
      detailCloseBtn.onclick = function(e){
          showDetail(arguments);
      };
      msgDiv.appendChild(detailCloseBtn);
      detailDiv.appendChild(msgDiv);


      me.content.appendChild(eDiv);
      me.mask.focus();
      me.main.focus();
      me.main.click();
      me.mask.click();

      showDetail = function(){
          if (detailDiv.style.display === 'none'){
             detailDiv.style.display = 'inline-block';
          } else {
              detailDiv.style.display = 'none';
          }
      };
  },

  closeWindow: function(){
      var me = this;
      me.mask.style.display = 'none';
      me.main.style.display = 'none';
      me.clearContent();
  },

  clearContent: function(){
      var me = this;
      delete me.lastError;
      for( var i = me.content.childNodes.length - 1; i >= 0; i--){
              me.content.removeChild(me.content.childNodes[i]);
      }
  },

  addEvent:  function (elem, type, handler){
     if (elem.addEventListener){
         elem.addEventListener(type, handler, false);
     } else {
         elem.attachEvent("on"+type, handler);
     }

  },

  removeEvent:  function (elem, type, handler){
        if (elem.removeEventListener){
            elem.removeEventListener(type, handler, false);
        } else {
            elem.detachEvent("on"+type, handler);
        }

  },

  init: function(){
      var
          me = this,
          main, mask, btn, onclick, header;
      if (me.inProcessInit){
          return;
      }
      me.inProcessInit = true;
      me.main = main = document.createElement('div');
      main.className = 'ub-error-win';
      main.style.display = 'none';
      //main.style.width = '600px';
      //main.style.height = '400px';
      main.style.left = (window.innerWidth - 600) / 2 + 'px';
      main.style.top = (window.innerHeight - 400) / 2 + 'px';
      main.tabindex = "5";
      document.body.appendChild(main);
      main.setAttribute('tabindex', '5');

          main.innerHTML = ['<div class="ub-error-win-inner"><table collspan="0" rowspam="0" style="border-spacing: 0px;" width="100%" height="100%" >',
      '<tr><td ><div class="ub-error-win-header">', '<i class="fa fa-2x fa-exclamation-triangle"></i> ',  /*UB.i18n('error')*/, '</div></td></tr>',
      '<tr><td class="ub-error-win-content">',
      '<div class="ub-error-win-contentT" style="width:600px; min-height: 80px; max-height: 350px;"></div>',
      '</td></tr>',
      '<tr><td><div class="ub-error-win-footer"><button class="ub-error-win-btn ub-error-win-btn-ok" tabindex="1" >', UB.i18n('ok'), '</button></div></td></tr>',
      '</table></div>'].join('');

      me.mask = mask = document.createElement('div');
      mask.className = 'ub-mask';
      mask.style.display = 'none';
      document.body.appendChild(mask);

      me.content = main.querySelector('[class="ub-error-win-contentT"]');
      header = main.querySelector('[class="ub-error-win-header"]');
      var onmouseup = function(e){
              main.moveWin = false;
              me.removeEvent(document.body, 'mouseup', onmouseup);
              me.removeEvent(document.body, 'mousemove', onmousemove);
          },
          onmousemove = function(e){
              if (main.moveWin){
                  main.style.left = e.x - main.moveWin.x  + main.offsetLeft + document.body.scrollLeft + 'px';
                  main.style.top = e.y - main.moveWin.y  + main.offsetTop + document.body.scrollTop + 'px';
                  main.moveWin.x = e.x;
                  main.moveWin.y = e.y;
              }
          };
      header.onmousedown = function(e){
          main.moveWin = {x: e.x, y: e.y};
          me.addEvent(document.body, 'mouseup', onmouseup);
          me.addEvent(document.body, 'mousemove', onmousemove);
      };
      btn = main.querySelector('[class*="ub-error-win-btn-ok"]');
      btn.focus();
      btn.tabindex = 1;


      function lockKey(e) {
          btn.focus();
          return false;
      }
      btn.onkeypress = lockKey;
      btn.onkeyup = lockKey;
      btn.onkeydown = function(e) {
          if (e.keyCode === 13 || e.keyCode === 27 ) {
              onclick();
          }
          var ctrlKey = 17, insKey = 45, cKey = 67;
          if (e.keyCode === ctrlKey || e.keyCode === insKey || e.keyCode === cKey ){
              return;
          }
          return false;
      };

      main.onkeypress = lockKey;
      main.onkeyup = lockKey;
      main.onkeydown = btn.onkeydown;

      onclick = function(){
         me.closeWindow();
      };
      if (btn.attachEvent){
          btn.attachEvent('onclick', onclick);
      } else {
          btn.onclick = onclick;
      }
      me.isInited = true;
      me.inProcessInit = false;

      me.errList.forEach(function(errConfig){
          me.renderErr(errConfig);
      });
      me.errList = [];

      me.mask.setAttribute('tabindex', '5');
      me.mask.onkeypress = lockKey;
      me.mask.onkeyup = lockKey;
      me.mask.onkeydown = btn.onkeydown;

  }

};

/**
 *  Show error window.
 *  Translate error message using {@link UB#i18n i18n}
 * @param {String|Object|Error|UBError} errMsg  message to show
 * @param {String} [errCode] (Optional) error code
 * @param {String} [entityCode] (Optional) entity code
 */
UB.showErrorWindow = function(errMsg, errCode, entityCode, detail){
    var errDetails = detail || '';
    if (errMsg && errMsg instanceof UB.UBError){
        errCode = errMsg.code;
        errDetails = errMsg.detail;
        if(errMsg.stack) {
            errDetails += '<BR/>stackTrace:' + errMsg.stack;
        }
        errMsg = errMsg.message;
    } else if (errMsg instanceof Error){
        if(errMsg.stack) {
            errDetails += '<BR/>stackTrace:' + errMsg.stack;
        }
        errMsg = errMsg.toString();
    } else if ( Ext.isObject(errMsg) ){
        errCode = errMsg.errCode;
        entityCode = errMsg.entity;
        errMsg = errMsg.errMsg ? errMsg.errMsg : JSON.stringify(errMsg);
        errDetails = errMsg.detail || errDetails;
    }
      //var wnd = Ext.WindowMgr.get('ub-error-Window') ||  Ext.create('UB.view.ErrorWindow',{id:'ub-error-Window'});
    UB.view.ErrorWindow.showError({errMsg: errMsg, errCode: errCode, entityCode: entityCode, detail: errDetails });
};


UB.showResponseError = function(result){
    if (result.errCode === UB.core.UBCommand.errCode.MODIFIED_BY_ANOTHER_USER) {
        var
            resultData = result.resultData,
            datePos = _.find(resultData.fields, 'mi_modifyDate'),
            userPos = _.find(resultData.fields, 'mi_modifyUser'),
            userId = resultData.data[0][userPos],
            dateTime = Ext.Date.format(Ext.Date.parse(resultData.data[datePos], "c"), Ext.util.Format.datetimeFormat);
        //TODO - rewrite!
        UB.core.UBDataLoader.loadInstance({
            entityName: 'uba_user',
            fieldList: ['name'],
            id: userId,
            callback: function (rec) {
                var
                    runLinkCmd = UB.format('UB.core.UBApp.runLink(&quot;command=ShowFormUser&amp;id={2}&quot;); Ext.fly(this).up(&quot;div.x-window&quot;).hide();', userId);
                Ext.Msg.show({
                    title: UB.i18n('error'),
                    msg: UB.format('{0} <a href="#" onclick="{1}">{2}</a> {3}', result.errMsg, runLinkCmd, rec.get('name'), dateTime),
                    buttons: Ext.Msg.OK,
                    icon: Ext.Msg.ERROR
                });
            },
            scope: this
        });
    } else {
        UB.showErrorWindow(result.errMsg, result.errCode,  result.entity);
    }
    throw new Error(result.errMsg);
};
/**
 * Show notification to UI
 * @param {Object} cfg
 * @param {String} cfg.entityTitle
 * @param {String} cfg.fieldLabel
 * @param {Function} cfg.callback
 */
UB.toast = function(cfg){
    var toast = Ext.create('widget.uxNotification', {
        title: UB.i18n('error'),
        position: 't',
        slideInDuration: 800,
        slideBackDuration: 1500,
        slideInAnimation: 'elasticIn',
        slideBackAnimation: 'elasticIn',
        useXAxis: true,
        autoShow: true,
        cls: 'ux-notification-light',
        iconCls: 'ux-notification-icon-error',
        bodyPadding: 5,
        items: [{
            html: UB.format( UB.i18n('oshibkaVvoda'), cfg.entityTitle),
            border: false
        }, {
            xtype: 'box',
            autoEl: {
                tag: 'a',
                href: '#',
                onclick: 'return false;',
                html: cfg.fieldLabel
            },
            listeners: {
                boxready: function(box){
                    box.getEl().on({
                        click: function(){
                            toast.close();
                            Ext.callback(cfg.callback);
                            return false;
                        }
                    });
                }
            }
        }]
    });
};
