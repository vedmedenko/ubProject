/*
 * @author v.orel
 */
console.log('Worker test started');
var
    assert = require('assert'),
    Worker = require('@unitybase/base').Worker;

function job1(message) {
    sleep(200);
    postMessage('='.concat(message));
    sleep(200);
    postMessage('+'.concat(message));
    terminate();
}

function job2(message) {
    sleep(200);
    postMessage('='.concat(message));
    sleep(200);
    postMessage('+'.concat(message));
    sleep(200);
    terminate();
}

function job3(message) {
    sleep(200);
    postMessage('='.concat(message));
    sleep(200);
    postMessage('+'.concat(message));
    sleep(200);
    throw new Error('-'.concat(message));
}

var job4 = (function(){
        "use strict";
        return function(message) {
            postMessage(message);
            terminate();
        }
    })();

function job5(message) {
    postMessage(message);
    terminate();
}

function doInsideJobWhenThreadTerminate() {
    postMessage('terminate 1');
    sleep(200);
    postMessage('terminate 2');
}

function doInsideJobWhenError(message, exception) {
    postMessage('e'.concat(message));
    postMessage('e'.concat(exception.message));
    terminate();
}

function nextMessage(){
    return workerThread.waitMessage(1000);
}

var workerThread, mes;

workerThread = new Worker({onmessage: job1, onterminate: doInsideJobWhenThreadTerminate});

workerThread.postMessage('1');
assert(!workerThread.getMessage(), 'job1 must not emit message immediately');
mes = nextMessage();
assert.equal(mes, '=1', 'job1 must emit message "=1" in 100ms');
assert(!workerThread.getMessage());
assert.equal(nextMessage(), '+1', 'job1 must emit message "+1" after "=1"');
assert(!workerThread.getMessage(), 'job1 - expect 2 message only');
workerThread.terminate();
mes = nextMessage();
assert.equal(mes,'terminate 1', 'job1 - expect "terminate 1" message after terminate');
mes = workerThread.getMessage();
assert.equal(mes, undefined, 'job1 must not emit message immediately after "terminate 1", but got:' + mes);
assert.equal(nextMessage(), 'terminate 2', 'job1 - expect "terminate 2" message during terminate');
assert(!workerThread.getMessage(), 'job1 - no message expected aftar "terminae 2"');

workerThread = new Worker({onmessage: job2, onterminate: doInsideJobWhenThreadTerminate, message: '2'});
assert(!workerThread.getMessage());
mes = nextMessage();
assert.equal(mes,'=2');
assert(!workerThread.getMessage());
assert.equal(nextMessage(),'+2');
assert(!workerThread.getMessage());
workerThread.terminate();
mes = nextMessage();
assert.equal(mes,'terminate 1');
assert(!workerThread.getMessage());
assert.equal(nextMessage(),'terminate 2');
assert(!workerThread.getMessage());

workerThread = new Worker({onmessage: job3, onterminate: doInsideJobWhenThreadTerminate, onerror: doInsideJobWhenError, message: '3'});
assert(!workerThread.getMessage());
mes = nextMessage();
assert.equal(mes,'=3');
assert(!workerThread.getMessage());
assert.equal(nextMessage(),'+3');
assert(!workerThread.getMessage());
assert.equal(nextMessage(),'e3');
assert.equal(nextMessage(),'e-3');
mes = nextMessage();
assert.equal(mes,'terminate 1');
assert(!workerThread.getMessage());
assert.equal(nextMessage(),'terminate 2');
assert(!workerThread.getMessage());

//test function compiled in strict mode
workerThread =  null;
workerThread = new Worker({onmessage: job4, message: '4'});
assert.equal(nextMessage(),'4');

console.log('Test a lot of workers');
var i, j;
for (j = 0; j < 15; j++ ) {
    workerThread = [];
    for (i = 0; i < 10; i++ ) {
        workerThread.push(new Worker({onmessage: job5, message: '5'}));
    }
    process.stdout.write('.');
    workerThread.forEach(function(elem){
        while (!elem.waitMessage(1000)){
            sleep(10);
        }
    });
    process.stdout.write('*');
//    sleep(10000);
}    
console.log('Worker test completed');