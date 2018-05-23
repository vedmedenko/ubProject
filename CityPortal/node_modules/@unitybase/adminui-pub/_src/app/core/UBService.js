require('./UBApp')
require('./UBAppConfig')
/**
 * Файл: UB.core.UBService.js
 * Автор: Игорь Ноженко
 * 
 * Реализует низкоуровневую передачу данных на сервер
 */

Ext.define("UB.core.UBService", {
    singleton: true,

    TRANSACTION_ID: 0,

    // requires: [
    //     "UB.core.UBApp",
    //     "UB.core.UBAppConfig"
    // ],

    method: {
        runList: "runList",
        getDocument: "getDocument"
// DEPRECATED
//        setDocument: "setDocument",
//        setDocumentMultipart: "setDocumentMultipart"
    },
    enableBuffer: 20,

    callTask: null,

    callBuffer: [],
    /**
     * 
     * @ param {String} methodName
     * @return {String}
     * @deprecated
     */
    getUrl: function(/*methodName*/) {
        throw new Error('deprecated. Use methods from $App.connection \r\n' +
            ' $App.connection.authorize().then(function(session){\r\n' +
            " me.dom.href = Ext.String.urlAppend( me.href, 'session_signature='+session.signature())\r\n" +
            '})\r\n');
    },

    /**
     * 
     * @param {Object[]} params
     * @param {Function} callback
     * @param {Object} scope
     * @deprecated Use $App.connection.run({entity:...}).then(..) or $App.connection.runTrans([{entity:...}])
     */
    runList: function(params, callback, scope) {
        UB.logDebug('UBService.runList is deprecated. Use $App.connection.run({entity:...}).then(..) or runTrans([{entity:...}])');
        var
            me = this,
            enableBuffer = me.enableBuffer;

        if(!Ext.isArray(params)){
            params = [params];
        }
        if (enableBuffer && params.length === 1) {
            me.callBuffer.push({
                transactionId: ++UB.core.UBService.TRANSACTION_ID,
                params: params[0],
                callback: callback,
                scope: scope
            });

            if (!me.callTask) {
                me.callTask = new Ext.util.DelayedTask(me.combineAndSend, me);
            }

            me.callTask.delay(Ext.isNumber(enableBuffer) ? enableBuffer : 10);
        }
        else {
            me.sendRequest(params, callback, scope);
        }
    },

    combineAndSend : function() {
        var me = this,
            buffer = me.callBuffer,
            len = buffer.length;

        if (len > 0) {
            me.sendRequest();
            me.callBuffer = [];
        }
    },

    /**
     * Sends a request to the server
     *
     * @param {Object/Array} [data] The data to send. If no data passed - send each callBuffer
     * @param {Function} [callback]
     * @param {Object} [scope]
     * @private
     * @deprecated
     */
    sendRequest: function(data, callback, scope){

        var
            me = this,
            params = [],
            callBackList = {};
        if(data){
            params = data;
        } else {
            Ext.each(me.callBuffer, function(item){
                callBackList[item.transactionId] = {
                    fn: item.callback,
                    scope: item.scope
                };
                item.params.transactionId = item.transactionId;
                params.push(item.params);
            });
        }

        $App.connection.post('ubql', params)
            .then(function(response){
                var
                    result = response.data,
                    jsonData = response.config.data;
                if(data){
                    Ext.callback(callback, scope, [result, jsonData] );
                } else {
                    Ext.each(result, function(item, index ){
                        var callback = callBackList[item.transactionId];
                        Ext.callback(callback.fn, callback.scope, [[item], jsonData[index]], 0 );
                    });
                }
            }, function(failReason){
                if(data){
                    Ext.callback(callback, scope, [{
                        serverFailure: true
                    }]);
                } else {
                    Ext.Object.each(callBackList, function(index, callback ){
                        Ext.callback(callback.fn, callback.scope, [{
                            serverFailure: true
                        }], 0 );
                    });
                }
                if (failReason.data && failReason.data.errMsg){
                    throw new Error(failReason.data.errMsg);
                } else {
                    throw failReason;
                }
            });
    },
    /**
     * 
     * @param {Object} params
     * @param {Function} [callback]
     * @param {Object} [scope] Callback scope
     * @param {Object} [options]
     * @param {Boolean} [options.binary]
     * @param {Boolean} [options.usePostMethod]
     * @param {Boolean} [options.noCache]
     * @returns {Promise|null} If callback is not null return null
     */
   getDocument: function(params, callback, scope, options) {
        //todo можно сделать без callback
        var me = this, promise,
            opt = Ext.apply({}, options),
            allowedParams = ['entity', 'attribute', 'ID', 'id', 'isDirty', 'forceMime', 'fileName', 'store', 'revision'],
            reqParams = {
                url: 'getDocument',
                method: opt.usePostMethod ? 'POST' : 'GET'
            };
        if (options && options.binary){
            reqParams.responseType = 'arraybuffer';
        }
        if (opt.usePostMethod){
            reqParams.data = _.clone(params);
            Object.keys(reqParams.data).forEach(function(key){
                if (allowedParams.indexOf(key) === -1){
                    delete reqParams.data[key];
                    UB.logDebug('invalid parameter "' + key + '" passed to getDocument request');
                }
            });
        } else {
            reqParams.params = params;
        }
        promise = $App.connection.xhr(reqParams)
            .then(function(response){
                if (callback){
                   Ext.callback(callback, scope || me, [response.data, params] );
                }
                return response.data;
            })
            .catch(function(){
                UB.showErrorWindow('<span style="color: red">' + UB.i18n('documentNotFound') + '<span/>');
            });
        if (callback){
            return null;
        } else {
            return promise;
        }
   },

    /**
     * 
     * @ param {Object} params
     * @ param {String} method
     * @ param {Object} document
     * @ param {Function} callback
     * @ param {Object} scope
     * @deprecated
     */
    setDocument: function(/*params, method, document, callback, scope*/) {
        //noinspection JSValidateTypes
        throw new Error('UBService.setDocument is deprecated!!');
//        Use code like this:
//        $App.connection.post('setDocument', me.ubCmp.getValue(), {
//            params: {
//                entity: me.entityName,
//                attribute: me.attributeName,
//                ID: me.instanceID,
//                filename: val && val.origName ? val.origName :
//                    (me.documentMIME && (me.documentMIME.indexOf('/') < me.documentMIME.length - 1) ?
//                        'newfile.' + me.documentMIME.substr(me.documentMIME.indexOf('/')+1) : '' )
//            },
//            headers: {"Content-Type": "application/octet-stream"}
//        })
//        var request, isRawData = (params && params.isRawData);
//        request  = {
//            url: Ext.String.urlAppend($App.connection.getUrl(this.method.setDocument), Ext.Object.toQueryString(params)),
//                method: method,
//            jsonData: document,
//            headers: Ext.apply({
//                    "Content-Type": "application/octet-stream"
//                },
//                UB.core.UBApp.getSessionSignature()
//            ),
//            scope: this,
//            success: function(response) {
//                 Ext.callback(callback, scope, [response.responseText] );
//            }
//        };
//        if (isRawData){
//            delete params.isRawData;
//            request.binary = document;
//        } else {
//            request.jsonData = document;
//        }
//
//        Ext.Ajax.request(request);
    },

    /**
     * @deprecated
     */
    setUserData: function(/*params, callback, scope*/) {
        throw new Error('deprecated. Use uba_user.changeLanguage')
    }
});