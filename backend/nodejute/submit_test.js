#!/usr/bin/env node

var args = require( "argsparser" ).parse(),
    sys  = require('sys'),
    qs   = require('querystring'),
    http = require('http'),
    juteArgs = {};


for (var key in args) {
    var old = args[key];
    key = key.replace(/^-*/, '');
    if (args[key]) {
        if (typeof args[key] != 'object') {
            args[key] = [ args[key], old ];
        } else {
            args[key].push(old);
        }
    } else {
        args[key] = old;
    }
}

if (!args.test) {
    console.error("You must specify some tests (use '-test')!!");
    process.exit(1);
}

// Defaults
args.host = args.host || 'localhost';
args.port = args.port || 80;

// Make sure we have an array of test(s)
if (typeof args.test != 'object') {
    args.test = [ args.test ];
}

// POST space separated list of tests
juteArgs.tests = args.test.join(' ');

// Toss in Selenium stuff
if (args.sel_host) {
    juteArgs.sel_host = args.sel_host;
    juteArgs.sel_browser = args.sel_browser || '*firefox';
}

// Whether to stream output back
if (args.send_output) {
    juteArgs.send_output = 1;
}

// See what we got
console.log('Submitting ' + sys.inspect(juteArgs) + ' to ' + args.host);

var options = {
    host: args.host,
    port: args.port,
    path: '/jute/_run_test',
    method: 'POST'
};

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
    console.error("Is JUTE running there?  Did you specify '-host' and '-port' correctly?");
    process.exit(1);
});

req.end(qs.stringify(juteArgs));

