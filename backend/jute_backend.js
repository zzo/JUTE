#!/usr/bin/env node

var sys       = require('sys'),
    events    = require("events"),
    configure = require('./jute/configure');
    server    = require('./jute/server');
    eventHubF = function() { events.EventEmitter.call(this) }
    ;

/**
 * Create our event hub
 */
sys.inherits(eventHubF, events.EventEmitter);
var eventHub = new eventHubF();

// Start up modules
configure.Create(eventHub);
server.Create(eventHub);

// Get Party Started
eventHub.emit('configure', process.argv[2]);

// Some app-wide helpers
eventHub.addListener('log', function(sev, str) {
    if (sev === 'error') {
        console.error(str);
    } else {
        console.log(str);
    }
    
});

