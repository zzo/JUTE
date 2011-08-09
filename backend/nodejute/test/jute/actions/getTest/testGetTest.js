YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('getTest'),
        util      = require('util'),
        glob      = require('glob'),
        hub       = require('./test/mock/hub').getNewHub(),
        common    = require('./jute/actions/common').Create(hub)
        getTest   = require('./jute/actions/getTest', true).Create(hub, common, glob); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'get test'
        ,setUp: function() {
            this.cache = { tests_to_run: [], browsers: {} };
            this.uuid = 'blag';

            this.req = { session: { uuid: this.uuid } };
            this.req.headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:5.0) Gecko/20100101 Firefox/5.0 FirePHP/0.5' }
            this.req.connection = { remoteAddress: '1.2.3.4' };
        }
        ,testHookedUp : function(vals) {
            Y.Assert.areEqual(hub.listeners('action:get_test').length, 1);
        }
        ,testNoTests : function(vals) {
            var res = Y.Mock();
            Y.Mock.expect(res, {
                method: "end",
                args: [Y.Mock.Value.String]
            });

            hub.emit('action:get_test', this.req, res, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Mock.verify(res);
                Y.Assert.isNumber(this.cache.browsers[this.uuid].get_test);
            }, 500);
        }
        ,testSomeTests : function(vals) {
            var res = Y.Mock();
            Y.Mock.expect(res, {
                method: "end",
                args: [Y.Mock.Value.String]
            });

            this.cache.tests_to_run.push({ browser: 'notMe' });

            hub.emit('action:get_test', this.req, res, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Mock.verify(res);
                Y.Assert.isNumber(this.cache.browsers[this.uuid].get_test);
                Y.Assert.areEqual(this.cache.tests_to_run.length, 1, 'test for other browser gone!');
            }, 500);
        }
        ,testMyTestAlreadyRunning : function(vals) {
            var res = Y.Mock();
            Y.Mock.expect(res, {
                method: "end",
                args: [Y.Mock.Value.String]
            });

            Y.Mock.expect(res, {
                method: "write",
                args: [Y.Mock.Value.String]
            });

            this.cache.tests_to_run.push({ browser: this.uuid, running: true, sendOutput: true });

            hub.emit('action:get_test', this.req, res, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Mock.verify(res);
                Y.Assert.isNumber(this.cache.browsers[this.uuid].get_test);
                Y.Assert.areEqual(this.cache.tests_to_run.length, 0, 'test for me still here!');
            }, 500);
        }
        ,testGetTest : function(vals) {
            var res = Y.Mock(), url = 'foo';
            Y.Mock.expect(res, {
                method: "end",
                args: ['{"testLocation":"' + url + '"}']
            });

            this.cache.tests_to_run.push({ browser: this.uuid, url: url });

            hub.emit('action:get_test', this.req, res, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Mock.verify(res);
                Y.Assert.isNumber(this.cache.browsers[this.uuid].get_test);
                Y.Assert.isNumber(this.cache.tests_to_run[0].running, 'test NOT set to run!');
                Y.Assert.areEqual(this.cache.tests_to_run[0].browser, this.uuid, 'Test not running in browser');
            }, 500);
        }
        ,testGetSelTest : function(vals) {
            var res = Y.Mock(), url = 'foo';
            Y.Mock.expect(res, {
                method: "end",
                args: [ '{"testLocation":"' + url + '"}' ]
            });

            this.cache.tests_to_run.push({ browser: 'sel', url: url });
            this.req.session.seleniumUUID = 'sel';

            hub.emit('action:get_test', this.req, res, this.cache);

            // Give it half a second & then verify - test should get taken
            this.wait(function() {
                Y.Mock.verify(res);
                Y.Assert.isNumber(this.cache.browsers[this.uuid].get_test);
                Y.Assert.isNumber(this.cache.tests_to_run[0].running, 'test NOT set to run!');
                Y.Assert.areEqual(this.cache.tests_to_run[0].browser, this.uuid, 'Test not running in sel browser');
            }, 500);
        }
        ,testSelTestsDone : function(vals) {
            var res = Y.Mock(), url = 'foo', event = false;;
            Y.Mock.expect(res, {
                method: "end",
                args: [Y.Mock.Value.String]
            });

            this.req.session.seleniumUUID = 'sel';

            hub.on('seleniumTestsFinished', function() {
                event = true;
            });

            hub.emit('action:get_test', this.req, res, this.cache);

            // Give it half a second & then verify - test should get taken
            this.wait(function() {
                Y.Mock.verify(res);
                Y.Assert.isNumber(this.cache.browsers[this.uuid].get_test);
                Y.assert(event, 'Selenium test finished event did not get called!');
            }, 500);
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

