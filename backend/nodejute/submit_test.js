#!/usr/bin/env node
/*
Copyright (c) 2011, Yahoo! Inc.
All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the following 
conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Yahoo! Inc. nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of Yahoo! Inc.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS 
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED 
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


var config = (require('./getConfig'))(),
    opt  = require( "optimist" ),
    os   = require('os'),
    events    = require("events"),
    eventHubF = function() { events.EventEmitter.call(this); },
    args = opt
        .usage('Usage: $0 --test [testfile] [ --test [another testfile] ] [ --host [JUTE host] ] [ --port [JUTE host port] ] [ --sel_host [Selenium host] ] [ --sel_browser [Selenium browser spec] ] [ --seleniums # ] [ --load ] ] [ --send_output ] [ --wait ] [ --clear_results ] [ -v8 ] [ --status ] [ --snapshot ] [ --retry ] [ --phantomjs ] [ --screen # ]')
        .alias('t', 'test')
        .alias('h', 'host')
        .alias('p', 'port')
        .alias('sh', 'sel_host')
        .alias('sb', 'sel_browser')
        .alias('se', 'seleniums')
        .alias('l', 'load')
        .alias('s', 'status')
        .alias('sn', 'snapshot')
        .alias('c', 'clear_results')
        .alias('w', 'wait')
        .alias('r', 'retry')
        .alias('ph', 'phantomjs')
        .alias('sc', 'screen')
        .default('host', (config && config.host) || os.hostname())
        .default('port', (config && config.port) || 8080)
        .default('send_output', false)
        .default('wait', false)
        .default('v8', false)
        .default('snapshot', false)
        .default('load', false)
        .default('phantomjs', false)
        .default('clear_results', false)
        .default('seleniums', 1)
        .default('sel_browser', '*firefox')
        .default('retry', 0)
        .default('screen', 0)
        .describe('test', 'Test file to run - relative to docRoot/testDir (npm set jute.testDir) - can specify multiple of these')
        .describe('host', 'Hostname of JUTE server')
        .describe('port', 'Port of JUTE server')
        .describe('sel_host', 'Hostname of Selenium RC or Grid Server (if not specified test(s) will run in all CURRENTLY captured browsers)')
        .describe('sel_browser', 'Selenium browser specification')
        .describe('seleniums', 'Number of Selenium browsers to run tests in parallel')
        .describe('load', 'Load up tests but do not run them immediately')
        .describe('snapshot', 'Dump a snapshot at end of test (Selenium only!)')
        .describe('send_output', 'For Selenium tests ONLY - send status messages back while running')
        .describe('wait', 'Wait for captured tests to finish')
        .describe('clear_results', 'Clear ALL previous test results before running specified test(s)')
        .describe('v8', 'Run these test(s) using the V8 backend')
        .describe('status', 'Just get status')
        .describe('retry', 'Number of time to retry a failed test')
        .describe('phantomjs', 'Path to phantomjs executable')
        .describe('screen', 'X screen number where an X server is listening')
        .argv,
    util  = require('util'),
    qs    = require('querystring'),
    http  = require('http'),
    juteArgs = {};

if (!config) {
    process.exit(0);
}

if (args.help) {
    console.log(opt.help());
    process.exit(0);
}

if (args.wait && args.sel_host) {
    console.log("You don't need '--wait' for Selenium tests!");
}

if (args.wait && args.v8) {
    console.log("You don't need '--wait' for V8 tests!");
}

if (args.v8 && args.sel_host) {
    console.error("Erg V8 or Selenium - pick one!");
    process.exit(1);
}

util.inherits(eventHubF, events.EventEmitter);
var eventHub = new eventHubF();

var options = {
    host: args.host,
    port: args.port
};

eventHub.on('tests', function(tests) {
    if (tests) {
        if (args.v8) {
            var exec = require('child_process').exec,
                path = require('path');

            for (var i = 0; i < tests.length; i++) {
                var test = tests[i];
                exec(path.join(__dirname, 'jute_v8.js') + ' ' + test, function(error, stdout, stderr) {
                    if (error) {
                        console.error("Error running jute_v8: " + error);
                    } else {
                        console.error(stderr);
                        console.log(stdout);
                    }

                    if (i == args.length) {
                        process.exit(0);
                    }
                });
            }
        } else {
            // POST space separated list of tests
            juteArgs.tests = tests.join(' ');
            if (args.load) {
                juteArgs.load = 1;
            }
            if (args.wait) {
                juteArgs.wait = 1;
            }
            juteArgs.retry = args.retry;

            // Toss in Selenium stuff
            if (args.phantomjs) {
                juteArgs.phantomjs = 1;
                juteArgs.screen = args.screen;
            }

            // Toss in Selenium stuff
            if (args.sel_host) {
                juteArgs.sel_host = args.sel_host;
                juteArgs.sel_browser = args.sel_browser;
                juteArgs.seleniums = args.seleniums;
                if (args.snapshot) {
                    juteArgs.snapshot = 1;
                }
            }

            // Whether to stream output back
            if (args.send_output) {
                juteArgs.send_output = 1;
            }

            options.path    = '/jute/_run_test';
            options.method  = 'POST';
            options.headers = { 'Content-Type': 'application/json' };

            // See what we got
            console.log('Submitting ' + util.inspect(juteArgs) + ' to ' + args.host);

            // POST AWAY!
            var req = http.request(options, function(res) {

                if (res.statusCode != 200) {
                    console.log('JUTE Displeased');
                }

                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log(chunk);
                });
                res.on('end', function() {
                });
            });

            // 6000 seconds = 100 minutes
            req.socket.setTimeout(6000000, function(e) { console.log('socket timeout!'); });

            // Not Good
            req.on('error', function(e) {
                console.error('Problem contacting JUTE server at: ' + args.host + ':' + args.port);
                console.error("Is JUTE running there?  Did you specify '--host' and '--port' correctly?");
                process.exit(1);
            });

            req.end(JSON.stringify(juteArgs));
        }
    }
});

if (args.status) {
    options.path = '/jute/_status';
    http.get(options, function(res) { 
        var status = '';
        res.on('data', function (chunk) {
            status += chunk;
        });

        res.on('end', function() {
            console.log(status);
            process.exit(0);
        });
    });
} else {

// Read test from STDIN?
if (args.test === true) {
    var stests = '';

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', function(chunk) {
        stests += chunk;
    });

    process.stdin.on('end', function() {
        eventHub.emit('tests', stests.trim().split('\n'));
    });
} else {
    // Make sure we have an array of test(s)
    if (args.test && typeof args.test != 'object') {
        args.test = [ args.test ];
    }

    eventHub.emit('tests', args.test);
}

if (args.clear_results) {
    console.log('Clearing all previous results...');
    options.path = '/jute/_clear_results';
    http.get(options, function(res) { });
}

}
