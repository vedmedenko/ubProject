/**
 * @class UB.UBQ
 * FTS index builder for Scheduler
 * @singleton
 */

const _ = require('lodash')
let me = UB.ns('UB.UBQ')

/**
 * Read queue with code 'ASYNCFTS' (by portion of 1000 queue rows at once) and rebuild FTS indexes.
 *
 * Expect msgCmd value in form: {"entity":"tst_document","ID":3000000005908,"operation":"DELETE"}
 * Possible operation is 'INSERT' 'UPDATE' 'DELETE'
 * @param {ubMethodParams} ctxt
 * @returns {String}
 */
me.FTSReindexFromQueue = function (ctxt) {
  console.log('Call JS scheduler method: UB.UBQ.FTSReindexFromQueue')

  let cmdStore = UB.Repository('ubq_messages')
    .attrs(['ID', 'queueCode', 'msgCmd'])
    .where('[queueCode]', '=', 'ASYNCFTS')
    .where('[completeDate]', 'isNull')
    .limit(1000)
    .select()

  let cmdArray = []
  let messageIDs = []
  let operationCount = 0
  while (!cmdStore.eof) {
    cmdArray.push(JSON.parse(cmdStore.get('msgCmd')))
    messageIDs.push(cmdStore.get('ID'))
    cmdStore.next()
  }
    // prevent multiple index update on the same instanceID
    // in case delete operation exists - we must delete from index, in case not - update index
    // group by entity {tst_document: [], other_entity: [], ...}
  let groupedByEntity = _.groupBy(cmdArray, 'entity')
  _.forEach(groupedByEntity, function (entityCmds, entityName) {
    let byID = _.groupBy(entityCmds, 'ID')
    _.forEach(byID, function (commandsForID, instanceIDStr) {
      let instanceID = parseInt(instanceIDStr) // converto from string
      if (_.find(commandsForID, {operation: 'DELETE'})) {
        if (!_.find(commandsForID, {operation: 'INSERT'})) { // if insert exists delete is not necessary (no data in index yet)
          console.debug('AYNC_FTS: delete', entityName, instanceID)
          App.deleteFromFTSIndex(entityName, instanceID)
          operationCount++
        } else {
          console.debug('AYNC_FTS: delete+insert - skip', entityName, instanceID)
        }
      } else {
        console.debug('AYNC_FTS: update', entityName, instanceID)
        App.updateFTSIndex(entityName, instanceID)
        operationCount++
      }
    })
  })
    // mark all ubq_messages as complete
  messageIDs.forEach(function (msgID) {
    cmdStore.run('success', {
      ID: msgID
    })
  })

    // cmdStore.entity.connection.commit();
  return 'Make ' + operationCount + ' FTS modifications'
}
