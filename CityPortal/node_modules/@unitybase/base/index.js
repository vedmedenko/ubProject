/**
 * Contains classes, common for CLI, server-side and browser side
 * @module @unitybase/base
 */
const argv = require('./argv')
const CustomRepository = require('./CustomRepository')
const LocalDataStore = require('./LocalDataStore')
const options = require('./options')
const ServerRepository = require('./ServerRepository')
const UBConnection = require('./UBConnection')
const UBDomain = require('./UBDomain')
const UBSession = require('./UBSession')
const csv1 = require('./csv1')
const dataLoader = require('./dataLoader')
const FileBasedStoreLoader = require('./FileBasedStoreLoader')
const Worker = require('./worker')
const uba_common = require('./uba_common')

module.exports = {
  /**
   * Command line utils
   */
  argv,
  /**
   * Base class for Browser / server Repository
   * @type {CustomRepository}
   */
  CustomRepository,
  /**
   * Helper class for manipulation with data, stored locally in ({@link TubCachedData} format)
   * @type {LocalDataStore}
   */
  LocalDataStore,
  /**
   * Parse a command line options & environment variables and create a configuration object
   * @type {options}
   */
  options,
  /**
   * Server side & CLI side Repository
   * @type {ServerRepository}
   */
  ServerRepository,
  /**
   * Server side & CLI side connection to UB server
   * @type {UBConnection}
   */
  UBConnection,
  /**
   * Domain metadata
   * @type {UBDomain}
   */
  UBDomain,
  /**
   * UB connection user session
   * @type {UBSession}
   */
  UBSession,
  /**
   * CSV data parser
   * @type {csv1}
   */
  csv: csv1,
  /**
   * Bulk data loader from CSV/arrays to UB
   * @type {dataLoader}
   */
  dataLoader: dataLoader,

  /**
   * File-system based virtual store **select**.
   * Able to load files & transform it content to {@link TubCachedData} format
   */
  FileBasedStoreLoader,

  /**
   * Execute a script in a dedicated thread
   * @type {Worker}
   */
  Worker,
  /**
   * Constants for administrative security model
   */
  uba_common
}
