YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('clearTests'),
        hub       = require('./test/mock/hub').getNewHub(),
        util      = require('util'),
        clearResults = require('./jute/actions/clearTests', true).Create(hub); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'clear tests'
        ,setUp: function() {
            this.cache = { tests_to_run: [ 'foobie', 'doobie', 'doo' ] };
        }
        ,testVals : function(vals) {
            var res = Y.Mock();

            Y.Mock.expect(res, { method: "end", args: ["OK"] });

            hub.emit('action:clear_tests', {}, res, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Mock.verify(res);
                Y.Assert.areEqual(this.cache.tests_to_run.length, 0, 'Ensure cache is empty');
            }, 500);
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

