#!/usr/bin/env node
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

var  fs         = require('fs')
    ,sys        = require('sys')
    ,YUI        = require("yui3").YUI
    ,http       = require('http')
    ,PATH       = require('path')
    ,spawn      = require('child_process').spawn
    ,exec       = require('child_process').exec
    ,url        = require('url')
    ,events     = require("events")
    ,config     = (require('./getConfig'))()
    ,jsdom      = require('jsdom').jsdom
    ,xmlhttp    = require("xmlhttprequest").XMLHttpRequest
    ,DEBUG      = function() { if (process.env.JUTE_DEBUG==1) { console.log(Array.prototype.join.call(arguments, ' ')); } }
    ,DONE       = false
    ,EXIT       = false
    ,coverageReportJar = PATH.join(__dirname, 'jute', 'actions', 'yuitest-coverage-report.jar')
    ,coverageJar       = PATH.join(__dirname, 'jute', 'yuitest-coverage.jar')
    ,TEST_FILE
    ,DO_COVERAGE
    ;

if (!process.argv[2]) {
    console.log('You must specify a test to run!  This file is relative to testDir');
    process.exit(1);
}

TEST_FILE  = PATH.join(config.testDir, process.argv[2]);
DO_COVERAGE = TEST_FILE.match(/do_coverage=1/);
TEST_FILE   = TEST_FILE.replace(/\?.*/,''); // get rid of any query string

console.log('Testing ' + TEST_FILE + ' with' + (DO_COVERAGE ? '' : 'out') + ' code coverage');

// Find java is we're doing coverage....
if (DO_COVERAGE) {
    if (!config.java) {
        exec('which java', function (error, stdout, stderr) {
            config.java = stdout.trim();
            if (error !== null) {
                console.log('Cannot find "java" executable - you will not be able to get code coverage - make sure "java" is in your PATH');
                process.exit(1);
            }
        });
    }
}

fs.readFile(TEST_FILE, 'utf8', function (err, data) {
    if (err) {
        console.error("Cannot read " + TEST_FILE + ": " + err); 
        process.exit(1); 
    }
    var d = jsdom(''), w = d.createWindow();
    doit(data, d, w);
});

/**
 * This gets called when the unit tests are finished
 */
function tests_done(data, report_data, cover_object, cover_out) {
    var dirname = PATH.join(config.outputDir, data.results.name),
        test_output_file = PATH.join(dirname, 'v8-test.xml'),
        cover_out_file = PATH.join(dirname, 'cover.json'), coverage, cover,
        total_lines, total_functions, line_coverage = 0, func_coverage = 0;

    try {
        fs.mkdirSync(dirname, 0777);
    } catch(e) { }

    console.log('Test output file: ' + test_output_file);
    fs.writeFileSync(test_output_file, report_data);

    DONE = true;

    if (cover_object) {

        fs.writeFileSync(cover_out_file, cover_out);

        coverage = spawn(config.java, [ '-jar', coverageReportJar, '--format', 'lcov', '-o', PATH.join(dirname, 'lcov-report'), cover_out_file ]);
        coverage.on('exit', function(code) {
            for (file in cover_object) {
                cover = cover_object[file];
                total_lines = cover.coveredLines;
                total_functions = cover.coveredFunctions;

                if (total_lines) {
                    line_coverage = Math.round((cover.calledLines / total_lines) * 100);
                }
                console.log('Line coverage for ' + file + ': ' + line_coverage + '%');

                if (total_functions) {
                    func_coverage = Math.round((cover.calledFunctions / total_functions) * 100);
                }
                console.log('Function coverage for ' + file + ': ' + func_coverage + '%');
                DEBUG(cover_out);
            }
            process.exit(data.results.failed);
        });
    } else {
        process.exit(data.results.failed);
    }
}

function doit(data, d, w) {
    YUI({
//        filter: 'DEBUG',
        logExclude: {
            attribute:     true
            ,base:         true
            ,get:          true
            ,loader:       true
            ,selector:     true
            ,yui:          true
            ,widget:       true
            ,event:        true
        }
        ,doc: d
        ,win: w
    }).use('node', 'nodejs-dom', function(Y) {

        var document = Y.Browser.document, window = document.parentWindow,
            Script = process.binding('evals').Script, orig_eval = eval, sandbox,
            createElementOrig = document.createElement,
            createElement = function(str) {
                var e = createElementOrig.call(this, str), d;
                if (str === 'iframe') { 
                    d = jsdom(''); 
                    e.contentWindow = d.createWindow(); 
                    d.open = d.close = function(){}; 
                    d.write = function(t) { e.innerHTML += t; d.innerHTML += t; }; 
                    d.createElement = createElement;
                } else if (str === 'style') {
                    e.sheet.cssRules   = [];
                    e.sheet.deleteRule = function(i) { delete cssRules[i]; },
                    e.sheet.addRule    = function(sel, css,i) { cssRules[i] = { selectorText: sel, style: { cssText: css } }; }
                }
                return e;
            };

        document.innerHTML = data;
        document.createElement = createElement;

        // Work around some eval goo - eval in global context otherwise webkit complains
        window.eval = eval = function(goo) { return orig_eval.call(null, goo); }
        window.__done       =  tests_done;
        document.location   = { href: '' };
        window.location     = { search: '' };
        document.write      = document.open = document.close = function() {};

        sandbox = Script.createContext(
            {
                window: window
                ,console: console
                ,setInterval: setInterval
                ,document: document
                ,ActiveXObject: function(){ return { setRequestHeader: function() {} } }
                ,XMLHttpRequest: xmlhttp
                ,clearInterval: clearInterval
                ,clearTimeout: clearTimeout
                ,setTimeout: setTimeout
                ,navigator: window.navigator
                ,location: { href: '' }
                ,Image: function(){}
                ,alert: Y.log
                ,__NODE: true
            }
        );

        process.chdir(PATH.dirname(TEST_FILE));

        Y.on('getNextScript', function() {
            var tag = findNextScript();
            if (tag) {
                getScript(tag, executeScript);
            } else {
                // Give the slacker 10 seconds to exit
                setTimeout(function() { process.exit(0); }, 10000);
            }
        });

        Y.fire('getNextScript');

        function findNextScript() {
            var csses = Y.all('link'),
                scripts = Y.all('script'), script, i;

            for (i = 0; i < csses.size(); i++) {
                script = csses.item(i);
                if (!script.getData('javascript')) {
                    return script;
                }
            }

            for (i = 0; i < scripts.size(); i++) {
                script = scripts.item(i);
                if (!script.getData('javascript')) {
                    return script;
                }
            }

            return;
        }

        function executeScript(tag) {
            var domtag = Y.Node.getDOMNode(tag), data, style;
            try {
                data = tag.getData('javascript');
                if (domtag.nodeName === 'LINK') {
                    style = document.createElement('style');
                    style.innerHTML = data;
                    document.head.appendChild(style);
                } else {
                    DEBUG("RUNNING SCRIPT: " + tag.getAttribute('src'));
                    new Script(data).runInContext(sandbox);
                    DEBUG("BACK SCRIPT: " + tag.getAttribute('src'));
                }
                if (typeof(domtag.onload) === 'function') {
                    domtag.readyState = 'complete';
                    domtag.onload.call(sandbox);
                }
                DEBUG('EXECUTED: ' + tag.getAttribute('src') + ' successfully!');
            } catch(e) {
                Y.log("PARSE FAILURE exiting: " + tag.getAttribute('src'));
                Y.log("Cannot run tests in: " + TEST_FILE);

                DEBUG(e.message);
                DEBUG(e.stack);

                console.log('JAVASCRIPT ERROR: NO TESTS RUN');
                process.exit(1);
            }

            Y.fire('getNextScript');
        }

        function getScript(tag, cb) {
            var src = tag.getAttribute('src') || tag.getAttribute('href'), host, server,
                path, request, data = '', ssrc, full_path_file, coverage;

            if (src) {
                if (src.match(/^http:/)) {
                    host    = url.parse(src);
                    server  = http.createClient(host.port || 80, host.hostname);
                    path    = (host.search) ?  host.pathname + host.search : host.pathname;
                    request = server.request('GET', path, {'host': host.hostname });

                    request.end();

                    request.on('response', function (response) {
                        response.setEncoding('utf8');
                        response.on('data', function (chunk) {
                            data += chunk;
                        });
                        response.on('end', function() {
                            if (response.statusCode > 299) {
                                DEBUG("ERROR FETCHING: " + path);
                            } else {
                                tag.setData('javascript', data || 1);
                                cb(tag);
                            }
                        });
                    });
                } else {
                    if (src.substring(0,7) === "file://") {
                        src = value.substring(7);
                    }
                    ssrc = src.split('?');
                    DEBUG('loading: ' + ssrc[0]);
                    if (ssrc[1] === 'coverage=1' && DO_COVERAGE) {
                        // Get coveraged version of this file
                        DEBUG('Doing coverage for ' + ssrc[0]);
                        full_path_file = PATH.join('/tmp/', PATH.basename(ssrc[0]));
                        coverage = spawn(config.java, [ '-jar', coverageJar, '-o', full_path_file, ssrc[0] ]);
                        coverage.on('exit', function(code) {
                            fs.readFile(full_path_file, 'utf8', function (err, data) {
                                if (err) throw err;
                                tag.setData('javascript', data || 1);
                                cb(tag);
                            });
                        });
                    } else {
                        fs.readFile(ssrc[0], 'utf8', function (err, data) {
                            if (err) { Y.error("Can't read file: " + ssrc[0]); throw err; }
                            tag.setData('javascript', data || 1);
                            cb(tag);
                        });
                    }
                }
            } else {
                tag.setData('javascript', tag.get('innerHTML') || 1);
                cb(tag);
            }
        }
    });
}

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    process.exit(1);
});

process.on('exit', function () {
    if (!EXIT) {
        EXIT = true;
        if (!DONE) {
            console.log('Premature exit: FAIL!');
        }
        process.exit(DONE ? 0 : 1);
    }
});

