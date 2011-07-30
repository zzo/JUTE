module.exports = {

    Create: function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var cache = { browsers: {}, tests_to_run: [] };
            glob = require('glob'),
            path = require('path'),
            actions = glob.globSync(path.join(__dirname, 'actions/', '*.js'));

        // Suck in all available actions
        actions.forEach(function(action) {
            var h = require(action).Create(hub);
            if (path.basename(action, '.js') == 'common') {
                h.common = h;
            }


        });

        hub.addListener('action', function(action, req, res) {
            hub.once('pruneDone', function(redirect) {
                if (redirect) {
                    // done
                    res.end(JSON.stringify({ redirect_run_tests: '/jute_docs/run_tests.html' }));
                } else {
                    // keep party going
                    hub.emit('action:' + action, req, res, cache);
                }

            });
            hub.emit('action:prune', action, req, cache);
        });
    }
};

