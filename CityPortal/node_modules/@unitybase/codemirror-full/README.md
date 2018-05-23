CodeMirror with plugins for UnityBase

The main purpose of this package is to create a boundle for CodeMirror + CodeMirror plugins + jshint 
for use it inside UnityBase platform

We can't  boundle a original for several reason^

 - it use old version of lodash
 - we can't use jshint form SystemJS because it require node build-in module "events"
