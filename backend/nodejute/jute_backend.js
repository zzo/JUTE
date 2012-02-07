#!/usr/bin/env node
/*
Copyright (c) 2011, Yahoo! Inc.
All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the following 
conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Yahoo! Inc. nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of Yahoo! Inc.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS 
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED 
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A 
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// npm npm start jute -g 2&>1 > LOGFILE &
var util      = require('util'),
    fs        = require("fs"),
    events    = require("events"),
    configure = require('./jute/configure'),
    server    = require('./jute/server'),
    actions   = require('./jute/actions'),
    common    = require('./jute/actions/common'),
    eventHubF = function() { events.EventEmitter.call(this); this.LOG = 'log'; this.ERROR = 'error'; this.INFO = 'info'; }
    ;

/**
 * Create our event hub
 */
util.inherits(eventHubF, events.EventEmitter);
var eventHub = new eventHubF();

// Prime cache
eventHub.cache = { browsers: {}, tests_to_run: [], connections: {}, currentTest: {} };

// Some app-wide helpers
eventHub.addListener(eventHub.LOG, function(sev, str) {
    var output;
    if (sev === eventHub.ERROR) {
        output = 'ERROR: ' + str + "\n";
    } else {
        output = str + "\n";
    }

    if (eventHub.config.logFD) {
        fs.writeSync(eventHub.config.logFD, output);
    } else {
        console.error(str);
    }
});

configure.Create(eventHub);
actions.Create(eventHub, common.Create(eventHub));
server.Create(eventHub);


// Get Party Started
eventHub.on('configureError', function(obj) {
    eventHub.emit(eventHub.LOG, eventHub.ERROR, "Configuration error for " + obj.name + ': ' + obj.error);
    eventHub.emit(eventHub.LOG, eventHub.ERROR, "Fix and restart jute!");
    process.exit(0);
});

eventHub.on('configureDone', function() {
    // Note config gets stashed in eventHub (eventHub.config)
    eventHub.on('actionsLoaded', function() {

        console.log('Looking for unit tests in: ' + eventHub.config.testDir);
        console.log('Ouptut going to: ' + eventHub.config.outputDir);

        // Dump the config file for jute_v8 and submit_tests
        console.log('DMPING: ' + JSON.stringify(eventHub.config));
        fs.writeFileSync('/tmp/jute.config', JSON.stringify(eventHub.config));

        // Fire up server
        eventHub.emit('startServer');
    });
    eventHub.emit('loadActions');
});
eventHub.emit('configure');

process.on('exit', function() { fs.unlinkSync(process.env['npm_package_config_pidfile']); });
