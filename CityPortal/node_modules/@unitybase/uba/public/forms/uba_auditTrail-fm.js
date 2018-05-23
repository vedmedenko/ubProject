exports.formCode = {
    initUBComponent: function () {
        var me = this;
        me.setWindowCaption();

        Ext.define('UBS.auditItemModel', {
            extend: 'Ext.data.Model',
            fields: [
                {name: "title", type: 'string'},
                {name: "fromValue", type: 'string'},
                {name: "toValue", type: 'string'}
            ]
        });

        var form = me.getForm();
        var entityField = form.findField('entityField');
        entityField.setValue(me.record.data.entity + ' (' + $App.domainInfo.get(me.record.data.entity).caption + ')');
        entityField.resetOriginalValue();

        var actionTimeField = form.findField('actionTimeField');
        actionTimeField.setValue(me.record.data.actionTime);
        actionTimeField.resetOriginalValue();

        var actionUserField = form.findField('actionUserField');
        actionUserField.setValue(me.record.data.actionUser);
        actionUserField.resetOriginalValue();
        me.getEntityValueEntityById(me.record.data.actionUser, $App.domainInfo.get('uba_auditTrail').attr('actionUser').associatedEntity).done(function(result){
            actionUserField.setValue(result);
            actionUserField.resetOriginalValue();
        });

        var panel = me.down('panel[name=panel]');

        me.initStore(panel);
    },

    addBaseDockedItems: function () {

    },

    createGrid: function (panel, title){
        var grid = Ext.create('widget.grid', {
            store: Ext.create('Ext.data.Store', {
            layout: "fit",
            anchor: "100% 50%",
            fields: [
                       {name: "title", type: 'string'},
                       {name: "fromValue", type: 'string'},
                       {name: "toValue", type: 'string'}
                   ]
            }),
            defaults: {
               flex: 1
            },
            columns: [
               {
                   text     : UB.i18n('nameAttr'),
                   flex: 1,
                   dataIndex: 'title'
               },
               {
                   text     : UB.i18n('fromValue'),
                   flex: 1,
                   dataIndex: 'fromValue',
                   renderer: function(value, metaData, record, rowIndex, colIndex, view) {
                           metaData.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(value) + '"';
                           metaData.style = "white-space: normal;";
                           return value;
                   }
               },
               {
                   text     : UB.i18n('toValue'),
                   flex: 1,
                   dataIndex: 'toValue',
                   renderer: function(value, metaData, record, rowIndex, colIndex, view) {
                           metaData.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(value) + '"';
                           metaData.style = "white-space: normal;";
                           return value;
                   }
               }
            ]
        });
        var panelGrid = Ext.create('widget.panel', {
            //title: title,
            autoSize: true,
            layout: 'fit'
        });
        panelGrid.add(grid);

        var space = Ext.create("widget.panel",
        {
            xtype: 'panel',
            padding: 5
        });
        var label = Ext.create("widget.label",
        {
            text: title,
            style: 'font-weight:bold',
            padding: 5
        });

        panel.add(space);
        panel.add(label);
        panel.add(panelGrid);

        grid.panelGrid = panelGrid;
        grid.space = space;
        grid.label = label;
        grid.panel = panel;
        grid.destroySelf = function () {
            this.space.destroy();
            this.label.destroy();
            this.panelGrid.destroy();
        };

        return grid;
    },

    initStore: function (panel) {
        var me = this;

        var fromValue = me.record.data.fromValue ? JSON.parse(me.record.data.fromValue) : {};
        var toValue = me.record.data.toValue ? JSON.parse(me.record.data.toValue) : {};

        me.maskForm();
        me.getDiffObj(fromValue, toValue)
        .then(function(diffObj) { return me.resolveDiffObjInfo(diffObj); })
        .then(function(diffObj) {
            var promises = [], p;

            for (var key in diffObj) {
                if (diffObj.hasOwnProperty(key)) {
                    var diffAttr = diffObj[key];

                    if (diffAttr.dataType === 'Document') {
                        delete diffObj[key];
                        p = me.initStoreDocumentImage(panel, diffAttr);
                        promises.push(p);
                    }
                }
            }

            if (me.checkDiffObjDiff(diffObj)) {
                p = Q.resolve(diffObj).then(function(obj) {
                    var gridAttrs = me.createGrid(panel, UB.i18n('changedAttributes'));
                    return me.fillDiffObjToStore(gridAttrs, obj);
                });

                promises.splice(0, 0, p);
            }

            return Q.all(promises);
        }).fin(function() {
            me.unmaskForm();
        }).done();
    },

    initStoreDocumentImage: function(panel, diffAttr) {
        var me = this;

        return Q.resolve(diffAttr).then(function(diffAttrDoc) {
            var fromValueDoc = diffAttrDoc.fromValue ? JSON.parse(diffAttrDoc.fromValue) : {};
            var toValueDoc = diffAttrDoc.toValue ? JSON.parse(diffAttrDoc.toValue) : {};
            for (var key in fromValueDoc) {
                if (!toValueDoc[key]) {
                    toValueDoc[key] = undefined;
                }
            }
            return me.getDiffObj(fromValueDoc, toValueDoc)
            .then(function(diffObjDoc) { return me.resolveDiffObjInfo(diffObjDoc); })
            .then(function(diffObjDoc) { return me.resolveDiffObjAttachmentAttrs(diffObjDoc); })
            .then(function(diffObjDoc) {
                if (!me.checkDiffObjDiff(diffObjDoc)) {
                    return diffObjDoc;
                }
                var gridDoc = me.createGrid(panel, UB.i18n('changedImageAttachment') + ' "' + diffAttrDoc.caption + '"');
                return me.fillDiffObjToStore(gridDoc, diffObjDoc).then(function(diffObj2) {
                    var textDesc = Ext.create('widget.textfield', {
                        fieldLabel: UB.i18n('clarifyingEvent'),
                        width: '100%',
                        margin: '0 0 10 0',
                        readOnly: true
                    });
                    gridDoc.panelGrid.add(0, textDesc);
                    if (!diffObjDoc.md5.fromValue && diffObjDoc.md5.toValue) {
                        textDesc.setValue(UB.i18n('attachedDocumentImage'));
                    } else if (diffObjDoc.md5.fromValue && !diffObjDoc.md5.toValue) {
                        textDesc.setValue(UB.i18n('removedDocumentImage'));
                    } else if (diffObjDoc.md5.fromValue !== diffObjDoc.md5.toValue) {
                        textDesc.setValue(UB.i18n('editedImageDocument'));
                    }
                    textDesc.resetOriginalValue();
                });
            });
        });
    },

    checkDiffObjDiff: function(diffObj) {
        var me = this;

        for (var key in diffObj) {
            if (diffObj.hasOwnProperty(key)) {
                var diffAttr = diffObj[key];
                if (diffAttr.fromValue !== diffAttr.toValue) {
                    return true;
                }
            }
        }
        return false;
    },

    gridColumnAutoSize: function (grid) {
        if (grid && grid.columns) {
            for (var i = 0, len = grid.columns.length; i < len; ++i) {
                var col = grid.columns[i];
                col.autoSize();
            }
        }
    },

    /*
    fill grid rows
    */
    fillDiffObjToStore: function (grid, diffObj) {
        var me = this;

        return UB.inject('models/UBA/lcs.js').then(UB.inject.bind(null, 'models/UBA/diff.js'))
        .then(function() {
            var promises = [];
            _.forEach(_.keys(diffObj), function (key) {
                var diffAttr = diffObj[key];
                promises.push(me.resolveDiffObjEntity(diffAttr));
            });
            return Q.all(promises);
        }).then(function() {
            var promises = [];
            _.forEach(_.keys(diffObj), function (key) {
                var diffAttr = diffObj[key];
                promises.push(me.resolveDiffObjTexts(diffAttr));
            });
            return Q.all(promises);
        }).then(function() {
            var count = 0;
            _.forEach(_.keys(diffObj), function (key) {
                if (diffObj.hasOwnProperty(key)) {
                    var diffAttr = diffObj[key];
                    if (diffAttr.fromValue !== diffAttr.toValue) {
                        grid.store.add({
                            title: diffAttr.caption,
                            fromValue: diffAttr.fromValueText,
                            toValue: diffAttr.toValueText
                        });
                        count = count + 1;
                    }
                }
            });
            if (count === 0) {
                grid.destroySelf();
            } else {
                me.gridColumnAutoSize(grid);
            }

            return diffObj;
        });
    },

/*
Create Diff object from values before update and after update
*/
    getDiffObj: function (fromValue, toValue) {
        var me = this;

        var diffObj = {};
        _.forEach(_.keys(fromValue), function (key) {
            if (!diffObj[key]) {
                diffObj[key] = {};
            }
            diffObj[key].fromValue = fromValue[key];
            diffObj[key].toValue = fromValue[key];
        });

        _.forEach(_.keys(toValue), function (key) {
            if (!diffObj[key]) {
                diffObj[key] = {};
            }
            diffObj[key].toValue = toValue[key];
        });

        delete diffObj.mi_modifyDate;
        delete diffObj.mi_createDate;

        return Q.resolve(diffObj);
    },


/*
filling the missing information, such as the title attribute, attribute type
*/
    resolveDiffObjInfo: function (diffObj) {
        var me = this;

        var entityInfo = $App.domainInfo.get(me.record.data.entity);
        _.forEach(_.keys(diffObj), function (key) {
            var attrName = key;
            var attrLangName = null;
            if (attrName[attrName.length - 1] === '^') {
                if (attrName[attrName.length - 4] === '_') {
                    attrName = key.substring(0, key.length - 4);
                    attrLangName = key.substring(key.lastIndexOf('_') + 1, key.length - 1);
                } else {
                    attrName = key.substring(0, key.length - 1);
                }
            }

            var attrInfo = entityInfo.attributes[attrName];
            var diffAttr = diffObj[key];
            var attrCaption = key;

            if (attrInfo) {
                if (attrInfo.caption) {
                    attrCaption = attrInfo.caption;
                }
                if (attrCaption === key) {
                    attrCaption = UB.i18n(key);
                }
                if (attrLangName) {
                    attrCaption = attrCaption + ' ' + attrLangName;
                }

                diffAttr.attrInfo = attrInfo;
                diffAttr.dataType = attrInfo.dataType;
            }

            diffAttr.key = key;
            diffAttr.caption = attrCaption;
            diffAttr.fromValueText = diffAttr.fromValue ? diffAttr.fromValue.toString() : '';
            diffAttr.toValueText = diffAttr.toValue ? diffAttr.toValue.toString() : '';
        });
        
        return Q.resolve(diffObj);
    },

/*
filling missing attribute information file image
*/
    resolveDiffObjAttachmentAttrs: function (diffObj) {
        _.forEach(_.keys(diffObj), function (key) {
            var diffAttr = diffObj[key];
            switch (key) {
                default:
                    throw new Error('unknown field name ' + key);
                    break;
                case "store":
                    diffAttr.caption = UB.i18n('auditImageStore');
                    break;
                case "fName":
                    diffAttr.caption = UB.i18n('auditImageFName');
                    break;
                case "origName":
                    diffAttr.caption = UB.i18n('auditImageOrigName');
                    break;
                case "relPath":
                    diffAttr.caption = UB.i18n('auditImageRelPath');
                    break;
                case "ct":
                    diffAttr.caption = UB.i18n('auditImageCT');
                    break;
                case "size":
                    diffAttr.caption = UB.i18n('auditImageSize');
                    break;
                case "md5":
                    diffAttr.caption = UB.i18n('auditImageMD5');
                    break;
                case "revision":
                    diffAttr.caption = UB.i18n('auditImageRevision');
                    break;
            }
        });
        
        return Q.resolve(diffObj);
    },

/*
if the field "Entity" gets the value of this
*/
    resolveDiffObjEntity: function (diffAttr) {
        var me = this,
            promise,
            promises = [];

        if (diffAttr.dataType === 'Entity') {
            diffAttr.isEntity = true;
            if (diffAttr.fromValue) {
                promise = me.getEntityValueEntityById(diffAttr.fromValue, diffAttr.attrInfo.associatedEntity)
                .then(function(result) {
                    diffAttr.fromValueText = result;
                });

                promises.push(promise);
            }

            if (diffAttr.toValue) {
                promise = me.getEntityValueEntityById(diffAttr.toValue, diffAttr.attrInfo.associatedEntity)
                .then(function(result) {
                    diffAttr.toValueText = result;
                });

                promises.push(promise);
            }

            return Q.all(promises).then( function() { return Q.resolve(diffAttr); });
        } else if (diffAttr.dataType === 'Enum') {
            if (diffAttr.fromValue) {
                promise = me.getEntityValueEnumByCode(diffAttr.fromValue, diffAttr.attrInfo.enumGroup)
                                .then(function(result) {
                                    diffAttr.fromValueText = result || '';
                                });
                promises.push(promise);
            }

            if (diffAttr.toValue) {
                promise = me.getEntityValueEnumByCode(diffAttr.toValue, diffAttr.attrInfo.enumGroup)
                                .then(function(result) {
                                    diffAttr.toValueText = result || '';
                                });
                promises.push(promise);
            }

            return Q.all(promises).then( function() { return Q.resolve(diffAttr); });
        } else if (diffAttr.dataType === 'Boolean') {
            if (diffAttr.fromValue == true) {
                diffAttr.fromValueText = 'true';
            }
            if (diffAttr.fromValue == false) {
                diffAttr.fromValueText = 'false';
            }
            if (diffAttr.toValue == true) {
                diffAttr.toValueText = 'true';
            }
            if (diffAttr.toValue == false) {
                diffAttr.toValueText = 'false';
            }
        } else if (diffAttr.dataType === 'Date') {
            if (diffAttr.fromValue) {
                var date = new Date(Date.parse(diffAttr.fromValue));
                diffAttr.fromValueText = Ext.Date.format(date, 'd.m.Y');
            }
            if (diffAttr.toValue) {
                var date = new Date(Date.parse(diffAttr.toValue));
                diffAttr.toValueText = Ext.Date.format(date, 'd.m.Y');
            }
        } else if (diffAttr.dataType === 'DateTime') {
            if (diffAttr.fromValue) {
                var date = new Date(Date.parse(diffAttr.fromValue));
                diffAttr.fromValueText = Ext.Date.format(date, 'd.m.Y H:m:s');
            }
            if (diffAttr.toValue) {
                var date = new Date(Date.parse(diffAttr.toValue));
                diffAttr.toValueText = Ext.Date.format(date, 'd.m.Y H:m:s');
            }
        }

        return  Q.resolve(diffAttr);
    },

    getEntityValueEntityById: function(value, associatedEntity) {
        var me = this, promises = [];

        if (associatedEntity === 'uba_user') {
            promises.push(me.getEntityValueUserById(value));
        } else {
            promises.push(Q.resolve(null));
        }

        promises.push(me.getEntityValueById(value, associatedEntity)
        .then(function(result) {
            return value ? result + ' (' + value + ')' : '';
        }));

        var promise = Q.all(promises).then(function(pp) {
            return pp[0] ? pp[0] + ' ' + pp[1] : pp[1];
        }).then(function(result) {
            return result || '';
        });

        return promise;
    },

    getEntityValueEnumByCode: function(value, enumGroup) {
        var me = this;
        var entityInfo = $App.domainInfo.get('ubm_enum');

        if (entityInfo && entityInfo.entityMethods.select) {
            return UB.Repository('ubm_enum')
            .attrs(['name','eGroup','code'])
            .where('eGroup', '=', enumGroup)
            .where('code', '=', value)
            .selectAsObject().then(function(items) {
                if (items.length > 0){
                    var rec = items[0];
                    return rec.name + ' (' + value + ')';
                } else {
                    return value;
                }
            });
        }

        return Q.resolve('');
    },

    getEntityValueById: function (id, associatedEntity, descriptionAttribute) {
        if (!id) {
            return Q.resolve(null);
        }
        
        if (!window.$App.domainInfo.isEntityMethodsAccessible(associatedEntity, 'select')) {
            return Q.resolve('');
        }
        var fieldDesc = descriptionAttribute || window.$App.domainInfo.get(associatedEntity).descriptionAttribute || 'ID';
        
        return UB.Repository(associatedEntity)
        .attrs(_.union(['ID', fieldDesc])) // in case of mapping it is possible what fieldDesc === 'ID'
        .where('ID', '=', id)
        .selectAsObject().then(function(items) {
            if (items.length) {
                var rec = items[0];
                return rec[fieldDesc];
            } else {
                return null;
            }
        });
    },

    getEntityValueUserById: function(value) {
        var
            me = this;

        if (window.$App.domainInfo.isEntityMethodsAccessible('org_employee', 'select')) {
            return me.getEntityOrgInfoByUserId(value);
        } else {
            return Q.resolve(null);
        }
    },

    getEntityOrgInfoByUserId: function (userID) {
        var entityInfo;
        if (!window.$App.domainInfo.isEntityMethodsAccessible('org_employee', 'select')) {
            return Q.resolve(null);
        }
        entityInfo = window.$App.domainInfo.get('org_employee');
        if (entityInfo && entityInfo.entityMethods.select) {
            return UB.Repository('org_employee')
            .attrs(['ID', 'userID', entityInfo.descriptionAttribute])
            .where('userID', '=', userID)
            .selectAsObject().then(function(items) {
                if (items.length > 0){
                    var rec = items[0];
                    return rec[entityInfo.descriptionAttribute] + ' (' + rec.ID + ')';
                } else {
                    return null;
                }
            });
        }
    },
    
/*
coloring text
*/
    resolveDiffOp: function (o, lastOp, addColor, delColor, isDel) {
        var str = Ext.String.htmlEncode(o.atom),
            colorAdd = addColor,
            colorDel = delColor;

        if (isDel) {
            colorAdd = delColor;
            colorDel = addColor;
        }

        if (o.atom === '\n') {
            return '</p><p>';
        }

        if (o.operation === 'none') {
            lastOp.del = false;
            return str;
        } else {
            if (o.operation === 'add') {
                lastOp.del = false;
                if (isDel) {
                    return "<del><span style='background-color:" + colorAdd + "'>"  + str + "</span></del>";
                } else {
                    return "<span style='background-color:" + colorAdd + "'>"  + str + "</span>";
                }
            } else {
                /*
                // put colored delete position (or add position), needs to be improved
                if (lastOp.del) {
                    return '';
                } else {
                    lastOp.del = true;
                    if (isDel) {
                        return "<span style='background-color:" + colorDel + "'>&nbsp;</span>";
                    } else {
                        return "<del><span style='background-color:" + colorDel + "'>&nbsp;</span></del>";
                    }
                }
                */
                return '';
            }
        }
    },

/*
calculating a difference value between before and after
*/
    resolveDiffObjTexts: function (diffAttr) {
        var me = this,
            lastOp;

        var fromValueText = me.splitByWords(diffAttr.fromValueText);
        var toValueText = me.splitByWords(diffAttr.toValueText);

        var diffOpsFromValue = diff(toValueText, fromValueText);
        var diffOpsToValue = diff(fromValueText, toValueText);

        lastOp = {};
        var diffTextFromValue = diffOpsFromValue.map(function (o) {
            return me.resolveDiffOp(o, lastOp, '#C8F2C8', '#D6D6D6', true);
        }).join('');

        lastOp = {};
        var diffTextToValue = diffOpsToValue.map(function (o) {
            return me.resolveDiffOp(o, lastOp, '#C8F2C8', '#D6D6D6', false);
        }).join('');

        diffAttr.fromValueText = diffTextFromValue;
        diffAttr.toValueText = diffTextToValue;

        return Q.resolve(diffAttr);
    },

/*
*/
    splitByWords: function (text) {
        var lexems = [];

        var rules = [/^&lt;+/, /^&gt;+/, /^&amp;+/, /^\s+/, /^\w+/i];
        var tokens = [' ','\n',',','.',';','"',"'",'_','#',
            '<','>','(',')','{','}','?','!','[',']',':','%','|',"\\",
            '*','/','-','+'];
        var i;

        while (text.length > 0) {
            var minPos = Number.MAX_VALUE;
            var minLen = 0;
            for (i = 0; i < tokens.length; i++) {
                var pos = text.indexOf(tokens[i]);
                if (minPos > pos && pos >= 0) {
                    minPos = pos;
                    minLen = tokens[i].length;
                }
            }
            if (minPos > text.length) {
                minPos = text.length;
                minLen = 0;
            }
            var lex = text.substring(0, minPos);
            text = text.slice(minPos, text.length);
            lexems.push(lex);
            if (minLen) {
                lex = text.substring(0, minLen);
                text = text.slice(minLen, text.length);
                lexems.push(lex);
            }
        }
        return lexems;

      //   while (text.length > 0) {
      //   var parsed = false;
      //   for (var i = 0; i < rules.length; i++) {
      //       var m = rules[i].exec(text);
      //       if (m) {
      //           m = m[0];
      //           lexems.push(m);
      //           text = text.slice(m.length, text.length);
      //           parsed = true;
      //           break;
      //       }
      //   }
      //
      //   if (!parsed) {
      //       lexems.push(text[0]);
      //       text = text.slice(1, text.length);
      //   }
      //   }
      //
      // return lexems;
    },

/*
performs "select" to "Entity" attribute value and takes it
*/
    setWindowCaption: function () {
        var me = this;
        var entityInfo = $App.domainInfo.get(me.entityName);
        var actionTypeInfo = entityInfo.attributes.actionType;

        return UB.Repository('ubm_enum')
        .attrs(['name','eGroup','code'])
        .where('eGroup', '=', actionTypeInfo.enumGroup)
        .where('code', '=', me.record.data.actionType)
        .selectAsObject().then(function(items) {
            if (items.length > 0){
                var rec = items[0];
                return entityInfo.caption + " - " + rec.name;
            } else {
                return entityInfo.caption + " - " + me.record.data.actionType;
            }
        }).done(function(result) {
            me.setTitle(result);
        });
    },

    bindEvent: function (cmp, eventName, handler) {
        this.getUBCmp(cmp).on(eventName, handler, this);
    }
};