module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:heart_beat', heartBeat);

        function heartBeat(req, res, cache) {
            var baseDir = hub.config.outputDir,
                fs      = require('fs'),
                glob    = require('glob'),
                path    = require('path');

            // Update heartbeat time
            if (!cache.browsers[req.session.uuid]) {
                cache.browsers[req.session.uuid] = {};
            }

            cache.browsers[req.session.uuid].heart_beat = new Date().getTime();
            cache.browsers[req.session.uuid].name = common.browserName(req);

            // Now find all results
            var components = fs.readdirSync(baseDir), ret = { current_results: {} };
            components.forEach(function(component) {
                var testFiles, testResults = [];

                component = path.basename(component);
                testFiles = glob.globSync(path.join(baseDir, component, '*.xml'));
                testFiles.forEach(function(testFile) {
                    if (common.failedTests(testFile)) {
                        testResults.push({ name: path.basename(testFile), failed: 1 });
                    } else {
                        testResults.push({ name: path.basename(testFile), failed: 0 });
                    }
                });

                var coverage = path.existsSync(path.join(baseDir, component, 'lcov-report'));
                ret.current_results[component] = {};
                ret.current_results[component].test_results = testResults;
                ret.current_results[component].coverage     = coverage;
            });

            ret.current_status = cache;
            res.end(JSON.stringify(ret));
        }
    }
};

