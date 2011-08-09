YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('heartBeat'),
        util      = require('util'),
        hub       = require('./test/mock/hub').getNewHub(),
        common    = require('./jute/actions/common').Create(hub),
        getTest   = require('./jute/actions/heartBeat', true).Create(hub, common); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'heart beat'
        ,setUp: function() {
            this.cache = { tests_to_run: [], browsers: {} };

            this.uuid = 'foo';
            this.req = { session: { uuid: this.uuid } };
            this.req.headers = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:5.0) Gecko/20100101 Firefox/5.0 FirePHP/0.5' };
            this.req.connection = { remoteAddress: '1.2.3.4' };
        }
        ,testHookedUp : function(vals) {
            Y.Assert.areEqual(hub.listeners('action:heart_beat').length, 1);
        }
        ,testNothing : function(vals) {
            var res = Y.Mock();

            Y.Mock.expect(res, {
                method: "end",
                args: [Y.Mock.Value.String]
            });

            hub.emit('action:heart_beat', this.req, res, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                hub.emit('action:checkedResults', {});
                this.wait(function() {
                    Y.Mock.verify(res);
                    Y.Assert.isNumber(this.cache.browsers[this.uuid].heart_beat);
                }, 500);
            }, 500);
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

