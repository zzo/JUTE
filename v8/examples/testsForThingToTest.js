YUI({
    logInclude: { TestRunner: true }
}).use('test', 'gallery-jute', 'foo', function(Y) {

    var suite = new Y.Test.Suite('test');

    suite.add(new Y.Test.Case({

        name:'TEST',

        setUp: function() {
            this.foo = new Y.Foo();
        },

        test_obj : function() {
            Y.Assert.isObject(this.foo);
        },
        test_eq : function() {
            Y.Assert.areEqual(this.foo.foo, 'goo');
        },
        test_str : function () {
            Y.Assert.isTypeOf("string", this.foo.foo);
        },
        test_true : function() {
            Y.Assert.isTrue(this.foo.moo);
        },
        test_undef : function() {
            Y.Assert.isUndefined(this.foo.loo);
            this.foo.addLoo();
            Y.Assert.areSame(this.foo.loo, 99);
        },
        test_incr : function() {
            Y.Assert.areSame(this.foo.incr(6), 7);
        },
        test_by10 : function() {
            Y.Assert.areSame(this.foo.by10(6), 60);
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});
