var common = require('../common')
var assert = require('assert')
var folder = common.fixturesDir + '\\UBTest\\'
var fs = require('fs')

var etalon = 'Привет! Hello!'
var content

content = fs.readFileSync(folder + 'ascii.txt', {encoding: 'ascii'})
assert.ok(content == etalon, 'ascii.txt fail')

content = fs.readFileSync(folder + 'utf8wBOM.txt')
assert.ok(content == etalon, 'utf8wBOM.txt fail')

content = fs.readFileSync(folder + 'utf8wBOM.txt', {encoding: 'uft-8'})
assert.ok(content == etalon, 'utf8wBOM.txt fail')

content = fs.readFileSync(folder + 'utf8woBOM.txt', {encoding: 'uft-8'})
assert.ok(content == etalon, 'utf8woBOM.txt fail')

content = fs.readFileSync(folder + 'utf8woBOM.txt')
assert.ok(content == etalon, 'utf8woBOM.txt fail')

content = fs.readFileSync(folder + 'utf8wBOM.txt', {encoding: 'bin'})
assert.ok(content.byteLength == 23, 'utf8wBOM.txt bin lenght')
var bytes = new Uint8Array(content)
assert.ok(bytes.length == 23, 'utf8wBOM.txt bytes lenght')
assert.ok(bytes[0] == 0xEF && bytes[1] == 0xBB, 'utf8wBOM.txt bin bytes')

assert.ok(fs.writeFileSync(folder + '_utf8wBOM.txt', content), 'write binary data to file')
var contentNew = fs.readFileSync(folder + '_utf8wBOM.txt', {encoding: 'bin'})
assert.ok(fs.statSync(folder + '_utf8wBOM.txt').size === 23, 'write binary data to file')

assert.deepEqual(content, contentNew, 'ArrayBuffer equal')
bytes[1] = 10
assert.notDeepEqual(content, contentNew, 'ArrayBuffer not equal')
