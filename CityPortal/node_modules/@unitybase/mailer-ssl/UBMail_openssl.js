/**
 * Implementation of UBMail with openssl. This module loading time is more then 2 seconds. So if you not need use ssl use UBMail.
 *
 * You need OpenSSL libraries version >= 0.9.7 to be installed and libraries libssl32.dll, libeay32.dll, ssleay32.dll must be in the PATH
 *
 * See {@link @module:@unitybase/mailer @unitybase/mailer} for details
 * @module @unitybase/mailer-ssl
 */
const dllName = 'UBMail.dll'
const archPath = process.arch === 'x32' ? './bin/x32' : './bin/x64'
const path = require('path')
const moduleName = path.join(__dirname, archPath, dllName)
const binding = require(moduleName)
var UBMail = module.exports;

/**
 * constructor for TubMailReceiver
 *
 * @method TubMailReceiver
 * @return {UBMail.TubMailReceiver}
 */
UBMail.TubMailReceiver = binding.TubMailReceiver;

/**
 * constructor for TubMailSender
 *
 * @method TubMailSender
 * @return {UBMail.TubMailSender}
 */
UBMail.TubMailSender = binding.TubMailSender;

/**
 * Mail body type
 *
 * @property TubSendMailBodyType
 * @type {UBMail.TubSendMailBodyType}
 */
UBMail.TubSendMailBodyType = binding.TubSendMailBodyType;

/**
 * Mail body type
 *
 * @property TubSendMailAttackKind
 * @type {UBMail.TubSendMailAttachKind}
 */
UBMail.TubSendMailAttachKind = binding.TubSendMailAttachKind;

/**
 * Get body from message part
 *
 * @ignore
 * @param {UBMail.TMimePart} part
 * @returns {UBMail.StringCollection}
 */

function getBodyFromMessagePart(part) {
    var i, subPart = part.subPart;
    if (subPart.length === 0) {
        return part.partBody;
    } else {
        for (i = 0; i<subPart.length; i++) {
            if (subPart[i].disposition !== 'ATTACHMENT') {
                return getBodyFromMessagePart(subPart[i]);
            }
        }
    }
}

/**
 * Get body from message
 *
 * @param {UBMail.TUBMimeMess} message
 * @returns {UBMail.StringCollection}
 */
UBMail.getBodyFromMessage = function(message) {
    return getBodyFromMessagePart(message.messagePart);
};


