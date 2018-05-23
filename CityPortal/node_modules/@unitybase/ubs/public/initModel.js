if (window.isDeveloperMode) {
  System.import('@unitybase/ubs/public/index.js')
} else {
  UB.inject('clientRequire/@unitybase/ubs/public/dist/ubs.main.min.js')
}
