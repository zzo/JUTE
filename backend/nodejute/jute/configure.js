module.exports = {
Create:  function(hub) {
    path = require('path');

    // Events I care about
    hub.addListener('configure', configure);

    function configure() {
        var config = {
                uid:            process.getuid(),
                gid:            process.getgid(),
                port:           8080,
                docRoot:        '/var/www/',
                testDir:        'test/',
                outputDir:      'output/',
                java:           '',
                logFile:        '/tmp/jute.log',
                logFormat:      '',
                testRegex:      '*.htm*'
            },
            exec = require('child_process').exec,
            fs   = require('fs');

        // Suck in NPM config variables
        for (var key in config) {
            var val = process.env['npm_package_config_' + key];
            if (val) {
                config[key] = val;
            }
        }

        // Web paths and full paths...
        config.outputDirWeb = config.outputDir;
        config.outputDir    = path.join(config.docRoot, config.outputDir);

        config.testDirWeb   = config.testDir;
        config.testDir      = path.join(config.docRoot, config.testDir);

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
        } else if (!config.java) {
            exec('which java', function (error, stdout, stderr) {
                if (error !== null) {
                    hub.log(hub.LOG, 'error', 'Cannot find "java" executable - you will not be able to get code coverage - make sure "java" is in your PATH');
                    process.exit(1);
                }
                config.java = stdout.trim();
            });
        }

        try {
            var stat = fs.statSync(config.java);
            if (!stat.isFile()) {
                throw 'foobie';
            }
        } catch(e) {
            hub.emit(hub.LOG, 'error', '** Cannot find "java" executable **');
            hub.emit(hub.LOG, 'error', 'Set $JAVA_HOME OR set the "java" configuration variable (% npm config set jute:java <path>)');
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

