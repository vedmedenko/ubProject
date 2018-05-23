### UnityBase enterprise Excel exporter

AdminUI use this module for export grid view to Excel (via Action -> Export -> Excel)

### Install

```
 npm i @unitybase/xlsx
```

### Usage
```
const fs = require('fs')
const {XLSXWorkbook} = require('@unitybase/xlsx')
const wb = new XLSXWorkbook()
const ws = wb.addWorkSheet({})
const defFont = wb.style.fonts.add({code: 'def', name: 'Calibri', fontSize: 11, scheme: 'minor'})
const fillBG = wb.style.fills.add({fgColor: {rgb: 'CFE39D'}})
const fstyle = wb.style.getStyle({font: defFont})
const fstyle1 = wb.style.getStyle({font: defFont, fill: fillBG})
ws.addRow([{value: 'test'}],[{column: 1, style: fstyle}])
ws.addRow(
    [{value: 'test'}, {value: '2'}, {value: 256}],
    [
        {column: 1, style: fstyle},
        {column: 3, style: fstyle1},
        {column: 4, style: fstyle1}
    ]
)
wb.render()
.then(function (content) {
  fs.writeFileSync('./example.xlsx', content, 'binary')
})
```


