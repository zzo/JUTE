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
            sys = require('sys')
        ;

        // Events I care about
        hub.addListener('action:seleniumStart', startSelenium);


        function startSelenium(req, res, obj, testsLength) {
            var soda = require('soda'), cb,
                browser = soda.createClient({
                    url: 'http://' + req.headers.host,
                    host: obj.sel_host,
                    browser: obj.sel_browser
                }),
                TIME_TEST_THRESHOLD = 60,   // Wait up to 60 seconds/test
                maxWaitTime = TIME_TEST_THRESHOLD * (testsLength + 1)
            ;

            // called when all Selenium tests are complete for this browser
            cb = function() {
                    browser.chain.testComplete().end(function(err) {
                        hub.emit('action:seleniumDone', err);
                    });
                };
            cb = hub.once('seleniumTestsFinished', cb);

            browser.
                chain.
                session().
                setTimeout(maxWaitTime).
                open('/?selenium=' + obj.uuid).
                waitForPageToLoad(60000).
                end(function(err) {
                    if (err) {
                        var msg = 'Error starting/waiting for Selenium page to load: ' + err;
                        hub.emit(hub.LOG, hub.ERROR, msg);
                        res.end(msg);
                        hub.removeListener('seleniumTestsFinished', cb);
                    }
                });
        }
    }

};

