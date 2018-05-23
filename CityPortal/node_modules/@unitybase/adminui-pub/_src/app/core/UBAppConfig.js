//@!require ../UB.js
/**
 * Singleton contains some constants for UnityBase application
 * @deprecated In UB 1.8 will be moved to UB.appConfig
 */
Ext.define("UB.core.UBAppConfig", {
    singleton: true,

    systemEntities: {
        desktop: {
            name: "ubm_desktop",
            fields: {
                caption: "caption",
                url: "url",
                isDefault: "isDefault"
            }
        },
        navigationShortcut: {
            name: "ubm_navshortcut",
            fields: {
                code: "code",
                desktopID: "desktopID",
                folderID: "parentID",
                isFolder: "isFolder",
                caption: "caption",
                commandCode: "cmdCode",
                inWindow: "inWindow",
                isCollapsed: "isCollapsed",
                displayOrder: "displayOrder",
                ubTreePath: "mi_treePath"
            }
        },
        form: {
            name: "ubm_form",
            fields: {
                code: "code",
                description: "description",
                caption: "caption",
                formType: "formType",
                formDef: "formDef",
                formCode: "formCode",
                entity: "entity",
                isDefault: "isDefault"
            }
        },
        _enum_: {
            name: "ubm_enum",
            fields: {
                eGroup: "eGroup",
                code: "code",
                name: "name",
                shortName: "shortName",
                sortOrder: "sortOrder"
            }
        }
    }
});
