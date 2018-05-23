/**
 * Repository for server-side data retrieve
 *
 * @module @unitybase/base/ServerRepository
 * @author pavel.mash
 */

const CustomRepository = require('./CustomRepository.js')
const LocalDataStore = require('./LocalDataStore')

/* global TubDataStore */
/**
 * Create a new server side repository.
 * Implement {@link ServerRepository#select} method able to return initialized {@link TubDataStore}
 *
 * Usually created using fabric function {@link UBConnection.Repository  conn.Repository}
 *
 * @example

 let store = UB.Repository('my_entity')
   .attrs('id')
   .where('code', 'in', ['1', '2', '3'])  // code in ('1', '2', '3')
   .where('name', 'contains', 'Homer'). // name like '%homer%'
   .where('birtday', 'geq', new Date()) //(birtday >= '2012-01-01')
   .where('birtday', 'leq', new Date() + 10) // AND (birtday <= '2012-01-02')
   .where('[age] -10', '>=', {age: 15}, 'byAge') // (age + 10 >= 15)
   .where('', 'match', 'myvalue') // perform full text search for entity (require fts mixin)
   .logic('(byStrfType OR bySrfKindID)AND(dasdsa)')
   .select()

 * @class
 * @extends {CustomRepository}
 * @param {UBConnection|null} connection The remote server connection or `null` for internal server thread
 * @param {String} entityName name of Entity we create for
 */
class ServerRepository extends CustomRepository {
  constructor (connection, entityName) {
    super(entityName)
    /**
     * @type {UBConnection}
     * @private
     */
    this.connection = connection
  }

  /**
   * @param {Boolean} [resultInPlainText=false] If true - result is {String}
   * @return {Array.<Object>|String}
   */
  selectAsObject (resultInPlainText) {
    if (process.isServer) { // inside server thread
      let inst = new TubDataStore(this.entityName)
      inst.run('select', this.ubql())
      let res = resultInPlainText ? inst.asJSONObject : JSON.parse(inst.asJSONObject)
      inst.freeNative() // release memory ASAP
      return res
    } else {
      let conn = this.connection
      if (resultInPlainText) throw new Error('plainTextResult parameter not applicable in this context')
      return LocalDataStore.selectResultToArrayOfObjects(conn.query(this.ubql()))
    }
  }

  /**
   * @param {Boolean} [resultInPlainText=false] If true - result is {String}
   * @return {TubCachedData|String} // todo this is TubCachedData structure!!!
   */
  selectAsArray (resultInPlainText) {
    if (process.isServer) { // inside server thread
      let inst = new TubDataStore(this.entityName)
      inst.run('select', this.ubql())
      let res = resultInPlainText ? inst.asJSONArray : { resultData: JSON.parse(inst.asJSONArray) }
      if ((!resultInPlainText) && (this.options && this.options.totalRequired)) {
        inst.currentDataName = '__totalRecCount'
        res.__totalRecCount = inst.get(0)
      }
      inst.freeNative() // release memory ASAP
      return res
    } else {
      if (resultInPlainText) {
        throw new Error('plainTextResult parameter not applicable in this context')
      }
      return this.connection.query(this.ubql())
    }
  }

  /**
   * Create new, or use passed as parameter {@link TubDataStore} and run {@link TubDataStore#select} method passing result of {@link CustomRepository#getRunListItem} as config.
   * Do not work for remote connection.
   *
   * @param {TubDataStore} [instance] Optional instance for in-thread execution context. If passed - run select for it (not create new instance) and return instance as a result.
   *   Be careful - method do not check instance is created for entity you pass to Repository constructor.
   * @return {TubDataStore|Array.<Object>}
   */
  selectAsStore (instance) {
    let inst
    if (this.connection) {
      if (instance) { throw new Error('parameter instance applicable only for in-server execution context') }
      inst = this.selectAsObject()
    } else {
      inst = instance || new TubDataStore(this.entityName)
      inst.run('select', this.ubql())
    }
    return inst
  }

  /**
   * @param {TubDataStore} [instance] Optional instance for in-thread execution context. If passed - run select for it (not create new instance) and return instance as a result.
   * @return {TubDataStore}
   */
  select (instance) {
    return this.selectAsStore(instance)
  }

  /**
   * Select a single row. If ubql result is empty - return {undefined}.
   *
   * WARNING method do not check repository conntains the single row and always return a first row from result.
   * @return {Object|undefined}
   */
  selectSingle () {
    return this.selectAsObject()[ 0 ]
  }

  /**
   * Perform select and return a value of the first attribute from the first row
   *
   * WARNING method do not check repository contains the single row
   * @return {Object|undefined}
   */
  selectScalar () {
    let result = this.selectAsArray()
    return Array.isArray(result.resultData.data[ 0 ]) ? result.resultData.data[ 0 ][ 0 ] : undefined
  }

  /**
   * Select a single row by ID. If ubql result is empty - return {undefined}.
   *
   * @param {Number} ID Row identifier
   * @return {Object|undefined}
   */
  selectById (ID) {
    return this.where('[ID]', '=', ID).selectSingle()
  }
}
/**
 * Create new instance of ServerRepository
 *
 *      const Repository = require('@unitybase.base/ServerRepository').fabric;
 *      var req = Repository('uba_user').attrs('*').ubql();
 *
 * @param {String} entityName name of Entity for which we create repository
 * @param {UBConnection} [connection] The remote server connection. For internal server thread can be empty
 * @return {ServerRepository}
 */
function fabric (entityName, connection = null) {
  return new ServerRepository(connection, entityName)
}

module.exports = {
  ServerRepository,
  fabric
}
