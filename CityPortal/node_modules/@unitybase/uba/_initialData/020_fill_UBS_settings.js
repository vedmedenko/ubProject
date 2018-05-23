const csvLoader = require('@unitybase/base').dataLoader
const path = require('path')
/**
 * Fill UBS model settings
 * Used by `ubcli initialize` command
 * @param {ServerSession} session
 */
module.exports = function (session) {
  let conn = session.connection
  let domain = conn.getDomainInfo()
  if (!domain.has('ubs_settings')) {
    console.info('\tSkip adding default settings - entity `ubs_settings` not in domain')
    return
  }
  console.info('\tFill default settings for UBS model')
  csvLoader.loadSimpleCSVData(conn, path.join(__dirname, 'ubs_settings-UBA.csv'),
    'ubs_settings',
    'settingKey;type;defaultValue;settingValue;name;description'.split(';'),
    [0, 1, 2, 3, 4, 5],
    1
  )
}
