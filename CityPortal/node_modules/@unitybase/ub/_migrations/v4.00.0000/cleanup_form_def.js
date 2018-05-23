/**
 * Command line module.
 *
 * Remove a //@ID and //@code comments from all forms in application(as required by UB >1.12.32
 *
 * @author pavel.mash
 */

const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const cmdLineOpt = require('@unitybase/base/options')
const argv = require('@unitybase/base/argv')

module.exports = function cleanupFormDef (options) {
  var
    configFileName,
    configPath,
    config,
    app,
    storeNames,
    selectedStores

  if (!options) {
    var opts = cmdLineOpt.describe('cleanupFormDef',
                'Remove a //@ID and //@code comments from all forms in application(as required by UB >1.12.32',
                ''
            )
            .add({short: 'cfg', long: 'cfg', param: 'serverConfig', defaultValue: 'ubConfig.json', help: 'Server config'})
    options = opts.parseVerbose({}, true)
    if (!options) return
  }
  configFileName = argv.getConfigFileName()

  if (!configFileName) {
    throw new Error('Invalid server config path')
  }

  config = argv.getServerConfiguration()
  app = config.application
  var models = app.domain.models
  _.forEach(models, function (model) {
    var modelFormsPath = path.join(process.cwd(), model.path, 'public', 'forms')
    if (fs.isDir(modelFormsPath)) {
      var folderFiles = fs.readdirSync(modelFormsPath)
      if (folderFiles.length) console.info('Check ' + modelFormsPath)
      folderFiles.forEach(function (fileName) {
        if (/-fm\.def/.test(fileName)) {
          var fPath = path.join(modelFormsPath, fileName)
	  var content = fs.readFileSync(fPath)
	  var newContent = content.replace(/^\/\/@code.*\r?\n/gm, '').replace(/^\/\/@ID.*\r?\n/gm, '')
	  if (content != newContent) {
   	    console.log('Form cleaned: ' + fPath)
            fs.writeFileSync(fPath, newContent)
	  }
        }
      });
    }
  })
}
