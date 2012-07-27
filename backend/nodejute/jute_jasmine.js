#!/usr/bin/env node

/*
Copyright (c) 2012, ZZO Associates
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

var fs          = require('fs')
    ,m 		= require('module')
    ,PATH       = require('path')
    ,util       = require('util')
    ,exec       = require('child_process').exec
    ,config     = (require('./getConfig'))()
    ,DEBUG      = function() { if (process.env.JUTE_DEBUG==1) { console.log(Array.prototype.join.call(arguments, ' ')); } }
    ,coverageReportJar = PATH.join(__dirname, 'jute', 'actions', 'yuitest-coverage-report.jar')
    ,coverageJar       = PATH.join(__dirname, 'jute', 'yuitest-coverage.jar')
    ,TEST_FILE
    ,SAVE_DIR
    ,DO_COVERAGE
    ,FILES_FOR_COVERAGE = {}
    ,testOutput = ''
    ,jasmine = require('jasmine-node/lib/jasmine-node/index.js')
    ,originalLoader
    ;


if (!config) {
    console.error('You must % npm start jute!');
    process.exit(0);
}

if (!process.argv[2]) {
    console.log('You must specify a test to run!  This file is relative to testDir');
    process.exit(1);
}

TEST_FILE   = PATH.join(config.testDir, process.argv[2]);
DO_COVERAGE = TEST_FILE.match(/do_coverage=1/) || process.argv[3];
TEST_FILE   = TEST_FILE.replace(/\?.*/,''); // get rid of any query string
SAVE_DIR    = PATH.join(config.outputDir, PATH.basename(TEST_FILE, '.js'), PATH.sep)

console.log('Testing ' + TEST_FILE + ' with' + (DO_COVERAGE ? '' : 'out') + ' code coverage');

// Recursively instrument all requested coverage files
function getOneCoverage(files, index) {
    if (files[index]) {
        var reqMatch = /require\s*\(\s*['"]([^'"]+)['"]\s*,\s*true\s*\)/g
            , covers = reqMatch.exec(files[index])
        ;

        generateCoverage(covers[1], getOneCoverage, files, ++index);
    } else {
        // All done
        doit();
    }
}

// START PARTY!!!
if (TEST_FILE.match(/\.js$/)) {
    // JS

    if (DO_COVERAGE) {
        try {
            var tf = fs.readFileSync(TEST_FILE, 'utf8')
                , reqMatch = /require\s*\(\s*['"]([^'"]+)['"]\s*,\s*true\s*\)/g
                , cc = tf.match(reqMatch)
                ;

            if (cc) {
                console.log('getting coverage');
                getOneCoverage(cc, 0);
            } else {
                console.log('Warning: requested coverage but found no modules to cover');
                doit();
            }
        } catch(e) {
            console.error("Error reading " + TEST_FILE + ": " + e);
            process.exit(1);
        }

    	originalLoader = m._load;
    	m._load = hookedLoader;
    } else { 
        doit();
    }
} 

function doit() {
    console.log('doing it');
	var junitreport = {
		report: true
		, savePath : PATH.join(config.outputDir, PATH.basename(TEST_FILE, '.js'), PATH.sep)
		, useDotNotation: true
		, consolidate: true
	};

    jasmine.executeSpecsInFolder(config.testDir
        , onComplete
        , process.env.JUTE_DEBUG == 1
        , false
        , false
        , false
        , new RegExp(PATH.basename(TEST_FILE, '.js'))
        , junitreport
    );
}

/**
 * This gets called when the unit tests are finished
 */
function  onComplete(runner, log) {
    var dirname = SAVE_DIR
        , cover_out_file = PATH.join(dirname, 'cover.json')
	    , cover
        , total_lines
	    , total_functions
	    , line_coverage = 0
	    , func_coverage = 0
    ;

    if (typeof _yuitest_coverage == 'object') {

        try {
            fs.writeFileSync(cover_out_file, JSON.stringify(_yuitest_coverage));
        } catch(e) {
            console.error("Error writing coverage file " + cover_out_file + ": " + e);
        }

        DEBUG([ config.java, '-jar', coverageReportJar, '--format', 'lcov', '-o', dirname, cover_out_file ].join(' '));
        exec([ config.java, '-jar', coverageReportJar, '--format', 'lcov', '-o', dirname, cover_out_file ].join(' '), function(err, stdout, stderr) {
            if (err) {
                console.error('Error creating coverage report: ' + err);
                process.exit(1);
            } else {
                for (file in _yuitest_coverage) {
                    cover = _yuitest_coverage[file];
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
            }
        });
    }
}

function generateCoverage(file, cb, files, index) {
    var tempFile = PATH.join('/tmp', PATH.basename(file))
        , realFile
	    , real = true
	    , keep = file
    ;

    try {
        realFile = require.resolve(file);
    } catch(e) {
        if (file.match(/^\./)) {
            file = PATH.join(config.testDir, file);
        }
        realFile = require.resolve(file);
        real = false;
    }

    if (realFile == file && real) {
        // A native module!!  Who know where the heck these are - skip it
        DEBUG('Cannot get coverage for a native module: ' + file);
        cb(files, index);
    } else {
        exec(config.java + ' -jar ' + coverageJar + " -o " + tempFile + " " + realFile, function(err) {
            if (err) {
                console.error("Cannot coveage " + realFile + ': ' + err);
                process.exit(1);
            }  else {
	            FILES_FOR_COVERAGE[keep] = 1;
                cb(files, index);
            }
        });
    }
}

function hookedLoader(request, parent, isMain) {
	if (FILES_FOR_COVERAGE[request]) {
		request = PATH.join('/tmp', PATH.basename(request));
        var cached = m._resolveFilename(request, parent);
        delete m._cache[cached]; // make sure we get a fresh copy every time for mockery
	}

	return originalLoader(request, parent, isMain);
}

