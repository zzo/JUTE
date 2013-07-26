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
    path = require('path');

    // Events I care about
    hub.addListener('configure', configure);

    function configure() {

        var config = {
                port:           5883,
                docRoot:        '/var/www',
                testDir:        'test/',
                outputDir:      'output/',
                java:           '',
                logFormat:      '',
                logFile:        '/tmp/jute.log',
                testRegex:      '.html$',
                inject:         1,
                phantomjs:      '/usr/local/bin/phantomjs',
                host:           ''
            },
            exec = require('child_process').exec,
            fs   = require('fs');

        hub.config = config;

        // Suck in NPM config variables
        for (var key in config) {
            var val = process.env['npm_package_config_' + key];
            if (val) {
                config[key] = val;
            }
        }

        try {
            config.logFD = fs.openSync(config.logFile, "w");
        } catch(e) {
            console.error('Cannot open logilfe: ' + e);
            hub.emit('configureError', { name: 'logFile', value: config.logFile, error: e } );
            return;
        }

        try {
            var stat = fs.statSync(config.docRoot);
                if (!stat.isDirectory()) {
                    throw 'foobie';
                }
        } catch(e) {
            hub.emit(hub.LOG, hub.ERROR, "** " + config.docRoot + " does not exist or is not a directory!! **");
            hub.emit(hub.LOG, hub.ERROR, "Set it properly: npm config set jute:docRoot <directory>");
            hub.emit('configureError', { name: 'docRoot', value: config.docRoot, error: e } );
            return;
        }

        // Web paths and full paths...
        config.outputDirWeb = config.outputDir;
        config.outputDir    = path.join(config.docRoot, config.outputDir);
        try {
            fs.statSync(config.outputDir);
        } catch(e) {
            try {
                fs.mkdirSync(config.outputDir, 0777)
            } catch(e2) {
                hub.emit(hub.LOG, hub.ERROR, "Cannot make output dir: " + e2);
                hub.emit('configureError', { name: 'outputDir', value: config.outputDir, error: e2 } );
                return;
            }
        }

        config.testDirWeb   = config.testDir;
        if (!config.testDirWeb.match(/\/$/)) {
            config.testDirWeb += '/';
        }

        config.testDir = path.join(config.docRoot, config.testDir);

        try {
            fs.statSync(config.testDir);
        } catch(e) {
            try {
                fs.mkdirSync(config.testDir, 0777)
            } catch(e2) {
                hub.emit(hub.LOG, hub.ERROR, "Cannot make test dir: " + e2);
                hub.emit('configureError', { name: 'testDir', value: config.testDir, error: e2 } );
                return;
            }
        }

        // Find Java executable
        if (!config.java) {
            exec('which java', function (error, stdout, stderr) {
                if (!error) {
                    config.java = stdout.trim();
                }
                try {
                    var stat = fs.statSync(config.java);
                    if (!stat.isFile()) {
                        throw 'foobie';
                    }
                } catch(e) {
                    hub.emit(hub.LOG, hub.ERROR, '** Cannot find "java" executable in PATH **');
                    hub.emit(hub.LOG, hub.ERROR, 'Set the "java" configuration variable (% npm config set jute:java <path>)');
                    hub.emit(hub.LOG, hub.ERROR, 'Or add the "java" executable to your PATH');
                    hub.emit('configureError', { name: 'java', value: config.java, error: e } );
                    return;
                }
            });
        } else {
            try {
                var stat = fs.statSync(config.java);
                if (!stat.isFile()) {
                    throw 'foobie';
                }
            } catch(e) {
                hub.emit(hub.LOG, hub.ERROR, '** Cannot find "java" executable **');
                hub.emit(hub.LOG, hub.ERROR, 'NPM java config variable improperly set: ' + config.java);
                hub.emit('configureError', { name: 'java', value: config.java, error: e } );
                return;
            }
        }

        // Make sure output directory is writable for grins...
        var testDir = path.join(config.outputDir, 'foo');
        try {
            fs.mkdirSync(testDir, 0777);
        } catch(e) {
            hub.emit(hub.LOG, hub.ERROR, "** Output directory '" + config.outputDir + "' not writable or does not exist!! **");
            hub.emit(hub.LOG, hub.ERROR, "Note outputDir is RELATIVE to docRoot!!");
            hub.emit(hub.LOG, hub.ERROR, "Change output dir using: % npm conifg set jute:outputDir <dir>");
            hub.emit(hub.LOG, hub.ERROR, "Or make " + config.outputDir + ' writable by user/group running jute');
            hub.emit('configureError', { name: 'outputDir', value: config.outputDir, error: e } );
            return;
        }

        try {
            fs.rmdirSync(testDir);
        } catch(e) {}

        // All is cool - stash config & move on
        hub.config = config;
        hub.emit('configureDone', config);
    }
}
};

