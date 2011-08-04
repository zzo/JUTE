var getConfig = require('./getConfig'),
    hub       = require('./test/mock/hub');

YUI({
    logInclude: { TestRunner: true },
}).use('jute', function(Y) {

    var suite = new Y.Test.Suite('backend');
    suite.add(new Y.Test.Case({
        name:'simple test',
        setUp: function() {
            this.hub = hub.getNewHub();
        },
        testIsObject : function () {
            console.log('EROIJRWIJOEIJOEFWIJEFWIJOEFWIJOEFWIJ');
            getConfig.Create(this.hub);

            Y.log(gc);
            Y.Assert.isObject(gc);
        },
        testMessage : function () {
            Y.log('testIsObject');
//            Y.Assert.areEqual(this.tb.message, "I am a toolbar!");
        }

    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});
