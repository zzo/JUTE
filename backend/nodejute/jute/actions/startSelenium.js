module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:seleniumStart', startSelenium);

        function startSelenium(req, res, cache, obj, testsLength) {
            var soda = require('soda'),
                browser = soda.createSauceClient({
                    url: 'http://' + req.headers.host
                    , host: obj.sel_host
                    , browser: obj.sel_browser
                }),
            TIME_TEST_THRESHOLD = 60,   // Wait up to 60 seconds/test
            maxWaitTime = TEST_TIME_THRESHOLD * (testsLength + 1); 
            ;

            browser
                .chain
                .session()
                .setTimeout(maxWaitTime)
                .open('/')
                .waitForPageToLoad(60000)
                .waitForElementPresent('name=multiple_tests')
                .testComplete()
                .end(function(err) {
                    hub.emit('action:seleniumDone', err);
                });
        }
    }
};

