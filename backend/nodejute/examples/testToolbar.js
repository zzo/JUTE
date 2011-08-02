YUI({
    logInclude: { TestRunner: true },
    gallery:    'gallery-2011.06.22-20-13'
}).use('gallery-jute', 'toolbar', function(Y) {

    var suite = new Y.Test.Suite('toolbar');
    suite.add(new Y.Test.Case({
        name:'simple test',
        setUp: function() {
            this.tb = new Y.Toolbar();
        },
        testIsObject : function () {
            Y.log('testIsObject');
            Y.Assert.isObject(this.tb);
        }
        testMessage : function () {
            Y.log('testIsObject');
            Y.Assert.isSame(this.message, "I am a toolbar!");
        }

    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});
