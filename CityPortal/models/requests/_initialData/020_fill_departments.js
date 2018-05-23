module.exports = function(session){
    const path = require('path')
    const fs = require('fs')
    const {dataLoader, csv, argv} = require('@unitybase/base')
        let  conn = session.connection;
    let fn = path.join(__dirname, '/req_depart.csv')
    let fContent = fs.readFileSync(fn)
    if (!fContent) { throw new Error(`File ${fn} is empty or not exist`) }
    fContent = fContent.trim()
    let csvData = csv.parse(fContent)
    //check existing records in the DB
    let notExisted = csvData.filter(
      (row) => !conn.lookup('req_depart', 'ID',
          conn.Repository('req_depart').where('name', '=', row[0]).ubql().whereList
        )
    )
    console.info('\t\tFill Departments field (req_depart)');
    dataLoader.loadArrayData(conn, notExisted, 'req_depart', 'name;postAddr;phoneNum'.split(';'), [0,1,2], 1);

};
