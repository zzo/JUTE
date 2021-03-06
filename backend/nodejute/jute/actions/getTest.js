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
        var path = require('path'),
            cache = hub.cache
        ;

        // Events I care about
        hub.addListener('action:get_test', getTest);

        function getTest(req, res) {
            var browser  = req.session.uuid,
                bName    = common.browserName(req),
                now      = new Date().getTime(),
                testURL;

            if (!cache.browsers[browser]) {
                cache.browsers[browser] = {};
            }

            cache.browsers[browser].get_test = now;

            hub.emit(hub.LOG, hub.INFO, 'Getting test for ' + bName);

            for (var i = 0; i < cache.tests_to_run.length; i++) {
                var test = cache.tests_to_run[i];
                if (test.browser == browser && test.running) {
                    // um you're already running this test!
                    //  must be something wrong with it - pop it
                    var error = 'Skipping bad test: ' + test.url + ': we thought it was running!';
                    hub.emit(hub.LOG, hub.ERROR, error);
                    common.badUnitTest(req, test);
                    cache.tests_to_run.splice(i, 1);
                    i--;
                    continue;
                }

                // This test is not for us
                if (test.browser && (test.browser != browser)) continue;

                if (!test.browser) {
                    // A test pre-loaded w/o any browsers listening
                    //  this browser looks like a winner!
                    test.browser = browser;
                }

                // Otherwise start running this test in capture mode!!
                common.addTestOutput(test, "To browser " + bName);
                test.running = now;
                cache.currentTest[browser] = test;
                testURL = test.url;
                break;
            }

            if (testURL) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ testLocation: testURL }));
                hub.emit(hub.LOG, hub.INFO, "Sent test url: " + testURL + ' to ' + bName);
            } else {
                delete cache.currentTest[browser];
                // find all local tests
                var glob             = require('glob'),
                    prefix           = hub.config.testDir,
                    local_test_files = hub.config.testRegex,
                    data             = [];
                ;

                // No tests for me - end if we're a Selenium browser
                if (req.session.selenium) {
                    // Selenium job all done!!
                    hub.emit(req.session.uuid + 'finished');
                } else {
                    hub.emit('testsDone');
                }

                // ONLY USE HTML FOR NOW UNTIL THE PAGE IS SMARTER...
                glob('**/*.html', { cwd: prefix }, function(err, matches_html) {
                    matches_html.forEach(function(testFile) {
                        data.push({ test_url: testFile });
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ availableTests: data, config: hub.config }));
                });
            }
        }
    }
};

