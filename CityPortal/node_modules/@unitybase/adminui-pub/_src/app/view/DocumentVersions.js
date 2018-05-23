require('./BaseWindow')
/**
 * Window for display revision history of `Document` type attribute.
 * Must be created from form, already contain {UB.ux.UBDocument} since we need to obtain configuration (`docContainerBase` parameter)
 *
 *      var docVersionsViewer = Ext.create('UB.view.DocumentVersions', {
            docRecord: this.record,
            docAttribute: action.attribute,
            instanceID: this.instanceID,
            docContainerBase: this.getField(action.attribute) // on UB 1.7: this.getUBCmp(UB.core.UBCommand.getUBCmpUBName(action.attribute))
        });
        docVersionsViewer.show();
 *
 * @author UnityBase core team, xmax
 */
Ext.define("UB.view.DocumentVersions", {
    extend: "UB.view.BaseWindow",
    height: 600,
    width: 800,
    modal: true,
    commandCode: 'DocumentVersions',
    layout: { type: 'fit' },

    constructor: function(){
        this.callParent(arguments);
    },

    /**
     * @cfg {Ext.data.Model} docRecord record
     */
    /**
     * @cfg {String} docAttribute `Document` type attribute name to display revisions for
     */
    /**
     * @cfg {Number} instanceID ID value
     */
    /**
     * @cfg {UB.ux.UBDocument} docContainerBase Base container
     */
    initComponent: function() {
        var
            me = this, strDoc, revision, revisionItems = [], btn, docCfg, startItem;

        me.maxDeepRevisions = 10;

        me.title = UB.i18n('formShowDocRevisions') + ' ' + me.docContainerBase.initialConfig.fieldLabel;

        strDoc = me.docRecord.get(me.docAttribute);
        me.documentInfo = {};
        if (strDoc){
           me.documentInfo = Ext.JSON.decode(strDoc);
           revision = me.documentInfo.revision;
        }

        me.revisionItems = [];
        revisionItems.push({
            xtype: 'label',
            text: UB.i18n(revision > 1 ? 'selectDocRevision' : 'onlyCurrentVersionExists'),
            margin: '0 0 0 10'
        });
        startItem = (revision - me.maxDeepRevisions) > 0 ? (revision - me.maxDeepRevisions): 1;
        if (revision > 1) { // do not show if only one revision exists
            for (var i = startItem; i <= revision; i++) {
                btn = Ext.widget('button', {
                    style: 'text-weight: bolder',
                    margin: '0 0 0 5',
                    text: i.toString() + (i === revision ? ' ' + UB.i18n('isLastDocRevision') : ''),
                    revisionNum: i,
                    handler: me.loadRevision,
                    scope: me
                });
                revisionItems.push(btn);
                me.revisionItems.push(btn);
            }
        }

        me.tBar = Ext.widget('toolbar', {
            dock: 'top',
            cls: 'ub-grid-info-panel',
            items:  revisionItems
        });

        me.items = me.items || [];

        docCfg = Ext.merge({useRevision: true, expanded: true}, me.docContainerBase.initialConfig );
        docCfg.hidden = false;
        me.documentConainer = Ext.create('UB.ux.UBDocument', docCfg );
        me.items.push(me.documentConainer);

        //me.tbar = revisionItems;

        me.callParent(arguments);
        me.addDocked([me.tBar]);

        //me.documentConainer.setValue(strDoc, me.instanceID, true);
    },

    loadRevision : function(sender){
        var
            me = this;

        me.documentInfo.revision = sender.revisionNum;
        // we don't know original name of prev. revisions, so override it
        me.documentInfo.origName = UB.i18n('revisionNum') + sender.revisionNum;
        me.documentConainer.setValue( Ext.JSON.encode(me.documentInfo) , me.instanceID, true);

        sender.addCls('ub-buttondown');

        Ext.Array.each(me.revisionItems, function(item){
          if (item.revisionNum !== sender.revisionNum ){
              item.removeCls('ub-buttondown');
          }
        });
    }
});
