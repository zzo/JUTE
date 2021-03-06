YUI({
    logInclude: { TestRunner: true },
}).use('test', 'toolbar', 'console', function(Y) {

    var suite = new Y.Test.Suite('toolbar');
    suite.add(new Y.Test.Case({
        name:'simple test',
        setUp: function() {
            this.tb = new Y.Toolbar();
        },
        testIsObject : function () {
            Y.log('testIsObject');
            Y.Assert.isObject(this.tb);
        },
        testMessage : function () {
            Y.log('testIsObject');
            Y.Assert.areEqual(this.tb.message, "I am a toolbar!");
        }

    }));

    Y.Test.Runner.add(suite);

    //initialize the console
    var yconsole = new Y.Console({
        newestOnTop: false
    });

    yconsole.render('#log');
    Y.Test.Runner.run();
});

