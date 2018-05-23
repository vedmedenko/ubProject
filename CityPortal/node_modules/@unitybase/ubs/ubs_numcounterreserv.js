var me = ubs_numcounterreserv;
me.entity.addMethod('reserveRC');
me.entity.addMethod('getReservedRC');

/**
 * Reserves some numbers for future use. For internal calls.
 * @param {String} regkey Registration key
 * @param {Number} regNum  Number to reserve
 * @param {Date} [reservedDate]  Date for reserve
 * @param {string} [note]  Note of reserve
 * @return {Boolean} success or not
 */
me.reserveRegnum = function(regkey, regNum, reservedDate, note) {
    var
        res, store;

    console.debug('==Call JS method ubs_numcounterreserv.reserveRegnum');
    console.debug('Parameters: regkey=' + regkey + ',regNum=' + regNum);
	// Read current counter value
    //Check, that we have value in database for specified key
    store = UB.Repository('ubs_numcounterreserv')
        .attrs(["ID", "regKey", "counter"])
        .where('[regKey]', '=', regkey)
        .where('[counter]', '=', regNum)
        .limit(1)
        .select();
	// Если нет, то вставляем
	if (store.eof) {
		var newID = store.generateID();
		var insobj = {
				execParams: {
					ID: newID,
					regKey: regkey,
					counter: regNum,
                    reservedDate: reservedDate || null,
                    note: note || ''
				}
			};
		res = store.run('insert', insobj);
	}

	return res;
};


/**
 * Reserves some numbers for future use. For external calls.
 * @param {ubMethodParams} ctxt
 * @returns {Boolean}
 */
me.reserveRC = function(ctxt){
	// Caller sends request with format
	// {"entity":"ubs_numcounterreserv","method":"reserveRC","execParams":{"regkey":"abc_y","regNum":10}}
	var mParams = ctxt.mParams,
        upregkey = mParams.execParams['regkey'],
		upregNum = mParams.execParams['regNum'],
        reservedDate = mParams.execParams['reservedDate'],
        note = mParams.execParams['note'];
   return me.reserveRegnum(upregkey, upregNum, reservedDate, note);
};


/**
 * Gets first reserved number for regkey and remove returned number from reservation entity. For internal call.
 * @param {String} regKey  Registration Key
 * @return {Number} Reserved number
*/
me.getReservedRegnum = function(regKey){
    console.debug('--Call JS method: ubs_numcounterreserv.getReservedRegnum');
    console.debug('Parameters: regkey=', regKey);
	var returnVal = -1;

    var repo = UB.Repository('ubs_numcounterreserv')
        .attrs(["ID", "regKey", "counter", "reservedDate"])
        .where('[regKey]', '=', regKey)
        .where('[reservedDate]', 'isNull')
        .orderBy('counter','asc')
        .limit(1)
        .select();

	//Read current counter value
	if ((repo) && (!repo.eof)){
        var IDValue = repo.get('ID');
        returnVal = repo.get('counter');
        var inst = new TubDataStore('ubs_numcounterreserv');
        var delObj = {
            execParams: {ID: IDValue}
        };
        inst.run('delete', delObj);
	}
	return returnVal;
};


/**
 * Get first reserved number for regkey and remove returned number from reservation entity. For external call.
 * Actual result returned as mParams.getReservedRC
 *
 * @example
 *     {"entity":"ubs_numcounterreserv","method":"getReservedRC","execParams":{"regkey":"abc_y","fromNum":10}}
 *
 * @param {ubMethodParams} ctxt
 * @returns {boolean}
 */
me.getReservedRC = function(ctxt){
	var
        mp = ctxt.mParams,
        upRegkey = mp.execParams['regkey'];
    mp.getReservedRC = me.getReservedRegnum(upRegkey);
    return true;
};