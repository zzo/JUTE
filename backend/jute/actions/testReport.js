module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:test_report', testReport);

        function testReport(req, res, cache) {
            var report = '',
                qs = require('querystring')
            ;

            req.on('data', function(chunk) {
                report += chunk;
            });
            req.on('end', function() {
                var obj = qs.parse(report), succeeded = true,
                    names = common.makeSaneNames(common.browserName(req)),
                    filename = names[0], pkgname = names[1],
                    now = new Date().getTime(),
                    exec = require('child_process').exec
                ;

                // obj = { results: <xml>, name: <name>, coverage: <coverage.json> }
                obj.results = obj.results.replace(/testsuite name="/g, 'testsuite name="' + pkgname + '.');

                if (obj.name) {
                    names = common.dumpFile(obj, 'results', filename + '-test.xml', obj.name);
                    if (common.failedTests(names[0])) {
                        succeeded = false;
                    }
                    hub.emit(hub.LONG, 'info', "Test Report for " + obj.name);
                }

                if (obj.coverage && obj.coverage !== 'null') {
                    var cover_obj = JSON.parse(obj.coverage);
                    for (file in cover_obj) {
                        var new_file = path.join(hub.config.outputDir, obj.name, 'lcov-report', file);
                        cover_obj[new_file] = cover_obj[file];
                        delete cover_obj[file];
                    }
                    obj.coverage = JSON.stringify(cover_obj);
                    names = common.dumpFile(obj, 'coverage', 'cover.json', obj.name);
                    exec(hub.config.java + ' -jar ' + path.join(hub.config.coverageJarDir, "yuitest-coverage-report.jar") + " -o " + names[1] + " --format lcov " + names[0]);
                    hub.emit(hub.LONG, 'info', "Coverage Report for " + obj.name);
                }

                var totalTests = cache.tests_to_run.length;
                for (var i = 0; i < totalTests; i++) {
                    var test = cache.tests_to_run[i];
                    if (test.browser == browser.session.uuid) {
                        if (test.sendOutput) {
                            common.sendRemoteOutput(test.sendOutput, obj.name + "finished - it " + (succeeded ? 'SUCCEEDED' : 'FAILED') + ' it took ' + (now - test.running) + ' seconds');
                        }
                        cache.test_to_run.splice(i, 1);
                        break;
                    }
                }

                res.end('OK');
            });
        }
    }
};

