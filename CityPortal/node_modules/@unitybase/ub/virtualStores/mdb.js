/**
 *  @classdesc
 *  Virtual store implementation for storing content inside models `public` folders.
 *  Key conceptions:
 *
 *    - relative path created in format modelName|relativePathFromModelDir to hide real file place from client
 *    - OS user temp folder used for store temporary content
 *    - delete operation is forbidden since models must be under version control
 *
 *  Used in:
 *
 *    - ubm_form for store form def & js inside /public/forms
 *    - ubm_diagrams for store diagram inside /public/erdiagrams
 *    - e.t.c.
 *
 * @class
 * @extends UB.virtualStores.Custom
 * @singleton
 */
UB.virtualStores.mdb = Object.create(UB.virtualStores.Custom)
/**
 * @private
 */
UB.virtualStores.mdb.fileTempInfoExt = '.fti'

const path = require('path')
/**
 * @private
 * @param {TubDocumentHandlerCustom} handler
 */
UB.virtualStores.mdb.getPermanentFileName = function (handler) {
  var
    filePath,
    content = handler.content
  if (content.isDirty) {
    filePath = this.getTempFileName(handler)
  } else {
    let pathPart = content.relPath.split('|')
    filePath = (pathPart.length === 2) ? path.join(App.domain.config.models.byName(pathPart[0]).publicPath, pathPart[1], content.fName) : ''
  }
  return filePath
}
/**
 * @inheritdoc
 */
UB.virtualStores.mdb.fillResponse = function (handler) {
  var
    filePath,
    content = handler.content

  filePath = content.isDirty ? this.getTempFileName(handler) : this.getPermanentFileName(handler)
  if (filePath) {
    return {
      httpResultCode: 200,
      body: filePath,
      header: 'Content-Type: application/def', // TODO - fix me - content type must be calculated from extension. Find and use some existing node module?? //'application/json'
      isFromFile: true
    }
  } else {
    return {
      httpResultCode: 404
    }
  }
}
/**
 * @inheritdoc
*/
UB.virtualStores.mdb.saveContentToTempStore = function (handler) {
  var
    content = handler.content,
    request = handler.request,
    fn
  console.debug('--========saveContentToTempStore=====------')

  if (!request.getIsBodyLoaded()) {
    request.setBodyAsUnicodeString('{}')
  }
  fn = this.getTempFileName(handler)
  console.debug('temp file is writen to ', fn)
  if (!request.saveBodyToFile(fn)) {
    throw new Error('invalid temp path')
  }
  if (!writeFile(fn + this.fileTempInfoExt, content)) {
    throw new Error('invalid temp path')
  }
  return true
}
/**
 *  Must return true in case no exception
 *  load content and body from temporary file in the this.tempFolder'
 *
 * See {@link UB.virtualStores.Custom#loadContentFromTempStore}
 */
UB.virtualStores.mdb.loadContentFromTempStore = function (handler, aWithBody) {
  var
    content = handler.content,
    request = handler.request,
    strCtnt, objCtnt, fn
  console.debug('--========loadContentFromTempStore=====------ for ', handler.attribute.name)
    // toLog('handler = %', handler);

  fn = this.getTempFileName(handler)
  strCtnt = loadFile(fn + this.fileTempInfoExt)
  if (!strCtnt) {
    return // TODO - make difference between insert (do nothing) and update - raise
        // throw new Error('temporary content information not found for ' + handler.attribute.name);
  }
  objCtnt = JSON.parse(strCtnt)
    // move all property from file to handler.content
  _.forEach(objCtnt, function (key, value) {
    content[key] = value
  })
  if (aWithBody === TubLoadContentBody.Yes) {
    request.loadBodyFromFile(fn)
  }
  return true
}
/**
 * @inheritdoc
 */
UB.virtualStores.mdb.loadBodyFromEntity = function (handler) {
  var
    request = handler.request,
    content = handler.content,
    filePath = content.isDirty ? this.getTempFileName(handler) : this.getPermanentFileName(handler)

  console.debug('--===== loadBodyFromEntity ===--- try to load body from', filePath)
  return filePath ? request.loadBodyFromFile(filePath) : false
}
/**
 * Do nothing here - just delete content. Content itself must be under external version control system (SVN, fossil)
 */
UB.virtualStores.mdb.moveToArchive = function (handler) {
  return true // this.deleteContent(handler);
}
/**
 * Do nothing here - content must be under external version control system (SVN, GIT, fossil)
 */
UB.virtualStores.mdb.deleteContent = function () {
    // nothing to do here
  return true
}
/**
 * @inheritDoc
 */
UB.virtualStores.mdb.moveToPermanentStore = function (handler, aPrevRelPath) {
  var
    content = handler.content,
    pathPart, oldFilePath, newFilePath,
    fs = require('fs')

  console.debug('--========moveToPermanentStore=====------')
  oldFilePath = this.getTempFileName(handler)

  pathPart = content.relPath.split('|')
  if (pathPart.length !== 2) {
    throw new Error('MDB store expect relPath in form modelName|pathRelativeToModelPublicFolder but got: ' + content.relPath)
  } else {
    newFilePath = path.join(App.domain.config.models.byName(pathPart[0]).publicPath, pathPart[1])
    if (!fs.isDir(newFilePath)) {
      fs.mkdirSync(newFilePath)
    }
    newFilePath = path.join(newFilePath, content.fName)
  }
  console.debug('move from ' + oldFilePath + ' to ' + newFilePath)
  if (!moveFile(oldFilePath, newFilePath)) {
    throw new Error('Can\'t move file to permanent store')
  }
  deleteFile(oldFilePath + this.fileTempInfoExt)
  handler.content.isDirty = false
  return true
}
