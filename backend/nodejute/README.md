JUTE Server and Backends
========================

This is the code for the JUTE npm package https://github.com/zzo/JUTE for the full JUTE scoop...

The examples/ directory show how to set up your files for JUTE testing - basically you leave your original source file that you want to test unchanged.  You create an HTML file linking your source & test javascript files together & load in YUI3.  You can also put any markup your tests need in here.  Finally you add the '?coverage=1' querystring to any Javascript files you want code coverage generated for.

Your test javascript must begin with the:

    YUI({
        logInclude: { TestRunner: true },
        gallery:    'gallery-2011.06.22-20-13'
    }).use('gallery-jute', '<your module>', ..., function(Y) {

block to load up the JUTE javascript piece.  And that's it!  Write all of your tests as your normally would using the YUI3 test module - details here: http://developer.yahoo.com/yui/3/test/

