/*jshint multistr:true */
var me = ubm_diagram;

const fs = require('fs')
const FileBasedStoreLoader = require('@unitybase/base').FileBasedStoreLoader
const LocalDataStore = require('@unitybase/base').LocalDataStore
const path = require('path')

me.entity.addMethod('select');
me.entity.addMethod('update');
me.entity.addMethod('beforedelete');
me.entity.addMethod('insert');

/**
 *  here we store loaded forms
 */
var
    resultDataCache = null,
    modelLoadDate,
    DIAGRAM_CONTENT_TYPE =  'application/m3metadiag',
    REL_PATH_TAIL = 'erdiagrams',
    XML_EXTENSION = '.xml';

/**
 * Check integrity of file content. Passed as a callback to FileBasedStore.onBeforeRowAdd
 * @param {FileBasedStoreLoader} loader
 * @param {String} fullFilePath
 * @param {String} content
 * @param {Object} row
 * @return {boolean}
 */
function postProcessing(loader, fullFilePath, content, row){
    var parts, fileName,
        // we fill relPath in form "modelName"|"path inside model public folder" as expected by mdb virtual store
        relPath = loader.processingRootFolder.model.name + '|' + REL_PATH_TAIL;

    //fill model attribute by current folder model name
    row.model = loader.processingRootFolder.model.name;

    // fill name attribute with file name w/o ".xml" extension
    parts = fullFilePath.split('\\');
    fileName = parts[parts.length-1];
    row.name = fileName.substring(0, fileName.length - XML_EXTENSION.length);

    // fill formDef attribute value
    row.document = JSON.stringify({
        fName: fileName,
        origName: fileName,
        ct: DIAGRAM_CONTENT_TYPE,
        size: content.length,
        md5: "fakemd50000000000000000000000000",
        relPath: relPath
    });
    return true;
}

function loadAllDiagrams(){
    var models = App.domain.config.models,
        folders = [],
        model, mPath, i, l,
        modelLastDate = new Date(App.globalCacheGet('UB_STATIC.modelsModifyDate')).getTime();

    console.debug('modelLastDate = ', modelLastDate);
    if (!resultDataCache || modelLoadDate < modelLastDate){
        console.debug('load diagrams from models directory structure');

        resultDataCache = [];
        for (i = 0, l = models.count; i < l; i++) {
            model = models.items[i];
            mPath = path.join(model.publicPath, REL_PATH_TAIL);
            folders.push({
                path: mPath,
                model: model // used for fill Document content for `mdb` store in postProcessing
            });
        }
        var loader = new FileBasedStoreLoader({
            entity: me.entity,
            foldersConfig: folders,
            fileMask: new RegExp(XML_EXTENSION + '$'),
            attributeRegExpString: FileBasedStoreLoader.XML_ATTRIBURE_REGEXP,
            onBeforeRowAdd: postProcessing
        });
        resultDataCache = loader.load();

        modelLoadDate = modelLastDate;
    }else{
        console.debug('ubm_diagram: resultDataCache already loaded');
    }
    return resultDataCache;
}

/** Retrieve data from resultDataCache and init ctxt.dataStore
 *  caller MUST set dataStore.currentDataName before call doSelect
 * @param {ubMethodParams} ctxt
 */
function doSelect(ctxt){
    var
        mP = ctxt.mParams,
        aID = mP.ID,
        cachedData, filteredData,
        resp, cType = ctxt.dataStore.entity.cacheType,
        reqVersion;

    cachedData = loadAllDiagrams();

    if (!(aID && (aID > -1)) && (cType === TubCacheType.Entity || cType === TubCacheType.SessionEntity) && (!mP.skipCache)){
        reqVersion = mP.version;
        mP.version = resultDataCache.version;
        if (reqVersion === resultDataCache.version){
            mP.resultData = {};
            mP.resultData.notModified = true;
            return;
        }
    }
    filteredData = LocalDataStore.doFilterAndSort(cachedData, mP);
    // return as asked in fieldList using compact format  {fieldCount: 2, rowCount: 2, values: ["ID", "name", 1, "ss", 2, "dfd"]}
    resp = LocalDataStore.flatten(mP.fieldList, filteredData.resultData);
    ctxt.dataStore.initFromJSON(resp);
}

/**
 *
 * @param {ubMethodParams} ctxt
 * @return {Boolean}
 */
me.select = function(ctxt) {
    ctxt.dataStore.currentDataName = 'select'; //TODO надо или нет????
    doSelect(ctxt);
    ctxt.preventDefault();
    return true; // everything is OK
};

/**
 * Check model exists
 * @param {Number} aID
 * @param {String} modelName
 */
me.validateInput = function(aID, modelName){
    var model = App.domain.config.models.byName(modelName);
    if (!model) {
        throw new Error('ubm_diagram: Invalid model attribute value "' + modelName + '". Model not exist in domain');
    }

    if (!aID){
        throw new Error('No ID parameter passed in execParams');
    }
};

/**
 *
 * @param {ubMethodParams} ctxt
 * @param {Object} storedValue
 * @return {boolean}
 */
function doUpdateInsert(ctxt, storedValue){
    var
        mP = ctxt.mParams,
        newValues,
        newDocument,
        ID,
        docHandler, docReq, ct, docBody, attr,
        entity = me.entity,
        attributes = entity.attributes;

    newValues = mP.execParams || {};
    ID = newValues.ID;

    // move all attributes from execParams to storedValue
    newDocument = newValues.document;
    _.forEach(newValues, function(val, key){
        attr = attributes.byName(key);
        if ( attr && (attr.dataType !== TubAttrDataType.Document) )  {
            storedValue[key] = val;
        }
    });

    docReq = new TubDocumentRequest();
    docReq.entity = entity.name;
    docReq.attribute = 'document';
    docReq.id = ID;
    docReq.isDirty = Boolean(newDocument);
    docHandler = docReq.createHandlerObject(false);
    docHandler.loadContent(TubLoadContentBody.Yes /*WithBody*/);
    docBody = docHandler.request.getBodyAsUnicodeString();
    if (!docBody){
        docBody = '<!--@ID "' + ID + '"-->\r\n<mxGraphModel><root></root></mxGraphModel>';
    } else {
        var clearAttrReg = new RegExp(FileBasedStoreLoader.XML_ATTRIBURE_REGEXP, 'gm'); // seek for <!--@attr "bla bla"-->CRLF
        docBody = '<!--@ID "' + ID + '"-->\r\n' + docBody.replace(clearAttrReg, ''); // remove all old entity attributes
    }
    docHandler.request.setBodyAsUnicodeString(docBody);

    ct = docHandler.content;
    ct.fName = storedValue.name + XML_EXTENSION;
    ct.relPath = storedValue.model + '|' + REL_PATH_TAIL;
    ct.ct = DIAGRAM_CONTENT_TYPE;
    docReq.isDirty = true;
    docHandler.saveContentToTempStore();
    docHandler.moveToPermanentStore('');
    storedValue.document = JSON.stringify(ct);

    resultDataCache = null; // drop cache. afterInsert call select and restore cache
    return true;
}

/**
 *
 * @param {ubMethodParams} ctxt
 * @return {boolean}
 */
me.update = function(ctxt) {
    var
        inParams = ctxt.mParams.execParams || {},
        ID = inParams.ID,
        storedValue,
        cachedData;

    cachedData = loadAllDiagrams();
    storedValue = LocalDataStore.byID(cachedData, ID);
    if (storedValue.total !== 1){
        throw new Error('Record with ID=' + ID + 'not found');
    }
    storedValue = LocalDataStore.selectResultToArrayOfObjects(storedValue)[0];

    me.validateInput(ID, inParams.model || storedValue.model);

//    if (inParams.code && inParams.code !== storedValue.code){
//        throw new Error('<<<To change form code rename both *.def & *.js files & change "//@code "formCode" comment inside new def file>>>');
//    }
    doUpdateInsert(ctxt, storedValue);

    ctxt.preventDefault();
    return true; // everything is OK
};

me.beforedelete = function() {
    throw new Error('<<<To delete ER-diagram you must manually delete corresponding xml file from model folder!>>>');
};

/**
 * Check ID is unique and perform insertion
 * @param {ubMethodParams} ctxt
 * @return {boolean}
 */
me.insert = function(ctxt) {
    var
        inParams = ctxt.mParams.execParams,
        ID = inParams.ID,
        cachedData, row,
        oldValue = {};

    cachedData = loadAllDiagrams();
    me.validateInput(ID, inParams.model);

    row = LocalDataStore.byID(cachedData, ID);
    if (row.total) {
        throw new Error('Diagram with ID ' + ID + 'already exist');
    }

    doUpdateInsert(ctxt, oldValue);
    ctxt.preventDefault();
    return true; // everything is OK
};
