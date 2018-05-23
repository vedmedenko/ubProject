require('../core/UBUtil')
require('../core/UBLocalStorageManager')
require('../core/UBAppConfig')
/**
 * Container for elements, showed in separate window
 * Tasks solved:
 *
 *  - window is constraints to center area of viewport
 *  - minWidth & minHeight set to parameters defined in UB.appConfig
 *  - handle browser window resize event
 *  - fires  'windowActivated' & 'windowDestroyed' events to $App singleton
 *  - stores size & position to localStore & restore it during next creation
 *
 * @author UnityBase core team
 */
Ext.define('UB.view.BaseWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.basewindow',
    // requires: [
    //     'UB.core.UBUtil',
    //     'UB.core.UBLocalStorageManager',
    //     'UB.core.UBAppConfig'
    // ],
  uses: ['UB.core.UBApp'],

    //padding: 1,
    constrain: true,
    maximizable: true,

    initComponent: function() {
        var
            me = this,
            commandConfig = this.commandCode ? UB.core.UBLocalStorageManager.getItem(this.windowLocalStoreKey=UB.core.UBLocalStorageManager.getKeyUI(this.commandCode), true) : undefined;

        if(commandConfig && commandConfig.window && commandConfig.window.position) {
            if(commandConfig.window.position.x) {
                this.x = commandConfig.window.position.x;
            }
            if(commandConfig.window.position.y) {
                this.y = commandConfig.window.position.y;
            }
        } else if(this.dfm && this.dfm.position) {
            if(this.dfm.position.x) {
                this.x = this.dfm.position.x;
            }
            if(this.dfm.position.y) {
                this.y = this.dfm.position.y;
            }
        }

        if(commandConfig && commandConfig.window) {
            if(commandConfig.window.height) {
                this.height = commandConfig.window.height;
            }
            if(commandConfig.window.width) {
                this.width = commandConfig.window.width;
            }
        } else if(this.dfm && this.dfm.size) {
            if(this.dfm.size.height) {
                this.height = this.dfm.size.height;
            }
            if(this.dfm.size.width) {
                this.width = this.dfm.size.width;
            }
        } else if(this.isGrid) {
            this.height = UB.appConfig.gridHeightDefault;
            this.width = UB.appConfig.gridWidthDefault;
        }


        Ext.apply(this, {
            //autoShow: true,
            minHeight: UB.appConfig.formMinHeight,
            minWidth: UB.appConfig.formMinWidth
        });

        // all window must be modal.
        me.modal = true;

        this.callParent(arguments);

        this.addListener('activate', this.onActivated, this);
    },

    onActivated: function(/*win, eOpts*/) {
        $App.fireEvent('windowActivated', this);
    },

    /**
     * @override
     */
    beforeDestroy: function() {
        var
            commandConfig;

        if(this.commandCode){
            commandConfig = UB.core.UBLocalStorageManager.getItem(this.windowLocalStoreKey, true) || {};
            commandConfig.window = {
                position: {
                    x: this.x,
                    y: this.y
                }
            };
            if(this.height) {
                commandConfig.window.height = this.height;
            }
            if(this.width) {
                commandConfig.window.width = this.width;
            }

            UB.core.UBLocalStorageManager.setItem(this.windowLocalStoreKey, commandConfig);
        }

        this.callParent(arguments);

        $App.fireEvent('windowDestroyed', this);
    }
});
