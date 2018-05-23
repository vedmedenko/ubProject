var me = uba_als
me.entity.addMethod('save')

/**
 * Save one ALS record. If unique values "entity+attribute+state+roleName" is found in database - record will update,
 * else record will insert
 *
 * @param {ubMethodParams} ctxt
 * @return {boolean}
 */
me.save = function (ctxt) {
  var execParams = ctxt.mParams.execParams

  var alsDataStore = UB.Repository('uba_als')
        .attrs(['ID'])
        .where('[entity]', '=', execParams.entity)
        .where('[attribute]', '=', execParams.attribute)
        .where('[state]', '=', execParams.state)
        .where('[roleName]', '=', execParams.roleName)
        .select()

  var rowCount = alsDataStore.rowCount,
    execInst = new TubDataStore('uba_als')

  console.debug('rowCount:', rowCount)

  if (rowCount === 0) {
	    // insert
    console.debug('executing INSERT')
    var insertExecParams = {
      entity: execParams.entity,
      attribute: execParams.attribute,
      state: execParams.state,
      roleName: execParams.roleName,
      actions: execParams.actions
    }

    execInst.run('insert', {
      execParams: insertExecParams
    }
        )
  } else {
	    // update
    console.debug('executing UPDATE')
    var updateExecParams = {
		    ID: alsDataStore.get('ID'),
      actions: execParams.actions
    }

    execInst.run('update', {
      execParams: updateExecParams
    }
        )
  }

  return true
}
