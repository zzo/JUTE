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
        var TEST_TIME_THRESHOLD = 60000,    // 60 seconds to wait before declaring test dead
            BROWSER_TIME_THRESHOLD = 20000, // Delete a captured browser after it has been gone for this long - 20 seconds
            path = require('path'),
            cache = hub.cache
        ;

        // Events I care about
        hub.addListener('action:prune', prune);

        function prune(doing_what, req) {
            var redirect;

            if (doing_what != 'status') {
                prune_browsers(req);
                redirect = prune_tests(doing_what, req);
                hub.emit('pruneDone', redirect);
            }
        }

        function prune_tests(doing_what, req) {
            var now = new Date().getTime(),
                browser = req.session.uuid, test,
                timeStarted
            ;

            for (var i = 0; i< cache.tests_to_run.length; i++) {
                test = cache.tests_to_run[i];
                timeStarted = test.running;
                if (timeStarted) {
                    if (now - timeStarted > TEST_TIME_THRESHOLD) {
                        // This test has been running for too long!!
                        var msg = "Test running for too long - killing it";

                        hub.emit(hub.LOG, hub.ERROR, msg);
                        common.addTestOutput(test, msg);

                        cache.tests_to_run.splice(i, 1);

                        common.badUnitTest(req, test);

                    }
                }
            }
        }

        function prune_browsers(req) {
            var now = new Date().getTime(), me = req.session.uuid,
                sys = require('sys');

            for (browser in cache.browsers) {
                if (browser == me) continue;

                var b_time = cache.browsers[browser].heart_beat;
                if (now - b_time > BROWSER_TIME_THRESHOLD) {
                    hub.emit(hub.LOG, hub.ERROR,  "We lost browser " + cache.browsers[browser].name);
                    delete cache.browsers[browser];
                    // take it out of ay tests it's supposed to be running
                    for (var i = 0; i < cache.tests_to_run.length; i++) {
                            var test = cache.tests_to_run[i];
                            if (test.browser == browser) {
                                // blow this test out!
                                hub.emit(hub.LOG, hub.ERROR,  "Deleting this test that was part of lost browser: " + sys.inspect(test));
                                cache.tests_to_run.splice(i, 1);
                                i--; // fake a perl 'redo'!!  Otherwise we might skip over something!
                                common.badUnitTest(req, test);
                            }
                        }
                }
            }
        }
    }
};

