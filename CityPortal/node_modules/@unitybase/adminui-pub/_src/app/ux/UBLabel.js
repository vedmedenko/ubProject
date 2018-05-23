/**
 * Extend Ext.form.Label for display information about empty document type attribute
 * TODO - describe usage
 * @author UnityBase core team
 */
Ext.define("UB.ux.UBLabel", {
    extend: "Ext.form.Label",
    alias: "widget.ublabel",

    cls: "emptyDocument",

    setSrc: function(cfg) {
        this.setText(cfg.html);
        return Q.resolve(true);
    }
});
