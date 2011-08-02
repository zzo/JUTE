#!/usr/bin/env node

var sys       = require('sys'),
    fs        = require("fs"),
    events    = require("events"),
    daemon    = require('daemon'),
    configure = require('./jute/configure'),
    server    = require('./jute/server'),
    actions   = require('./jute/actions'),
    eventHubF = function() { events.EventEmitter.call(this); this.LOG = 'log'; this.ERROR = 'error'; this.INFO = 'info' },
    pidFile   = '/tmp/jute.pid'
    ;

// Stop
switch(process.argv[2]) {
  case "stop":

    try {
        process.kill(parseInt(fs.readFileSync(pidFile)));
        fs.unlinkSync(pidFile)
    } catch(e) { 
        console.error('Error stopping JUTE - is it already stopped?');
    }

    process.exit(0);
}

/**
 * Create our event hub
 */
sys.inherits(eventHubF, events.EventEmitter);
var eventHub = new eventHubF();

// Start up base modules
configure.Create(eventHub);
server.Create(eventHub);
actions.Create(eventHub);

// Some app-wide helpers
eventHub.addListener(eventHub.LOG, function(sev, str) {
    if (sev === eventHub.ERROR) {
        console.error(str);
    } else {
        console.log(str);
    }

});

try {
    fs.statSync(pidFile);
    console.error('JUTE is either already running or died unexpectedly.');
    console.error('If still running try % npm stop jute');
    console.error('If JUTE is NOT running delete ' + pidFile);
    process.exit(0);
} catch(e) {
    // this is good!!
}

// Get Party Started
eventHub.on('configureDone', function() {
    // Note config gets stashed in eventHub (eventHub.config)
    fs.open(eventHub.config.logFile, 'w+', function (err, fd) {
        daemon.start(fd);
        daemon.lock(pidFile);

        // Dump the config file for jute_v8 and submit_tests
        fs.writeFile('/tmp/jute.config', JSON.stringify(eventHub.config));

        // Fire up server
        eventHub.emit('startServer');
    });
});
eventHub.emit('configure');

