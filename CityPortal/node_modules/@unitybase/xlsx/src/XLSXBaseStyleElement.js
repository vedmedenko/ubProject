/**
 * Created by xmax on 16.11.2017.
 */

const tools = require('./tools')

class XLSXBaseStyleElement {
  /**
   * @constructor
   * @param {Object} config
   * @param {String} type
   * @param {XLSXBaseStyleController} controller
   */
  constructor (config, type, controller) {
    this.config = config
    this.type = type
    this.controller = controller
  }

  /**
   * compile
   * @return {string}
   */
  compile () {
    return this.controller.compile(this)
  }

  /**
   * set id
   * @param {Number} id
   */
  setId (id) {
    this.id = id
  }

  /**
   * Returns clone of this style with compounded config
   * @param {Object} config Configuration for compound. If config do not have properties the function return same style
   * @return {XLSXBaseStyleElement}
   */
  compound (config) {
    return this.controller.add(Object.assign(tools.configFromInstance(this.config), config))
  }
}

class XLSXBaseStyleController {
  /**
   * @constructor
   * @param {Object} [config] Init element
   * @param {Number} [startId]
   */
  constructor (config, startId) {
    this.elements = []
    /**
     * Associative array of element. (String code - Integer index) pair
     * @type {Object}
     */
    this.named = {}
    this.hashList = {}
    this.startId = startId || 0
    this.initId = this.startId
    if (config) {
      this.add(config)
    }
  }

  /**
   * Get XLSXBaseStyleElement instance by id or config
   * @param {number|object|XLSXBaseStyleElement} cfg
   * @return {XLSXBaseStyleElement}
   */
  get (cfg) {
    if (typeof cfg === 'number') {
      return this.itemByID(cfg)
    }
    if (cfg instanceof XLSXBaseStyleElement) {
      return cfg
    } else {
      return this.add(cfg)
    }
  }

  /**
   * @param {Number} id
   * @return {XLSXBaseStyleElement|Number}
   */
  itemByID (id) {
    if (id < this.initId) return id
    let res = this.elements[id - this.initId]
    if (!res) {
      throw new Error(`XLSXBaseStyleElement element with id ${id} not found`)
    }
    return res
  }

  render () {
    return this.elements.map(item => this.compile(item)).join('')
  }

  count () {
    return this.elements.length
  }

  /**
   *
   * @param {XLSXBaseStyleElement} info
   * @param {String} type
   * @return {XLSXBaseStyleElement} Style element index
   */
  add (info, type) {
    if (info instanceof XLSXBaseStyleElement) {
      if (info.type !== type) {
        throw new Error('Invalid type')
      }
      return info
    }
    let hash = this.getHash(info)
    let exist = this.hashList[hash]
    if (exist) return exist
    const infoEl = new XLSXBaseStyleElement(info, type, this)

    this.hashList[hash] = infoEl
    this.elements.push(infoEl)
    infoEl.setId(this.startId)
    this.startId++
    if (info.code) {
      this.named[info.code] = infoEl
    }
    return infoEl
  }

  /**
   * @param {XLSXBaseStyleElement} element
   * @return {string}
   */
  getHash (element) {
    throw new Error('You must override getHash method')
  }

  /**
   * @param {XLSXBaseStyleElement} item
   * @return {string}
   */
  compile (item) {
    throw new Error('You must override compile method')
  }
}

module.exports = {
  XLSXBaseStyleElement,
  XLSXBaseStyleController
}
