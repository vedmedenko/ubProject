var me = ubs_message_recipient;
me.entity.addMethod('accept');
me.entity.addMethod('addRoles');
me.entity.addMethod('removeRoles');


/**
 * Mark a message as readed by this resipient
 * @param {ubMethodParams} ctx
 * @param {Number} ctx.mParams.execParams.ID
 */
me.accept = function (ctx) {
    if (!ctx.mParams.execParams || !ctx.mParams.execParams.ID){
        throw new Error('Invalid value of parameter ID');
    }
    var request = {
        fieldList: ['ID'],
        execParams: {
            ID: ctx.mParams.execParams.ID,
            acceptDate: new Date()
        },
        ID: ctx.mParams.execParams.ID,
        __skipOptimisticLock: true
    };


    var inst = new TubDataStore('ubs_message_recipient');
    ctx.mParams.resultData = inst.run('update', request);
};

/**
 * Add all users with roles `roles` to a message recipient list
 * @param {ubMethodParams} ctx
 * @param {Number} ctx.mParams.execParams.messageID
 * @param {String} ctx.mParams.execParams.roles Comma separated role list
 */
me.addRoles = function (ctx) {
    if (!ctx.mParams.execParams || !ctx.mParams.execParams.messageID){
        throw new Error('Invalid value of parameter messageID');
    }
    if (!ctx.mParams.execParams || !ctx.mParams.execParams.roles){
        throw new Error('Invalid value of parameter roles');
    }
    var roles = String(ctx.mParams.execParams.roles).split(',').map(Number),
        messageID = ctx.mParams.execParams.messageID,
        users = [];


    var rInst = new TubDataStore('ubs_message_recipient');
    rInst.run('select', {
        entity: 'uba_userrole',
        fieldList: ['userID', 'roleID'],
        whereList: {
            role: {
                expression: '[roleID]',
                condition: 'in',
                values: {
                    roleID: roles
                }
            }
        }
    });
    while (!rInst.eof) {
        users.push(Number(rInst.get('userID')));
        rInst.next();
    }
    var request = {
        fieldList: ['messageID', 'userID'],
        execParams: {
            messageID: messageID,
            userID: 0
        }
    };
    var inst = UB.Repository('ubs_message_recipient')
        .attrs(['ID', 'messageID', 'userID'])
        .where('[messageID]', '=', messageID, 'message')
        .where('[userID]', 'in', users, 'user')
        .selectAsStore();
    var userIdx;
    while (!inst.eof) {
        userIdx = users.indexOf(Number(inst.get('userID')));
        if (userIdx >= 0){
            users.splice(userIdx, 1);
        }
        inst.next();
    }
    for(var i = 0; i < users.length; i++ ){
        request.execParams.userID = users[i];
        inst.run('insert', request);
    }

};

me.removeRoles = function (ctx) {
    if (!ctx.mParams.execParams || !ctx.mParams.execParams.messageID){
        throw new Error('Invalid value of parameter messageID');
    }
    if (!ctx.mParams.execParams || !ctx.mParams.execParams.roles){
        throw new Error('Invalid value of parameter roles');
    }
    var roles = String(ctx.mParams.execParams.roles).split(',').map(Number),
        messageID = ctx.mParams.execParams.messageID,
        users = [];


    var rInst = new TubDataStore('uba_userrole');
    rInst.run('select', {
        entity: 'uba_userrole',
        fieldList: ['userID', 'roleID'],
        whereList: {
            role: {
                expression: '[roleID]',
                condition: 'in',
                values: {
                    roleID: roles
                }
            }
        }
    });
    while (!rInst.eof) {
        users.push( Number(rInst.get('userID')) );
        rInst.next();
    }
    rInst = new TubDataStore('ubs_message_recipient');
    rInst.run('select', {
        entity: 'ubs_message_recipient',
        fieldList: ['ID', 'userID', 'messageID'],
        whereList: {
            message: {
                expression: '[messageID]',
                condition: 'equal',
                values: {
                    messageID: messageID
                }
            },
            role: {
                expression: '[userID]',
                condition: 'in',
                values: {
                    userID: users
                }
            },
            acceptDate: {
                expression: '[acceptDate]',
                condition: 'isNull'
            }
        }
    });
    var request = {
        //fieldList: ['ID'],
        execParams: {
            ID: 0
        }
    };
    var inst = new TubDataStore('ubs_message_recipient');
    while (!rInst.eof) {
        request.execParams.ID = rInst.get('ID');
        inst.run('delete', request);
        rInst.next();
    }

};
