#!/usr/bin/env node

var sys       = require('sys'),
    fs        = require("fs"),
    events    = require("events"),
    daemon    = require('daemon');
    configure = require('./jute/configure');
    server    = require('./jute/server');
    actions   = require('./jute/actions');
    eventHubF = function() { events.EventEmitter.call(this); this.LOG = 'log'; this.ERROR = 'error'; }
    ;


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
    fs.open(eventHub.config.logFile, 'w+', function (err, fd) {
        daemon.start(fd);
        daemon.lock('/tmp/jute.pid');
        eventHub.emit('startServer');
    });
});
eventHub.emit('configure');

