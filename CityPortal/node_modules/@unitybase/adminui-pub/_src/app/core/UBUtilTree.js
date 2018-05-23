/**
 * Файл: UB.core.UBUtilTree.js
 * Автор: Игорь Ноженко
 *
 * Функции для формирования данных для tree
 */

Ext.define("UB.core.UBUtilTree", {
    singleton: true,

    pathSeparator: "/",
    pathAttribute: "treepath",
    doSort: false,

    arrayToTreeRootNode: function (data) {
        var
            root = {
                leaf: false,
                id: 0,
                expanded: true
            },
            items = {0: root}, item, parent,
            i,
            len;

        for (i = 0, len = data.length; i < len; ++i) {
            var
                row = data[i];

            item = items[row.id];
            if (!item){
                item = items[row.id] = row;
            } else {
                Ext.applyIf(item, row);
            }
            parent = items[row.parentId || 0];
            if (!parent){
                parent = items[row.parentId] = {id: row.parentId};
            }
            if (!parent.children){
                parent.children = [];
            }
            parent.children.push(item);
        }

        return root;
    },

    /**
     *
     * @param {Ext.data.NodeInterface} parent
     * @param {Object[]} childNodes
     */
    addToParent: function(parent, childNodes){
        _.forEach(childNodes, function(node){
             var elm = parent.appendChild(node);
             if (node.children && node.children.length > 0){
                 UB.core.UBUtilTree.addToParent(elm, node.children);
             }

        })
    }

});
