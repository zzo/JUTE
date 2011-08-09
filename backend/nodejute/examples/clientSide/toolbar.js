YUI().add('toolbar', function(Y) {
    Y.Toolbar = function Toolbar() {
        this.message = "I am a toolbar!";
    };
}, '1.0.0' ,{requires:['attribute', 'event-custom-base', 'common-utils']});

