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
    ,REQUIRE    = require
    ,DONE       = false
    ,EXIT       = false
    ,coverageReportJar = PATH.join(__dirname, 'jute', 'actions', 'yuitest-coverage-report.jar')
    ,coverageJar       = PATH.join(__dirname, 'jute', 'yuitest-coverage.jar')
    ,TEST_FILE
    ,DO_COVERAGE
    ,myYUI
    ,testOutput = ''
    ;


if (!config) {
    process.exit(0);
}

if (!process.argv[2]) {
    console.log('You must specify a test to run!  This file is relative to testDir');
    process.exit(1);
}

TEST_FILE   = PATH.join(config.testDir, process.argv[2]);
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

// Shim in 'jute' instead of 'test'
//  for the sandbox's YUI
var myYUI = function(yuiArgs) {
    var yui = YUI(yuiArgs),
        origUse = yui.use,
        origLog = yui.log;

    yui.use = function() {
        for (var i = 0; i < arguments.length - 1; i++) {
            if (arguments[i] === 'test') {
                arguments[i] = 'jute';
            }
        }

        return origUse.apply(yui, arguments);
    };

    yui.log = function() {
        testOutput += arguments[1] + ': (' + arguments[2] + '): ' + arguments[0] + "\n";
        return origLog.apply(yui, arguments);
    }

    return yui;
}

// Inject mini-jute into sandbox's YUI
myYUI().add('jute', function(Y) {
     Y.namespace('UnitTest').go = function() { Y.Test.Runner.run(); };
     Y.Test.Runner.subscribe(Y.Test.Runner.COMPLETE_EVENT,
         function(data) {
             var cover_out   = Y.Test.Runner.getCoverage(Y.Coverage.Format.JSON),
                 report_data = Y.Test.Format.JUnitXML(data.results);

             testsDone(data, report_data, cover_out);
         }
     );

}, '1.0', { requires: [ 'test' ] });

// Recursively instrument all requested coverage files
function getOneCoverage(files, index) {
    if (files[index]) {
        var reqMatch = /require\s*\(\s*['"]([^'"]+)['"]\s*,\s*true\s*\)/g;
        var covers = reqMatch.exec(files[index]);
        generateCoverage(covers[1], getOneCoverage, files, ++index);
    } else {
        // All done
        doit('<script src="' + TEST_FILE + '"></script>');
    }
}

// START PARTY!!!
if (TEST_FILE.match(/\.js$/)) {
    // JS
    if (DO_COVERAGE) {
        var tf = fs.readFileSync(TEST_FILE, 'utf8');
            reqMatch = /require\s*\(\s*['"]([^'"]+)['"]\s*,\s*true\s*\)/g,
            cc = tf.match(reqMatch);

        getOneCoverage(cc, 0);
    } else {
        doit('<script src="' + TEST_FILE + '"></script>');
    }
} else {
    // HTML
    fs.readFile(TEST_FILE, 'utf8', function (err, data) {
        if (err) {
            console.error("Cannot read " + TEST_FILE + ": " + err); 
            process.exit(1); 
        }
        doit(data);
    });
}

/**
 * This gets called when the unit tests are finished
 */
function testsDone(data, report_data, cover_out) {
    var dirname = PATH.join(config.outputDir, data.results.name),
        test_output_file = PATH.join(dirname, 'v8-test.xml'), cover_object,
        test_debug_file = PATH.join(dirname, 'v8-test.txt'),
        cover_out_file = PATH.join(dirname, 'cover.json'), cover,
        total_lines, total_functions, line_coverage = 0, func_coverage = 0;

    try {
        fs.mkdirSync(dirname, 0777);
    } catch(e) { }

    console.log('Test results file: ' + test_output_file);
    fs.writeFileSync(test_output_file, report_data);

    console.log('Test debug file: ' + test_debug_file);
    fs.writeFileSync(test_debug_file, testOutput);

    DONE = true;

    if (cover_out) {

        cover_object = JSON.parse(cover_out);
        fs.writeFileSync(cover_out_file, cover_out);

        DEBUG([ config.java, '-jar', coverageReportJar, '--format', 'lcov', '-o', dirname, cover_out_file ].join(' '));
        exec([ config.java, '-jar', coverageReportJar, '--format', 'lcov', '-o', dirname, cover_out_file ].join(' '), function(err, stdout, stderr) {
            if (err) {
                console.error('Error creating coverage report: ' + err);
                process.exit(1);
            } else {
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
                }
                process.exit(data.results.failed);
            }
        });
    } else {
        process.exit(data.results.failed);
    }
}

function doit(data) {

    var d = jsdom(''), w = d.createWindow();

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
            //Script = process.binding('evals').Script,
            orig_eval = eval, sandbox,
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
            },
            requireCover = function(file, coverage) {
                if (DO_COVERAGE && coverage && (file !== require.resolve(file))) {
                    var tempFile = PATH.join('/tmp', PATH.basename(file));

                    return REQUIRE(tempFile);
                } else {
                    return REQUIRE(file);
                }
            };

        document.innerHTML = data;
        document.createElement = createElement;

        // Work around some eval goo - eval in global context otherwise webkit complains
        window.eval = eval = function(goo) { return orig_eval.call(null, goo); }
        document.location   = { href: '' };
        window.location     = { search: '' };
        document.write      = document.open = document.close = function() {};

        //sandbox = Script.createContext(
        sandbox = 
            {
                window: window
                ,console: console   // dummy this out??
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
                ,YUI: myYUI
                ,__NODE: true
                ,module: module     // SOO sneaky!
                ,process: process     // SOO sneaky!
                ,require: requireCover   // Test nodejs stuff - maybe get coverage'd version
            };

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
            var domtag = Y.Node.getDOMNode(tag), data, style,
                vm = require('vm');

            try {
                data = tag.getData('javascript');
                if (domtag.nodeName === 'LINK') {
                    style = document.createElement('style');
                    style.innerHTML = data;
                    document.head.appendChild(style);
                } else {
                    DEBUG("RUNNING SCRIPT: " + tag.getAttribute('src'));
                    vm.runInNewContext(data, sandbox, tag.getAttribute('src'));
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
                        exec([ config.java, '-jar', coverageJar, '-o', full_path_file, ssrc[0] ].join(' '), function(error) {
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


function generateCoverage(file, cb, files, index) {
    var tempFile = PATH.join('/tmp', PATH.basename(file)),
        realFile = require.resolve(file);

    if (realFile == file) {
        // A native module!!  Who know where the heck these are - skip it
        console.log('Cannot get coverage for a native module: ' + file);
        cb(files, index);
    } else {
        exec(config.java + ' -jar ' + coverageJar + " -o " + tempFile + " " + realFile, function(err) {
            if (err) {
                console.error("Cannot coveage " + realFile + ': ' + err);
                process.exit(1);
            }  else {
                cb(files, index);
            }
        });
    }
}
