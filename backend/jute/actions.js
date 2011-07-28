module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var cache = { browsers: {}, tests_to_run: [] },
            TEST_TIME_THRESHOLD = 60000,    // 60 seconds to wait before declaring test dead
            BROWSER_TIME_THRESHOLD = 20000, // Delete a captured browser after it has been gone for this long - 20 seconds
            ERROR = '<?xml version="1.0" encoding="UTF-8"?><testsuites><testsuite name="BROWSER" tests="0" failures="1" time="0">Test Timed Out: Most likely a Javascript parsing error - try loading URL in your browser</testsuite></testsuites>'
        ;

        // Events I care about
        hub.addListener('action:heart_beat', heartBeat);
        hub.addListener('action:get_test', getTest);

        function getTest(req, res) {
            var browser  = req.session.uuid,
                bName    = browserName(req),
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
                    if (test.send_output) {
                        _send_remote_output(test.send_output, error);
                    }
                    cache.tests_to_run.splice(i, 1);
                    i--;
                    continue;
                }

                // So either the browser matches OR it's a Selenium test
                //   so we match on remote IP
                if (!test.browser) {
                    // A Selenium host
                    test.browser = browser;
                    cache.browsers[browser].is_selenium = 1;
                }

                // This test already running in another browser
                if (test.browser != browser) {
                    continue;
                }

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
                    matches          = require("glob").globSync(full_find),
                    data             = [];
                ;

                matches.forEach(function(testFile) {
                    testFile = testFile.replace(prefix, webPrefix);
                    data.push({ test_url: testFile });
                });

                res.end(JSON.stringify({ availableTests: data }));
            }
        }

        function heartBeat(req, res) {
            var baseDir = hub.config.outputDir,
                fs      = require('fs'),
                path    = require('path');

            // Update heartbeat time
            if (!cache.browsers[req.session.uuid]) {
                cache.browsers[req.session.uuid] = {};
            }

            cache.browsers[req.session.uuid].heart_beat = new Date().getTime();
            cache.browsers[req.session.uuid].name = browserName(req);

            // Now find all results
            var components = fs.readdirSync(baseDir), ret = { current_results: {} };
            components.forEach(function(component) {
                var testFiles, testResults = [];

                component = path.basename(component);
                testFiles = fs.readdirSync(path.join(baseDir, component));
                testFiles.foreEach(function(testFile) {
                    if (testFile.match(/\.xml$/)) {
                        if (failed_tests(testFile)) {
                            test_results.push({ name: path.basename(testFile), failed: true });
                        } else {
                            test_results.push({ name: path.basename(testFile), failed: false });
                        }
                    }
                });

                var coverage = path.existsSync(path.join(baseDir, component, 'lcov-report'));
                ret.current_results[component] = {};
                ret.current_results[component].test_results = testResults;
                ret.current_results[component].coverage     = coverage;
            });

            ret.current_status = cache;
            res.end(JSON.stringify(ret));
        }

        hub.addListener('action:prune', function (doing_what, req) {
            var redirect;
            if (doing_what != '_status') {
                prune_browsers(req);
                redirect = prune_tests(doing_what, req);
                hub.emit('pruneDone', redirect);
            }
        });

        function prune_tests(doing_what, req) {
            var now = new Date().getTime(),
                browser = req.session.uuid, test,
                timeStarted, failedTest, failedTestURL;

            for (var i = 0; i< cache.tests_to_run.length; i++) {
                test = cache.tests_to_run[i];
                timeStarted = test.running;
                if (timeStarted) {
                    if (now - timeStarted > TEST_TIME_THRESHOLD) {
                        // This test has been running for too long!!
                        hub.emit(hub.LOG, 'error', "Test running for too long - killing it");
                        failedTest = cache.tests_to_run.splice(i, 1);
                        failedTestURL = failedTest.url;
                        if (failedTest.sendOutput) {
                            hub.emit('sendOutput', failedTest.sendOutput, failedtestURL + ' timed out - javascript error?');
                        }

                        // Dump a FAILED XML file
                        // Use test file name as the NAME of this test (vs. component name from test itself)
                        var parts = req.url.split('/');
                        var name  = parts.pop();
                        name = name.replace(/\..*$/, '');   // get rid of suffix
                        var names = makeSaneNames(browserName(req));
                        var err = ERROR;
                        err = err.replace('BROWSER', names[1]);
                        err = err.replace('URL', req.url);
                        var params  = { results: err, name: name };

                        hub.emit(hub.log, 'error',  "Dumped error unit test file " + name + " / " + names[0] + " (from " + req.url + ")");
                        dumpFile(params, 'results', names[0] + '-test.xml', name);

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
                            hub.emit(hub.LOG, 'error', "Been too long since you've requested a test: " + $browser + " - Kicking iframe...");
                            return 1;  // Redirect!!
                        }
                   }
                }
            }
        }

        function prune_browsers(req) {
            var now = new Date().getTime(), me = req.session.uuid;

            if (typeof cache.browsers == 'object') {
                for (browser in cache.browsers) {
                    if (browser == me) continue;

                    var b_time = cache.browsers[browser].heart_beat;
                    if (now - b_time > BROWSER_TIME_THRESHOLD) {
                        hub.emit(hub.LOG, 'error',  "We lost browser " + cache.browsers[browser].name);
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

        function browserName(req) {
            return [req.headers['user-agent'], req.connection.remoteAddress].join('---');
        }

        function makeSaneNames(browser) {
            var names = browser.split('---'),
                filename = names[0],
                ip = names[1],
                pkgname
            ;

            // Get rid of funny chars
            filename = filename.replace(/[\/;]/g, '');
            filename = filename.replace(/[A-Za-z0-9-]/g, '_');

            // Make a Hudson happy package name
            pkgname = filename.replace(/\./g, '');
            pkgname = pkgname.replace(/_+/g, '.');

            return [ filename, pkgname ];
        }

        function dumpFile(vars, dataKey, filename, component) {
            var baseOutputDir = hub.config.outputDir,
                dir           = [ baseOutputDir, (makeSaneNames(component))[0] ].join('/'),
                data          = vars[dataKey],
                fullFile      = dir + '/' + filename,
                fs            = require('fs')
            ;

            hub.emit(hub.LOG, 'info', "Dumping " + fullFile);

            // Any one of these can toss cookies!!!
            try {
                fs.mkdirSync(dir);
                var fd = fs.openSync(fullFile, 'w')
                fs.writeSync(fd, data, 0, 'utf8');
                fs.closeSync(fd)
                return [ fullFile, dir ];
            } catch(e) {
                hub.emit(hub.LOG, 'error', "Error dumping file: " + e);
            }
        }
    }
};

