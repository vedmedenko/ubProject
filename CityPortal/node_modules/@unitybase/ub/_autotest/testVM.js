var
  assert = require('assert'),
  ok = assert.ok,
  throws = assert.throws

var
  localVar = 123,
  usingRun, evaled

// throws(runInThisContext('localVar', 'runInThisContext1'), 'm', 'oo');
// usingRun = runInThisContext('localVar', 'runInThisContext1');
// ok(usingRun === 123, 'runInThisContext must see context variables');

if (false) { // MPV - in SM45 there is no posibility to eval in context other when global!
  usingRun = runInThisContext('var localVar = 15; localVar;')
  ok(usingRun === 15 && localVar === 123, 'runInThisContext hase his own variable object')

  evaled = eval('var localVar = 15; localVar;')
  ok(evaled === 15)
  ok(localVar === 15, 'eval do not hahe his own variable object and use global instead')
  localVar = 123

  evaled = eval('"use strict"; var localVar = 15; localVar;')
  ok(evaled === 15)
  ok(localVar === 123, 'in strict mode eval do the same as UB runInThisContext')

  var beauty = require('js_beautify.js').js_beautify
  ok(beauty('ssd'), 'ssd', 'js_beautify not work')
}
