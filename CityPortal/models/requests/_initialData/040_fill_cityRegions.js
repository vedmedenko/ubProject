module.exports = function(session){
 const path = require('path')
 const fs = require('fs')
 const {dataLoader, csv, argv} = require('@unitybase/base')
 let  conn = session.connection;
 let fn = path.join(__dirname, '/req_cityRegions.csv')
 let fContent = fs.readFileSync(fn)
 if (!fContent) { throw new Error(`File ${fn} is empty or not exist`) }
 fContent = fContent.trim()
 let csvData = csv.parse(fContent)
 //check existing records in the DB
 let notExisted = csvData.filter(
   (row) => !conn.lookup('req_cityRegion', 'ID',
   conn.Repository('req_cityRegion').where('name', '=', row[0]).ubql().whereList
 )
)
 console.info('\t\tFill City Region field (req_cityRegion)');
 dataLoader.loadArrayData(conn, notExisted, 'req_cityRegion', 'name'.split(';'), [0], 1);

};
