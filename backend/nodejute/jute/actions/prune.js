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
        var TEST_TIME_THRESHOLD = 60000,    // 60 seconds to wait before declaring test dead
            BROWSER_TIME_THRESHOLD = 20000, // Delete a captured browser after it has been gone for this long - 20 seconds
            ERROR = '<?xml version="1.0" encoding="UTF-8"?><testsuites><testsuite name="BROWSER" tests="0" failures="1" time="0">Test Timed Out: Most likely a Javascript parsing error - try loading URL in your browser</testsuite></testsuites>',
            path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:prune', prune);

        function prune(doing_what, req, cache) {
            var redirect;
            if (doing_what != 'status') {
                prune_browsers(req, cache);
                redirect = prune_tests(doing_what, req, cache);
                hub.emit('pruneDone', redirect);
            }
        }

        function prune_tests(doing_what, req, cache) {
            var now = new Date().getTime(),
                browser = req.session.uuid, test,
                timeStarted;

            for (var i = 0; i< cache.tests_to_run.length; i++) {
                test = cache.tests_to_run[i];
                timeStarted = test.running;
                if (timeStarted) {
                    if (now - timeStarted > TEST_TIME_THRESHOLD) {
                        // This test has been running for too long!!
                        hub.emit(hub.LOG, hub.ERROR, "Test running for too long - killing it");
                        cache.tests_to_run.splice(i, 1);
                        if (test.sendOutput) {
                            hub.emit('sendOutput', test.sendOutput, test.url + ' timed out - javascript error?');
                        }

                        // Dump a FAILED XML file
                        // Use test file name as the NAME of this test (vs. component name from test itself)
                        var parts = test.url.split('/');
                        var name  = parts.pop();
                        name = name.replace(/\..*$/, '');   // get rid of suffix
                        var names = common.makeSaneNames(common.browserName(req));
                        var err = ERROR;
                        err = err.replace('BROWSER', names[1]);
                        err = err.replace('URL', test.url);
                        var params  = { results: err, name: name };

                        hub.emit(hub.log, hub.ERROR,  "Dumped error unit test file " + name + " / " + names[0] + " (from " + test.url + ")");
                        common.dumpFile(params, 'results', names[0] + '-test.xml', name);

                        if (cache.browsers[browser]) {
                            cache.browsers[browser].heart_beat = now;
                            cache.browsers[browser].get_test   = now;
                            return 1;   //Redirect!
                        }
                    }
                } else {
                    // make sure browser is still requesting tests
                   if (cache.browsers[browser]) {
                        var last_got_test = cache.browsers[browser].get_test;
                        if (doing_what != '_get_test' && (now - last_got_test > TEST_TIME_THRESHOLD)) {
                            hub.emit(hub.LOG, hub.ERROR, "Been too long since you've requested a test: " + browser + " - Kicking iframe...");
                            return 1;  // Redirect!!
                        }
                   }
                }
            }
        }

        function prune_browsers(req, cache) {
            var now = new Date().getTime(), me = req.session.uuid;

            if (typeof cache.browsers == 'object') {
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
                                    cache.tests_to_run.splice(i, 1);
                                    i--; // fake a perl 'redo'!!  Otherwise we might skip over something!
                                }
                            }
                    }
                }
            }
        }
    }
};

