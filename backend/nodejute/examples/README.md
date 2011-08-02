These 3 files show how it all fits together.

testToolbar.html is the 'hub' - it loads YUI3 and the file being tested (toolbar.js) and the file with tests (testToolbar.js)

toolbar.js so happens to use YUI3 in this example BUT it doesn't have to - it can use any (or none) JS Framework.  Just make sure you HTML file loads whatever JS Framework you need for your tests to work.

The tests themselves however MUST USE the YUI3 testing framework!!  It's very nice and easy I promise you.

Note in the HTML file the querystring '?coverage=1' tacked on to toolbar.js - this tells JUTE IF you want code coverage THIS is the file you want code coverage for.

Also note in the HTML the 'log' div - IF you include this then you'll get a nice console while your unit tests run - it is NOT required.  Just ensure IF you include this THEN add the 'yui3-skin-sam' class on your <body> element.  No big.

That's about it for the HTML file.  And nothing to say about the file you are testing - that does not change.

In your test JS file (testToolbar.js in this example) this is important:

<verbatim>
YUI({
    logInclude: { TestRunner: true },
    gallery:    'gallery-2011.06.22-20-13'
}).use('gallery-jute', 'toolbar', function(Y) {
</verbatim>

This loads up the client-side part of JUTE AND in this case pulls in the 'toolbar' module that we're testing.  Note if your original JS is NOT a YUI3 module then you do not need this!

Then the 'meat' of the file - I defined a test suite named 'toolbar' - THIS NAME IS IMPORTANT!!  It will be translated into a directory name in your output directory!  This directory will contain all test results and code coverage information for this suite - so name it sanely!!

Then I define some tests and finally I call:

<verbatim>
    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
</verbatim>

To kick the whole thing off.

You can/should load up this HTML directly into your browser and your tests will run indendpendenly of JUTE.

When you are ready to run within JUTE either run 'jute_submit_test' or run it directly via JUTE's WebUI.



