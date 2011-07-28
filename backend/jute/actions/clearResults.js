module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:clear_results', clearResults);

        function clearResults(req, res, cache) {
            var exec = require('child_process').exec;

            exec("/bin/rm -rf " + hub.config.outputDir + "/*");
            res.end('OK');
        }
    }
};

