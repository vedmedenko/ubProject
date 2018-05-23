require('../core/UBApp')
require('../core/UBAppConfig')
require('../core/UBUtil')
require('../core/UBLocalStorageManager')
/**
 *  Widget for MainToolbar. Create user menu.
 */
Ext.define('UB.view.ToolbarMenuButton', {
  extend: 'UB.view.ToolbarWidget',
  alias: 'widget.ubtoolbarmenubutton',

  statics: {
    /**
     * min width of screen to static show menu
     */
    minWidthScreen: 1024
  },

  initComponent: function () {
    this.items = [
      Ext.create('Ext.button.Button', {
        border: 0,
        padding: 1,
        scale: 'large',
        glyph: UB.core.UBUtil.glyphs.faBars,
        cls: 'ub-menu-button',
        handler: this.buttonClick,
        scope: this
      }),
      {xtype: 'label', text: UB.i18n('menu') },
      {xtype: 'tbseparator'}
    ]
    this.callParent(arguments)
    this.on('destroy', this.onDestroy, this)
    $App.on('desktopChanged', function () {
      var leftPanel
      var viewport = $App.getViewport()
      viewport.on('resize', this.viewPortResize, this)
      if (viewport.getWidth() <= UB.view.ToolbarMenuButton.minWidthScreen) {
        leftPanel = this.getLeftPanel()
        if (leftPanel && leftPanel.isVisible()) {
          leftPanel.hide()
        }
      }
      this.initViewPortResize = true
    }, this)
  },

  viewPortResize: function (owner, width) {
    var leftPanel = this.getLeftPanel()
    var isHidden
    if (leftPanel) {
      isHidden = leftPanel.isHidden()
      if ((width <= UB.view.ToolbarMenuButton.minWidthScreen) && !isHidden) {
        leftPanel.hide()
      }
      if ((width > UB.view.ToolbarMenuButton.minWidthScreen) && !this.innerHide && isHidden) {
        leftPanel.show()
      }
    }
  },

  onDestroy: function () {
    var me = this
    var viewPort
    if (me.dynPanel) {
      me.dynPanel.un('itemclickstart', me.itemClickStart, me)

      if (!me.dynPanel.isDestroyed && me.dynPanel.destroy) {
        me.dynPanel.destroy()
      }
    }
    me.dynPanel = null
    me.leftPanel = null
    viewPort = UB.core.UBApp.getViewport()
    if (this.initViewPortResize && viewPort) {
      viewPort.un('resize', me.viewPortResize, me)
      this.initViewPortResize = false
    }
  },

  getLeftPanel: function () {
    var me = this
    var viewPort

    if (!me.leftPanel) {
      viewPort = UB.core.UBApp.getViewport()
      me.leftPanel = viewPort.getLeftPanel()
    }
    return me.leftPanel
  },

  buttonClick: function () {
    var me = this
    var leftPanel, viewPort, vBox, mBox

    viewPort = UB.core.UBApp.getViewport()
    leftPanel = me.getLeftPanel()
    vBox = viewPort.getBox()
    if (vBox.width <= UB.view.ToolbarMenuButton.minWidthScreen) {
      mBox = me.getBox()
      if (!me.dynPanel) {
        me.dynPanel = Ext.create('UB.view.LeftPanel', {
          floating: {
            shadow: true,
            shim: true
          },
          closeAction: 'hide',
          height: vBox.height - mBox.bottom, // vBox.height
          width: 300,
          border: true,
          flex: 1
        })
        me.dynPanel.on('blur', function () {
          this.close()
        }, me)
        me.dynPanel.on('itemclickstart', me.itemClickStart, me)
      }
      if (me.dynPanel.isVisible()) {
        me.dynPanel.hide()
      } else {
        me.dynPanel.showAt(0, mBox.bottom + 1)
      }
      Ext.getDoc().on('mousedown', me.onMouseDown, me, { buffer: 20 })
    } else {
      if (leftPanel.isVisible()) {
        leftPanel.hide()
        me.innerHide = true
      } else {
        leftPanel.show()
        me.innerHide = false
      }
    }
  },

  itemClickStart: function () {
    var me = this
    if (me.dynPanel) {
      me.dynPanel.hide()
    }
  },

  onMouseDown: function (e) {
    if (!this.dynPanel) {
      Ext.getDoc().un('mousedown', this.onMouseDown, this)
    }
    var pnlBox
    var cXY = e.getXY()
    var x = cXY[0]
    var y = cXY[1]
    pnlBox = this.dynPanel.getBox()
    if ((x < pnlBox.x) || (x > pnlBox.x + pnlBox.width) ||
       (y < pnlBox.y) || (y > pnlBox.y + pnlBox.height)
    ) {
      if (!e.within(this.getEl())) {
        this.dynPanel.hide()
      }
      Ext.getDoc().un('mousedown', this.onMouseDown, this)
    }
  }
})
