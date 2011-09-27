//var YUI        = require("yui3").YUI;
YUI({
    logInclude: { TestRunner: true },
}).use('test', function(Y) {

    var suite = new Y.Test.Suite('Yahoo'),
        soda = require('soda');
        browser = soda.createClient({
            url: 'http://yahoo.com',
            host: '99-184-251-18.lightspeed.sndgca.sbcglobal.net',
            browser: '*firefox'
        });

        suite.add(new Y.Test.Case({
            name:'Yahoo Search',
            testSearch: function() {
                var test = this;

                /*
                Y.log('running test search: ' + browser);
                Y.log('running test search: ' + browser.session);
                browser.session(function(err, sid) {
                        Y.log('sess: ' + err);
                        Y.log('sess sid: ' + sid);
                        Y.log(browser.open);
                    browser.open('/', function(err) {
                        Y.log('open: ' + err);
                        Y.log(browser.waitForPageToLoad);
                        browser.waitForPageToLoad(10000, function(err) {
                        Y.log('wait: ' + err);
                            browser.testComplete(function(err) {
                        Y.log('complete: ' + err);
                                test.resume(function() {
                        Y.log('resume: ' + err);
                                    Y.Assert.isNull(err);
                                });
                            });
                        });
                    });
                });
                */
                browser.
                    chain.
                    session().
                    open('/').
                    waitForPageToLoad(600000).
                    typeKeys('name=p', 'ZZO Associates').
                    submit('name=sf1').
                    waitForPageToLoad(600000).
                    getText('id=cquery', function(val) {
                        console.log('TEXT: ' + val);
                    }).
                    verifyText('id=cquery', 'We have included zoo associates results - Show only ZZO Associates', function(error) {
                        if (error) {
                            console.log('TEST FAILED: ' + val);
                        }
                    }).
                    testComplete().
                    end(function(error) {
                        test.resume(function() {
                            Y.Assert.isNull(error);
                        });
                    });

                test.wait(1000000);
            }
        }));

        suite.add(new Y.Test.Case({
            name:'Yahoo Search Again',
            testSearch: function() {
                var test = this;
                browser.
                    chain.
                    open('/').
                    waitForPageToLoad(10000).
                    typeKeys('name=p', 'Walrun').
                    submit('name=sf1').
                    waitForPageToLoad(10000).
                    getText('id=cquery', function(val) {
                        console.log('TEXT: ' + val);
                    }).
                    verifyText('id=cquery', 'We have included zoo associates results - Show only ZZO Associates', function(error) {
                        if (error) {
                            console.log('TEST FAILED: ' + val);
                        }
                    }).
                    testComplete().
                    end(function(error) {
                        test.resume(function() {
                            Y.Assert.isNull(error);
                        });
                    });

                test.wait(10000000);
            }
        }));

        Y.Test.Runner.add(suite);
        Y.Test.Runner.run();


});

