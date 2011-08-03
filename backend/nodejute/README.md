JUTE Server and Backends
========================

This is the code for the JUTE npm package - https://github.com/zzo/JUTE has the full JUTE scoop...

The examples/ directory show how to set up your files for JUTE testing - basically you leave your original source file that you want to test unchanged.  You create an HTML file linking your source & test javascript files together & load in YUI3.  You can also put any markup your tests need in here.  Finally you add the '?coverage=1' querystring to any Javascript files you want code coverage generated for.

Your test javascript must begin with the:

    YUI({
        logInclude: { TestRunner: true },
        gallery:    'gallery-2011.06.22-20-13'
    }).use('gallery-jute', '<your yui3 module>', ..., function(Y) {
            .... // define suites and test cases in here


        Y.Test.Runner.add(<your suite>);
        Y.Test.Runner.run();
    });

block to load up the JUTE javascript piece.  And that's it!  Write all of your tests as your normally would using the YUI3 test module - details here: http://developer.yahoo.com/yui/3/test/


Note if your original javascript is not written using YUI3 don't worry it doesn't have to be!  Just use it as normal in that YUI3 'use' function block.

Testing non-YUI3 code:

    YUI({
        logInclude: { TestRunner: true },
        gallery:    'gallery-2011.06.22-20-13'
    }).use('gallery-jute', function(Y) {

        var myCode = new MyCode();   // Grab your object to test or whatever

            .... // define suites and test cases in here

        Y.Test.Runner.add(<your suite>);
        Y.Test.Runner.run();
    });

