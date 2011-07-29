module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:run_multiple', runMultiple);

        function runMultiple(req, res, cache) {
            req.on('data', function(chunk) {
                report += chunk;
            });
            req.on('end', function() {
                var obj = qs.parse(report),
                    tests = obj.test.split(';')
                ;

                tests.forEach(function(test) {
                    req.param.test = test;
                    hub.emit('run_test', req, res, cache);
                });

                /*
                 * when done: ??
                    $args->{response}->code(302);
                    $args->{response}->content("/jute_docs/run_tests.html");
                */
            });
        }
    }
};



