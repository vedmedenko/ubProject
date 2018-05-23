/*
 */
/**
 * @private
 */
Ext.define('UB.view.OverflowSelect', {

    /* Begin Definitions */

    extend: 'Ext.layout.container.boxOverflow.None',
    requires: ['Ext.toolbar.Separator', 'Ext.button.Button'],
    mixins: {
        observable: 'Ext.util.Observable'
    },

    /* End Definitions */

    /**
     * @cfg {String} triggerButtonCls
     * CSS class added to the Button which shows the overflow menu.
     */

    /**
     * @property {String} noItemsMenuText
     * HTML fragment to render into the toolbar overflow menu if there are no items to display
     */
    noItemsMenuText : '<div class="' + Ext.baseCSSPrefix + 'toolbar-no-items" role="menuitem">(None)</div>',

    constructor: function(layout) {
        var me = this;

        me.layout = layout;

        me.callParent(arguments);

        me.triggerButtonCls = me.triggerButtonCls || Ext.baseCSSPrefix + 'box-menu-after';
        /**
         * @property {Array} menuItems
         * Array of all items that are currently hidden and should go into the dropdown menu
         */
        me.menuItems = [];

        // Dont pass the config so that it is not applied to 'this' again
        me.mixins.observable.constructor.call(me);

        me.scrollPosition = 0;
        me.scrollSize = 0;
    },

    beginLayout: function (ownerContext) {
        this.callParent(arguments);

        ownerContext.innerCtScrollPos = this.getScrollPosition();

        // Before layout, we need to re-show all items which we may have hidden due to a
        // previous overflow...
        this.clearOverflow(ownerContext);
    },

    completeLayout: function(ownerContext) {
        var me = this,
            plan = ownerContext.state.boxPlan,
            names = me.layout.names,
            last;

        // If there is overflow...
        if (plan && plan.tooNarrow) {
            last = ownerContext.childItems[ownerContext.childItems.length - 1];

            // capture this before callParent since it calls handle/clearOverflow:
            me.scrollSize = last.props[names.x] + last.props[names.width];
            me.updateScrollButtons();
            me.updateActivePosition(ownerContext);
        }
        this.callParent(arguments);
    },


    finishedLayout: function(ownerContext) {
        var me = this,
            layout = me.layout,
            scrollPos = Math.min(me.getMaxScrollPosition(), ownerContext.innerCtScrollPos);

        layout.innerCt[layout.names.setScrollLeft](scrollPos);
    },

    beginLayoutCycle: function (ownerContext, firstCycle) {
        this.callParent(arguments);

        if (!firstCycle) {
            // if we are being re-run, we need to clear any overflow from the last run and
            // recache the childItems collection
            this.clearOverflow(ownerContext);

            this.layout.cacheChildItems(ownerContext);
        }
    },


    updateActivePosition: function(ownerContext){
        var me = this, itemCt;
        for (var i = 1; i < ownerContext.childItems.length; i++){
            if (ownerContext.childItems[i] && ownerContext.childItems[i].target){
                itemCt = ownerContext.childItems[i].target;
                if (itemCt.active){
                    me.scrollToItem(itemCt, true);
                    break;
                }
            }
        }

    },

    onRemove: function(comp){
        Ext.Array.remove(this.menuItems, comp);
    },

    // We don't define a prefix in menu overflow.
    getSuffixConfig: function() {
        var me = this,
            layout = me.layout,
            owner = layout.owner,
            oid = owner.id;

        /**
         * @private
         * @property {Ext.menu.Menu} menu
         * The expand menu - holds items for every item that cannot be shown
         * because the container is currently not large enough.
         */
        me.menu = new Ext.menu.Menu({
            listeners: {
                scope: me,
                beforeshow: me.beforeMenuShow
            }
        });

        /**
         * @private
         * @property {Ext.button.Button} menuTrigger
         * The expand button which triggers the overflow menu to be shown
         */
        me.menuTrigger = new Ext.button.Button({
            id: oid + '-menu-trigger',
            cls: Ext.layout.container.Box.prototype.innerCls + ' ' + me.triggerButtonCls + ' ' + Ext.baseCSSPrefix + 'toolbar-item' +
               ' ub-overflow-button',
            plain: owner.usePlainButtons,
            ownerCt: owner, // To enable the Menu to ascertain a valid zIndexManager owner in the same tree
            ownerLayout: layout,
            iconCls: Ext.baseCSSPrefix + me.getOwnerType(owner) + '-more-icon',
            ui: owner instanceof Ext.toolbar.Toolbar ? 'default-toolbar' : 'default',
            menu: me.menu,
            // Menu will be empty when we're showing it because we populate items after
            showEmptyMenu: true,
            getSplitCls: function() { return '';}
        });

        return me.menuTrigger.getRenderTree();
    },

    getOverflowCls: function() {
        return Ext.baseCSSPrefix + this.layout.direction + '-box-overflow-body';
    },

    handleOverflow: function(ownerContext) {
        var me = this,
            layout = me.layout,
            names = layout.names,
            plan = ownerContext.state.boxPlan,
            posArgs = [null, null];

        me.showTrigger(ownerContext);

        // Center the menuTrigger button only if we are not vertical.
        // TODO: Should we emulate align: 'middle' like this, or should we 'stretchmax' the menuTrigger?
        if (me.layout.direction !== 'vertical') {
            posArgs[names.heightIndex] = (plan.maxSize - me.menuTrigger[names.getHeight]()) / 2;
            me.menuTrigger.setPosition.apply(me.menuTrigger, posArgs);
        }

        return {
            reservedSpace: me.triggerTotalWidth
        };
    },

    /**
     * Finishes the render operation of the trigger Button.
     * @private
     */
    captureChildElements: function() {
        var me = this,
            menuTrigger = me.menuTrigger,
            names = me.layout.names;

        // The rendering flag is set when getRenderTree is called which we do when returning markup string for the owning layout's "suffix"
        if (menuTrigger.rendering) {
            menuTrigger.finishRender();
            me.triggerTotalWidth = menuTrigger[names.getWidth]() + menuTrigger.el.getMargin(names.parallelMargins);
        }
    },

    _asLayoutRoot: { isRoot: true },

    /**
     * @private
     * Called by the layout, when it determines that there is no overflow.
     * Also called as an interceptor to the layout's onLayout method to reshow
     * previously hidden overflowing items.
     */
    clearOverflow: function(ownerContext) {
        var me = this,
            items = me.menuItems,
            owner = me.layout.owner;

        owner.suspendLayouts();
        me.captureChildElements();
        me.hideTrigger();
        owner.resumeLayouts();
        items.length = 0;
    },

    /**
     * @private
     * Shows the overflow trigger when enableOverflow is set to true and the items
     * in the layout are too wide to fit in the space available
     */
    showTrigger: function(ownerContext) {
        var me = this,
            layout = me.layout,
            owner = layout.owner,
            names = layout.names,
            startProp = names.x,
            sizeProp = names.width,
            plan = ownerContext.state.boxPlan,
            available = plan.targetSize[sizeProp],
            childItems = ownerContext.childItems,
            len = childItems.length,
            menuTrigger = me.menuTrigger,
            childContext, btn,
            comp, i, props, isInvisible;

        me.ownerContext = ownerContext;
        // We don't want the menuTrigger.show to cause owner's layout to be invalidated, so
        // we force just the button to be invalidated and added to the current run.
        menuTrigger.suspendLayouts();
        menuTrigger.show();
        menuTrigger.resumeLayouts(me._asLayoutRoot);

        available -= me.triggerTotalWidth;

        owner.suspendLayouts();

        // Hide all items which are off the end, and store them to allow them to be restored
        // before each layout operation.
        me.menuItems.length = 0;
        for (i = 0; i < len; i++) {
            childContext = childItems[i];
            comp = childContext.target;
            props = childContext.props;
            isInvisible = (props[startProp] + props[sizeProp] > available);
            btn = Ext.create('Ext.Button',{
                 text: comp.text,
                 targetTab: comp,
                 childContext : childContext,
                 handler: me.onMenuItemClick, scope: me
            });
            me.menuItems.push(btn);

        }

        owner.resumeLayouts();
    },

    updateItemsState: function(item){
        var me = this,
            props =  item.childContext.props,
            comp = item.targetTab,
            names = me.layout.names,
            startProp = names.x,
            sizeProp = names.width,
            plan = me.ownerContext.state.boxPlan,
            available = plan.targetSize[sizeProp],
            isInvisible;

        props = item.childContext.props;
        available -= me.triggerTotalWidth;
        isInvisible = (props[startProp] + props[sizeProp] > available);
        item.initialConfig.cls = '';
        if (comp.active){
            item.initialConfig.cls += 'ub-overflow-menu-item-active';
        }

    },

    onMenuItemClick: function(sender){
        this.scrollToItem(sender.targetTab);
        sender.targetTab.tabBar.tabPanel.setActiveTab(sender.targetTab.card);
        //sender.targetTab.activate();
        //sender.targetTab.handler.call(sender.targetTab, sender.targetTab);
    },


    /**
     * Scrolls to the given component.
     * @param {String/Number/Ext.Component} item The item to scroll to. Can be a numerical index, component id
     * or a reference to the component itself.
     * @param {Boolean} animate True to animate the scrolling
     */
    scrollToItem: function(item, animate) {
        var me = this,
            layout = me.layout,
            owner = layout.owner,
            names = layout.names,
            visibility,
            newPos, i, nextItm, prevItm, centerPos, vsize;

        if (me.isScrollingProcess){
            return;
        }
        item = me.getItem(item);
        if (item !== undefined) {
            if (item === owner.items.first()) {
                newPos = 0;
            } else if (item === owner.items.last()) {
                newPos = me.getMaxScrollPosition();
            } else {
                for(i = 0; i < owner.items.length; i++){
                    if (owner.items.getAt(i) === item){
                        nextItm = owner.items.getAt(i + 1);
                        nextItm = me.getItemVisibility(nextItm);
                        prevItm = owner.items.getAt(i - 1);
                        prevItm = me.getItemVisibility(prevItm);
                        break;
                    }
                }
                visibility = me.getItemVisibility(item);
                if (!visibility.fullyVisible || !nextItm.fullyVisible || !prevItm.fullyVisible) {
                    vsize = me.layout.innerCt[names.getWidth]();

                    if (prevItm.hiddenStart){
                        centerPos = visibility.width + nextItm.width + prevItm.width < vsize ? nextItm.itemEnd - vsize :
                            //prevItm.itemStart:
                            visibility.itemStart + visibility.width / 2 -  vsize / 2 ;
                    } else {
                        centerPos = visibility.width + nextItm.width + prevItm.width < vsize ? prevItm.itemStart:
                            //nextItm.itemEnd - vsize:
                            visibility.itemStart + visibility.width / 2 -  vsize / 2 ;
                    }
                    newPos = centerPos;
                }
            }
            if (newPos !== undefined) {
                me.scrollTo(newPos, animate);
            }
        }
    },

    /**
     * @private
     * Scrolls to the given position. Performs bounds checking.
     * @param {Number} position The position to scroll to. This is constrained.
     * @param {Boolean} animate True to animate. If undefined, falls back to value of this.animateScroll
     */
    scrollTo: function(position, animate) {
        var me = this,
            layout = me.layout,
            names = layout.names,
            oldPosition = me.getScrollPosition(),
            newPosition = Ext.Number.constrain(position, 0, me.getMaxScrollPosition());

        if (me.isScrollingProcess){
            return;
        }
        if (newPosition !== oldPosition && !me.scrolling) {
            me.scrollPosition = NaN;
            if (animate === undefined) {
                animate = me.animateScroll;
            }
            me.isScrollingProcess = true;
            layout.innerCt[names.scrollTo](names.beforeScrollX, newPosition, animate ? me.getScrollAnim() : false);
            if (animate) {
                me.scrolling = true;
            } else {
                me.updateScrollButtons();
            }
            me.fireEvent('scroll', me, newPosition, animate ? me.getScrollAnim() : false);
            me.isScrollingProcess = false;
        }
    },


    /**
     * @private
     * @return {Object} Object passed to scrollTo when scrolling
     */
    getScrollAnim: function() {
        return {
            duration: this.scrollDuration,
            callback: this.updateScrollButtons,
            scope   : this
        };
    },

    /**
     * @private
     * Enables or disables each scroller button based on the current scroll position
     */
    updateScrollButtons: function() {
        var me = this;
        me.scrolling = false;
    },

    /**
     * @private
     * For a given item in the container, return an object with information on whether the item is visible
     * with the current innerCt scroll value.
     * @param {Ext.Component} item The item
     * @return {Object} Values for fullyVisible, hiddenStart and hiddenEnd
     */
    getItemVisibility: function(item) {
        var me          = this,
            box         = me.getItem(item).getBox(true, true),
            layout      = me.layout,
            names       = layout.names,
            itemStart   = box[names.x],
            itemEnd     = itemStart + box[names.width],
            scrollStart = me.getScrollPosition(),
            scrollEnd   = scrollStart + layout.innerCt[names.getWidth]();

        return {
            hiddenStart : itemStart < scrollStart,
            hiddenEnd   : itemEnd > scrollEnd,
            fullyVisible: itemStart > scrollStart && itemEnd < scrollEnd,
            scrollStart: scrollStart,
            scrollEnd: scrollEnd,
            itemStart: itemStart,
            itemEnd: itemEnd,
            width: box[names.width]
        };
    },

    /**
     * Returns the current scroll position of the innerCt element
     * @return {Number} The current scroll position
     */
    getScrollPosition: function(){
        var me = this,
            layout = me.layout,
            result;

        // Until we actually scroll, the scroll[Top|Left] is stored as zero to avoid DOM
        // hits, after that it's NaN.
        if (isNaN(me.scrollPosition)) {
            result = layout.innerCt[layout.names.getScrollLeft]();
        } else {
            result = me.scrollPosition;
        }
        return result;
    },

    /**
     * @private
     * Returns the maximum value we can scrollTo
     * @return {Number} The max scroll value
     */
    getMaxScrollPosition: function() {
        var me = this,
            layout = me.layout,
            maxScrollPos = me.scrollSize - layout.innerCt[layout.names.getWidth]();

        return (maxScrollPos < 0) ? 0 : maxScrollPos;
    },



    /**
     * @private
     */
    hideTrigger: function() {
        var menuTrigger = this.menuTrigger;
        if (menuTrigger) {
            menuTrigger.hide();
        }
    },

    /**
     * @private
     * Called before the overflow menu is shown. This constructs the menu's items, caching them for as long as it can.
     */
    beforeMenuShow: function(menu) {
        var me = this,
            items = me.menuItems,
            i = 0,
            len   = items.length,
            item,
            prev;

        menu.suspendLayouts();
        me.clearMenu();
        menu.removeAll();

        for (; i < len; i++) {
            item = items[i];
            me.updateItemsState(item);
            me.addComponentToMenu(menu, item);
            prev = item;
        }

        // put something so the menu isn't empty if no compatible items found
        if (menu.items.length < 1) {
            menu.add(me.noItemsMenuText);
        }
        menu.resumeLayouts();
    },

    /**
     * @private
     * Returns a menu config for a given component. This config is used to create a menu item
     * to be added to the expander menu
     * @param {Ext.Component} component The component to create the config for
     * @param {Boolean} hideOnClick Passed through to the menu item
     */
    createMenuConfig : function(component, hideOnClick) {
        var me = this,
            config = Ext.apply({}, component.initialConfig),
            group  = component.toggleGroup;

        Ext.copyTo(config, component, [
            'iconCls', 'icon', 'itemId', 'disabled', 'handler', 'scope', 'menu', 'tabIndex'
        ]);

        Ext.apply(config, {
            text       : component.overflowText || component.text,
            hideOnClick: hideOnClick,
            destroyMenu: false,
            listeners  : {}
        });

        // Clone must have same value, and must sync original's value on change
        if (component.isFormField) {
            config.value = component.getValue();

            // Sync the original component's value when the clone changes value.
            // This intentionally overwrites any developer-configured change listener on the clone.
            // That's because we monitor the clone's change event, and sync the
            // original field by calling setValue, so the original field's change
            // event will still fire.
            config.listeners.change = function(c, newVal, oldVal) {
                component.setValue(newVal);
            };
        }

        // ToggleButtons become CheckItems
        else if (group || component.enableToggle) {
            Ext.apply(config, {
                hideOnClick: false,
                group  : group,
                checked: component.pressed,
                handler: function(item, e) {
                    component.onClick(e);
                }
            });
        }

        // Buttons may have their text or icon changed - this must be propagated to the clone in the overflow menu
        if (component.isButton && !component.changeListenersAdded) {
            component.on({
                textchange: me.onButtonAttrChange,
                iconchange: me.onButtonAttrChange,
                toggle:     me.onButtonToggle
            });
            component.changeListenersAdded = true;
        }

        // Typically margins are used to separate items in a toolbar
        // but don't really make a lot of sense in a menu, so we strip
        // them out here.
        delete config.margin;
        delete config.ownerCt;
        delete config.xtype;
        delete config.id;
        delete config.itemId;
        return config;
    },

    onButtonAttrChange: function(btn) {
        var clone = btn.overflowClone;
        clone.suspendLayouts();
        clone.setText(btn.text);
        clone.setIcon(btn.icon);
        clone.setIconCls(btn.iconCls);
        clone.resumeLayouts(true);
    },

    onButtonToggle: function(btn, state) {
        // Keep the clone in sync with the original if necessary
        if (btn.overflowClone.checked !== state) {
            btn.overflowClone.setChecked(state);
        }
    },

    /**
     * @private
     * Adds the given Toolbar item to the given menu. Buttons inside a buttongroup are added individually.
     * @param {Ext.menu.Menu} menu The menu to add to
     * @param {Ext.Component} component The component to add
     * TODO: Implement overrides in Ext.layout.container.boxOverflow which create overrides
     * for SplitButton, Button, ButtonGroup, and TextField. And a generic one for Component
     * which create clones suitable for use in an overflow menu.
     */
    addComponentToMenu : function(menu, component) {
        var me = this,
            i, items, iLen;
        if (component instanceof Ext.toolbar.Separator) {
            menu.add('-');
        } else if (component.isComponent) {
            if (component.isXType('splitbutton')) {
                component.overflowClone = menu.add(me.createMenuConfig(component, true));

            } else if (component.isXType('button')) {
                component.overflowClone = menu.add(me.createMenuConfig(component, !component.menu));

            } else if (component.isXType('buttongroup')) {
                items = component.items.items;
                iLen  = items.length;

                for (i = 0; i < iLen; i++) {
                    me.addComponentToMenu(menu, items[i]);
                }
            } else {
                component.overflowClone = menu.add(Ext.create(Ext.getClassName(component), me.createMenuConfig(component)));
            }
        }
    },

    /**
     * @private
     * Deletes the sub-menu of each item in the expander menu. Submenus are created for items such as
     * splitbuttons and buttongroups, where the Toolbar item cannot be represented by a single menu item
     */
    clearMenu : function() {
        var menu = this.menu,
            items, i, iLen, item;

        if (menu && menu.items) {
            items = menu.items.items;
            iLen  = items.length;

            for (i = 0; i < iLen; i++) {
                item = items[i];
                if (item.setMenu) {
                    item.setMenu(null);
                }
            }
        }
    },

    /**
     * @private
     */
    destroy: function() {
        var trigger = this.menuTrigger;

        if (trigger && !this.layout.owner.items.contains(trigger)) {
            // Ensure we delete the ownerCt if it's not in the items
            // so we don't get spurious container remove warnings.
            delete trigger.ownerCt;
        }
        Ext.destroy(this.menu, trigger);
    }
});

