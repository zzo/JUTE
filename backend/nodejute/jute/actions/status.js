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
        hub.addListener('action:checkResults', checkResults);

        hub.addListener('action:status', function(req, res) {
            hub.once('action:checkedResults', function(results) {
                results.current_status  = { browsers: cache.browsers, tests_to_run: cache.tests_to_run };
                results.config = hub.config;
                res.end(JSON.stringify(results));
            });
            hub.emit('action:checkResults');
        });

        function checkResults() {
            var baseDir = hub.config.outputDir,
                fs      = require('fs'),
                sys     = require('sys'),
                path    = require('path');

            // Find & parse all results
            var components = fs.readdirSync(baseDir), ret = { current_results: {} };

            if (components.length) {
                components.forEach(function(component) {
                    doComp(ret, component, function() {
                        if (Object.keys(ret.current_results).length == components.length) {
                            hub.emit('action:checkedResults', ret);
                        }
                    });
                });
            } else {
                hub.emit('action:checkedResults', ret);
            }
        }

        function doComp(ret, component, cb) {
            var testFiles, testResults = [], compDir,
                find    = require('npm/lib/utils/find'),
                baseDir = hub.config.outputDir;

            component = path.basename(component);
            compDir   = path.join(baseDir, component);

            // Find all the various output files
            find(compDir, /\.txt$/, function(err, debugFiles) {
                find(compDir, /\.png$/, function(err, snapshotFiles) {
                    find(compDir, /\.xml$/, function(err, testFiles) {
                        if (!err) {
                            // Determined if failed or not
                            testFiles.forEach(function(testFile) {
                                if (common.failedTests(testFile)) {
                                    testResults.push({ name: path.basename(testFile), failed: 1 });
                                } else {
                                    testResults.push({ name: path.basename(testFile), failed: 0 });
                                }
                            });

                            var coverage = path.existsSync(path.join(baseDir, component, 'lcov-report'));
                            ret.current_results[component] = {};
                            ret.current_results[component].test_results  = testResults;
                            ret.current_results[component].coverage      = coverage;
                            ret.current_results[component].debugFiles    = debugFiles.map(function(f) { return path.basename(f); });
                            ret.current_results[component].snapshotFiles = snapshotFiles.map(function(f) { return path.basename(f); });
                        } else {
                            hub.emit(hub.LOG, hub.ERROR, 'Error getting current output files: ' + err);
                        }
                        cb();
                    });
                });
            });
        }
    }
};

