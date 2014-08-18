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
    Create:  function(hub, common) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path  = require('path'),
            fs    = require('fs'),
            cache = hub.cache
        ;

        // Events I care about
        hub.addListener('action:selenium2Start', startSelenium);

        function startSelenium(selID, req, res) {
            var webdriverio = require("webdriverio"), cb,
                body = req.body, browser
                , url =  'http://' + (hub.config.host ? hub.config.host + ':' + hub.config.port : req.headers.host)
            ;

            try {
                browser = webdriverio.remote({
                    host: body.sel_host,
                    port: body.sel_port || 4444,
                    desiredCapabilities: { browserName: body.sel_browser || 'firefox' }
                });

            } catch(e) {
                hub.emit('action:seleniumDone', 'Cannot connect to Selenium server at ' + body.sel_host + ': ' + e, selID);
                return;
            }

            // Give Selenium 1000 minutes to finish - should be good - 16 hours baby!
            req.socket.setTimeout(60000000, function() {
                hub.emit(hub.LOG, hub.ERROR, 'Selenium taking too long - giving up');
                cb();
            });

            cache.connections[selID] = res; // our link back to the requesting client for status messages

            // called when all Selenium tests are complete for this browser
            //   && keep track of requesting client for debug messages back...
            // Callback for when the Selenium session is done
            cb = function(err) {
                hub.removeAllListeners(selID + 'snapshot');
                if (!err) {
                    browser.end(function() {
                        delete cache.connections[selID]; // done with status updates
                        hub.emit('action:seleniumDone', err, selID);
                    });
                } else {
                    hub.emit('action:seleniumDone', err, selID);
                }
            };
            cb = hub.once(selID + 'finished', cb);

            hub.on(selID + 'snapshot', function(test, component) {
                browser.screenshot(function(screenshot) {
                    var path = require('path')
                        , filename = path.join(hub.config.outputDir, (common.makeSaneNames(component))[0], 'snapshot.png');

                    try {
                        var bb  = new Buffer(screenshot.value, 'base64'),
                            msg = "Dumped snapshot for " + test.url + ' to ' + filename + "\n";
                        fs.writeFileSync(filename, bb, 0, bb.length);
                        common.addTestOutput(test, msg);
                        hub.emit(hub.LOG, hub.INFO, msg);
                    } catch(e) {
                        msg = "Error dumping snapshot file " + filename + ": " + e + "\n";
                        common.addTestOutput(test, msg);
                        hub.emit(hub.LOG, hub.ERROR,  msg);
                    }

                    hub.emit('action:doneDone', null, test);
                });
            });

            browser
                .init(function() {
                    // If this is one of the tests that are going to run in the
                    //  Selenium session, tag it with the Selenium token
                    cache.tests_to_run.forEach(function(test) {
                        if (test.browser === selID) {
                            test.seleniumID = browser.sessionId;
                            test.sel2 = true;
                        }
                    });
                })
                .url(url + '/?selenium=' + selID);
        }
    }

};

