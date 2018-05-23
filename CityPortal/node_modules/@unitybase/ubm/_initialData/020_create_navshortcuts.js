/**
 * User: pavel.mash
 * Fill navigation shortcuts for UBM model
 */

/**
 * Initial script for create UnityBase Administration desktop navigation shortcuts for UBM model
 * Used by `ubcli initialize` command
 * @param {cmd.argv.serverSession} session
 */
module.exports = function(session) {
    "use strict";
    var desktopID, folderID,
        conn = session.connection;

    desktopID = conn.lookup('ubm_desktop', 'ID', {expression: 'code', condition: 'equal', values: {code: 'adm_desktop'}});
    console.info('\tFill `Administrator` desktop');
    if (!desktopID) {
        console.info('\t\tcreate new `Administrator` desktop');
        desktopID = conn.insert({
            entity: 'ubm_desktop',
            fieldList: ['ID'],
            execParams: {
                code: 'adm_desktop',
                caption: 'Administrator'
            }
        });
    } else {
        console.info('\t\tuse existed desktop with code `adm_desktop`', desktopID);
    }

    folderID =  conn.lookup('ubm_navshortcut', 'ID', {expression: 'code', condition: 'equal', values: {code: 'adm_folder_UI'}});
    if (!folderID){
      console.log('\t\tcreate `UI` folder');
      folderID = conn.insert({
        entity: 'ubm_navshortcut',
        fieldList: ['ID'],
        execParams: {
            desktopID: desktopID,
            code: 'adm_folder_UI',
            caption: 'UI',
            isFolder: true,
            isCollapsed: false,
            iconCls: 'fa fa-picture-o',
            displayOrder: 30
        }
      });
    }

    console.log('\t\t\tcreate `Enumerations` shortcut');
    conn.insert({
        fieldList: ['ID'],
        entity: 'ubm_navshortcut',
        execParams: {
            desktopID: desktopID,
            parentID: folderID,
            code: 'ubm_enum',
            caption: 'Enumerations',
            displayOrder: 10,
            cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [
                { entity: 'ubm_enum', method: 'select', fieldList: '*', orderList: [
                    {"expression":"eGroup"}, {"expression":"sortOrder"}
                ]}
            ]}}, null, '\t')
        }
    });

    console.log('\t\t\tcreate `Desktops` shortcut');
    conn.insert({
        fieldList: ['ID'],
        entity: 'ubm_navshortcut',
        execParams: {
            desktopID: desktopID,
            parentID: folderID,
            code: 'ubm_desktop',
            caption: 'Desktops',
            displayOrder: 20,
            cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [
                { entity: 'ubm_desktop', method: 'select', fieldList: '*'}
            ]}}, null, '\t')
        }
    });

    console.log('\t\t\tcreate `Shortcuts` shortcut');
    conn.insert({
        fieldList: ['ID'],
        entity: 'ubm_navshortcut',
        execParams: {
            desktopID: desktopID,
            parentID: folderID,
            code: 'ubm_navshortcut',
            caption: 'Shortcuts',
            displayOrder: 30,
            cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [
                { entity: 'ubm_navshortcut', method: 'select', fieldList: '*'}
            ]}}, null, '\t')
        }
    });

    console.log('\t\t\tcreate `Forms` shortcut');
    conn.insert({
        fieldList: ['ID'],
        entity: 'ubm_navshortcut',
        execParams: {
            desktopID: desktopID,
            parentID: folderID,
            code: 'ubm_form',
            caption: 'Forms',
            displayOrder: 40,
            cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [
                { entity: 'ubm_form', method: 'select', fieldList: ["entity", "code", "description", "caption", "formType", "isDefault"]}
            ]}}, null, '\t')
        }
    });

    console.log('\t\t\tcreate `ER diagrams` shortcut');
    conn.insert({
        fieldList: ['ID'],
        entity: 'ubm_navshortcut',
        execParams: {
            desktopID: desktopID,
            parentID: folderID,
            code: 'ubm_diagram',
            caption: 'ER diagrams',
            displayOrder: 40,
            cmdCode: JSON.stringify({cmdType: 'showList', cmdData: {params: [
                { entity: 'ubm_diagram', method: 'select', fieldList: '*'}
            ]}}, null, '\t')
        }
    });
};
