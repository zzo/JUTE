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
        hub.addListener('action:test_report', testReport);

        function testReport(req, res, cache) {
            var obj = req.body, succeeded = true,
                names = common.makeSaneNames(common.browserName(req)),
                filename = names[0], pkgname = names[1],
                now = new Date().getTime(), output = '',
                exec = require('child_process').exec
            ;

            // obj = { results: <xml>, name: <name>, coverage: <coverage.json> }
            obj.results = obj.results.replace(/testsuite name="/g, 'testsuite name="' + pkgname + '.');

            if (obj.name) {
                names = common.dumpFile(obj, 'results', filename + '-test.xml', obj.name);
                if (common.failedTests(names[0])) {
                    succeeded = false;
                }
                hub.emit(hub.LONG, hub.INFO, "Test Report for " + obj.name);
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
                    exec(hub.config.java + ' -jar ' + path.join(__dirname, "yuitest-coverage-report.jar") + " -o " + namez[1] + " --format lcov " + namez[0]);
                    hub.emit(hub.LONG, hub.INFO, "Coverage Report for " + obj.name);
                    output += "Coverage Report for " + obj.name + ' generated';
                } catch(e) {
                    hub.emit(hub.LOG, hub.ERROR, "Error generating coverage report: " + e);
                    output += "Error generating coverage report: " + e;
                }
            }

            // Take this test out of circulation
            var totalTests = cache.tests_to_run.length;
            for (var i = 0; i < totalTests; i++) {
                var test = cache.tests_to_run[i];
                if (test.browser == req.session.uuid) {
                    common.addTestOutput(test, output);
                    if (test.snapshot && test.sel_host) {
                        common.takeSeleniumSnapshot(test, path.join(names[1], path.basename(names[0], 'xml')) + 'png');
                        common.addTestOutput(test, "Took snapshot: " + path.join(names[1], path.basename(names[0], 'xml')) + 'png');
                    }

                    common.addTestOutput(test, obj.name + " finished - it " + (succeeded ? 'SUCCEEDED' : 'FAILED') + ' - it took ' + (now - test.running) + "ms\n");
                    common.dumpFile({ output: test.output }, 'output', path.basename(names[0], 'xml') + 'txt', obj.name);
                    cache.tests_to_run.splice(i, 1);
                    break;
                }
            }
            if (!totalTests) {
                // A single browser test
                output += obj.name + " finished - it " + (succeeded ? 'SUCCEEDED' : 'FAILED') + "\n";
                common.dumpFile({ output: output }, 'output', path.basename(names[0], 'xml') + 'txt', obj.name);
            }

            res.end('OK');
        }
    }
};

