var argv = require('@unitybase/base').argv
var assert = require('assert')
var path = require('path')
var fixturesDir = path.join(path.dirname(__filename), 'nodeModules', 'fixtures')
var obj = argv.safeParseJSONfile(fixturesDir + '\\jsonParser.json')
assert.equal(obj.path, '\\\\fs\\Share\\')
