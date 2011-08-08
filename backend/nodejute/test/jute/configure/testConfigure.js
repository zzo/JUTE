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
        fs        = require('fs'),
        path      = require('path'),
        configure = require('./jute/configure', true).Create(hub); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'configure basics',
        setUp: function() {
            this.expectedKeys = { 
                port: '8080',
                docRoot: '/tmp',
                testDir: 'test',
                outputDir: 'output',
                java: '/usr/bin/java',
                logFile: '/tmp/FF.log',
                logFormat: '',
                testRegex: '*.htm*'
            };

            this.badVal = '/KRAZY';

            hub.removeAllListeners('configureDone');
            hub.removeAllListeners('configureError');
        }
        ,testVals : function(vals) {
            var clone = JSON.parse(JSON.stringify(this.expectedKeys));
            for (var k in vals) {
                clone[k] = vals[k];
            }

            for (var k in this.expectedKeys) {
                if (!clone[k]) {
                    clone[k] = this.expectedKeys[k];
                }
            }

            for (var k in clone) {
                process.env['npm_package_config_' + k] = clone[k];
            }

            hub.emit('configure');
        }
        ,testIsListening : function () {
            // Should be 1 listener for the 'configure' event
            Y.Assert.areEqual(hub.listeners('configure').length, 1);
        }
        ,testDocRootFail : function () {
            var test = this;

            hub.on('configureDone', function() {
                Y.Assert.fail("docRoot supposed to be invalid!!");
            });

            hub.on('configureError', function(obj) {
                Y.Assert.areEqual(obj.name, 'docRoot',  "docRoot value should be wrong");
                Y.Assert.areEqual(obj.value, test.badVal,  "docRoot value should be " + test.badVal);
            });

            this.testVals({ docRoot: this.badVal });
        }
        ,testOutputDirFail : function () {
            var test = this;

            hub.on('configureDone', function() {
                Y.Assert.fail("outputDir supposed to be invalid!!");
            });

            hub.on('configureError', function(obj) {
                Y.Assert.areEqual('outputDir', obj.name,  "testDir value should be wrong");
                Y.Assert.areEqual(path.join('/tmp', test.badVal), obj.value,  "testDir value should be " + test.badVal);
            });

            this.testVals( { docRoot: '/tmp', outputDir: this.badVal } );
        }
        ,testTestDirFail : function () {
            var test = this;

            hub.on('configureDone', function(obj) {
                Y.Assert.areEqual(path.join('/tmp', test.badVal), obj.testDir,  "testDir value should be " + test.badVal);
                fs.rmdirSync('/tmp/output');
            });

            hub.on('configureError', function(obj) {
                console.log(obj);
                Y.Assert.areEqual('testDir', obj.name,  "testDir value should be wrong");
                Y.Assert.areEqual(path.join('/tmp', test.badVal), obj.value,  "testDir value should be " + test.badVal);
                fs.rmdirSync('/tmp/output');
            });

            try {
            fs.mkdirSync('/tmp/output', 0777);
            } catch(e) {}

            this.testVals( { docRoot: '/tmp', outputDir: 'output', testDir: this.badVal } );
        }
        ,testJavaFail : function () {

            hub.on('configureDone', function(obj) {
                Y.Assert.fail("java supposed to be invalid!!");
            });

            hub.on('configureError', function(obj) {
                Y.Assert.areEqual('java', obj.name,  "java value should be wrong");
                Y.Assert.areEqual('/zany', obj.value,  "java value should be /zany");
            });

            this.testVals( { java: '/zany' } );
        }
        ,testUIDFail : function () {

            hub.on('configureDone', function(obj) {
                    console.log(util.inspect(obj));
                Y.Assert.fail("uid supposed to be invalid!!");
                fs.rmdirSync('/tmp/output');
            });

            hub.on('configureError', function(obj) {
                Y.Assert.areEqual('uid/gid', obj.name,  "uid/gid value should be wrong");
                Y.Assert.areEqual('zany', obj.value[1],  "java value should be zany");
                fs.rmdirSync('/tmp/output');
                process.env.npm_package_config_uid = '';
            });

            try {
                fs.mkdirSync('/tmp/output', 0777);
            } catch(e) {}

            this.testVals( { uid: 'zany' } );
        }
        ,testGIDFail : function () {

            hub.on('configureDone', function(obj) {
                Y.Assert.fail("gid supposed to be invalid!!");
                fs.rmdirSync('/tmp/output');
            });

            hub.on('configureError', function(obj) {
                Y.Assert.areEqual('uid/gid', obj.name,  "uid/gid value should be wrong");
                Y.Assert.areEqual('zany', obj.value[0],  "java value should be zany");
                fs.rmdirSync('/tmp/output');
                process.env.npm_package_config_gid = '';
            });


            try {
                fs.mkdirSync('/tmp/output', 0777);
            } catch(e) {}

            this.testVals( { gid: 'zany' } );
        }
        ,testHubConfig : function () {
            var test = this;

            hub.on('configureDone', function(obj) {
                for (var k in obj) {
                    if (!test.expectedKeys[k]) continue;
                    if (k == 'uid' || k == 'gid') continue;
                    if (k == 'outputDir' || k == 'testDir') {
                        test.expectedKeys[k] = path.join(test.expectedKeys.docRoot, test.expectedKeys[k]);
                    }
                    Y.Assert.areEqual(test.expectedKeys[k], obj[k],  test.expectedKeys[k] + ' should be ' + obj[k]);
                }
                fs.rmdirSync('/tmp/output');
            });

            hub.on('configureError', function(obj) {
                Y.Assert.fail("config should have worked!!");
                fs.rmdirSync('/tmp/output');
            });

            try {
                fs.mkdirSync('/tmp/output', 0777);
            } catch(e) {}

            this.testVals( { } );
        }
        ,testJavaEnv : function () {

            hub.on('configureDone', function(obj) {
                Y.Assert.fail("java supposed to be invalid!!");
            });

            hub.on('configureError', function(obj) {
                Y.Assert.areEqual('java', obj.name,  "uid/gid value should be wrong");
                Y.Assert.areEqual('/not/here/bin/java', obj.value,  "java value should be zany");
            });

            process.env.JAVA_HOME = '/not/here';
            this.testVals( { } );
            process.env.JAVA_HOME = '';
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

