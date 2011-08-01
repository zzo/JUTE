module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            sys = require('sys'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:seleniumStart', startSelenium);


        function startSelenium(req, res, obj, testsLength) {
            var soda = require('soda'), cb,
                browser = soda.createClient({
                    url: 'http://' + req.headers.host,
                    host: obj.sel_host,
                    browser: obj.sel_browser
                }),
                TIME_TEST_THRESHOLD = 60,   // Wait up to 60 seconds/test
                maxWaitTime = TIME_TEST_THRESHOLD * (testsLength + 1)
            ;

            // called when all Selenium tests are complete for this browser
            cb = function() {
                    browser.chain.testComplete().end(function(err) {
                        hub.emit('action:seleniumDone', err);
                    });
                };
            cb = hub.once('seleniumTestsFinished', cb);

            browser.
                chain.
                session().
                setTimeout(maxWaitTime).
                open('/?selenium=' + obj.uuid).
                waitForPageToLoad(60000).
                end(function(err) {
                    if (err) {
                        var msg = 'Error starting/waiting for Selenium page to load: ' + err;
                        hub.emit(hub.LOG, 'error', msg);
                        res.end(msg);
                        hub.removeListener('seleniumTestsFinished', cb);
                    }
                });
        }
    }

};

