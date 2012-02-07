#!env node

var opt     = require( "optimist"),
    fs      = require('fs'),
    args    = opt
        .usage('Usage: $0 [ --start ] [ --stop ]')
        .alias('s', 'start')
        .alias('p', 'stop')
        .describe('start', 'Start JUTE')
        .describe('stop', 'Stop JUTE')
        .argv,
    pidfile = process.env['npm_package_config_pidfile'] || '/tmp/jute.pid'
    ;

function start() {
    var spawn = require('child_process').spawn, jute;

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
                try {
                    fs.unlinkSync(pidfile);
                } catch(err) {}
            }
        }
    } catch(e) {
        // good to go
    }

    try {
        jute = spawn('./jute_backend.js', [], { setsid: false, cwd: process.cwd() });
    } catch(e) {
        console.error("Error spawing JUTE: " + e);
        process.exit(1);
    }

    jute.on('exit', function() {  try { fs.unlinkSync(pidfile); } catch(e) {} });

    try {
        fs.writeFileSync(pidfile, "" + jute.pid);
    } catch(e) {
        console.error("Error writing pidFile: " + pidfile);
    }
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

//process.exit(0);
