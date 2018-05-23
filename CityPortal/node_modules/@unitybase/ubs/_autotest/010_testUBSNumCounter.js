/**
 * Will test NunCounter generation.
 *
 * Unity base must be running in -c mode
 *
 * UB ./models/UBS/_autotest/010_testUBSNumCounter.js -cfg ubConfig.json -app autotest -u admin -p admin  -t 5
 *
 * @author mpv
 * @created 04.11.2015
 */
const _ = require('lodash')
const Worker = require('@unitybase/base').Worker
var workers = [];
var
    argv = require('@unitybase/base').argv,
    session = argv.establishConnectionFromCmdLineAttributes(),
    connection = session.connection,
    numThreads = parseInt(argv.findCmdLineSwitchValue('t') || '2', 10),
    regKey = argv.findCmdLineSwitchValue('regkey') || 'tst_regkey',
    i, result;


try {
    console.log('start ', numThreads, 'thread');
    // create threads
    for(i=0; i<numThreads; i++){
        workers.push(new Worker({
            name: 'numCounter' + i,
            onmessage: onProcessWorker,
            onterminate: onTerminateWorker,
            onerror: onWorkerError
        }));
        console.log('Create worker ', i);
    }
    //create record in ubs_numcounter
    result = connection.run({
        entity: 'ubs_numcounter',
        method: 'getRegnumCounter',
        execParams: {
            regkey: regKey
        }
    });
    i = 0;
    workers.forEach(function(worker){
        worker.postMessage({signal: 'start',  thread: i, regKey: regKey });
        console.log('Worker ', i, 'started');
        i++;
    });
    var resultsCounters = [];
    // wait for done
    workers.forEach(function(worker){
        worker.result = worker.waitMessage(100000);
        resultsCounters.push(worker.result.numCounter);
    });
    if (resultsCounters.length !== _.uniq(resultsCounters).length) {
        throw new Error('Method ubs_numcounter.getRegnumCounter generate duplicates values for regKey:' + regKey + '#' + resultsCounters);
    } else {
        console.log('Test successfull(./models/UBS/_autotest/010_testUBSNumCounter.js):' + resultsCounters);
    }

} finally {
    session.logout();
}


function onTerminateWorker(){
    postMessage('Worker terminated');
}

function onWorkerError(message, exception){
    postMessage('Worker exception: ' + exception + ' during handle message ' + message);
}

function onProcessWorker(message){
    var
        path = require('path'),
        //argv = require(path.join(process.startupPath, 'node_modules', '@unitybase/base/argv')),
        argv = require('@unitybase/base/argv'),
        session,
        connection,
        result,
        startTime;

    console.log(argv)
    if (message.signal !== 'start'){
        throw new Error('Start phase. Wrong message ' + message);
    }

    session = argv.establishConnectionFromCmdLineAttributes();
    connection = session.connection;
    startTime = Date.now();
    try {
        result = connection.run({
            entity: 'ubs_numcounter',
            method: 'getRegnumCounter',
            execParams: {
                regkey: message.regKey
            }
        });
    }
    finally {
        if (session) {
            session.logout();
        }
    }
    postMessage({signal: 'done', thread: message.thread, timeSpend: Date.now() - startTime, numCounter: result.getRegnumCounter});
    terminate();
}
