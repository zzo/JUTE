#!env node

var opt     = require( "optimist"),
    fs      = require('fs'),
    args    = opt
        .usage('Usage: $0 [ --start ] [ --stop ] [ --restart ] [ --kill ]')
        .alias('s', 'start')
        .alias('p', 'stop')
        .alias('r', 'restart')
        .alias('k', 'kill')
        .describe('start', 'Start JUTE')
        .describe('stop', 'Stop JUTE')
        .argv,
    pidfile = process.env['npm_package_config_pidfile'] || '/tmp/jute.pid'
    user    = process.env['npm_package_config_asuser'] || ''
    ;

var daemon = require("daemonize2").setup({
    main:      "../jute_backend.js"
    , name:    "jute"
    , pidfile: pidfile
    , user: user
});

if (args.start) {
    daemon.start().once("started", function() {
        process.exit();
    });
} else if (args.stop) {
    daemon.stop();
} else if (args.restart) {
    if (daemon.status()) {
        daemon.stop().once("stopped", function() {
            daemon.start().once("started", function() {
                process.exit();
            });
        });
    } else {
        daemon.start().once("started", function() {
            process.exit();
        });
    }
} else if (args.kill) {
    daemon.kill();
} else {
    console.error("You must specify 'start' or 'stop'!");
}

