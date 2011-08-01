module.exports = {
Create:  function(hub) {
    path = require('path');

    // Events I care about
    hub.addListener('configure', configure);

    function configure(cFile) {
        var config = {
                uid:            process.getuid(),
                gid:            process.getgid(),
                port:           8080,
                docRoot:        '/var/www/',
                jutebase:       'jutebase/',
                testDir:        'test/',
                outputDir:      'output/',
                java:           '/usr/bin/java',
                logFile:        '/tmp/jute.log',
                logFormat:      '',
                testRegex:      '*.htm*'
            },
            conf = {},
            fs   = require('fs');

        if (cFile) {
            // If not a FQPath prepend './'
            if (!cFile.match(/^\//)) {
                cFile = './' + cFile;
            }
            try {
                conf = require(cFile) 
            } catch(e) {
                hub.emit(hub.LOG, 'error', '\n** Config file "' + cFile + '" does not exist or is invalid! **\n');
                hub.emit(hub.LOG, 'error', e.toString() + "\n");
                hub.emit(hub.LOG, 'error', "Format of config file is:\n\
    module.exports = {\n\
        port:           8080,\n\
        uid:            'trostler',\n\
        gid:            'pg1090052',\n\
        docRoot:        '/var/www/',\n\
        jutebase:       'jutebase/',\n\
        testDir:        'test/',\n\
        outputDir:      'output/',\n\
        logFile:        '/tmp/jute.log',\n\
        java:           '/usr/bin/java'\n\
    };\n\n\
\
All values are optional.\n\
                ");
                process.exit(1);
            }
        } else {
            for (var key in config) {
                var val = process.env['npm_package_config_' + key];
                if (val) {
                    conf[key] = val;
                }
            }
        }

        for(var val in config) {
            if (conf[val]) {
                config[val] = conf[val];
            }
        }

        config.outputDir = path.join(config.docRoot, config.jutebase, config.outputDir);

        config.testDirWeb   = path.join('/', config.jutebase, config.testDir);
        config.testDir      = path.join(config.docRoot, config.jutebase, config.testDir);

        // Set process uid/gid
        try {
            process.setgid(config.gid);
            process.setuid(config.uid);
        } catch(e) {
            hub.emit(hub.LOG, 'error', "** Unable to set uid/gid: " + e + " **");
            process.exit(1);
        }

        // Find Java executable
        if (process.env.JAVA_HOME) {
            config.java = path.join(process.env.JAVA_HOME, 'bin', 'java');
        }
        try {
            var stat = fs.statSync(config.java);
            if (!stat.isFile()) {
                throw 'fooble';
            }
        } catch(e) {
            hub.emit(hub.LOG, 'error', '** Cannot find "java" executable **');
            hub.emit(hub.LOG, 'error', 'Set $JAVA_HOME OR set "java" in your configuration file');
            process.exit(1);
        }

        // Make sure output directory is writable for grins...
        var testDir = path.join(config.outputDir, 'foo');
        fs.mkdir(testDir, 0777, function(err) {
            if (err) {
                hub.emit(hub.LOG, 'error', "** Output directory '" + config.outputDir + "' not writable!! **");
                process.exit(1);
            }
            fs.rmdirSync(testDir);

            // All is cool - stash config & move on
            hub.config = config;
            hub.emit('configureDone', config);
        });
    }
}
};

