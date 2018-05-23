return;
var fs = require('fs'),
  path = require('path');

var tests = fs.readdirSync(path.dirname(__filename) + '/nodeModules/simple');
tests.forEach(function(test){
  console.debug('Run', test);
  require('./nodeModules/simple/' + test);
});

var tests = fs.readdirSync(path.dirname(__filename) + '/nodeModules/paralel');
tests.forEach(function(test){
  if (test.substr(0,4) === 'test') {
      console.debug('Run', test);
      require('./nodeModules/paralel/' + test);
  }
});