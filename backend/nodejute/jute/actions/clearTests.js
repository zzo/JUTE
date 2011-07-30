module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:clear_tests', clearTests);

        function clearTests(req, res, cache) {
            cache.tests_to_run = [];
            res.end('OK');
        }
    }
};

