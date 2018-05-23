let __loadedScript = {}
let __head = (typeof document !== 'undefined') && document.getElementsByTagName('head')[0]

/**
 * Inject external script or css to DOM and return a promise to be resolved when script is loaded.
 *
 * Implement single load mode (if script successfully loaded using inject it not loaded anymore.
 *
 * @example
 *
 //Load script.js:
 UB.inject('jslibs/script.js')

 //Load several script at once and error handling:
 Promise.all([UB.inject('jslibs/script.js'), UB.inject('script2.js')])
 .catch(function(err){
   console.log('Oh! error occurred: ' + err)
 });

 //Load one script and then load other
 UB.inject('jslibs/js_beautify.js')
 .then(function(){
     console.log('first script loaded. Continue to load second')
     return UB.inject('jslibs/js_beautify1.js')
 });

 //Load couple of resources:
 Promise.all([UB.inject('css/first.css'), UB.inject('css/second.css')])

 * @param {String} url either *js* or *css* resource to load
 * @param {String} [charset]
 * @return {Promise}
 */
function inject (url, charset) {
  let res
  if (__loadedScript[url]) {
    res = __loadedScript[url]
  } else {
    // Create and inject script tag at end of DOM body and load the external script
    // attach event listeners that will trigger the Deferred.
    res = __loadedScript[url] = new Promise(function (resolve, reject) {
      let elm = null
      let isCSS = /\.css(?:\?|$)/.test(url)
      if (isCSS) {
        elm = document.createElement('link')
        elm.rel = 'stylesheet'
        elm.async = true
      } else {
        elm = document.createElement('script')
        elm.type = 'text/javascript'
        if (charset) {
          elm.charset = charset
        }
        elm.async = true
      }
      elm.onerror = function (oError) {
        let reason = 'Required ' + (oError.target.href || oError.target.src) + ' is not accessible'
        delete __loadedScript[url]
        elm.onerror = elm.onload = elm.onreadystatechange = null
        reject(new Error(reason))
      }

      elm.onload = function () {
        elm.onerror = elm.onload = elm.onreadystatechange = null
        setTimeout(function () { // script must evaluate first
          let _elm = elm
          resolve()
          // Remove the script (do not remove CSS) ???
          if (_elm.parentNode && !_elm.rel) {
            _elm.parentNode.removeChild(elm)
            elm = null
          }
        }, 0)
      }
      // if ('readyState' in elm) {   // for <IE9 Compatability
      //   elm.onreadystatechange = function () {
      //     if (this.readyState === 'loaded' || this.readyState === 'complete') {
      //       resultHandler()
      //     }
      //   }
      // }

      __head.appendChild(elm)
      // src must be set AFTER onload && onerror && appendChild
      if (isCSS) {
        elm.href = addResourceVersion(url)
      } else {
        elm.src = addResourceVersion(url)
      }
    })
  }
  return res
}

/**
 *  In case window contains __ubVersion property {@link addResourceVersion addResourceVersion} will add
 *  version parameter to scripts inside models.
 *
 *  @private
 */
const __ubVersion = (typeof window !== 'undefined') && window.__ubVersion
const MODEL_RE = new RegExp('models/(.+?)/') // speculative search. w/o ? found maximum string length

/**
 * Search for resource version in the  window.__ubVersion global const
 * IF any,  return 'ver=version' else ''
 * @param {String} uri
 * @returns {String}
 */
function getResourceVersion (uri) {
  let modelName = MODEL_RE.test(uri) ? MODEL_RE.exec(uri)[1] : '_web'
  return (__ubVersion && __ubVersion[modelName])
    ? '?ubver=' + __ubVersion[modelName]
    : ''
}

/**
 * Append UnityBase model version to the URL
 * @param {String} uri
 * @returns {String} uri with added resource version
 */
function addResourceVersion (uri) {
  let ver = getResourceVersion(uri)
  return ver ? uri + ver : uri
}

module.exports = {
  inject,
  addResourceVersion
}
