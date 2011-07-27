#!/usr/bin/env node

var cFile    = '/etc/jute.conf',
    sys      = require('sys'),
    events   = require("events"),
    eventHubF  = function() { events.EventEmitter.call(this) }
    ;

    /**
     * Create our event hub
     */
    sys.inherits(eventHubF, events.EventEmitter);
    var eventHub = new eventHubF();

    /*
     * Events we care about
     */
    eventHub.addListener('configure', configure);
    eventHub.addListener('configureDone', startServer);

    // Get Party Started
    eventHub.emit('configure', process.argv[2]);

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
            // If not a FQPath prepend './'
            if (!cFile.match(/^\//)) {
                cFile = './' + cFile;
            }
            try {
                conf = require(cFile) 
            } catch(e) {
                console.error('\n** Config file "' + cFile + '" does not exist or is invalid! **\n'); 
                console.error("Format of config file is:\n\
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
            console.error("** Unable to set uid/gid: " + e + " **");
            process.exit(1);
        }

        // Find the YUI coverage JARs
        try {
            fs.statSync(config.coverageJarDir + 'yuitest-coverage.jar');
            fs.statSync(config.coverageJarDir + 'yuitest-coverage-report.jar');
        } catch(e) {
            console.error("** Cannot find the YUI Test Coverage JARs in '" + config.coverageJarDir + "' **");
            console.error("Dowload them from here: https://github.com/yui/yuitest/tree/master/java/build");
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
            console.error('** Cannot find "java" executable **');
            console.error('Set $JAVA_HOME OR set "java" in your configuration file');
            process.exit(1);
        }

        // Make sure output directory is writable for grins...
        var testFile = config.docRoot + config.jutebase + config.outputDir + 'foo';
        fs.writeFile(testFile, 'Test', function (err) {
            if (err) {
                console.error("** Output directory '" + config.docRoot + config.jutebase + config.outputDir + "' not writable!! **");
                process.exit(1);
            }
            fs.unlinkSync(testFile);

            // All is cool
            eventHub.emit('configureDone', config);
        });
    }

    function startServer(config) {

        var connect  = require('connect'),
            os       = require('os'),
            uuid     = require('node-uuid');

        console.log("Running as " + process.getuid() + '/' + process.getgid());
        console.log("Connect at http://" + os.hostname() + '/jute/');

        connect(
          connect.cookieParser()
        , connect.session({ secret: 'jute rox', cookie: { maxAge: 5000 }})
        , connect.favicon()
        , function(req, res, next) {
            var sess = req.session;
            console.log(sess);
            if (!sess.uuid) {
                sess.uuid = uuid();
                sess.cookie.expires = false;
            }
            res.setHeader('Content-Type', 'text/html');
            res.end('<p>views: ' + sess.uuid + '</p>');
        }
        ).listen(config.port);
    }

