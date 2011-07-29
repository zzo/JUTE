module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:run_multiple', runMultiple);

        // Make this run_test's problem!
        function runMultiple(req, res, cache) {
            hub.emit('action:run_test', req, res, cache);
        }
    }
};



