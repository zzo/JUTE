module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

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

            hub.emit(hub.LOG, 'info', 'Getting test for ' + bName);

            for (var i = 0; i < cache.tests_to_run.length; i++) {
                var test = cache.tests_to_run[i];
                if ((test.browser == browser) && test.running) {
                    // um you're already running this test!
                    //  must be something wrong with it - pop it
                    var error = 'Skipping bad test: ' + test.url + ': we thought it was running!';
                    hub.emit(hub.LOG, 'error', error);
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
                hub.emit(hub.LOG, 'info', "Sending test url: " + testURL);
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
                    testFile = testFile.replace(prefix, webPrefix);
                    data.push({ test_url: testFile });
                });

                res.end(JSON.stringify({ availableTests: data }));
            }
        }
    }
};

