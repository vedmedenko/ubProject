exports.Monitor = {
   logout: function(conn) {
       if (conn && conn.isAuthorized()) {
           conn.xhr({
               endpoint: 'logout',
               method: 'POST'
           });
       }
   },
    monConnect: function(host, app) {
        var
            result,
            UBConnection = require('UBConnection');
        try {
            result =  new UBConnection({
                server: host,
                appName: app
            });
            result.onRequestAuthParams = function() {
                return {authSchema: 'UBIP', login: 'monitor', password: 'monitor'}
            };
        } catch (e) {
            result = {errorMsg: e.message};
        }
        return result;
    },


    /**
     * @method
     * returns statistic info for specified instance of UB
     * @param {String} host
     * @param {String} app
     * @return {Object}
     *
     */
    getStatInfo:  function (host, app) {
        var
            me = this,
            result,
            conn = me.monConnect(host, app);
        if (conn.errorMsg) {
            result = conn;
        } else {
            try {
                result = conn.xhr({
                    endpoint: 'stat',
                    method: 'POST'
                });
                me.logout(conn);
            } catch(e) {
                result = {errorMsg: e.message};
            }
        }
        return result;
    },

    getServerInfo:  function getServerInfo() {
        var
            result = {},ww,
            fs = require('fs'),
            path = require('path'),
            argv = process.argv,
            configContent,
            config,
            stripJsonComments = function (str) {
                //return str.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
                var
                    currentChar,
                    nextChar,
                    insideString = false,
                    insideComment = false,
                    result = '',
                    singleComment = 1,
                    multiComment = 2;
                for (var i = 0; i < str.length; i++) {
                    currentChar = str[i];
                    nextChar = str[i + 1];
                    if (!insideComment && currentChar === '"') {
                        var escaped = str[i - 1] === '\\' && str[i - 2] !== '\\';
                        if (!escaped) {
                            insideString = !insideString;
                        }
                    }
                    if (insideString) {
                        result += currentChar;
                        continue;
                    }
                    if (!insideComment && currentChar + nextChar === '//') {
                        insideComment = singleComment;
                        i++;
                    } else
                    if (insideComment === singleComment && currentChar + nextChar === '\r\n') {
                        insideComment = false;
                        i++;
                        result += currentChar;
                        result += nextChar;
                        continue;
                    } else
                    if (insideComment === singleComment && currentChar === '\n') {
                        insideComment = false;
                    } else
                    if (!insideComment && currentChar + nextChar === '/*') {
                        insideComment = multiComment;
                        i++;
                        continue;
                    } else
                    if (insideComment === multiComment && currentChar + nextChar === '*/') {
                        insideComment = false;
                        i++;
                        continue;
                    }
                    if (insideComment) {
                        continue;
                    }
                    result += currentChar;
                    }
                    return result;
                },
            stripWaste = function (str) {
                    return stripJsonComments(String(str)).
                        replace(/[\n\r]/g, ' '). //stripping line breaks
                        replace(/\t/g, ' '); //stripping tabs
            };
        result.exeName = argv[0];
        try {
            result.startDate = fs.statSync(result.exeName).ctime;
        } catch (e) {
            delete result.startDate;
        }

        for (var i = 1, len = argv.length; i < len; ++i) {
            if (argv[i].toLowerCase() == '-cfg' && argv[i+1]) {
                result.configFileName = argv[i+1];
                break;
            }
        }
        if (!result.configFileName) {
            result.configFileName = process.cwd()+'ubConfig.json';
        }
        configContent = String(fs.readFileSync(result.configFileName, 'utf8'));
        result.config = stripWaste(configContent);
        result.serviceLocationPath = path.dirname(result.configFileName);
        var verDir = path.dirname(result.configFileName);
        var files = fs.readdirSync(verDir);
        files.forEach(function(item){
           if (path.extname(item).toLowerCase() == '.ver' && item.indexOf('_') !== 0 && !result.appVersion) {
               var
                   parts = path.basename(item).split('.');
               if (parts.length) {
                   parts.splice(parts.length-1);
                   result.appVersion = parts.join('.');
               }
           }
        });
        if (!result.appVersion) {
            result.appVersion = '?';
        }
        return result;
    }

};
