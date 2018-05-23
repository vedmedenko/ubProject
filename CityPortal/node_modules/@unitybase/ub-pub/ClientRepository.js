const LocalDataStore = require('@unitybase/base/LocalDataStore')
const CustomRepository = require('@unitybase/base/CustomRepository')

/**
 * Repository for client-side data retrieve.
 * Implement:
 *
 *  - {@link ClientRepository#select} method able to return `array of object` representation of server entity
 *  - {@link ClientRepository#selectAsArray} method able to return `array of object` representation of server entity
 *  - {@link ClientRepository#selectAsStore} method able to return {UB.ux.data.UBStore} (applicable only for Ext-based client types)
 *
 * Usually created using {@link UB#Repository UB.Repository} fabric function. Example:
 *
 *      var store = UB.Repository('my_entity').attrs(['ID', 'code'])
 *       .where('code', 'includes', ['1', '2', '3'])  // code in ('1', '2', '3')
 *       .where('name', 'contains', 'Homer'). // name like '%homer%'
 *       .where('birtday', 'geq', new Date()).where('birtday', 'leq', new Date() + 10) //(birtday >= '2012-01-01') AND (birtday <= '2012-01-02')
 *       .where('[age] -10', '>=', {age: 15}, 'byAge') // (age + 10 >= 15)
 *       .where('', 'match', 'myvalue'). // for condition match expression not need
 *       .logic('(byStrfType OR bySrfKindID)AND(dasdsa)')
 *       .select().then(function(response){
 *          // here response is in [{ID: 10, code: 'value1'}, .... {}] format
 *       });;
 *
 *
 * @class ClientRepository
 * @extends CustomRepository
 * @author pavel.mash 23.09.2014
 */

/**
 * Create a new CustomRepository
 * @constructor
 * @param {UBConnection} connection
 * @param {String} entityName name of Entity we create for
 */
class ClientRepository extends CustomRepository {
  constructor (connection, entityName) {
    super(entityName)
    this.connection = connection
  }

  /**
   * Asynchronously run request, constructed by Repository. Return promise, resolved to `array of object` representation of response.
   *
   *      UB.Repository('ubm_navshortcut').attrs(['ID', 'code'])
   *      .where('code', 'in', ['uba_user', 'uba_auditTrail'])
   *      .selectAsObj().then(function(store){
   *          console.log(store); // output is [{"ID":3000000000004,"code":"uba_user"},{"ID":3000000000039,"code":"ubs_audit"}]
   *      });
   *
   *  Optionally can rename attributes in the resulting object:
   *
   *      UB.Repository('investment')
   *      .attrs(['ID', 'product', 'product.name', 'product.provider.name'])
   *      .selectAsObject({
              'product.name': 'productName',
              'product.provider.name': 'productProviderName'
          }).then(function(result){
              console.log(result); // output [{"ID": 1, "productName": "My product", "productProviderName": "My provider"}, ...]
          });
   *
   * @param {Object<string, string>} [fieldAliases] Optional object to change attribute names during transform array to object
   * @return {Promise}
   */
  selectAsObject (fieldAliases) {
    return this.connection.select(this.ubql()).then(function (res) {
      return LocalDataStore.selectResultToArrayOfObjects(res, fieldAliases)
    })
  }

  /**
   * Asynchronously run request, constructed by Repository. Return promise, resolved to `array of array` representation of response.
   * Actual data is placed to `resultData` response property.
   *
   *      UB.Repository('ubm_navshortcut').attrs(['ID', 'code'])
   *      .where('code', 'in', ['uba_user', 'ubs_audit'])
   *      .select().then(UB.logDebug);
   *      // output is {"resultData":{"data":[[3000000000004,"uba_user"],[3000000000039,"ubs_audit"]],"fields":["ID","code"]},"total":2}
   *
   * Response MAY (but may not even for the same request) contain other variables, returned by server in case data retrieved not from cache
   *
   *      UB.Repository('uba_user').attrs(['ID', 'name', 'ID.name']) // since uba_user have `unity` mixin it ID property point us to parent (`uba_subject` in this case)
   *      .selectAsArray().then(UB.logDebug);
   *      // {"entity":"uba_user","fieldList":["ID","name","ID.name"],"method":"select","resultData":{"fields":["ID","name","ID.name"],"rowCount":1,"data":[[10,"admin","admin"]]},"total":1}
   *
   * But resultData is always present
   *
   * @return {Promise}
   */
  selectAsArray () {
    return this.connection.select(this.ubql())
  }

  /**
   * For core module (without Ext) - do the same as {ClientRepository.selectAsObj}
   *
   * For EntJS based client (actual implementation in {UB.ux.data.UBStore}) - create store based on request, constructed by Repository.
   * Return promise resolved to loaded {UB.ux.data.UBStore} instance.
   *
   *      UB.Repository('ubm_navshortcut').attrs(['ID', 'code']).where('code', 'in', ['uba_user', 'ubs_audit'])
   *      .selectAsStore().then(function(store){
   *          console.log(store.getTotalCount()); // here store is UB.ux.data.UBStore instance
   *      });
   *
   * @param {Object} [storeConfig] optional config passed to store constructor
   * @return {Promise}
   */
  selectAsStore (storeConfig) {
    return this.selectAsObject(storeConfig)
  }

  /**
   * Alias to {ClientRepository.selectAsObject}
   */
  select (fieldAliases) {
    return this.selectAsObject(fieldAliases)
  }

  /**
   * Select a single row. If ubql result is empty - return {undefined}.
   *
   * WARNING method do not check repository contains the single row and always return a first row from result.
   * @param {Object<string, string>} [fieldAliases] Optional object to change attribute names
   *   during transform array to object. See {@link selectAsObject}
   * @return {Promise} Promise, resolved to {Object|undefined}
   */
  selectSingle (fieldAliases) {
    return this.selectAsObject(fieldAliases).then(function (row) {
      return row[ 0 ]
    })
  }

  /**
   * Perform select and return a value of the first attribute from the first row
   *
   * WARNING method do not check repository contains the single row
   * @return {Promise} Promise, resolved to {Object|undefined}
   */
  selectScalar () {
    return this.selectAsArray().then(function (result) {
      return (result.resultData.rowCount > 0) ? result.resultData.data[ 0 ][ 0 ] : undefined
    })
  }

  /**
   * Select a single row by ID. If ubql result is empty - return {undefined}.
   *
   * @param {Number} ID Row identifier
   * @param {Object<string, string>} [fieldAliases] Optional object to change attribute names
   *   during transform array to object. See {@link selectAsObject}
   * @return {Promise} Promise, resolved to {Object|undefined}
   */
  selectById (ID, fieldAliases) {
    return this.where('[ID]', '=', ID).selectSingle()
  }
}

module.exports = ClientRepository
