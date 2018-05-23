var common = require('../common')
var assert = require('assert')
var folder = common.fixturesDir + '\\UBTest\\'

var wBom = require(folder + 'testBOM')
assert.ok(wBom == 'withBOM', 'testBOM fail')

var woBom = require(folder + 'testNoBOM')
assert.ok(woBom == 'withoutBOM', 'testNoBOM fail')

var jsonWithComment = require(folder + 'jsonWithComment')
assert.ok(jsonWithComment.a === 1, 'jsonWithComment fail')
