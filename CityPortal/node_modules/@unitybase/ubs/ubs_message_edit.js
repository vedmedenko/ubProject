var me = ubs_message_edit;
const WebSockets = require('@unitybase/ub/modules/web-sockets');

me.on('update:after', mayBeNotify);

/**
 * Filter only completed(ready for send) up-to-date messages for logged in user
 * @param {ubMethodParams} ctx
 * @return {boolean}
 */
function mayBeNotify(ctx){
    "use strict";
    var notifier = WebSockets.getWSNotifier();
    if (notifier) {
        var store = ctx.dataStore;
        var dn = store.currentDataName;
        store.currentDataName = 'selectAfterUpdate';
        if (!store.eof && store.get('complete')){
            console.debug('ubs_message_edit: detected ready to send message - try to notify using WS');
            var
                sentTime = new Date(store.get('startDate')),
                _expireStr = store.get('expireDate'),
                expireDate = _expireStr ? new Date(store.get('expireDate')) : null,
                now = new Date();
            if ((sentTime <= now) && (!expireDate || (expireDate >= now)) ){
                me.notifyAllMessageRecipients(store.get('ID'));
            }
        }
    }
}

/**
 * Send a WS command `ubs_message` to all recipient of message with ID `messageID`
 * @param {Number} messageID
 */
me.notifyAllMessageRecipients = function notifyAllMessageRecipient(messageID){
    "use strict";
    var recipients = UB.Repository('ubs_message_recipient')
        .attrs('userID')
        .where('messageID', '=', messageID)
        .where('acceptDate', 'isNull')
        .selectAsObject();
    var notifier = WebSockets.getWSNotifier(),
        wsSessions;

    function doNotify(wsSession){
        notifier.sendCommand('ubs_message', wsSession, {info: 'newMessage'});
    }
    if (notifier){
        for(var i= 0, l = recipients.length; i<l; i++){
            wsSessions = notifier.getUserSessions(recipients[i].userID);
            wsSessions.forEach(doNotify);
        }
    }
};

/**
 * Send a WS command `ubs_message` to all recipient who have a ready to send unaccepted messages.
 * To be user in scheduler for sending notification
 */
me.notifyAllRecipients = function  notifyAllRecipients(){
    var notifier = WebSockets.getWSNotifier(),
        now = new Date(),
        wsSessions,
        recipients;

    function doNotify(wsSession){
        notifier.sendCommand('ubs_message', wsSession, {info: 'newMessage'});
    }

    if (notifier){
        recipients = UB.Repository('ubs_message_recipient')
            .attrs('userID')
            .where('acceptDate', 'isNull')
            .where('[messageID.complete]', '=', 1)
            .where('[messageID.startDate]', '>=', now)
            .where('[messageID.expireDate]', '<=', now)
            .groupBy('userID')
            .select();
        while (!recipients.eof) {
            wsSessions = notifier.getUserSessions(recipients.get(0));
            wsSessions.forEach(doNotify);
        }
        recipients.freeNative();
    }
};

