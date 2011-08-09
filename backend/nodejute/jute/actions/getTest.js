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
        var path = require('path');

        // Events I care about
        hub.addListener('action:get_test', getTest);

        function getTest(req, res, cache) {
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
                if ((test.browser == browser) && test.running) {
                    // um you're already running this test!
                    //  must be something wrong with it - pop it
                    var error = 'Skipping bad test: ' + test.url + ': we thought it was running!';
                    hub.emit(hub.LOG, hub.ERROR, error);
                    if (test.sendOutput) {
                        res.write(error);
                    }
                    cache.tests_to_run.splice(i, 1);
                    i--;
                    continue;
                }

                // If this test doesn't have a specific browser for it
                //  then it is a Selenium test - which means give it to anyone
                if (test.browser == req.session.seleniumUUID) {
                    // The Selenium host
                    test.browser = browser;
                }

                // This test already running in another browser
                if (test.browser != browser) continue;

                // Otherwise start running this test in capture mode!!
                test.running = now;
                testURL = test.url;
                break;
            }

            if (testURL) {
                res.end(JSON.stringify({ testLocation: testURL }));
                hub.emit(hub.LOG, hub.INFO, "Sending test url: " + testURL);
            } else {
                // find all local tests
                var prefix           = hub.config.testDir,
                    webPrefix        = hub.config.testDirWeb,
                    local_test_files = hub.config.testRegex,
                    full_find        = path.join(prefix, '**', local_test_files),
                    matches          = glob.globSync(full_find),
                    data             = [];
                ;

                // No tests for me - end if we're a Selenium browser
                if (req.session.seleniumUUID) {
                    // Selenium job all done!!
                    hub.emit('seleniumTestsFinished');
                }

                matches.forEach(function(testFile) {
                    testFile = testFile.replace(prefix, '');
                    data.push({ test_url: testFile });
                });

                res.end(JSON.stringify({ availableTests: data, config: hub.config }));
            }
        }
    }
};

