/**
 * Файл: UB.ux.form.field.AdvancedTextArea.js
 * Автор: Игорь Ноженко
 * 
 * Расширение Ext.form.field.TextArea позволяющее вставлять текст в позицию курсора
 */

Ext.define("UB.ux.form.field.AdvancedTextArea", {
    extend: "Ext.form.field.TextArea",
    alias: "widget.advancedtextarea",

    /**
     * 
     * @param {String} value
     */
    insertAtCursor: function(value) {
        var
            el = this.inputEl.dom,
            sel,
            pos;

        if(typeof document.selection !== "undefined")
        {
            el.focus();
            sel = document.selection.createRange();
            sel.text = value; 
        }
        else
        {
            pos = el.selectionStart;
            el.value = el.value.substring(0, pos) + value + el.value.substring(pos);
        }
    }
});
