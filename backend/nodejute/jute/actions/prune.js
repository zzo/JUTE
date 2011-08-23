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
        hub.addListener('startAction', prune);

        function prune(doing_what, req, res) {
            var redirect;

            if (doing_what != 'status') {
                prune_browsers(req);
                redirect = prune_tests(doing_what, req);
                if (redirect) {
                    // we're done
                    res.end(JSON.stringify({ redirect_run_tests: '/jute_docs/run_tests.html' }));
                } else {
                    // keep going
                    hub.emit('action:' + doing_what, req, res);
                }
            } else {
                hub.emit('action:status', req, res);
            }
        }

        function prune_tests(doing_what, req) {
            var now = new Date().getTime(),
                browser = req.session.uuid, test,
                timeStarted
            ;

            // Only check my tests
            for (var i = 0; i < cache.tests_to_run.length; i++) {
                test = cache.tests_to_run[i];
                if (test.browser != browser) continue;
                timeStarted = test.running;
                if (timeStarted) {
                    if (now - timeStarted > TEST_TIME_THRESHOLD) {
                        // This test has been running for too long!!
                        var msg = "Test running for too long - killing it";

                        hub.emit(hub.LOG, hub.ERROR, msg);
                        common.addTestOutput(test, msg);
                        cache.tests_to_run.splice(i, 1);
                        common.badUnitTest(req, test);

                        // redirect me outta here
                        return 1;

                    }
                }
            }
            // So we have to either *2 (arbitrary) on the timeout here OR reset the get_test timestamp above otherwise we get in an inf loop!
            if (cache.browsers[browser] && cache.browsers[browser].get_test && (now - cache.browsers[browser].get_test > (TEST_TIME_THRESHOLD * 2))) {
                // A link test taking too long - these are NOT in cache.tests_to_run
                hub.emit(hub.LOG, hub.ERROR, "Test running for too long - killing it");

                // redirect me outta here
                return 1;
            }
        }

        function prune_browsers(req) {
            var me = req.session.uuid,
                sys = require('sys');

            // only check other browsers
            for (browser in cache.browsers) {
                var now = new Date().getTime(),
                    b_time = cache.browsers[browser].heart_beat;

                if (browser == me) continue;

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

