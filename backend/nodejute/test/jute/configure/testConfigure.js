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
                docRoot: '/var/www',
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

            hub.on('configureDone', function() {
                Y.Assert.fail("testDir supposed to be invalid!!");
            });

            hub.on('configureError', function(obj) {
            console.log(util.inspect(obj));
                Y.Assert.areEqual('testDir', obj.name,  "testDir value should be wrong");
                Y.Assert.areEqual(path.join('/tmp', test.badVal), obj.value,  "testDir value should be " + test.badVal);
            });

            fs.mkdirSync('/tmp/output');
            this.testVals( { docRoot: '/tmp', outputDir: 'output', testDir: this.badVal } );
            fs.rmdirSync('/tmp/output');
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

