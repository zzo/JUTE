#!/usr/bin/env node

var sys       = require('sys'),
    fs        = require("fs"),
    events    = require("events"),
    configure = require('./jute/configure');
    server    = require('./jute/server');
    actions   = require('./jute/actions');
    eventHubF = function() { events.EventEmitter.call(this); this.LOG = 'log'; }
    ;


// Dump PID
fs.writeFileSync('/tmp/jute.pid', '' + process.pid, 'utf8');

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
    if (sev === 'error') {
        console.error(str);
    } else {
        console.log(str);
    }

});

// Get Party Started
eventHub.on('configureDone', function() {
    // Note config gets stashed in eventHub (eventHub.config)
    eventHub.emit('startServer');
});
eventHub.emit('configure', process.argv[2]);

