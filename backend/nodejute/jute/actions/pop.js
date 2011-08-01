module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:pop', pop);

        // THIS IS DANGEROUS!!!
        //  Take off top test whatever it is
        function pop(req, res, cache) {
            cache.tests_to_run.shift();
            hub.emit('action:status', req, res, cache);
        }
    }
};

