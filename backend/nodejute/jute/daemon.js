#!/usr/bin/env node

var opt     = require( "optimist"),
    fs      = require('fs'),
    sys     = require('sys'),
    args    = opt
        .usage('Usage: $0 [ --start ] [ --stop ]')
        .alias('s', 'start')
        .alias('p', 'stop')
        .describe('start', 'Start JUTE')
        .describe('stop', 'Stop JUTE')
        .argv,
    logfile = process.env['npm_package_config_logfile'],
    pidfile = process.env['npm_package_config_pidfile']
    ;

function start() {
    var spawn = require('child_process').spawn, fd, jute;

    try {
        var pid = fs.readFileSync(pidfile);
        if (pid) {
            // is pid actually running?
            try {
                process.kill(pid, 0);
                console.error('JUTE currently running: ' + pid + ".  Maybe you want to 'stop' it first?");
                process.exit(0);
            } catch(e) {
                // process does not exist!
                fs.unlinkSync(pidfile);
            }
        }
    } catch(e) {
        // good to go
    }

    try {
        fd = fs.openSync(logfile, 'w');
    } catch(e) {
        console.error('Error opening logfile: ' + e);
        return;
    }


    jute = spawn('./jute_backend.js', [], { setsid: true, customFds: [-1, fd, fd], cwd: process.cwd() });
    fs.writeFileSync(pidfile, "" + jute.pid);
}

function stop() {
    try {
        var pid = fs.readFileSync(pidfile);
        process.kill(pid, 'SIGTERM');
    } catch(e) {
        // not running?
    }

    try {
        fs.unlinkSync(pidfile);
    } catch(e) {}
}

if (args.start) {
    start();
} else if (args.stop) {
    stop();
} else {
    console.error("You must specify 'start' or 'stop'!");
}

process.exit(0);
