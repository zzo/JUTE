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
        var cache = hub.cache,
            common = {
            browserName: function(req) {
                return [req.headers['user-agent'], req.connection.remoteAddress].join('---');
            },

            makeSaneNames: function(browser) {
                var names = browser.split('---'),
                    filename = names[0],
                    ip = names[1],
                    pkgname
                ;

                // Get rid of funny chars
                filename = filename.replace(/[\/;]/g, '');
                filename = filename.replace(/[^A-Za-z0-9-]/g, '_');

                // Make a Hudson happy package name
                pkgname = filename.replace(/\./g, '');
                pkgname = pkgname.replace(/_+/g, '.');

                return [ filename, pkgname ];
            },

            dumpFile: function(vars, dataKey, filename, component) {
                var baseOutputDir = hub.config.outputDir,
                    path          = require('path'),
                    dir           = path.join(baseOutputDir, (common.makeSaneNames(component))[0]);
                    data          = vars[dataKey],
                    fullFile      = path.join(dir, filename),
                    fs            = require('fs')
                ;

                hub.emit(hub.LOG, hub.INFO, "Dumping " + fullFile);

                // Any one of these can toss cookies!!!
                try {
                    // This will complain if dir already exists
                    //     And we KNOW we can already make dirs here
                    fs.mkdirSync(dir, 0777);
                } catch(e) {}

                try {
                    var fd = fs.openSync(fullFile, 'w')
                    fs.writeSync(fd, data, 0, 'utf8');
                    fs.closeSync(fd)
                    return [ fullFile, dir ];
                } catch(e) {
                    hub.emit(hub.LOG, hub.ERROR, "Error dumping file: " + e);
                }
            },
            failedTests: function(filename) {
                var fs = require('fs'),
                    file = fs.readFileSync(filename, 'utf8');

                return file.match(/failures="[1-9]/);
            },
            takeSeleniumSnapshot: function(test, filename) {
                var soda = require('soda'), i
                    b = soda.createClient({ host: test.sel_host });

                if (!test.seleniumID) return;

                b.sid = test.seleniumID;

                //b.chain.windowFocus().getEval("window.moveTo(1,0); window.resizeTo(screen.availWidth, screen.availHeight);").windowMaximize().end(function(err) {
                b.chain.windowFocus().getEval("window.moveTo(1,0); window.resizeTo(screen.availWidth, screen.availHeight);").end(function(err) {
                    if (!err) {
                        b.command('captureScreenshotToString', [], function(err, body, res) {
                            if (!err) {
                                var bb = new Buffer(body, 'base64');
                                fs.writeFileSync(filename, bb, 0, bb.length);
                                common.addTestOutput(test, "Took snapshot: " + filename);
                            }
                            hub.emit('action:doneDone', err, test);
                        });
                    } else {
                        hub.emit('action:doneDone', err, test);
                    }
                });
            },
            addTestOutput: function(test, msg) {
                var lines = msg.split(/\n/),
                    now = new Date(),
                    format;

                format = now.getFullYear() + '/' + (now.getMonth() + 1) + '/' +  now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
                lines.forEach(function(line) {
                    test.output += '[' + format + '] ' + line + "\n";
                });

                if (test.sendOutput) {
                    // do something smart
                    if (cache.connections[test.browser]) {
                        cache.connections[test.browser].write(msg);
                    }
                }
            },
            badUnitTest: function(req, test) {
                // Dump a FAILED XML file
                // Use test file name as the NAME of this test (vs. component name from test itself)
                var parts = test.url.split('/');
                var name  = parts.pop();
                name = name.replace(/\..*$/, '');   // get rid of suffix
                var names = common.makeSaneNames(common.browserName(req));
                var err = '<?xml version="1.0" encoding="UTF-8"?><testsuites><testsuite name="BROWSER" tests="0" failures="1" time="0">Test Timed Out: Most likely a Javascript parsing error - try loading URL in your browser</testsuite></testsuites>',
                err = err.replace('BROWSER', names[1]);
                err = err.replace('URL', test.url);
                var params  = { results: err, name: name };
                var msg = "Dumped error unit test file " + name + " / " + names[0] + " (from " + test.url + ")";

                hub.emit(hub.log, hub.ERROR,  msg);
                common.addTestOutput(test, msg);

                common.dumpFile(params, 'results', names[0] + '-test.xml', name);
                common.dumpFile({ output: test.output }, 'output', names[0] + '.txt', name);
            }
        };

        return common;
    }
};

