module.exports = (function() {

    var events    = require("events"),
        util      = require("util"),
        eventHubF = function() { events.EventEmitter.call(this); this.LOG = 'log'; this.ERROR = 'error'; this.INFO = 'info'; this.DEBUG = 'debug'; },
        hub;

    util.inherits(eventHubF, events.EventEmitter);
    hub = new eventHubF();

    return {
        getNewHub: function() { hub.config = {}; return hub; }
    };
})();
