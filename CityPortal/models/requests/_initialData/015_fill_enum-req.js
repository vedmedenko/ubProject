module.exports = function(session){
        const path = require('path')
    const fs = require('fs')
    const {dataLoader, csv, argv} = require('@unitybase/base')
        let  conn = session.connection;
    let fn = path.join(__dirname, '/ubm_enum-req.csv')
    let fContent = fs.readFileSync(fn)
    if (!fContent) { throw new Error(`File ${fn} is empty or not exist`) }
    fContent = fContent.trim()
    let csvData = csv.parse(fContent)
    let notExisted = csvData.filter(
      (row) => !conn.lookup('ubm_enum', 'code',
          conn.Repository('ubm_enum').where('code', '=', row[1]).ubql().whereList
        )
    )
    console.info('\t\tFill enumeration for RequestList model');
    dataLoader.loadArrayData(conn, notExisted, 'ubm_enum', 'eGroup;code;name;sortOrder'.split(';'), [0, 1, 2, 3]);
}
