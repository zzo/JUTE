YUI().add('toolbar', function(Y) {
    Y.Toolbar = function Toolbar() {
        this.message = "I am a toolbar!";
        function hidden(testme) {
            var ret = testme + ' TESTED';
            return ret;
        }
    };

    Y.Toolbar.prototype = {
        zop: function() {
            this.zop = 'ZOP';
        }
    };

    function testme(y) {
        return y * 55;
    }

}, '1.0.0' ,{requires:['attribute', 'event-custom-base', 'common-utils']});

