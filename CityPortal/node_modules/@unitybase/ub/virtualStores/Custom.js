/**
 * @classdesc

 Abstract interface for Virtual store. Must be implemented in descendants.

Provide a way to store files in any manner developer want.

# General explanation

UnityBase provide 3 different type of storing files on server side:

1. FileSystem
2. Database
3. Virtual

First two type implemented inside UnityBase server. Virtual type can be implemented by developer in any manner.

In any case you define **Entity** contain **attribute** of `Document` type and set `storeName` property for this attribute.
Content of such attributes is a meta-information about file - serialized {TubDocumentContent} object, not actual file content.

For non-virtual entity (`dsType`!=='Virtual') UnityBase create varchar(4000) field in database and store
there {TubDocumentContent} serialized to JSON.

For Virtual entity developer must implement `select` method and fill content of document type attribute manually
(for example by parsing file content as done in **ubm_form**).

In the store definition section of application configuration developer describe stores. Each store must implement interface described below.

In case `storeType` is `FileSystem` or `Database` this interface is implemented inside UnityBase server executable, for
`storeType` == Virtual UnityBase search for implementation in `UB.virtualStores.YourStoreName` JS class.

The store class itself must provide storing and retrieving file content (based on meta-information stored in the entity attribute).

From client-side POV uploading files to server is separated onto two part. Like in gmail when you send mail with
attachment you can attach file, and gmail send it to server, but you do not send mail itself yet - this is first stage.
Result of this stage is information about where file on server stored.
When you send email client pass to server email attributes, body and information about attached files.
This is the same UnityBase do in the second stage.

## Upload file to server

So in UnityBase upload file to to the server is performed in two stages:

1. Upload file to temporary store - on this stage client call setDocument/setDocumentMultipart app level method and
pass file content to server with additional parameter **isDirty=true**, server must store file in the temporary place. To do this server:

    - parse incoming HTTP request and transform it to {@link TubDocumentRequest} object - container for raw document data
    - based on entity attribute UnityBase create {@link TubDocumentHandlerCustom} descendant object - this object able to
        put TubDocumentRequest content to store. During initialization handler calculate md5 checksum of incoming
        document and MIME content type (based of origName file extension or on magic bytes in case extension is unknown)
    - server call {@link UB.virtualStores.Custom#saveContentToTempStore} method passing {@link TubDocumentHandlerCustom handler} as a parameter
    - server return in HTTP response serialized {@link TubDocumentContent}, with {@link TubDocumentContent#isDirty} attribute is set to `true`.
        This information is used on the next step to determinate where to found file .

2. Client execute `insert` or `update` entity method and pass (with other attributes) string, returned on the first stage as a value of `Document`
type attribute. On this stage server see what user want to update/insert Document and, based on *Domain* information, know
what type of store is used for this attribute. Server:

    - load information about previously stored document from entity attribute to {@link TubDocumentContent}.
        Create {@link TubDocumentHandlerCustom} for old file content;
    - in case of `update` and exist previous revision: if (storeConfig.historyDepth > 0) then
        call {@link UB.virtualStores.Custom#moveToArchive}, else call {@link UB.virtualStores.Custom#deleteContent};
    - load temporary document meta-information from string provided in update/insert method to {@link TubDocumentContent}.
        Create {@link TubDocumentHandlerCustom} for new file content;
    - in case new content {@link TubDocumentContent#isDirty} equal to `true` - call {@link UB.virtualStores.Custom#loadContentFromTempStore}(TubLoadContentBody.No).
        `TubLoadContentBody.No` implies that there is no need to load file into memory. When UnityBase increase {@link TubDocumentContent#revision handler.content.revision}
        and call {@link UB.virtualStores.Custom#moveToPermanentStore}

3. Finally UnityBase update entity and commit database transaction (in case entity is non-virtual)

## Download file from server

For download file from server client call getDocument app level method. Server:

- lock document for a time of reading from store (by entity + ID)
- if dirty copy requested - call {@link UB.virtualStores.Custom#loadContentFromTempStore}(TubLoadContentBody.Yes) else call {@link UB.virtualStores.Custom#loadBodyFromEntity}
- call {@link UB.virtualStores.Custom#fillResponse}
- unlock document

Good example of Virtual store implementation is:

  - **mdb** store placed in `UnityBase\models\UB\virtualStores\mdb.js` - implement read/write files from models `public/form` folder;
  - **fileVirtualWritePDF** (`UnityBase\models\UB\virtualStores\fileVirtualWritePDF.js`) - implement file store with automatic conversion MS Word, MS Excel and MS Power Point documents into \*.pdf format;

### Warning - descendants must be singleton. We can not define parent class as singleton due to Ext specific

 * @markdown
 * @namespace UB.virtualStores
 */
UB.virtualStores = {}

/**
 * @class UB.virtualStores.Custom
 * @abstract
 */
UB.virtualStores.Custom = {
    /**
     * Implementation must save file content to temporary store
     * @abstract
     * @param {TubDocumentHandlerCustom} handler
     */
  saveContentToTempStore: function (handler) {
  },

    /**
     * Implementation must move old file revision to archive according to store historyDepth and delete file from permanent store.
     * @abstract
     * @param {TubDocumentHandlerCustom} handler
     * @return {Boolean}
     */
  moveToArchive: function (handler) {
  },

    /**
     * Implementation must delete file content from permanent store
     * @abstract
     * @param {TubDocumentHandlerCustom} handler
     * @return {boolean}
     */
  deleteContent: function (handler) {
  },

    /**
     *  Load content and (optionally) body from temporary file
     * @abstract
     * @param {TubDocumentHandlerCustom} handler
     * @param {TubLoadContentBody} aWithBody
     */
  loadContentFromTempStore: function (handler, aWithBody) {
  },

    /**
     * Implementation must MOVE file content from temporary store to permanent store
     * @abstract
     * @param {TubDocumentHandlerCustom} handler
     * @param {String} aPrevRelPath In case exist prev. file revision this variable contain it relative path
     * @return {boolean}
     */
  moveToPermanentStore: function (handler, aPrevRelPath) {
  },

    /**
     * Response for setDocument HTTP request. Descendants MUST return null(if responce internally filled) or
     * the following object:
     *
     *      {
     *          httpResultCode: 200, // in case httpResultCode == 200 you MUST return attributes below, else it not necessary
     *          body: '..', either full file path or string representation of content
     *          header: 'Content-Type: text/html', // HTTP header to be added to response. Minimal is Content-type header
     *          isFromFile: false //is body contain path to file
     *      }
     * if body is undefined then out body will take from request body
     *
     * @param {TubDocumentHandlerCustom} handler
     * @return {*}
     */
  fillResponse: function (handler) {
        // sample implementation
        // return {
        //    httpResultCode: 200,
        //    body: filePath,
        //    header: 'Content-type: application/pdf',
        //        isFromFile: true
        // };
  },
    /**
     * Implementation MUST fill handler.request body by call one of request body-related methods
     * @abstract
     * @param {TubDocumentHandlerCustom} handler
     * @return {boolean}
     */
  loadBodyFromEntity: function (handler) {
    var
      request = handler.request,
      content = handler.content
    request.loadBodyFromFile(filePath)
  },
    /**
     * Path to temp folder
     * @type {String}
     * @private
     */
  tempFolder: (process.env.TEMP || process.env.TMP) + '\\',
    /**
     * Get path to temporary file and it's name
     * @protected
     * @param {TubDocumentHandlerCustom} handler
     * @returns {string}
     */
  getTempFileName: function (handler) {
    var
            req = handler.request
        // important to use Session.userID. See UB-617
    return [this.tempFolder, req.entity, '_', req.attribute, '_', req.id, '_', Session.userID].join('')
  }

}
