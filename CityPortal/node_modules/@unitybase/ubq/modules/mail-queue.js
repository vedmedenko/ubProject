/**
 * Adding a EMail to queue for sending
 * @author pavel.mash on 25.09.2016.
 * @module
 */

const UBMail = require('@unitybase/mailer')
let ubqMessagesStore

/**
 * @typedef {Object} mailAttachmentReference
 * @property {String} entity The entity code where data is stored
 * @property {string} attribute Code of attribute with type `Document` from antity
 * @property {number} id Row ID
 * @property {string} atachName Name of attachment (as it will be displayed in EMail)
 */

/**
 * Add a mail to queue
 * @param {Object} config
 * @param {string|Array<string>} config.to Receiver EMail address (or array of addresses)
 * @param {string} config.subject A message subject
 * @param {string} config.body A message body
 * @param {string} [config.from] A optional sender EMail address. If missing - taken from ubConfig.application.customSetting.mailerConfig.fromAddr
 * @param {UBMail.TubSendMailBodyType} [config.bodyType=UBMail.TubSendMailBodyType.HTML] A mail body type
 * @param {Array<mailAttachmentReference>} [config.attachments] The references to documents, stored in the entities. Will be attached to EMail during sending
 */
module.exports.queueMail = function (config) {
  let msgCmd = {
    from: config.from || JSON.parse(App.customSettings)['mailerConfig'].fromAddr,
    to: Array.isArray(config.to) ? config.to : [config.to],
    bodyType: config.bodyType || UBMail.TubSendMailBodyType.HTML,
    subject: config.subject
  }
  if (config.attaches) console.warn('Invalid parameter "attaches" for queueMail. Use "attachments" instead')
  if (config.attachments) {
    msgCmd.attaches = config.attachments
  }
    // create store here - in case of initialization entity ubq_messages may not exists
  if (!ubqMessagesStore) ubqMessagesStore = new TubDataStore('ubq_messages')
  ubqMessagesStore.run('insert', {
    fieldList: ['ID'],
    execParams: {
      queueCode: 'mail',
      msgCmd: JSON.stringify(msgCmd),
      msgData: config.body,
      msgPriority: 0
    }
  })
}

