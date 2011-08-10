YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('runMultiple'),
        hub       = require('./test/mock/hub').getNewHub(),
        util      = require('util'),
        mult       = require('./jute/actions/runMultiple', true).Create(hub); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'runMultiple'
        ,setUp: function() {
        }
        ,testHookedUp : function(vals) {
            Y.Assert.areEqual(hub.listeners('action:run_multiple').length, 1);
        }
        ,testVals : function(vals) {

            // Give it half a second & then verify
            this.wait(function() {
                hub.on('action:run_test', function(req, res, cache) {
                    Y.Assert.areEqual(req, 'a');
                    Y.Assert.areEqual(res, 'b');
                    Y.Assert.areEqual(cache, 'c');
                });

                hub.emit('action:run_multiple', 'a', 'b', 'c');
            }, 500);

        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

