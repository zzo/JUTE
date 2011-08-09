module.exports = (function() {

    var events    = require("events"),
        sys       = require("sys"),
        eventHubF = function() { events.EventEmitter.call(this); this.LOG = 'log'; this.ERROR = 'error'; this.INFO = 'info'; this.DEBUG = 'debug'; },
        hub;

    sys.inherits(eventHubF, events.EventEmitter);
    hub = new eventHubF();

    return {
        getNewHub: function() { hub.config = {}; return hub; }
    };
})();
