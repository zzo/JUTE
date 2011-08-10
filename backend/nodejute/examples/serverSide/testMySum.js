YUI({
    logInclude: { TestRunner: true },
}).use('jute', function(Y) {

    var suite = new Y.Test.Suite('mySum'),
        mySum = require('./examples/serverSide/mySum', true).mySum;

    suite.add(new Y.Test.Case({
        name:'simple sums',
        testTwoNumbers: function() {
            Y.Assert.areEqual(mySum(5, 5), 10);
        },

        testArray: function() {
            Y.Assert.areEqual(mySum([5, 5]), 10);
        }

    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();

});


