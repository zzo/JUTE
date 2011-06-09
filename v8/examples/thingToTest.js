YUI.add('foo', function(Y) {
    function Foo() {
        this.foo = 'goo';
        this.moo = true;
    }

    Foo.prototype = {
        addLoo: function() { this.loo = 99; },
        incr: function(i) { return i + 1; },
        by10: function(x) { return x * 10; }
    };

    Y.Foo = Foo;
});
