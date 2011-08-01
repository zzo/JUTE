#!/usr/bin/env node

var opt  = require( "optimist" ),
    args = opt
        .usage('Usage: $0 --test [testfile] [ --test [another testfile] ] [ --host [JUTE host] ] [ --port [JUTE host port] ] [ --sel_host [Selenium host] ] [ --sel_browser [Selenium browser spec] ] [ --send_output ] [ --wait ] [ --clear_results ] [ -v8 ]')
        .demand(['test'])
        .default('host', 'localhost')
        .default('port', 80)
        .default('send_output', false)
        .default('wait', false)
        .default('v8', false)
        .default('clear_results', false)
        .default('sel_browser', '*firefox')
        .describe('test', 'Test file to run - relative to your docoument root (npm set jute.docRoot) - can specify multiple of these')
        .describe('host', 'Hostname of JUTE server')
        .describe('port', 'Port of JUTE server')
        .describe('sel_host', 'Hostname of Selenium RC or Grid Server (if not specified test(s) will run in all CURRENTLY captured browsers)')
        .describe('sel_browser', 'Selenium browser specification')
        .describe('send_output', 'For Selenium tests ONLY - send status messages back while running')
        .describe('wait', 'Wait for captured tests to finish')
        .describe('clear_results', 'Clear ALL previous test results before running specified test(s)')
        .describe('v8', 'Run these test(s) using the V8 backend')
        .argv,
    sys  = require('sys'),
    qs   = require('querystring'),
    http = require('http'),
    juteArgs = {};

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

// Make sure we have an array of test(s)
if (typeof args.test != 'object') {
    args.test = [ args.test ];
}

if (args.v8) {
    var exec = require('child_process').exec,
        path = require('path');

    for (var i = 0; i < args.test.length; i++) {
        var test = args.test[i];
        exec(path.join(__dirname, 'jute_v8.js') + ' ' + test, function(error, stdout, stderr) {
            if (error) {
                console.error("Error running jute_v8: " + error);
            } else {
                console.log(stdout);
                console.error(stderr);
            }

            if (i == args.length) {
                process.exit(0);
            }
        });
    }

} else {
    // POST space separated list of tests
    juteArgs.tests = args.test.join(' ');
    
    // Toss in Selenium stuff
    if (args.sel_host) {
        juteArgs.sel_host = args.sel_host;
        juteArgs.sel_browser = args.sel_browser;
    }
    
    // Whether to stream output back
    if (args.send_output) {
        juteArgs.send_output = 1;
    }
    
    var options = {
        host: args.host,
        port: args.port,
    };
    
    if (args.clear_results) {
        console.log('Clearing all previous results...');
        options.path = '/jute/_clear_results';
        http.get(options, function(res) { });
    }
    
    options.path = '/jute/_run_test';
    options.method = 'POST';
    // See what we got
    console.log('Submitting ' + sys.inspect(juteArgs) + ' to ' + args.host);
    
    // POST AWAY!
    var req = http.request(options, function(res) {
        console.log('Status Response from JUTE: ' + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log(chunk);
        });
        res.on('end', function() {
        });
    });
    
    // Not Good
    req.on('error', function(e) {
        console.error('Problem contacting JUTE server at: ' + args.host + ':' + args.port);
        console.error("Is JUTE running there?  Did you specify '--host' and '--port' correctly?");
        process.exit(1);
    });
    
    req.end(qs.stringify(juteArgs));
    
    if (!args.sel_host && args.wait) {
        options.path = '/jute/_status';
        setInterval(wait, 5000, options);
    }
    }

function wait(options) {
    http.get(options, function(res) {
        var status = '';
        res.on('data', function (chunk) {
            status += chunk;
        });

        res.on('end', function () {
            var statusObj = JSON.parse(status);
                browsers = statusObj.current_status.browsers,
                tests = statusObj.current_status.tests_to_run;

            if (tests.length) {
                console.log('Waiting for ' + tests[0].url + '...');
            } else {
                console.log('All tests finished - results: ');
                for (var component in statusObj.current_results) {
                    var result = statusObj.current_results[component].test_results[0].failed;
                    console.log(component + ': ' + (result ? 'FAILED' : 'SUCCEEDED'));
                }
                //console.log(sys.inspect(statusObj.current_results, false, null));
                process.exit(0);
            }

            if (!Object.keys(browsers).length) {
                console.log('There are no currently captured browsers!');
            }
        });

    }).on('error', function(e) {
        console.error("Got error waiting: " + e.message);
        process.exit(1);
    });
}

