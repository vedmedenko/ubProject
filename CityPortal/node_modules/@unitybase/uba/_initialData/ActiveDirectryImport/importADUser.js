'use strict'
console.info('\tImport users from active directry')
var
  fs = require('fs'),
  argv = require('@unitybase/base').argv,
  csv = require('@unitybase/base').csv,
  domainName, session

session = argv.establishConnectionFromCmdLineAttributes()
domainName = argv.findCmdLineSwitchValue('domainName')
if (!domainName) {
  throw new Error('you must specify domainName switch')
}

var csvLoader = require('@unitybase/base').dataLoader, conn = session.connection

var fContent, csvData, fileName = __dirname + '/ALLADUsers.csv', dataLength, i, lVal, resData = []

fContent = fs.readFileSync(fileName)
if (!fContent) { throw new Error('File ' + fileName + ' is empty or not exist') }
fContent = fContent.trim()
csvData = csv.parse(fContent, ',')
if (!Array.isArray(csvData)) {
  throw new Error('Invalid CSV format or file ' + fileName + ' not found')
}
if (csvData.length < 1) {
  throw UB.format('Length of CSVData ({0}) smaller then startRow ({1})', csvData.length, 1)
}
csvData.splice(0, 1)

dataLength = csvData.length
console.info('Data lenght: ' + dataLength)
    // console.info(JSON.stringify(csvData[0]));

for (i = 0; i < dataLength; i++) {
  lVal = conn.lookup('uba_user', 'ID', {expression: 'name', condition: 'equal', values: {name: domainName + '\\' + csvData[i][3].toLowerCase() }})
        // if (!csvData[i][3]){
        //    throw new Error('Empty name in row '+ JSON.stringify(csvData[i]));
        // }
  if (!lVal && lVal !== 0) {
    resData.push(csvData[i])
  }
}
console.info('will be inserted: ' + resData.length)

   // console.info(JSON.stringify(resData[0]));

  // "First Name","Last Name","Display Name","Logon Name","Phone","Email","Last LogOn Date"
csvLoader.loadArrayData(conn, resData, 'uba_user', 'name;description;disabled;isPending'.split(';'), [
  function (row) {
    return domainName + '\\' + row[3]
  },
  function (row) {
    return row[1] + ' ' + row[0] + ' ' + row[2] + ' ' + row[5] + ' ' + row[4]
  },
  function (row) {
    return 0
  },
  function (row) {
    return 0
  }
], 1000)

console.info('add roles')

var roleId = conn.lookup('uba_role', 'ID', {expression: 'name', condition: 'equal', values: {name: 'users' }}),
  roleData = []

dataLength = resData.length
if (roleId) {
  for (i = 0; i < dataLength; i++) {
    lVal = conn.lookup('uba_user', 'ID', {expression: 'name', condition: 'equal', values: {name: domainName + '\\' + resData[i][3].toLowerCase() }})
    if (lVal) {
      roleData.push([roleId, lVal])
    }
  }
}

csvLoader.loadArrayData(conn, roleData, 'uba_userrole', 'userID;roleID'.split(';'),
 [1, 0], 1000)

console.info('done.')

    /*
    csvLoader.loadSimpleCSVData(conn, __dirname + '/ALLADUsers.csv', 'uba_users', 'name,description,disabled,isPending'.split(';')
    */
