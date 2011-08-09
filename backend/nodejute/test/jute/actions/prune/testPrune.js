YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('prune'),
        util      = require('util'),
        hub       = require('./test/mock/hub').getNewHub(),
        common    = require('./jute/actions/common').Create(hub),
        prune     = require('./jute/actions/prune', true).Create(hub, common); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'prune'
        ,setUp: function() {

            this.uuid = 'foo';
            this.req = { session: { uuid: this.uuid } };
            this.req.headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:5.0) Gecko/20100101 Firefox/5.0 FirePHP/0.5' };
            this.req.connection = { remoteAddress: '1.2.3.4' };

            hub.removeAllListeners('pruneDone');
            hub.removeAllListeners(hub.LOG);

        }
        ,testHookedUp : function(vals) {
            Y.Assert.areEqual(hub.listeners('action:prune').length, 1);
        }
        ,testStatus : function(vals) {
            var res = Y.Mock();
            hub.emit('action:prune', 'status');

            // Give it half a second & then verify
            this.wait(function() {
                Y.assert(true, 'We skipped all pruning for status call!');
            }, 500);
        }
        ,testPruneBrowsers : function(vals) {
            var cache = { tests_to_run: [ { browser: 'aBrowser' } ], browsers: { aBrowser: { name: 'BLARG', heart_beat: 0 } } },
                timedOut = false;

            hub.once(hub.LOG, function(sev, message) {
                if (sev == hub.ERROR && message.match(/We lost browser BLARG/)) {
                    timedOut = true;
                }
            });

            hub.emit('action:prune', 'zob', this.req, cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Assert.isTrue(timedOut, 'We did not lose browser!');
                Y.Assert.isUndefined(cache.browsers.aBrowser, 'Browser should be out of cache!!');
                Y.Assert.areEqual(cache.tests_to_run.length, 0, 'Test not deleted for gone browser!');
            }, 500);
        }
        ,testPruneTests : function(vals) {
            var now = new Date().getTime(),
                cache = { tests_to_run: [ { url: '/blah/mah/goo/foo',  running: 1, browser: 'aBrowser' } ], browsers: { aBrowser: { name: 'BLARG', heart_beat: now }, foo: {} } },
                killTest = false, redirected = false, dumped = false;

            hub.on(hub.LOG, function(sev, mesg) {
                if (sev == hub.ERROR && mesg.match(/running for too long/)) {
                    killTest = true;
                }
                if (sev == hub.INFO && mesg.match(/Dumping/)) {
                    dumped = true;
                }
            });

            hub.once('pruneDone', function(redirect) {
                redirected = true;
            });

            hub.emit('action:prune', 'zob', this.req, cache);

            this.wait(function() {
                Y.Assert.isTrue(killTest, 'We did not kill the test!');
                Y.Assert.isTrue(redirected, 'We did not redirect the browser!');
                Y.Assert.isTrue(dumped, 'Did not dump error XML');
                Y.Assert.areEqual(cache.tests_to_run.length, 0, 'Test not deleted for gone browser!');
                Y.Assert.isNumber(cache.browsers[this.uuid].get_test, 'Did not set get_test for cached browser');
                Y.Assert.isNumber(cache.browsers[this.uuid].heart_beat, 'Did not set heart_beat for cached browser');
            }, 1000);

        }
        ,testPruneTestsNotRunning : function(vals) {
            var now = new Date().getTime(),
                cache = { tests_to_run: [ { } ], browsers: { foo: { get_test: 1 } } },
                tooLong = false, redirected = false;

            hub.on(hub.LOG, function(sev, mesg) {
                if (sev == hub.ERROR && mesg.match(/too long since/)) {
                    tooLong = true;
                }
            });

            hub.once('pruneDone', function(redirect) {
                redirected = redirect;
            });

            hub.emit('action:prune', 'zob', this.req, cache);

            this.wait(function() {
                Y.assert(tooLong, 'We did not kill the test!');
                Y.assert(redirected, 'We did not redirect the browser!');
            }, 1000);

        }
        ,testPruneTestsNotRunningGetTest : function(vals) {
            var now = new Date().getTime(),
                cache = { tests_to_run: [ { } ], browsers: { foo: { get_test: 1 } } },
                redirected = false;

            hub.once('pruneDone', function(redirect) {
                redirected = redirect;
            });

            hub.emit('action:prune', 'get_test', this.req, cache);

            this.wait(function() {
                Y.assert(!redirected, 'We did redirect the browser!');
            }, 1000);

        }

    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

