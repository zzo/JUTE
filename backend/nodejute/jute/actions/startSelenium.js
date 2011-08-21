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
        var path = require('path'),
            sys = require('sys'),
            cache = hub.cache
        ;

        // Events I care about
        hub.addListener('action:seleniumStart', startSelenium);

        function startSelenium() {
            var soda = require('soda'), cb,
                req = cache.req,
                res = cache.res,
                body = req.body,
                browser = soda.createClient({
                    url: 'http://' + (hub.config.host ? hub.config.host + ':' + hub.config.port : req.headers.host),
                    host: body.sel_host,
                    browser: body.sel_browser
                })
            ;

            // Give Selenium 1000 minutes to finish - should be good - 16 hours baby!
            req.socket.setTimeout(60000000, function() {
                hub.emit(hub.LOG, hub.ERROR, 'Selenium taking too long - giving up');
                cb();
            });

            // called when all Selenium tests are complete for this browser
            //   && keep track of requesting client for debug messages back...
            cache.connections[body.uuid] = res; // our link back to the requesting client for status messages

            // Callback for when the Selenium session is done
            cb = function(err) {
                if (!err) {
                    browser.chain.testComplete().end(function(err) {
                            delete cache.connections[body.uuid]; // done with status updates
                            hub.emit('action:seleniumDone', err);
                        });
                } else {
                    hub.emit('action:seleniumDone', err);
                }
            };
            cb = hub.once('seleniumTestsFinished', cb);

            browser.
                chain.
                session().
                open('/?selenium=' + body.uuid,  function(err, body, req) { body.seleniumID = browser.sid }).
                waitForPageToLoad(10000).
                end(function(err) {
                    if (err) {
                        var msg = 'Error starting/waiting for Selenium page to load: ' + err;
                        hub.emit('seleniumTestsFinished', err);
                    } else {
                        hub.emit(hub.LOG, hub.INFO, "Selenium up and running!");
                        // If this is one of the tests that are going to run in thie
                        //  Selenium session, tag it with the Selenium token
                        cache.tests_to_run.forEach(function(test) {
                            if (test.browser === body.uuid) {
                                test.seleniumID = body.seleniumID;
                            }
                        });

                    }
                });
        }
    }

};

