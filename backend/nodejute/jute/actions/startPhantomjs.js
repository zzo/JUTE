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


module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path  = require('path'),
            sys   = require('sys'),
            fs    = require('fs'),
            child = require('child_process'),
            cache = hub.cache
        ;

        // Events I care about
        hub.addListener('action:phantomjsStart', startPhantomjs);

        function Phantomjs(selID, phantomjs, screen, req, res) {
            var cb, phantom, body = req.body,
                url = 'http://' + (hub.config.host ? hub.config.host + ':' + hub.config.port : req.headers.host) + '/?selenium=' + selID
            ;

            try {
                phantom = child.spawn(phantomjs, [url]);
                phantom.stdout.on('data', function(data) {
                    hub.emit(hub.LOG, hub.INFO, "PhantomJS up and running: " + data);
                });
                phantom.stderr.on('data', function(data) {
                });
                phantom.on('exit', function() {
                    hub.emit(hub.LOG, hub.INFO, "PhantomJS up done");
                });

            } catch(e) {
                hub.emit('action:phantomjsDone', 'Cannot start up phantomjs at ' + phantomjs + ': ' + e, selID);
                return;
            }

            // Give Selenium 1000 minutes to finish - should be good - 16 hours baby!
            req.socket.setTimeout(60000000, function() {
                hub.emit(hub.LOG, hub.ERROR, 'Phantomjs taking too long - giving up');
                cb();
            });

            cache.connections[selID] = res; // our link back to the requesting client for status messages

            // called when all PhantomJS tests are complete for this instance
            //   && keep track of requesting client for debug messages back...
            // Callback for when the phantomjs process is done
            cb = function(err) {
                delete cache.connections[selID]; // done with status updates
                hub.emit('action:phantomjsDone', err, selID);
            };
            hub.once(selID + 'finished', cb);
        }
    }

};

