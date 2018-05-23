require('./UBAppConfig')
require('./UBUtil')

/**
 * Файл: UB.core.UBLocalStorageManager.js
 * Автор: Игорь Ноженко
 * 
 * Менеджер localStorage
 * 
 * Обеспечивает работу с localStorage
 * Содержит сервисные функции для формирования key'ев
 */

Ext.define("UB.core.UBLocalStorageManager", {
    singleton: true,

    // requires: [
    //     "UB.core.UBAppConfig",
    //     "UB.core.UBUtil"
    // ],

  uses: ["UB.core.UBApp"],

    separator: ":",

    /**
     * Возвращает "key_suffix"
     * 
     * @param {String} key
     * @param {String} suffix
     * @return {String}
     */
    getKey: function(key, suffix) {
        return UB.core.UBUtil.gatherStr(key, '_', suffix);
    },

    /**
     * Возвращает "key_UI"
     * 
     * @param {String} key
     * @return {String}
     */
    getKeyUI: function(key) {
        return this.getKey(key, 'UI');
    },

    /**
     * Возвращает "login:key"
     * 
     * @param {String} key
     * @return {String}
     */
    getFullKey: function(key) {
        var
            login = $App.connection.userLogin();

        return login && login.length ? login + this.separator + key : undefined;
    },

    /**
     *
     * @param {String} key
     * @param {Function} [callback]
     * @param [scope]
     * @param {Boolean} [decode]
     * @return {String}
     */
    getItem: function(key, callback, scope, decode) {
        var
            fullKey = this.getFullKey(key),
            data = fullKey ? UB.core.UBUtil.getLocalStorageItem(fullKey) : undefined;
        if(decode || callback){
            data = Ext.JSON.decode(data, true);
        }

        Ext.callback(callback, scope||this, [data] );
        return data;
    },

    /**
     * 
     * @param {String} key
     * @param {String} data
     * @param {Boolean} encode (optional)
     */
    setItem: function(key, data, callback, scope) {
        var
            fullKey=this.getFullKey(key);
        if(Ext.isObject(data)){
            data = Ext.JSON.encode(data);
        }
        if(fullKey){
            UB.core.UBUtil.setLocalStorageItem(fullKey, data);
        }
        Ext.callback(callback, scope||this );
    },
    
    /**
     * 
     * @param {String} key
     */
    removeItem: function(key, callback, scope) {
        var
            fullKey;

        if(fullKey=this.getFullKey(key))
            UB.core.UBUtil.removeLocalStorageItem(fullKey);
        Ext.callback(callback, scope||this );
    },

    /**
     * @param {Function} callback
     * @param {Object} scope
     */
    clear: function(callback, scope) {
        UB.core.UBUtil.clearLocalStorage();
        Ext.callback(callback, scope||this);
    },

    /**
     * 
     * @param {String} [login] (optional)
     * @return {String[]}
     */
    getUserKeys: function(login, callback, scope) {
        var
            keys = [],
            allKeys = UB.core.UBUtil.getLocalStorageKeys(),
            regexp,
            m;

        login = login || $App.connection.userLogin();
        regexp = new RegExp(Ext.util.Format.format("(?:{0}{1})(.*)", login, this.separator));
        for(var i=0, len=allKeys.length; i<len; ++i)  {
            if(m=UB.core.UBUtil.getRegExpGroup(allKeys[i], regexp, 1)) {
                keys.push(m);
            }
        }

        Ext.callback(callback, scope||this, [keys]);
        return keys;
    },

    getKeys: function(callback, scope) {
        var keys = UB.core.UBUtil.getLocalStorageKeys();
        Ext.callback(callback, scope||Ext.global, [keys]);
        return keys;
    },
    /**
     * 
     * @param {RegExp} regexp
     * @param {Function} fn
     * @param {Object} scope
     */
    removeUserItemsRegExp: function(regexp, fn, scope) {
        var
            keys = this.getUserKeys();

        fn = fn || this.removeItem;
        scope = scope || this;

        for(var i=0, len=keys.length; i<len; ++i) {
            if(regexp.test(keys[i])){
                fn.call(scope, keys[i]);
            }
        }

    },

    removeUserDataUI: function() {
        var
            keys = this.getKeys(),
            re = /_UI$/;
        keys.forEach(function(key){
            if (re.test(key) ){
                localStorage.removeItem(key);
            }
        });
        //this.removeUserItemsRegExp(new RegExp('.*?(?=_UI)'), Ext.state.Manager.clear, Ext.state.Manager);
    }
});
