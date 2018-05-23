require('./UBText')
/**
 * Text area field implementing specific logic of UB
 */
Ext.define('UB.ux.form.field.UBTextArea', {
    extend:'UB.ux.form.field.UBText',
    alias: ['widget.ubtextareafield', 'widget.ubtextarea'],
    requires: [
        'Ext.XTemplate',
        'Ext.layout.component.field.TextArea',
        'Ext.util.DelayedTask'
    ],

    // This template includes a `\n` after `<textarea>` opening tag so that an
    // initial value starting with `\n` does not lose its first character when
    // the markup is parsed. Both textareas below have the same value:
    //
    //     <textarea>initial value</textarea>
    //
    //     <textarea>
    //     initial value
    //     </textarea>
    //
    fieldSubTpl: [
        '<textarea id="{id}" role="{role}" {inputAttrTpl}',
        '<tpl if="name"> name="{name}"</tpl>',
        '<tpl if="rows"> rows="{rows}" </tpl>',
        '<tpl if="cols"> cols="{cols}" </tpl>',
        '<tpl if="placeholder"> placeholder="{placeholder}"</tpl>',
        '<tpl if="size"> size="{size}"</tpl>',
        '<tpl if="maxLength !== undefined"> maxlength="{maxLength}"</tpl>',
        '<tpl if="readOnly"> readonly="readonly"</tpl>',
        '<tpl if="disabled"> disabled="disabled"</tpl>',
        '<tpl if="tabIdx"> tabIndex="{tabIdx}"</tpl>',
        ' class="{fieldCls} {typeCls} {inputCls}" ',
        '<tpl if="fieldStyle"> style="{fieldStyle}"</tpl>',
        ' autocomplete="off">\n',
        '<tpl if="value">{[Ext.util.Format.htmlEncode(values.value)]}</tpl>',
        '</textarea>',
        {
            disableFormats: true
        }
    ],

    getSubTplMarkup: function(values) {
        var me = this,
            childElCls = values.childElCls,
            field = me.getTpl('fieldSubTpl').apply(this.getSubTplData());

        if (me.hideTrigger){
            return this.getTpl('fieldSubTpl').apply(this.getSubTplData());
        } else {
            return [
                '<table id="', me.id, '-triggerWrap" class="', Ext.baseCSSPrefix,
                    'form-trigger-wrap ub-textarea-wrap', childElCls,
                    '" cellpadding="0" cellspacing="0" role="presentation">',
                    '<tbody role="presentation">',
                        '<tr role="presentation">',
                            '<td id="', me.id, '-inputCell" class="', Ext.baseCSSPrefix,
                               'form-trigger-input-cell', childElCls, '" role="presentation">',
                                field,
                            '</td>',
                                me.getTriggerMarkup(),
                        '</tr>',
                    '</tbody>',
                '</table>'
            ].join('');
        }
    },

    getTriggerMarkup : function(){
        var me = this;
        if (me.hideTrigger){
            return '';
        }  else {
            return me.callParent(arguments);
        }
    },

    initTrigger: function(){
        var me = this;
        if (me.hideTrigger){
            return;
        }  else {
            me.callParent(arguments);
        }
    },

    /**
     * @cfg {Number} growMin
     * The minimum height to allow when {@link #grow}=true
     */
    growMin: 60,

    /**
     * @cfg {Number} growMax
     * The maximum height to allow when {@link #grow}=true
     */
    growMax: 1000,

    /**
     * @cfg {String} growAppend
     * A string that will be appended to the field's current value for the purposes of calculating the target field
     * size. Only used when the {@link #grow} config is true. Defaults to a newline for TextArea to ensure there is
     * always a space below the current line.
     */
    growAppend: '\n-',

    /**
     * @cfg {Number} cols
     * An initial value for the 'cols' attribute on the textarea element. This is only used if the component has no
     * configured {@link #width} and is not given a width by its container's layout.
     */
    cols: 20,

    /**
     * @cfg {Number} rows
     * An initial value for the 'rows' attribute on the textarea element. This is only used if the component has no
     * configured {@link #height} and is not given a height by its container's layout. Defaults to 4.
     */
    rows: 4,

    /**
     * @cfg {Boolean} enterIsSpecial
     * True if you want the ENTER key to be classed as a special key and the {@link #specialkey} event to be fired
     * when ENTER is pressed.
     */
    enterIsSpecial: false,

    /**
     * @cfg {Boolean} preventScrollbars
     * true to prevent scrollbars from appearing regardless of how much text is in the field. This option is only
     * relevant when {@link #grow} is true. Equivalent to setting overflow: hidden.
     */
    preventScrollbars: false,

    // private
    componentLayout: 'textareafield',

    setGrowSizePolicy: Ext.emptyFn,

    returnRe: /\r/g,

    inputCls: Ext.baseCSSPrefix + 'form-textarea',

    // private
    getSubTplData: function() {
        var me = this,
            fieldStyle = me.getFieldStyle(),
            ret = me.callParent();

        if (me.grow) {
            if (me.preventScrollbars) {
                ret.fieldStyle = (fieldStyle||'') + ';overflow:hidden;height:' + me.growMin + 'px';
            }
        }

        Ext.applyIf(ret, {
            cols: me.cols,
            rows: me.rows
        });

        return ret;
    },

    afterRender: function () {
        var me = this;

        me.callParent(arguments);

        me.needsMaxCheck = me.enforceMaxLength && me.maxLength !== Number.MAX_VALUE && !Ext.supports.TextAreaMaxLength;
        if (me.needsMaxCheck) {
            me.inputEl.on('paste', me.onPaste, me);
        }
    },

    // The following overrides deal with an issue whereby some browsers
    // will strip carriage returns from the textarea input, while others
    // will not. Since there's no way to be sure where to insert returns,
    // the best solution is to strip them out in all cases to ensure that
    // the behaviour is consistent in a cross browser fashion. As such,
    // we override in all cases when setting the value to control this.
    transformRawValue: function(value){
        return this.stripReturns(value);
    },

    transformOriginalValue: function(value){
        return this.stripReturns(value);
    },

    getValue: function(){
        return this.stripReturns(this.callParent());
    },

    valueToRaw: function(value){
        value = this.stripReturns(value);
        return this.callParent([value]);
    },

    stripReturns: function(value){
        if (value && typeof value === 'string') {
            value = value.replace(this.returnRe, '');
        }
        return value;
    },

    onPaste: function(e){
        var me = this;
        if (!me.pasteTask) {
            me.pasteTask = new Ext.util.DelayedTask(me.pasteCheck, me);
        }
        // since we can't get the paste data, we'll give the area a chance to populate
        me.pasteTask.delay(1);
    },

    pasteCheck: function(){
        var me = this,
            value = me.getValue(),
            max = me.maxLength;

        if (value.length > max) {
            value = value.substr(0, max);
            me.setValue(value);
        }
    },

    // private
    fireKey: function(e) {
        var me = this,
            key = e.getKey(),
            value;

        if (e.isSpecialKey() && (me.enterIsSpecial || (key !== e.ENTER || e.hasModifier()))) {
            me.fireEvent('specialkey', me, e);
        }

        if (me.needsMaxCheck && key !== e.BACKSPACE && key !== e.DELETE && !e.isNavKeyPress() && !me.isCutCopyPasteSelectAll(e, key)) {
            value = me.getValue();
            if (value.length >= me.maxLength) {
                e.stopEvent();
            }
        }
    },

    isCutCopyPasteSelectAll: function(e, key) {
        if (e.ctrlKey) {
            return key === e.A || key === e.C || key === e.V || key === e.X;
        }
        return false;
    },

    /**
     * Automatically grows the field to accomodate the height of the text up to the maximum field height allowed. This
     * only takes effect if {@link #grow} = true, and fires the {@link #autosize} event if the height changes.
     */
    autoSize: function() {
        var me = this,
            height;

        if (me.grow && me.rendered) {
            me.updateLayout();
            height = me.inputEl.getHeight();
            if (height !== me.lastInputHeight) {
                /**
                 * @event autosize
                 * Fires when the {@link #autoSize} function is triggered and the field is resized according to
                 * the grow/growMin/growMax configs as a result. This event provides a hook for the developer
                 * to apply additional logic at runtime to resize the field if needed.
                 * @param {Ext.form.field.Text} this
                 * @param {Number} height
                 */
                me.fireEvent('autosize', me, height);
                me.lastInputHeight = height;
            }
        }
    },

    beforeDestroy: function(){
        var task = this.pasteTask;
        if (task) {
            task.cancel();
            this.pasteTask = null;
        }
        this.callParent();
    }
});
