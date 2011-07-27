module.exports = {
Create:  function(hub) {
    // Events I care about
    hub.addListener('configure', configure);

    function configure(cFile) {
        var config = {
                uid:            process.getuid(),
                gid:            process.getgid(),
                port:           8080,
                cFile:          '/etc/jute.conf', // Default config file location
                docRoot:        '/var/www/',
                jutebase:       'jutebase/',
                testDir:        'test/',
                outputDir:      'output/',
                java:           '/usr/bin/java',
                coverageJarDir: '/usr/lib/yuitest_coverage'
            },
            conf = {},
            fs   = require('fs');

        if (cFile) {
            console.log("cFILE is " + cFile);
            // If not a FQPath prepend './'
            if (!cFile.match(/^\//)) {
                cFile = './' + cFile;
            }
            try {
                conf = require(cFile) 
            } catch(e) {
                hub.emit('log', 'error', '\n** Config file "' + cFile + '" does not exist or is invalid! **\n');
                /*
                hub.emit('log', 'error', "Format of config file is:\n\
    module.exports = {\n\
        port:           8080,\n\
        uid:            'trostler',\n\
        gid:            'pg1090052',\n\
        docRoot:        '/var/www/',\n\
        jutebase:       'jutebase/',\n\
        testDir:        'test/',\n\
        outputDir:      'output/',\n\
        java:           '/usr/bin/java',\n\
        coverageJarDir: '/usr/lib/yuitest_coverage'\n\
    };\n\n\
                ");
                */
                process.exit(1);
            }
        }

        for(var val in config) {
            if (conf[val]) {
                config[val] = conf[val];
            }
        }

        // Make sure all directory values end in '/'...
        [ 'docRoot', 'jutebase', 'testDir', 'outputDir', 'coverageJarDir' ].forEach(function(dir) {
            if (!config[dir].match(/\/$/)) {
                config[dir] += '/';
            }
        });

        // Set process uid/gid
        try {
            process.setgid(config.gid);
            process.setuid(config.uid);
        } catch(e) {
            hub.emit('log', 'error', "** Unable to set uid/gid: " + e + " **");
            process.exit(1);
        }

        // Find the YUI coverage JARs
        try {
            fs.statSync(config.coverageJarDir + 'yuitest-coverage.jar');
            fs.statSync(config.coverageJarDir + 'yuitest-coverage-report.jar');
        } catch(e) {
            hub.emit('log', 'error', "** Cannot find the YUI Test Coverage JARs in '" + config.coverageJarDir + "' **");
            hub.emit('log', 'error', "Dowload them from here: https://github.com/yui/yuitest/tree/master/java/build");
            process.exit(1);
        }

        // Find Java executable
        if (process.env.JAVA_HOME) {
            config.java = [process.env.JAVA_HOME, 'bin', 'java'].join('/');
        }
        try {
            var stat = fs.statSync(config.java);
            if (!stat.isFile()) {
                throw 'fooble';
            }
        } catch(e) {
            hub.emit('log', 'error', '** Cannot find "java" executable **');
            hub.emit('log', 'error', 'Set $JAVA_HOME OR set "java" in your configuration file');
            process.exit(1);
        }

        // Make sure output directory is writable for grins...
        var testFile = config.docRoot + config.jutebase + config.outputDir + 'foo';
        fs.writeFile(testFile, 'Test', function (err) {
            if (err) {
                hub.emit('log', 'error', "** Output directory '" + config.docRoot + config.jutebase + config.outputDir + "' not writable!! **");
                process.exit(1);
            }
            fs.unlinkSync(testFile);

            // All is cool
            hub.emit('configureDone', config);
        });
    }
}
};

