// All classes here are implemented inside UBMail.dll
// This unit contains a DOCUMENTATION

/**
 * @module @unitybase/mailer
 */

/**
 * @class
 * Mail body type
 * @enum {Number}
 */
const TubSendMailBodyTypeBind = {Text: 0, HTML: 1, Calendar: 2}

/**
 * @class
 * Mail attach kind
 * @enum {Number}
 */
const TubSendMailAttachKindBind = {File: 0, Text: 1, Buffer: 2}

/**
 * @class
 * Binding to a native implementation of POP3 receiver.
 *
 * Should be created using {@link TubMailReceiver} method of {@link module:@unitybase/mailer} module
 * @constructor
 * @param {Object} paramsObj parameters object
 * @param {String} paramsObj.host host of mail server
 * @param {String} paramsObj.port port of mail server
 * @param {String} [paramsObj.user = ''] user login on mail server
 * @param {String} [paramsObj.password = ''] user password on mail server
 * @param {Boolean} [paramsObj.tls = false] use tls. In {@link module:@unitybase/mailer} tls is
 *   not implemented so you will get an exception when set this value true.
 *   For using tls use {@link module:@unitybase/mailer-ssl} class
 */
function TubMailReceiverBind (paramsObj) {}

/**
 * Count of messages on server
 *
 * @returns {Number}
 */
TubMailReceiverBind.getMessagesCount = function () {}

/**
 * Get size of message
 *
 * @param {Number} index Index of mail message on server. Indexes starts from 1
 * @returns {Number}
 */
TubMailReceiverBind.getMessageSize = function (index) {}

/**
 * Receive message from server
 *
 * @param {Number} index Index of mail message on server. Indexes starts from 1
 * @returns {TubMimeMessBind}
 */
TubMailReceiverBind.receive = function (index) {}

/**
 * Receive message headers and first maxLines strings of message
 *
 * @param {Number} index Index of mail message on server. Indexes starts from 1
 * @param {Number} maxLines Count of message lines to receive
 * @returns {TubMimeMessBind}
 */
TubMailReceiverBind.top = function (index, maxLines) {}

/**
 * Mark the message to delete. The message will be removed indeed, when reconnect to the server
 * or the object is destroyed.
 * For destroy object immediately use freeNative, for reconnect use reconnect() method
 *
 * @param {Number} index Index of mail message on server. Indexes starts from 1
 * @returns {Boolean} True if successfully, in opposite case raise exception
 */
TubMailReceiverBind.deleteMessage = function (index) {}

/**
 * Reconnect to mail server. Get new messages from server, delete marked for delete messages.
 *
 * @returns {Boolean} True if successfully, in opposite case raise exception
 */
TubMailReceiverBind.reconnect = function () {}

/**
 * @class UBMail.TubMailAttach
 * mail attach
 */

/**
 * Mail attach kind
 *
 * @property kind
 * @type {UBMail.TubSendMailAttackKind}
 */

/**
 * Attach data.
 *
 * If kind is File, then String with path to attached file
 *
 * If kind is Text, then String with attach content
 *
 * If kind is Buffer, then ArrayBuffer containing attach content
 *
 * @property data
 * @type {String|ArrayBuffer}
 */

/**
 * Name of attached file.
 *
 * Optional when kind is File
 *
 * @property atachName
 * @type {String}
 */

/**
 *  Is attach data already decoded to Base64
 *
 *  Optional, default false
 *
 *  @property isBase64
 *  @type Boolean
 */

/**
 * @class
 * Mail SMTP sender object
 * @constructor
 * @param {Object} paramsObj parameters object
 * @param {String} paramsObj.host host of mail server
 * @param {String} paramsObj.port port of mail server
 * @param {String} [paramsObj.user = ''] user login on mail server
 * @param {String} [paramsObj.password = ''] user password on mail server
 * @param {Boolean} [paramsObj.tls = false] use tls. In {@link UBMail} tls is
 *    not implemented so you will get an exception when set this value true.
 *    For using tls use {@link UBMail_openssl} class
 * @param {Boolean} [paramsObj.auth = false] is need user authentication
 */
function TubMailSenderBind (paramsObj) {}

/**
 * Last error when last sendMail failed. Empty string last sendMail finished successfully.
 *
 * @property lastError
 * @type {String}
 */

/**
 * send a email message
 *
 * @param {Object} mailObj sending mail object
 * @param {String} [mailObj.subject] mail subject
 * @param {UBMail.TubSendMailBodyType} [mailObj.bodyType = UBMail.TubSendMailBodyType.Text] mail body type
 * @param {String} [mailObj.body = ''] mail body. If bodyType is Calendar then valid *.ics file
 * @param {String} [mailObj.fromAddr = ''] sender address
 * @param {Array.<String>} [mailObj.toAddr = []] array of receivers addresses
 * @param {Array.<UBMail.TubMailAttach>} [mailObj.attaches = []] array of attaches. Ignoreg when bodyType is Calendar.
 * @returns {Boolean} True if successfully
 */
TubMailSenderBind.sendMail = function (mailObj) {}

/**
 * @class
 * Received message
 */
function TubMimeMessBind () {}

/**
 * Main mime part of message
  */
TubMimeMessBind.messagePart = {}
/**
 * Full text of message
 *
 * @type StringCollectionBind
 */
TubMimeMessBind.fullText = {}

/**
 * Header of message
 *
 * @type TMessHeaderBind
 */
TubMimeMessBind.header = {}

/**
 * class for storing strings list
 *
 * @class StringCollectionBind
 * @implements {UBReader}
 */
function StringCollectionBind () {}
/**
 * Length content in bytes
 *
 * @type {Number}
 */
StringCollectionBind.byteLength = 0

/**
 * Count of lines in list
 *
 * @type {Number}
 */
StringCollectionBind.linesCount = 0

/**
 * Get string with custom index from list as String or ArrayBuffer
 *
 * @param {Number} index Index of string
 * @param {String} [encoding] Optional encoding of source. Default to 'utf-8'.
 *  If 'bin' - return ArrayBuffer source representation without any conversion.
 *  If 'base64' - transform base64 encoded content of source to ArrayBuffer
 * @returns {ArrayBuffer|String} Return String in case no encoding passed or ArrayBuffer
 */
StringCollectionBind.readLn = function (index, encoding) {}

/**
 * Implements a {@link UBReader} interface
 */
StringCollectionBind.read = function (encoding) {}

/**
 * @class TMessHeaderBind
 */
function TMessHeaderBind () {}

/**
 * Sender of message
 *
 * @type {String}
 */
TMessHeaderBind.from = ''

/**
 * Receivers of message (one per line)
 *
 * @type {StringCollectionBind}
 */
TMessHeaderBind.toList = {}

/**
 * Carbon Copy receivers of message (one per line)
 *
 * @type {StringCollectionBind}
 */
TMessHeaderBind.cCList = {}

/**
 * Subject of message
 *
 * @type {String}
 */
TMessHeaderBind.subject = ''

/**
 * Organization string
 *
 * @type {String}
 */
TMessHeaderBind.organization = ''

/**
 * After decoding contains all headers lines witch not have parsed to any
 * other structures in this object
 *
 * @type {StringCollectionBind}
 */
TMessHeaderBind.customHeaders = {}

/**
 * Date and time of message
 *
 * @type {Date}
 */
TMessHeaderBind.date = new Date()

/**
 * Mailer identification
 *
 * @type {String}
 */
TMessHeaderBind.xMailer = ''

/**
 * Address for replies
 *
 * @type {String}
 */
TMessHeaderBind.replyTo = ''

/**
 * Message indetifier
 *
 * @type {String}
 */
TMessHeaderBind.messageID = ''

/**
 * Message priority
 *
 * Can take values: MP_unknown, MP_low, MP_normal, MP_high
 *
 * @type {String}
 */
TMessHeaderBind.priority = ''

/**
 * Specify base charset. By default is used system charset
 *
 * @type {String}
 */
TMessHeaderBind.charsetCode = ''

/**
 * Mime part of message
 *
 * @class TMimePartBind
 */
function TMimePartBind () {}

/**
 * Primary Mime type of part. (i.e. 'application')
 *
 * @type {String}
 */
TMimePartBind.primary = ''

/**
 * String representation of used Mime encoding in part. (i.e. 'base64')
 *
 * @type {String}
 */
TMimePartBind.encoding = ''

/**
 * String representation of used Mime charset in part. (i.e. 'iso-8859-1')
 * Writing to this property automaticly generate value of @link(CharsetCode).
 * Charset is used only for text parts.
 *
 * @type {String}
 */
TMimePartBind.charset = ''

/**
 * Define default charset for decoding text MIME parts without charset
 * specification. Default value is 'ISO-8859-1' by RCF documents.
 * But Microsoft Outlook use windows codings as default. This property allows
 * properly decode textual parts from some broken versions of Microsoft
 * Outlook.
 *
 * @type {String}
 */
TMimePartBind.defaultCharset = ''

/**
 * Decoded primary type. Possible values are: MP_TEXT, MP_MULTIPART,
 * MP_MESSAGE and MP_BINARY. If type not recognised, result is MP_BINARY.
 *
 * @type {String}
 */
TMimePartBind.primaryCode = ''

/**
 * Decoded encoding type. Possible values are: ME_7BIT, ME_8BIT,
 * ME_QUOTED_PRINTABLE and ME_BASE64. If type not recognised, result is
 * ME_7BIT.
 *
 * @type {String}
 */
TMimePartBind.encodingCode = ''

/**
 * Decoded charset type.
 *
 * @type {String}
 */
TMimePartBind.charsetCode = ''

/**
 * System charset type. Default value is charset used by default in your
 * operating system.
 *
 * @type {String}
 */
TMimePartBind.targetCharset = ''

/**
 * If True, then do internal charset translation of part content between CharsetCode
 * and TargetCharset
 *
 * @type {Boolean}
 */
TMimePartBind.convertCharset = ''

/**
 * If True, then allways do internal charset translation of HTML parts
 * by MIME even it have their own charset in META tag. Default is False.
 *
 * @type {Boolean}
 */
TMimePartBind.forcedHTMLConvert = ''

/**
 * Secondary Mime type of part. (i.e. 'mixed')
 *
 * @type {String}
 */
TMimePartBind.secondary = ''

/**
 * Description of Mime part.
 *
 * @type {String}
 */
TMimePartBind.description = ''

/**
 * Value of content disposition field. (i.e. 'INLINE' or 'ATTACHMENT')
 *
 * @type {String}
 */
TMimePartBind.disposition = ''

/**
 * Content ID.
 *
 * @type {String}
 */
TMimePartBind.contentID = ''

/**
 * Boundary delimiter of multipart Mime part. Used only in multipart part.
 *
 * @type {String}
 */
TMimePartBind.boundary = ''

/**
 * Filename of file in binary part.
 * @type {String}
 */
TMimePartBind.fileName = ''

/**
 * String list with lines contains mime part (It can be a full message).
 *
 * @type {StringCollectionBind}
 */
TMimePartBind.lines = {}

/**
 * Encoded form of MIME part data.
 *
 * @type {StringCollectionBind}
 */
TMimePartBind.partBody = {}

/**
 * All header lines of MIME part.
 *
 * @type {StringCollectionBind}
 */
TMimePartBind.headers = {}

/**
 * On multipart this contains part of message between first line of message
 * and first boundary.
 *
 * @type {StringCollectionBind}
 */
TMimePartBind.prePart = {}

/**
 * On multipart this contains part of message between last boundary and end
 * of message.
 *
 * @type {StringCollectionBind}
 */
TMimePartBind.postPart = {}

/**
 * Show nested level in subpart tree. Value 0 means root part. 1 means
 * subpart from this root. etc.
 *
 * @type {Number}
 */
TMimePartBind.subLevel = 0

/**
 * Specify maximum sublevel value for decomposing.
 *
 * @type {Number}
 */
TMimePartBind.maxSubLevel = 0

/**
 * When is True, then this part maybe(!) have included some uuencoded binary
 * data
 *
 * @type {Boolean}
 */
TMimePartBind.attachInside = false

/**
 * Here you can specify maximum line length for encoding of MIME part.
 * If line is longer, then is splitted by standard of MIME. Correct MIME
 * mailers can de-split this line into original length.
 *
 * @type {Boolean}
 */
TMimePartBind.maxLineLength = 0

/**
 * Subparts of MimePart
 *
 * @type {Array.<TMimePartBind>}
 */
TMimePartBind.subPart = []