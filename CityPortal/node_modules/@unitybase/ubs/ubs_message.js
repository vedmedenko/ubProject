
var me = ubs_message;

me.entity.addMethod('getCached');

/**
 * If something changes in ubs_messages from a last call - return a messages.
 * @param {ubMethodParams} ctx
 * @return {boolean}
 */
me.getCached = function(ctx){
    var expr, version;

    if (ctx.mParams.version){
        expr = 'SELECT MAX(mi_modifyDate) as last_number FROM ubs_message';
        var inst = new TubDataStore('ubs_message');
        inst.runSQL(expr, {});
        version = inst.get('last_number');
        inst.freeNative();
        version = (new Date(version)).getTime();
        if (version === Number(ctx.mParams.version)){
            ctx.mParams.resultData = {notModified: true};
            ctx.mParams.version = version;
            return true;
        } else {
            ctx.mParams.version = version;
        }
    }
    ctx.dataStore.run('select', ctx.mParams );
};

me.on('select:before', addUserFilters);
/**
 * Filter only compleate(ready for send) up-to-date messages for logged in user
 * @param {ubMethodParams} ctx
 * @return {boolean}
 */
function addUserFilters(ctx){

    var nm = (new Date()).getTime();
    if (!ctx.mParams.whereList){
        ctx.mParams.whereList = {};
    }
    ctx.mParams.whereList["user" +  nm] = {
        expression: '[recipients.userID]',
        condition: 'equal',
        values: {userID: Session.userID}
    };
    ctx.mParams.whereList["complete" +  nm] = {
        expression: '[complete]',
        condition: 'equal',
        values: {complete: 1}
    };
    ctx.mParams.whereList["startDate" +  nm] = {
        expression: '[startDate]',
        condition: 'less',
        values: {startDate: new Date()}
    };
    return true;
};