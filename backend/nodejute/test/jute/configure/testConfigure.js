/*
var YUI  = require('yui3').YUI,
    jute = require('./jv8').inject(YUI);
    */
YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('configure'),
        hub       = require('./test/mock/hub').getNewHub(),
        util      = require('util'),
        configure = require('./jute/configure', true); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        setUp: function() {
            this.expectedKeys = { 
                uid: 12139982,
                gid: 295949,
                port: '8080',
                docRoot: '/tmp/foobie',
                testDir: 'test',
                outputDir: 'output',
                java: '/usr/bin/java',
                logFile: '/tmp/FF.log',
                logFormat: '',
                testRegex: '*.htm*'
            };

            for (var key in this.expectedKeys) {
                process.env['npm_package_config_' + key] = this.expectedKeys[key];
            }

            configure.Create(hub);

        },
        testIsListening : function () {
            // listening for 'configure' event??   
            console.log(util.inspect(hub.listeners('configure')));
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

