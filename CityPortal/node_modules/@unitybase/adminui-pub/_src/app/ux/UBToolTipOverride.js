/**
 * patch for target control rendered in bottom of screen.
 */
Ext.define('UB.ux.UBToolTipOverride',{
    override: 'Ext.tip.ToolTip',
     getTargetXY: function() {
         var
             me = this,
             resXY = this.callParent(arguments),
             constr = Ext.getBody().getViewSize();
         if (me.targetXY){
             if (resXY[1] + me.getHeight()  > constr.height ){
                 resXY[1] = me.targetXY[1] - 15 - me.getHeight();
             }

             //me.getWidth()
         }
         return resXY;
     }
});
