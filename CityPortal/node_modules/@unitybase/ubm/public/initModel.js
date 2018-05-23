//create default toolbar menu
$App.on('buildMainMenu', function(items){
    items.push(
        Ext.create('UB.view.ToolbarMenuButton'),
        "-",
        Ext.create('UB.view.ToolbarMenu'),
        "->",
        Ext.create('UB.view.ToolbarUser')
    );
});
