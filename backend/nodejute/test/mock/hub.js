module.exports = (function() {

    var events    = require("events"),
        sys       = require("sys"),
        eventHubF = function() { events.EventEmitter.call(this); };

    sys.inherits(eventHubF, events.EventEmitter);

    return {
        getNewHub: function() {console.log('NEW HUB');  return new eventHubF(); }
    };
})();
