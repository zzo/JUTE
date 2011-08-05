module.exports = (function() {

    var events    = require("events"),
        sys       = require("sys"),
        eventHubF = function() { events.EventEmitter.call(this); },
        hub;

    sys.inherits(eventHubF, events.EventEmitter);
    hub = new eventHubF();

    return {
        getNewHub: function() { return hub; }
    };
})();
