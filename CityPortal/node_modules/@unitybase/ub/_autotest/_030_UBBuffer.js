var
  assert = require('assert'),
  ok = assert.ok

var
  l = 100000, v, i, raw, buf, converted

buf = new TubBuffer(l)
for (i = 0; i < l; i++) {
  buf[i] = i % 255
}

for (i = 0; i < l; i++) {
  v = buf[i]
  ok(v === i % 255, 'get ' + v + ' but put ' + i % 255)
}

// CP 1251
raw = [0xCF, 0xF0, 0xE8, 0xE2, 0xE5, 0xF2, 0x21]
buf = new TubBuffer(raw.length)
for (i = 0; i < raw.length; i++) {
  buf[i] = raw[i]
}
converted = buf.transformToString(1251)
ok(converted === 'Привет!', 'Must be "Привет!"' + ' but got ' + converted)

// CP 866
raw = [0x8F, 0xE0, 0xA8, 0xA2, 0xA5, 0xE2, 0x21]
for (i = 0; i < 100; i++) {
  buf = new TubBuffer(raw.length)
  for (let j = 0; j < raw.length; j++) {
    buf[j] = raw[j]
  }
  converted = buf.transformToString(866)
  ok(converted === 'Привет!', 'Must be "Привет!"' + ' but got ' + converted)
}
buf = null

var TEST_PATH = 'D:\\SVN\\M3\\trunk\\06-Source\\models\\UB\\_autotest\\'
var zipR = new TubZipReader(TEST_PATH + '_autotest.zip')

var files = zipR.fileNames
ok(files.length = 4, 'Must be 4 files but got ' + files.length)
ok(files[0] = 'file866.txt', ' first file must be file866.txt but got files[0]')

var UNZIP_PATH = TEST_PATH + 'unzip\\'
ok(forceDirectories(UNZIP_PATH) === true, 'can not create directory ' + UNZIP_PATH)
ok(zipR.unZipToDir(0, UNZIP_PATH), 'can not unzip file ' + files[0])

var buff = new TubBuffer(0)
ok(buff.position == 0, 'new buffer not in 0 position')
i = zipR.unZipToBuffer(0, buff)
ok(i === buff.position, 'can not unzip file ' + files[0] + ' to buffer')

buff.position = 0
converted = buff.transformToString(866)
ok(converted === 'Привет!', 'Must be "Привет!"' + ' but got ' + converted)

buff.position += 1
converted = buff.transformToString(866)
ok(converted === 'ривет!', 'Must be "ривет!"' + ' but got ' + converted)

// i = buff.position = 100;
// assert.notEqual(i, 100, 'moved out of buffer size');

zipR.unZipAllToDir(UNZIP_PATH)
// todo load dir
buff.position = 0
buff.writeFile(UNZIP_PATH + files[0])
buff.position = 0

converted = buff.transformToString(866)
ok(converted === 'Привет!', 'Must be "Привет!"' + ' but got ' + converted)
buff.position = 14
buff.writeFile(UNZIP_PATH + 'file1251.txt')
buff.position = 14
converted = buff.transformToString(1251)
ok(converted === 'Привет!', 'CP1251 Must be "Привет!"' + ' but got ' + converted)

buff.position = 0
ok(buff.writeString('Привет!') == 14, 'While write as Unicode actual bytes must be len *2')
buff.position = 0
converted = buff.transformToString(1200, 14)
ok(converted === 'Привет!', 'Unicode Must be "Привет!"' + ' but got ' + converted)

buff.position = 0
ok(buff.writeString('') == 0, 'zero length string must write 0 bytes')
v = buff.transformToString(1200, 0)
ok(v === '', 'zero length string must be empty string')

zipR.freeNative()

zipW = new TubZipWriter(TEST_PATH + '_testZip.zip')
zipW.addFile(UNZIP_PATH + files[0])
zipW.addFile(UNZIP_PATH + files[1])
zipW.addFile(UNZIP_PATH + files[2])
zipW.addFile(UNZIP_PATH + files[3])
zipW.freeNative()

var fs = require('fs')
for (i = 0; i < 4; i++) {
  ok(fs.unlinkSync(UNZIP_PATH + files[i]))
}
var dirContent = fs.readdirSync(UNZIP_PATH)
ok(dirContent.length = 2, 'must be 2 subfolder in ' + UNZIP_PATH)
for (i = 0; i < 2; i++) {
  ok(fs.rmdirSync(UNZIP_PATH + dirContent[i]), 'cant remove ' + UNZIP_PATH)
}
ok(fs.rmdirSync(UNZIP_PATH), 'cant remove ' + UNZIP_PATH)

console.debug('TubBuffer, TubZipReader, TubZipWriter test passed')
