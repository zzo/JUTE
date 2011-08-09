YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('pop'),
        util      = require('util'),
        hub       = require('./test/mock/hub').getNewHub(),
        pop       = require('./jute/actions/pop', true).Create(hub); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'pop'
        ,setUp: function() {
            this.cache = { tests_to_run: [] };
        }
        ,testHookedUp : function(vals) {
            Y.Assert.areEqual(hub.listeners('action:pop').length, 1);
        }
        ,testNothing : function(vals) {

            hub.emit('action:pop', {}, {}, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Assert.areEqual(this.cache.tests_to_run.length, 0);
            }, 500);
        }
        ,testSomething : function(vals) {

            this.cache.tests_to_run.push('foobie');

            hub.emit('action:pop', {}, {}, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Assert.areEqual(this.cache.tests_to_run.length, 0);
            }, 500);
        }
        ,testMore : function(vals) {

            this.cache.tests_to_run.push('foobie');
            this.cache.tests_to_run.push('goobie');

            hub.emit('action:pop', {}, {}, this.cache);

            // Give it half a second & then verify
            this.wait(function() {
                Y.Assert.areEqual(this.cache.tests_to_run.length, 1);
                Y.Assert.areEqual(this.cache.tests_to_run[9], 'goobie');
            }, 500);
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

