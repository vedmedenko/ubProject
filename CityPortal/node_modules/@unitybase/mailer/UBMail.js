/**
 * Module for send and receive mail.
 * ssl is not supported. If you need SSL connection - use {@link module:@unitybase/mailer-ssl @unitybase/mailer-ssl}
 *
 * WARNING - do not send a mail directly from a HTTP thread. Mail server can fail or work slowly.
 * The rigth way is to **put a mail messages in the queue** and send it via scheduler.
 *
 * UBQ model already have:
 *
 *  - a module 'modules/mail-queue` for addint EMails to queue
 *  - a `mail` scheduler job for sending a mail from queue (once a minute by default)
 *
 *
 * Usage sample:
 *
      const UBMail = require('@unitybase/mailer')
      // send e-mail
      let sender = new UBMail.TubMailSender({
        host: 'mail.host.name',
        port: '25',
        tls: false
      })
      sender.sendMail({
        subject: 'subject 1',
        bodyType: UBMail.TubSendMailBodyType.Text,
        body: 'body\r\n 1',
        fromAddr: mailAddr1,
        toAddr: [mailAddr1, mailAddr2]
      })

      // Receive e-mails
      let receiver = new UBMail.TubMailReceiver({
        host: mailHost,
        port: '110',
        tls: false,
        auth: true,
        user: 'mpv',
        password: 'myPassword'
      })
      receiver.reconnect();
      let cnt = r.getMessagesCount()
      let res = []
      for (let i = 1; i <= cnt; i++ ) {
          res.push(r.receive(i))
      }
 *
 * @module @unitybase/mailer
 */
const dllName = 'UBMail.dll'
const archPath = process.arch === 'x32' ? './bin/x32' : './bin/x64'
const path = require('path')
const moduleName = path.join(__dirname, archPath, dllName)
const binding = require(moduleName)
let UBMail = module.exports

/**
 * constructor for TubMailReceiver
 *
 * @method TubMailReceiver
 * @return {TubMailReceiverBind}
 */
UBMail.TubMailReceiver = binding.TubMailReceiver

/**
 * constructor for TubMailSender
 *
 * @method TubMailSender
 * @return {TubMailSenderBind}
 */
UBMail.TubMailSender = binding.TubMailSender

/**
 * Mail body type
 *
 * @type {TubSendMailBodyTypeBind}
 */
UBMail.TubSendMailBodyType = binding.TubSendMailBodyType

/**
 * Mail body type
 *
 * @property TubSendMailAttackKind
 * @type {TubSendMailAttachKindBind}
 */
UBMail.TubSendMailAttachKind = binding.TubSendMailAttachKind

/**
 * Get body from message part
 *
 * @ignore
 * @param {TMimePartBind} part
 * @returns {StringCollectionBind}
 */
function getBodyFromMessagePart (part) {
  let subPart = part.subPart
  if (subPart.length === 0) {
    return part.partBody
  } else {
    for (let i = 0; i < subPart.length; i++) {
      if (subPart[i].disposition !== 'ATTACHMENT') {
        return getBodyFromMessagePart(subPart[i])
      }
    }
  }
}

/**
 * Get body from message
 *
 * @param {TubMimeMessBind} message
 * @returns {StringCollectionBind}
 */
UBMail.getBodyFromMessage = function (message) {
  return getBodyFromMessagePart(message.messagePart)
}
