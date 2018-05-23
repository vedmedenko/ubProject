var me = ubs_numcounter;
me.entity.addMethod('getRegnumCounter');

/** Return counter number by mask
 * @param {String} regKeyValue Registration key mask
 * @param {Number} [startNum] The starting counter value in case mask not exists
 * @return {Number} Next number for this mask
 */
me.getRegnum = function (regKeyValue, startNum) {
    var res, counterInData = -1;
    if (startNum !== 0) {
        startNum = startNum || 1;
    }

    var autoRegWithDeletedNumber = ubs_settings.loadKey('ubs.numcounter.autoRegWithDeletedNumber', true),
        reservedCounter;

    // Get counter from reserved if autoRegWithDeletedNumber set to true in settings
    reservedCounter = (autoRegWithDeletedNumber === true) ? ubs_numcounterreserv.getReservedRegnum(regKeyValue) : -1;

    if (reservedCounter != -1) {
        counterInData = reservedCounter;
    } else {
        // check number mask exist in ubs_numcounter
        var inst = UB.Repository('ubs_numcounter')
            .attrs(['ID'])
            .where('[regKey]', '=', regKeyValue)
            .select();

        // if mask not exists - add it
        if (inst.eof) {
            let newID = inst.generateID();
            counterInData = startNum;
            res = inst.run('insert', {
                execParams: {
                    ID: newID,
                    regKey: regKeyValue,
                    counter: startNum
                }
            });
            if (!res) {
                throw inst.lastError;
            }
        } else {
            // in case mask exist
            let IDInData = inst.get('ID');
            // lock it for update
            inst.run('update', {
                execParams: {
                    ID: IDInData,
                    regKey: regKeyValue
                }
            });
            // retrieve current number
            inst = UB.Repository('ubs_numcounter')
                .attrs(['ID', 'regKey', 'counter'])
                .where('ID', '=', IDInData)
                .select();
            // increment it
            counterInData = inst.get('counter') + 1;
            //and update a incremented counter value
            res = inst.run('update', {
                execParams: {
                    ID: IDInData,
                    regKey: regKeyValue,
                    counter: counterInData
                }
            });
            if (!res) {
                throw inst.lastError;
            }
        }
    }
    return counterInData;
};

/**
 * Get counter value by registration key. For external calls (from client, not inside server).
 * @param {ubMethodParams} ctxt
 */
me.getRegnumCounter = function (ctxt) {
    // We expect query in such format:
    // {"entity":"ubs_numcounter","method":"getRegnumCounter","execParams":{"regkey":"abc_y"}}

    // RegKey caller pass to method
    var upregKey = ctxt.mParams.execParams.regkey;
    ctxt.mParams.getRegnumCounter = me.getRegnum(upregKey, 1);
    return true;
};