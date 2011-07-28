#!/usr/bin/env node

var sys       = require('sys'),
    events    = require("events"),
    configure = require('./jute/configure');
    server    = require('./jute/server');
    actions   = require('./jute/actions');
    eventHubF = function() { events.EventEmitter.call(this); this.LOG = 'log'; }
    ;

/**
 * Create our event hub
 */
sys.inherits(eventHubF, events.EventEmitter);
var eventHub = new eventHubF();

// Start up modules
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
eventHub.emit('configure', process.argv[2]);

