/**
 * Widget to display Entity attributes tree.
 *
 * @author UnityBase core team, Nozhenko Igor
 */

Ext.define('UB.view.CommandBuilder.EntityTreePanel', {
  extend: 'Ext.tree.Panel',
  alias: 'widget.commandbuilderentitytreepanel',
  requires: [
    'Ext.data.TreeStore'
  ],
  store: Ext.create('Ext.data.TreeStore'),
  rootVisible: false,
  useArrows: true,
  cls: 'no-leaf-icons no-parent-icons',

  initComponent: function () {
    this.callParent(arguments)

    /**
     * Entity name to display attributes for
     * @cfg {String} entityName
     */
    if (this.entityName) {
      this.setRootNode(UB.core.UBUtil.getEntityAttributesTree(this.entityName))
    }
  },

  /**
   * Set entity name to display attributes for.
   * @param {String} entityName
   */
  setEntity: function (entityName) {
    this.entityName = entityName
    if ($App.connection.domain.has(entityName)) {
      this.setRootNode(UB.core.UBUtil.getEntityAttributesTree(this.entityName))
    }
  }
})
