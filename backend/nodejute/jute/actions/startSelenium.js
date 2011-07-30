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
            var soda = require('soda'),
                browser = soda.createClient({
                    url: 'http://' + req.headers.host,
                    host: obj.sel_host,
                    browser: obj.sel_browser
                }),
                TIME_TEST_THRESHOLD = 60,   // Wait up to 60 seconds/test
                maxWaitTime = TIME_TEST_THRESHOLD * (testsLength + 1)
            ;

            browser.
                chain.
                session().
                setTimeout(maxWaitTime).
                open('/?selenium=' + obj.uuid).
                waitForPageToLoad(60000).
                waitForElementPresent('name=multiple_tests').
                testComplete().
                end(function(err) {
                    hub.emit('action:seleniumDone', err);
                });
        }
    }
};

