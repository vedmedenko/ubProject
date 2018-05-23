# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [4.2.27]
### Changed
- allow blank for mi_dateTo record history mixin attribute on browser side
 (but for DDL generator mi_dateTo must be not null, so for non-browser keep it as is)

## [4.2.26]
### Fixed
- entity localization files `*.meta.lang` now can contains `attributes` section 
defined as array 
```
"attributes": [{"name": "arrtCode", ...}, ...]
```
(object also supported)

## [4.2.24]
### Added
- `dataLoader` module, method lookup now supports optional parameter `doNotUseCache`, which allows
  loading hierarchical data, with references to itself, when each next row may point to previous rows in CSV or array.
  NOTE: use transLen = 1 for such scenarios, otherwise it won't work, because lookup would happen before parent rows inserted

## [4.2.23]
### Added
- `FileBaseStoreLoader` now use a `CRC32(fileDate.toString())` to calculate a cache version (UB only).
Prev. implementataion based on max file modification date fails in 
case we updated something backwards

## [4.2.21]
### Added
- `argv.establishConnectionFromCmdLineAttributes` can accept a `-timeout` command line which
 set a connection receive timeout. By default timeout increased to 120 set to
 allow a long-live script execution

## [4.2.20]
### Added
- UBDoman iterator callbacks described as @callback for better code insight

## [4.2.17]
### Fixed
- prevent ORA-00932 error - in case `Repository.where(attr, 'in', undefined)` -> replace it by (0=1) SQL statement

## [4.1]
### Added
- `argv.getConfigFileName` take a config from UB_CFG environment variable if `-cfg` cmd line switch omitted
- `FileBaseStoreLoader.load()` now return data version in TubDataCache. 
  To be used in file-based entitis select's instead of version calculation individually in each entity
- `UBConnection.setDocument` method for convinient uploading content to temp store, for example in model initialization or
  data update/migration scripts

### Fixed
- LocalDataStore sometimes not filter by ID (known bug in TubList)
