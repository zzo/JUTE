module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:heart_beat', heartBeat);

        function heartBeat(req, res, cache) {
            // Update heartbeat time
            if (!cache.browsers[req.session.uuid]) {
                cache.browsers[req.session.uuid] = {};
            }

            cache.browsers[req.session.uuid].heart_beat = new Date().getTime();
            cache.browsers[req.session.uuid].name = common.browserName(req);

            hub.once('action:checkedResults', function(results) {
                results.current_status = cache;
                res.end(JSON.stringify(results));
            });
            hub.emit('action:checkResults');
        }
    }
};

