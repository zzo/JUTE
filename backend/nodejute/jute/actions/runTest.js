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
            cache = hub.cache;

        // Events I care about
        hub.addListener('action:run_test', runTest);

        function runTest(req, res) {
            var uuid    = require('node-uuid'),
                path    = require('path'),
                fs      = require('fs'),
                obj     = req.body,
                util    = require('util'),
                tests, multipleFromUI = false,
                capture = false,
                exec    = require('child_process').exec,
                errors  = []
            ;

            hub.emit(hub.LOG, hub.INFO, 'OBJ: ' + util.inspect(obj));
            if (obj.test) {
                multipleFromUI = true;
                // 'run multiple' from UI
                if (typeof obj.test == 'object') {
                    tests = obj.test
                } else {
                    tests = [ obj.test ];
                }
            } else if (obj.tests) {
                // From CLI
                tests = obj.tests.split(/\s+/);
            }

            if (!tests) {
               res.writeHead(302, { Location: "/jute_docs/run_tests.html" });
               res.end("/jute_docs/run_tests.html");
               return;
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

            if (!Object.keys(cache.browsers).length && !obj.sel_host && !obj.phantomjs && capture && !obj.load) {
                res.writeHead(412);
                res.end("There are no currently captured browsers!");
                return;
            }

            var pushed = false, v8Tests = '',
                requestKey = uuid(), seleniumIDs = [];

            // Generate Selenium IDs
            if (obj.sel_host || obj.phantomjs) {
                var seleniums = parseInt(obj.seleniums, 10) || parseInt(obj.parallel, 10) || 1;
                for (var i = 0; i < seleniums; i++) {
                    seleniumIDs.push(uuid());
                }
            }

            for (var i = 0; i < tests.length; i++) {
                var test = tests[i],
                    test_obj = {
                        running:    0,
                        url:        path.join('/', hub.config.testDirWeb, test),
                        output:     '',
                        requestKey: requestKey,
                        sendOutput: obj.send_output,
                        retry:      parseInt(obj.retry, 10) || 0
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
                    // A Selenium Test!

                    // keep this around
                    test_obj.sel_host = obj.sel_host;

                    if (obj.send_output) {
                        test_obj.sendOutput = 1;
                    }
                    if (obj.snapshot) {
                        test_obj.snapshot = 1;
                    }

                    // Only pass these tests out to selenium hosts started by this
                    //  this is how we keep track
                    //  hand this off to next SeleniumID
                    console.log('choosing selenium id: ' + (i % seleniumIDs.length));
                    test_obj.browser = seleniumIDs[i % seleniumIDs.length];

                    common.addTestOutput(test_obj, 'Selenium test');

                    cache.tests_to_run.push(test_obj);
                    pushed = true;
                } else if (obj.phantomjs) {
                    if (!obj.screen) {
                        obj.screen = hub.config.screen;
                    }
                    if (obj.send_output) {
                        test_obj.sendOutput = 1;
                    }
                    if (obj.snapshot) {
                        test_obj.snapshot = 1;
                    }

                    // Only pass these tests out to phantomjs instances started by this
                    //  this is how we keep track
                    //  hand this off to next SeleniumID
                    console.log('choosing phantomjs id: ' + (i % seleniumIDs.length));
                    test_obj.browser = seleniumIDs[i % seleniumIDs.length];

                    common.addTestOutput(test_obj, 'PhantomJS test');

                    cache.tests_to_run.push(test_obj);
                    pushed = true;
                } else {
                    if (multipleFromUI) {
                        // Only run these tests in THIS browser from the UI

                            pushed = true;
                            for (var browser in cache.browsers) {
                                (function(b) {
                                    hub.emit(hub.LOG, hub.INFO, 'Adding this test to zob: ' + b);
                                    var obj = JSON.parse(JSON.stringify(test_obj));
                                    obj.browser = b;
                                    common.addTestOutput(obj, 'Capture test');
                                    cache.tests_to_run.push(obj);
                                }(browser));
                            }
                    } else {
                        // Send to each test to each captured browser
                        if (!obj.load) {
                            pushed = true;
                            for (var browser in cache.browsers) {
                                (function(b) {
                                    hub.emit(hub.LOG, hub.INFO, 'Adding this test to zob: ' + b);
                                    var obj = JSON.parse(JSON.stringify(test_obj));
                                    obj.browser = b;
                                    common.addTestOutput(obj, 'Capture test');
                                    cache.tests_to_run.push(obj);
                                }(browser));
                            }
                        } else {
                            common.addTestOutput(test_obj, 'Loading this test for any browser');
                            cache.tests_to_run.push(test_obj);
                        }
                    }
                }

                common.addTestOutput(test_obj, util.inspect(test_obj));
            }

            if (pushed) {
                if (obj.sel_host) {
                    // Start up for a Selenium browser & Listen for results
                    var totalError = '';
                    hub.on('action:seleniumDone', function(err, selID) {
                        seleniumIDs.pop();  // a selenium browser finished - we don't really care which one
                                            //  as we're just waiting for all to finish
                        var done = !seleniumIDs.length;
                        if (done) hub.removeListener('action:seleniumDone', arguments.callee);

                        if (err) {
                            hub.emit(hub.LOG, hub.ERROR, 'ERROR running Selenium tests (' + selID + '): ' + err);
                            totalError += err;
                            if (done) {
                                res.end(totalError);
                            }
                        } else {
                            if (done) {
                                hub.once('action:checkedResults', function(results) {
                                    res.end('Final Selenium Results: ' + JSON.stringify(results));
                                });
                                hub.emit('action:checkResults');
                            }
                        }
                    });

                    seleniumIDs.forEach(function(selID) {
                        if (obj.sel2) {
                            hub.emit('action:selenium2Start', selID, req, res);
                        } else {
                            hub.emit('action:seleniumStart', selID, req, res);
                        }
                    });
                } else if (obj.phantomjs) {
                    // Start up for a Selenium browser & Listen for results
                    var totalError = '';
                    hub.on('action:phantomjsDone', function(err, selID) {
                        seleniumIDs.pop();  // a selenium browser finished - we don't really care which one
                                            //  as we're just waiting for all to finish
                        var done = !seleniumIDs.length;
                        if (done) hub.removeListener('action:phantomjsDone', arguments.callee);

                        if (err) {
                            hub.emit(hub.LOG, hub.ERROR, 'ERROR running PhantomJS tests (' + selID + '): ' + err);
                            totalError += err;
                            if (done) {
                                res.end(totalError);
                            }
                        } else {
                            if (done) {
                                hub.once('action:checkedResults', function(results) {
                                    res.end('Final PhantomJS Results: ' + JSON.stringify(results));
                                });
                                hub.emit('action:checkResults');
                            }
                        }
                    });

                    seleniumIDs.forEach(function(selID) {
                        hub.emit('action:phantomjsStart', selID, obj.screen, req, res);
                    });
                }else {
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
                        if (obj.wait) {
                            cache.connections[requestKey] = res; // our link back to the requesting client for status messages
                            hub.once('testsDone', function() {
                                delete cache.connections[requestKey]; // our link back to the requesting client for status messages
                                res.end('all done!');
                            });
                        } else if (capture) {
                            res.end('Added ' + (obj.test || obj.tests) + ' to capture/load tests');
                        }

                    }
                }
            } else {
                if (obj.load) {
                    res.write('All tests loading and waiting for a browser');
                    if (obj.wait) {
                        cache.connections[requestKey] = res; // our link back to the requesting client for status messages
                        hub.once('testsDone', function() {
                            delete cache.connections[requestKey]; // our link back to the requesting client for status messages
                            res.end('all done from load!');
                        });
                    } else {
                        res.end('');
                    }
                } else {
                    hub.emit(hub.LOG, hub.ERROR,  "No browsers listening!");
                    res.statusCode = 412; // Ye Olde Failed Precondition
                    res.end('No browsers listening!!  Test(s) not added!');
                }
            }
        }
    }
};

