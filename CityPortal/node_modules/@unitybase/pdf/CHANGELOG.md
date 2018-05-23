# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).


## [1.1.22]
### Fixed
 - module PDF: Module throw error when html contains &frac14; 

## [1.1.17]
### Fixed
 - module PDF: If textBox has defined high and sptitOnPage=true it will split not correct

## [1.1.15]
### Fixed
- HTML2PDF: Fix exception when convert broken HTML to PDF at server side. The HTML has invalid colspan value.


## [1.1.14]
### Added
- HTML2PDF: handle TimesNewRoman Bolt + Italic font (new font added)
- add Deflater compression

### Fixed
- HTML2PDF: fixed incorrect justify align in case block element contains several fonts 



