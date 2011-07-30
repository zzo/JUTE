module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:checkResults', checkResults);

        hub.addListener('action:status', function(req, res, cache) {
            hub.once('action:checkedResults', function(results) {
                results.current_status = cache;
                res.end(JSON.stringify(results));
            });
            hub.emit('action:checkResults');
        });

        function checkResults() {
            var baseDir = hub.config.outputDir,
                fs      = require('fs'),
                glob    = require('glob'),
                path    = require('path');

            // Find & parse all results
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

            hub.emit('action:checkedResults', ret);
        }
    }
};

