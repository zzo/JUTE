YUI({
    logInclude: { TestRunner: true },
}).use('test', function(Y) {

    var suite = new Y.Test.Suite('Yahoo'),
        soda = require('soda'),
        browser = soda.createClient({
        url: 'http://yahoo.com',
        host: 'localhost',
        browser: '*firefox'
    }).session(function(sid) {

        suite.add(new Y.Test.Case({
            name:'Yahoo Search',
            testSearch: function() {
                var test = this;
                browser.
                    chain.
                    open('/').
                    waitForPageToLoad(10000).
                    typeKeys('name=p', 'ZZO Associates').
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

                this.wait(3100);
            }
        }));

        suite.add(new Y.Test.Case({
            name:'Yahoo Search Again',
            testSearch: function() {
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
                    /*
                    verifyText('id=cquery', 'We have included zoo associates results - Show only ZZO Associates', function(error) {
                        if (error) {
                            console.log('TEST FAILED: ' + val);
                        }
                    }).
                    */
                    testComplete().
                    end(function(error) {
                        test.resume(function() {
                            Y.Assert.isNull(error);
                        });
                    });
            }
        }));


    });

    Y.Test.Runner.add(suite);
    Y.Test.Runner.run();

});

