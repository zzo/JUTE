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
        hub.addListener('action:test_report', testReport);
        hub.addListener('testOutputDone', testOutputDone);

        function testReport(req, res) {
            var obj = req.body,
                succeeded = true,
                names = common.makeSaneNames(common.browserName(req)),
                filename = names[0],
                pkgname = names[1],
                output = '',
                exec = require('child_process').exec
            ;

            // obj = { results: <xml>, name: <name>, coverage: <coverage.json> }
            obj.results = obj.results.replace(/testsuite name="/g, 'testsuite name="' + pkgname + '.');

            if (obj.name) {
                names = common.dumpFile(obj, 'results', filename + '-test.xml', obj.name);
                if (common.failedTests(names[0])) {
                    succeeded = false;
                }
                hub.emit(hub.LOG, hub.INFO, "Test Report for " + obj.name);
                output += "Test Report for " + obj.name + "\n";
                output += 'It: ' + (succeeded ? 'succeeded' : 'failed') + "\n";
            }

            if (obj.coverage && obj.coverage !== 'null') {
                try {
                    var cover_obj = JSON.parse(obj.coverage);
                    for (file in cover_obj) {
                        var new_file = path.join(hub.config.outputDir, obj.name, 'lcov-report', file);
                        cover_obj[new_file] = cover_obj[file];
                        delete cover_obj[file];
                    }
                    obj.coverage = JSON.stringify(cover_obj);
                    var namez = common.dumpFile(obj, 'coverage', 'cover.json', obj.name);
                    exec(hub.config.java + ' -jar ' + path.join(__dirname, "yuitest-coverage-report.jar") + " -o " + namez[1] + " --format lcov " + namez[0],
                            function(error, stdout, stderr) {
                                var msg;
                                if (error) {
                                    msg = "Error generating cooverage Report for " + obj.name + ': ' + error + "\n";
                                    output += msg;
                                    hub.emit(hub.LOG, hub.ERROR, msg);
                                } else {
                                    msg = "Generated cooverage Report for " + obj.name + "\n";
                                    hub.emit(hub.LOG, hub.INFO, msg);
                                    output += msg;

                                    /// deteremine coverage
                                    for (file in cover_obj) {
                                        cover = cover_obj[file];
                                        total_lines = cover.coveredLines;
                                        total_functions = cover.coveredFunctions;

                                        if (total_lines) {
                                            line_coverage = Math.round((cover.calledLines / total_lines) * 100);
                                            output += 'Line coverage for ' + path.basename(file) + ': ' + line_coverage + '%\n';
                                        }

                                        if (total_functions) {
                                            func_coverage = Math.round((cover.calledFunctions / total_functions) * 100);
                                            output += 'Function coverage for ' + path.basename(file) + ': ' + func_coverage + '%\n';
                                        }
                                    }
                                    ///// determine coverage
                                }

                                hub.emit('testOutputDone', req, res, succeeded, output);
                            }
                    );

                } catch(e) {
                    hub.emit(hub.LOG, hub.ERROR, "Error generating coverage report: " + e);
                    output += "Error generating coverage report: " + e;
                    hub.emit('testOutputDone', req, res, succeeded, output);
                }
            } else {
                hub.emit('testOutputDone', req, res, succeeded, output);
            }
        }

        function testOutputDone(req, res, succeeded, output) {
            // Take this test out of circulation
            var totalTests = cache.tests_to_run.length,
                names = common.makeSaneNames(common.browserName(req)),
                now = new Date().getTime(),
                obj = req.body;

            for (var i = 0; i < totalTests; i++) {
                var test = cache.tests_to_run[i];

                if (test.browser == req.session.uuid) {
                    // This is the test that just finished
                    hub.once('action:doneDone', function(err, test) {
                        if (err) {
                            hub.emit(hub.LOG, hub.ERROR, err);
                        } else {
                            hub.emit(hub.LOG, hub.INFO, 'Test finished: ' + test.url);
                        }
                        common.dumpFile({ output: test.output }, 'output', path.basename(names[0], 'xml') + '.txt', obj.name);
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end('OK');
                    });

                    // Clear this test out
                    common.addTestOutput(test, output);
                    common.addTestOutput(test, obj.name + " finished - it " + (succeeded ? 'SUCCEEDED' : 'FAILED') + ' - it took ' + (now - test.running) + "ms\n");
                    cache.tests_to_run.splice(i, 1);

                    // Take a snapshot & wait or we're done - always if 'snapshot' is set otherwise
                    //  only if a test fails
                    if ((!succeeded || test.snapshot) && req.session.selenium) {
                        hub.emit(hub.LOG, hub.INFO, 'Taking a Selenium snapshot of: ' + test.url);
                        common.takeSeleniumSnapshot(test, path.join(names[1], path.basename(names[0], 'xml')) + 'png');
                    } else {
                        hub.emit('action:doneDone', null, test);
                    }
                    break;
                }
            }

            if (!totalTests) {
                // A single browser test
                output += obj.name + " finished - it " + (succeeded ? 'SUCCEEDED' : 'FAILED') + "\n";
                common.dumpFile({ output: output }, 'output', path.basename(names[0], 'xml') + '.txt', obj.name);
                res.end('OK');
            }

        }
    }
};

