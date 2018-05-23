/**
 * @class UB.view.UBDropZone
 * @singleton
 *
 * Files Drag&Drop support.
 *
 * By using this class developer can add his own handlers to event, occurred when user  drag file
 * to the application area. Just subscribe to  `configureDropZone` event as described below:
 *
    UB.view.UBDropZone.on('configureDropZone', function(config){
        console.log('global configureDropzone');
        config.push({
            iconCls: 'fa fa-envelope fa-5x',
            message: 'createIncoming'
            // no dragoverHandler - default action will be used ('+copy')
            // no dropHandler - browser perform copy action
        });
        config.push({
            message: 'addAttachment',
            dragoverHandler: function(e){
                return true;
            },
            dropHandler: function(e){
                // this one never happens since dragoverHandler do not prevent default browser action
            }
        });
        config.push({
            iconCls: 'fa fa-file-o fa-5x',
            message: "addMainImage",
            dropHandler: function(e){
                UB.logDebug('user drop files:' + e.dataTransfer.files.length);
                // do something good with file
                e.preventDefault(); // tell browser we do all we want manually
            }
        });

    });
 *
 * Do not forget to un-subscribe when your module / form not require files drag & drop any more.
 * Warning - if you add handler using scope parameter of `on` - use the same scope for `un`
 * see {@link http://docs.sencha.com/extjs/4.2.2/#!/api/Ext.util.Observable-method-un} for details
 *
 *      UB.view.UBDropZone.removeListener('configureDropZone', myHandlerVariable);
 *
 *  For complex example see {@link UB.view.BasePanel#onFileDragDropConfigure} realisation
 */
/*
 @author pavel.mash on 12.07.2014.
 */
Ext.define('UB.view.UBDropZone', {
    singleton: true,
    requires: ['Ext.util.Observable'],
    mixins: {
        observable: 'Ext.util.Observable'
    },

    /**
     * @private
     * Current drop target config filled by configureDropZone event handlers
     */
    currentDropTargetConfig: [],
    /** @private balance between enter & leave of elements. If === 0 we hide */
    enterLaveBalance: 0,
    /**
     * @readonly
     * @private
     * is dropzone currently visible
     */
    visible: false,
    /**
     * @private
     * Enable/disable dropzone
     */
    _enabled: true,

    constructor: function() {
        var me = this;
        me.mixins.observable.constructor.call(me);
    },

    /**
     * @method  setEnabled
     * @param {Boolean} value
     * Enable / disable dropZone functionality. Remember - other subsystem can use this class to,
     * so instead of disable usually better to add nothing inside {@link UB.view.UBDropZone#configureDropZone configureDropZone}
     * event or unsubscribe from event at all.
     */
    setEnabled: function(value){
        this._enabled = value;
        if (!value){
            this.hide();
        }
    },

    isEnabled: function(){
        return this._enabled;
    },

    /**
     * Add drag/drop handlers for configured drop zones
     * @private
     * @param {UB.view.UBDropZone} self
     * @param {HTMLElement} zone
     * @param {Object} config
     */
    addZoneHandlers: function(self, zone, config){
        var alwaysAllow = function(e){
            var dt = e.dataTransfer;
            e.stopPropagation();
            e.preventDefault();
            dt.dropEffect = 'copy';
        };
        config.dragoverHandler = config.dragoverHandler || alwaysAllow;
        zone.addEventListener('dragenter', function(e){
            self.dzEnter(); // enter directly from mask
            zone.className = 'ub-dz-placeholder ub-dz-placeholder-accept';
            e.stopPropagation();
            e.preventDefault();
        });
        zone.addEventListener('dragover', function(e){
            return config.dragoverHandler(e);
        });
        zone.addEventListener('dragleave', function(e){
            var rect = zone.getBoundingClientRect();
            self.dzLeave();
            //dragleave occurs even if we go to child elements, so we must check we really go out from dropzone
            // Check the mouseEvent coordinates are outside of the zone
            if(e.clientX > (rect.left + rect.width) || e.clientX < rect.left
                || e.clientY > (rect.top + rect.height) || e.clientY < rect.top) {
                zone.className = 'ub-dz-placeholder';
            }
            e.stopPropagation();
            e.preventDefault();
        });
        zone.addEventListener('drop', function(e){
            var res = false;
            e.stopPropagation(); // do not pass to parent container
            if (!config.dropHandler){
                UB.logError('no handler passed to UBDropZone config: ' + JSON.stringify(config));
                return false;
            } else {
                res = config.dropHandler(e);
            }
            self.hide();
            return res;
        });
    },

    /**
     * @method init
     * Init DropZone. Call this after dom ready in your custom application.
     * We already done this in app.js for Ext-based client!
     *
     *           UB.view.UBDropZone.init();
     */
    init: function () {
        var body = document.body, me = this, mask, content;

        me.mask = mask = document.createElement('div');
        mask.className = 'ub-mask';
        mask.style.display = 'none';
        body.appendChild(mask);

        mask.addEventListener('dragenter', function (event) {
            me.dzEnter();
            event.preventDefault();
        });
        mask.addEventListener('dragleave', function (event) {
            me.dzLeave();
            event.preventDefault();
        });

        me.content = content = document.createElement('div');
        content.className = 'ub-dz-body';
        body.appendChild(content);

        content.addEventListener('dragenter', function (event) {
            me.dzEnter();
            event.stopPropagation();
            event.preventDefault();
        });

        content.addEventListener('dragleave', function (event) {
            me.dzLeave();
            event.stopPropagation();
            event.preventDefault();
        });

        body.addEventListener('dragenter', function (event) {
            if (!me._enabled){
                return;
            }
            var dt = event.dataTransfer, zone, i;
            event.preventDefault();
            if (!me.isVisible() && (dt.types.length > 0) && (_.indexOf(dt.types, 'Files') !== -1)) { // in firefox we got several items in types
                /**
                 * @event configureDropZone
                 * @param {Array} dropTargetConfig
                 * Fires when user drag file to UB application area.
                 *
                 * Subscriber must fill passed array (add some items) with config's objects:
                 *
                 *      {
                 *          iconCls: 'your action icon class', //default is 'fa fa-dropbox fa-5x'
                 *          message: 'text to display', // we do UB.i18n for this message
                 *          dragoverHandler: function(event){}, //Optional handler called to determinate we allow drop.
                 *          dropHandler: function(event){} // called when user drop file
                 *     }
                 */
                me.fireEvent('configureDropZone', me.currentDropTargetConfig);
                if (me.currentDropTargetConfig.length) {
                    UB.logDebug('add     inner content');
                    //activate only is somebody subscribe
                    _.forEach(me.currentDropTargetConfig, function(cfg){
                        zone = document.createElement('div');
                        zone.className = 'ub-dz-placeholder';
                        zone.id = 'ub-dz-item-' + i;
                        zone.innerHTML = UB.format('<i class="{0}"></i><br>{1}</div>', cfg.iconCls || 'fa fa-dropbox fa-5x', UB.i18n(cfg.message));
                        content.appendChild(zone);
                        me.addZoneHandlers(me, zone, cfg);
                    });
                    me.show();
                }
            }
        });

        body.addEventListener('dragover', function (event) {
            var dt;
            if (!me._enabled){
                return;
            }
            //if (me.isVisible()) {
                event.preventDefault(); // prevent default browser action (copy)
                dt = event.dataTransfer;
                dt.dropEffect = 'none';
                return false;
            //}
        });
    },

    clearContent: function () {
        var me = this, content = me.content;

        for (var i = content.childNodes.length - 1; i >= 0; i--) {
            content.removeChild(content.childNodes[i]);
        }
        me.currentDropTargetConfig = []
    },

    dzEnter: function(){
        return ++(this.enterLaveBalance);
    },

    dzLeave: function(){
        --(this.enterLaveBalance);
        if (this.enterLaveBalance===0){
            this.hide();
        }
        return this.enterLaveBalance;
    },

    hide: function () {
        this.mask.style.display = 'none';
        this.content.style.display = 'none';
        this.clearContent();
        this.visible = false;
        this.enterLaveBalance = 0;
    },

    show: function () {
        this.enterLaveBalance = 0;
        this.mask.style.display = 'inline';
        this.content.style.display = 'inline';
        this.visible = true;
    },

    isVisible: function () {
        return this.visible;
    }
});
