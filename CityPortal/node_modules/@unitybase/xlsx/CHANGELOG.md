# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [4.1.6]
### Added
  - Converter from HTML to XLSX.

 Simple example:
  ```
   const {XLSXWorkbook, XLSXfromHTML} = require('xlsx')
   const xmldom = require('xmldom')
   const wb = new XLSXWorkbook({useSharedString: false})
   const converter = new XLSXfromHTML(xmldom.DOMParser, wb, [{name: 'Лист'}])
   converter.writeHtml({html: yourHtmlString})
   wb.render().then(function (content) {
     content = Buffer.from(content)
     fs.writeFileSync('./testHtml.xlsx', content, 'binary')
   })
  ```

 Full example './_examples/testHtml.js'

## [4.1.0]
### Added
  - Use javascript classes instead Ext.js classes
  - Add rgb color in styles
  
  ```
   wb.style.fills.add({fgColor: {rgb: 'FFCFE39D'}})
  ```

