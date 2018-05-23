var entityRe = /"entity"\s*:\s*"(\w*)"/;

exports.formCode = {
  initUBComponent: function () {
    var me = this
    me.attributeGrid = this.down('commandbuilderentitytreepanel');
    me.getField('cmdCode').addListener('change', me.onCmdCodeChanged, me);
    me.onCmdCodeChanged(null, me.getField('cmdCode').getValue()); // initial data
    me.attributeGrid.addListener('itemdblclick', me.onEntityAttributeGridClick, me);

    me.getField('cmdCode').codeSnippetsGetter = this.codeSnippetsGetter.bind(this)

    if (me.commandConfig.instanceID) return // edit mode

    if (!me.commandConfig.isFolder) {
      me.getField('cmdCode').setValue('//remove this line and when press Ctrl+Q for code templates')
    } else {
      me.getField('isFolder').setValue(true)
    }

    var ds = me.commandConfig.desktopID || $App.getDesktop()
    if (ds) {
      me.getField('desktopID').setValueById(ds)
    }
    if (me.commandConfig.parentID) {
      me.getField('parentID').setValueById(me.commandConfig.parentID)
    }
  },

  codeSnippetsGetter: function () {
    return [{
      displayText: 'showList',
      text: JSON.stringify({
        "cmdType": "showList",
        "cmdData": {
          "params": [{
            "entity": "TYPE-ENTITY-CODE",
            "method": "select",
            "fieldList": ["Dbl-CLICK on left prop panel to add attribute"]
          }]
        }
      }, null, '  ')
    }, {
      displayText: 'showForm',
      text: JSON.stringify({
        "cmdType": "showForm",
        "formCode": "TYPE HERE A FORM CODE FROM UBM_FORM or remove this line to use a default form for entity",
        "entity": "TYPE HERE A ENTITY CODE",
        "instanceID": "REPLACE IT by ID value (to edit element) or remove this line"
      }, null, '  ')
    }, {
      displayText: 'showReport',
      text: JSON.stringify({
        cmdType: "showReport",
        description : "OPTIONAL report form caption",
        entity: "TYPE HERE A ENTITY CODE",
        cmdData: {
          reportCode: "type here report code",
          reportType: "html or pdf",
          reportParams: {
            paramName: "param value" 
          }  
        }
      }, null, '  ')
    }]
  },

    onCmdCodeChanged : function(field, newValue){
        var res;
        if (_.isString(newValue)){
            res = entityRe.exec(newValue);
            if (res) {
                this.attributeGrid.setEntity(res[1]);
            }
        }
    },

    onEntityAttributeGridClick: function(tree, record) {
        var textToInsert;
        var aCodeMirror;
        if (record) {
          textToInsert = '"' + record.get("id") + '"';
          aCodeMirror = this.down('ubcodemirror').codeMirrorInstance;
          aCodeMirror.replaceSelection(textToInsert);
          aCodeMirror.getInputField().focus()
        }
    },

    addBaseActions: function () {

        this.callParent(arguments);

        this.actions.ActionGenerateUpdateScript = new Ext.Action({
            actionId: 'ActionGenerateUpdateScript',
            actionText: 'Generate update script',
            eventId: 'ActionGenerateUpdateScript',
            handler: function () {
                var folderName = this.getUBCmp('attrParentID').getRawValue(),
                    desktopName = this.getUBCmp('attrDesktopID').getRawValue(),
                    code = this.record.get('code'),
                    caption = this.getUBCmp('attrCaption').getValue(),
                    iconCls = this.record.get('iconCls') ? this.record.get('iconCls') : "";

                var text = "//Desktop: "+ desktopName + ", Folder: " + folderName + ", Caption: " + caption+ ", Code: "+ code +"\n"+
                    "var ID = conn.lookup('ubm_navshortcut', 'ID', UB.Repository('ubm_navshorcut').where('code', '=', '"+this.record.get('code')+"').ubRequest().whereList, true);\n"+
                    "if (ID) {\n"+
                    "    var mi_modifyDate = conn.lookup('ubm_navshortcut', 'mi_modifyDate', UB.Repository('ubm_navshorcut').where('code', '=', '"+this.record.get('code')+"').ubRequest().whereList);\n"+
                    "    conn.run({\n"+
                    "        'entity': 'ubm_navshortcut',\n"+
                    "        'method': 'update',\n"+
                    "        'execParams': {\n"+
                    "            'cmdCode': "+JSON.stringify(this.getUBCmp('attrCmdCode').getModelData().cmdCode)+",\n"+
                    "            'ID': ID,\n"+
                    "            'iconCls' : " + iconCls + ",\n"+
                    "            'mi_modifyDate': mi_modifyDate\n"+
                    "        }\n"+
                    "    });\n"+
                    "} else { \n"+
                    "  var desktopID = conn.lookup('ubm_desktop', 'ID', UB.Repository('ubm_desktop').where('code', '=', '"+this.record.get('desktopID.code')+"').ubRequest().whereList);\n"+
                    "  var parentID = conn.lookup('ubm_navshortcut', 'ID', UB.Repository('ubm_navshorcut').where('code', '=', '"+this.record.get('parentID.code')+"').ubRequest().whereList, true);\n"+
                    "  conn.insert({\n"+
                    "   'entity'  : 'ubm_navshortcut',\n"+
                    "   'execParams' : {\n"+
                    "       'desktopID' : desktopID,\n"+
                    "       'parentID' : parentID,\n"+
                    "       'caption^' : '" + this.record.get('caption')+"',\n"+
                    "       'caption_ru^' : '" + this.record.get('caption')+"',\n"+
                    "       'caption_en^' : '" + this.record.get('caption')+"',\n"+
                    "       'caption_az^' : '" + this.record.get('caption')+"',\n"+
                    "       'code' : '" + this.record.get('code')+"',\n"+
                    "       'isFolder' : " + this.record.get('isFolder')+",\n"+
                    "       'inWindow' : " + this.record.get('inWindow')+",\n"+
                    "       'isCollapsed' : " + this.record.get('isCollapsed')+",\n"+
                    "       'displayOrder' : " + this.record.get('displayOrder')+",\n"+
                    "       'iconCls' : " + iconCls + ",\n"+
                    "       'cmdCode' : " +JSON.stringify(this.getUBCmp('attrCmdCode').getModelData().cmdCode)+"\n"+
                    "    }\n"+
                    "  });\n"+
                    "}\n";
                var wind = new Ext.Window({layout: 'fit', height: 400, width: 500, items: [{xtype:'textarea'}]});
                wind.show(null, function(){
                    var textArea = wind.down('textarea').setValue(text);
                    textArea.focus(500);
                    textArea.selectText(0,10000000000000000);
                });


            },
            scope: this
        });
    }
};