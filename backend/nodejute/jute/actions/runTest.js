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
        hub.addListener('action:run_test', runTest);

        function runTest(req, res, cache) {
            var uuid   = require('node-uuid'),
                path    = require('path'),
                fs      = require('fs'),
                obj     = req.body,
                sys     = require('sys'),
                tests, multipleFromUI = false,
                capture = false,
                exec    = require('child_process').exec,
                errors  = []
            ;

            console.log(sys.inspect(obj));
            if (obj.test) {
                // 'run multiple' from UI
                if (typeof obj.test == 'object') {
                    multipleFromUI = true;
                    tests = obj.test
                } else {
                    tests = [ obj.test ];
                }
            } else if (obj.tests) {
                // From CLI
                tests = obj.tests.split(/\s+/);
            }

            // FIRST make sure all these alleged test files exist
            for (var i = 0; i < tests.length; i++) {
                var realFullFile = path.join(hub.config.testDir, tests[i].replace(/\?.*/, ''));
                if (realFullFile.match(/\.html$/)) {
                    capture = true;
                }

                try {
                    fs.statSync(realFullFile);
                } catch (e) {
                    errors.push(realFullFile);
                }
            }

            if (errors.length > 0) {
                res.writeHead(404);
                res.end("Cannot find test files: " + errors.join(', '));
                return;
            }

            if (!Object.keys(cache.browsers).length && !obj.sel_host && capture) {
                res.writeHead(412);
                res.end("There are no currently captured browsers!");
                return;
            }

            var pushed = false, v8Tests = '';
            for (var i = 0; i < tests.length; i++) {
                var test = tests[i],
                    test_obj = {
                        running: 0,
                        url:     path.join('/', hub.config.testDirWeb, test),
                        output: ''
                    };

                if (test.match(/\.js/)) {
                    // V8 test!
                    pushed = true;
                    exec('JUTE_DEUBG=1 ' + path.join(__dirname, '..', '..', 'jute_v8.js') + ' ' + test + ' 2>&1', function(error, stdout, stderr) {
                        if (error) {
                            v8Tests += 'V8 ERROR: ' + error;
                        } else {
                            v8Tests += stdout;
                        }
                    });
                } else if (obj.sel_host) {
                    // A Selenium Test! - meaning anyone can run it
                    if (obj.send_output) {
                        test_obj.sendOutput = 1;
                    }
                    if (obj.snapshot) {
                        test_obj.snapshot = 1;
                    }

                    // Only pass these tests out to selenium hosts started by this
                    //  this is how we keep track
                    obj.uuid = test_obj.browser = uuid();

                    common.addTestOutput(test_obj, 'Selenium test');

                    cache.tests_to_run.push(test_obj);
                    pushed = true;
                } else {
                    if (multipleFromUI) {
                        // Only run these tests in THIS browser from the UI
                        test_obj.browser = req.session.uuid;

                        common.addTestOutput(test_obj, 'Multiple in this browser test');

                        cache.tests_to_run.push(test_obj);
                        pushed = true;
                    } else {
                        // Send to each test to each captured browser
                        for (var browser in cache.browsers) {
                            test_obj.browser = browser;
                            common.addTestOutput(test_obj, 'Capture test');
                            cache.tests_to_run.push(test_obj);
                            pushed = true;
                        }
                    }
                }

                common.addTestOutput(test_obj, sys.inspect(test_obj));
            }

            if (pushed) {
                if (obj.sel_host) {
                    if (obj.send_output) {
                        res.write("Opening " + obj.sel_browser + " on Selenium host " + obj.sel_host);
                    }

                    // Start up Selenium & Listen for results
                    hub.once('action:seleniumDone', function(err) {
                        if (err) {
                            hub.emit(hub.LOG, hub.ERROR, 'ERROR running Selenium tests: ' + err);
                            res.end(err);
                        } else {
                            hub.once('action:checkedResults', function(results) {
                                res.end('Final Selenium Results: ' + JSON.stringify(results));
                            });
                            hub.emit('action:checkResults');
                        }
                    });

                    hub.emit('action:seleniumStart', req, res, obj, tests.length);
                } else {
                    // UI wants to run multiple tests - redirect to it!
                    if (multipleFromUI) {
                        // Now tell browser to run the tests!
                        res.writeHead(302, { Location: "/jute_docs/run_tests.html" });
                        res.end("/jute_docs/run_tests.html");
                    } else {
                        // Command line client
                        if (v8Tests) {
                            res.write(v8Tests);
                        }
                        if (capture) {
                            res.end('Added ' + (obj.test || obj.tests) + ' to capture tests');
                        }

                    }
                }
            } else {
                hub.emit(hub.LOG, hub.ERROR,  "No browsers listening!");
                response.statusCode = 412; // Ye Olde Failed Precondition
                res.end('No browsers listening!!  Test(s) not added!');
            }
        }
    }
};

