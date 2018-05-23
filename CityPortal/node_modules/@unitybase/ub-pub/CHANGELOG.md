# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [4.5.0]
### Changed
- **BREAKING** Native messages features moved to the modules in `@ub-e` namespace.
  Depending on feature required for application add a `@ub-e/nm-docedit`, `@ub-e/nm-pdfsign`
  or `@ub-e/nm-scanner` to application packages (don't need to add to a domain models)

## [4.4.13]
### Fixed
 - UBNotifierWSProtocol do not connect with server after UBConnection restore session. The session can be restored when configuration parameter allowSessionPersistent = true.
 - Bug with parsing message of UBError: string caught by regexp is caught from JSON representation, not from original error message, therefore, the error message is JSON encoded string,
   which means the double-quotes would be encoded with backslashes, which does not look good
 - i18n now recognizes entity and attribute names so that `UB.i18n('uba_user')` or `UB.i18n('uba_role.description')` would be resolved
   to localized entity caption or entity attribute caption

## [4.4.11]
### Changed
 - In case of session persistent clear the session key only for 
   401 response status (instead of all > 300)
 
## [4.4.6]
### Added
- ub-pub now export a `UBCache` class, so instead of 
```
UBCache = require('@unitybase/ub-pub/UBCache')
```
better use a 
```
UBCache = require('@unitybase/ub-pub').UBCache
```


## [4.4.1]
### Changed
- UBConnection.on('passwordExpired') callback now accept connecton as a argument

### Fixed
- allow reconnect even if exception is occurred inside UBConnection 'authorized' / 'authorizationFail' event handlers
- in case language for user not stored in uba_user.uData will set a 
`UBConnection.userLang=appConfig.defaultLang` instead of `appConfig.supportedLanguages[0]` 
witch depends on how languages configured for database connections

## [4.4.0]
### Changed
 - all DSTU cryptography routines are moved to `@ub-d/mn-dstu` package

## [4.3.5]
### Fixed
- New event "notify" in UBNativeMessage instead of promise.notify

### Changed
- simplify a UBNativeMessages.features by **removing a `dstu`** feature (for UB Defence @ub-d/nm-dstu model must be added to domain)

## [4.3.4]
### Fixed
- throw correct exception text in case of clien-side auth handshake error in UBConnection

### Changed
- only `auth` & `getAppInfo` endpoint are "unauthorized" for UBConnection (remove `models` & `downloads`)


## [4.3.1]
### Fixed
 - correclty restore connsection.userLang() in case persisted session is used

## [4.3.0]
### Added
 - ability to persist session for `UBConnection` ( `allowSessionPersistent` connect config parameter) - for 
 usage inside non-SPA browser clients. Cleared after `connection.logout()` or in case server log out user.
 
## [4.2.0]
### Added
- Package @unitybase/ub-pub now can be used from nodeJS - see [usage samlpe](https://gitlab.intecracy.com/unitybase/samples/tree/master/use-nodejs)

## [4.1.5]
### Added
- parameter `onAuthorized` added to `UBConnection.connect` - Callback for authorization success. See `authorized` event


