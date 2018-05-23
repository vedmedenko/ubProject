var assert = require('assert')

var l = new TubList()

l.freeNative()
l = null

var session = require('@unitybase/base').UBSession
var crc32 = session.prototype.crc32 // slow CRC32 impl. Not support chining

var c = crc32('aaaabbbb')
assert.equal(c, ncrc32(0, 'aaaabbbb'))
assert.equal(c, ncrc32(ncrc32(0, 'aaaa'), 'bbbb'), 'ncrc32 calculation using initial value')

var SHA256 = require('@unitybase/cryptojs/sha256')

var s = 'salt'
for (let i = 0; i < 100; i++) {
  s = s + String.fromCharCode(i)
  assert.equal(SHA256(s).toString(), nsha256(s), 'SHA256 fail on i =' + i)
}
console.time('sha'); for (let i = 0; i < 1000; i++) { SHA256(s).toString() } console.timeEnd('sha')
console.time('Nsha'); for (let i = 0; i < 1000; i++) { nsha256(s) } console.timeEnd('Nsha')
