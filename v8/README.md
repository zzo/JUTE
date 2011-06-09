<!-- The code below creates a default page header by spacing out the topic name -->

JUTE V8
====================

<!-- %TOC% -->

Javascript Unit Testing Environment (JUTE) for NodeJS/V8


Abstract
=========

JUTE allows unobtrusive [JavaScript](JavaScript.html) YUI3 unit testing, code coverage, and yslow. Command line and web-based interfaces make JUTE easy to integrate with Hudson, developers, and even (gasp!) managers. There are 3 backends available to test your code: Selenium, Capture Mode, and V8.

Requirements


3.1.1+ of YUI3
---------------


[NodeJS](http://nodejs.org) .4
-------------------------------------


Super Quick Start
==================

Install JUTE V8
---------------

% npm install jute_v8

Set 2 Environment Variables
---------------------------

1. % export JUTE_OUTPUT_ROOT=/directory/where/you/want/output/to/go/

2. % export JUTE_TEST_ROOT=/directory/root/where/your/tests/live/

All test files you run are relative to this directory.

Require JUTE module in your TEST Javascript
--------------------------------------------

<pre>
YUI().use('test', 'gallery-jute', ..., function(Y) {
    // YUI3 Test Code...
});
</pre>

Run a test
----------

% jute_v8 testFile.html

Where 'testFile.html' is relative to JUTE_TEST_ROOT

In-Depth Start
===============

JUTE output directory
----------------------

JUTE writes unit test results and optionally coverage information into an output directory. You set the directory name by:

% export JUTE_OUTPUT_DIR=/directory/where/you/want/output/to/go/

JUTE test directory
--------------------

JUTE pulls test files relative to JUTE_TEST_ROOT.  You set the directory name by:

<pre>
% export JUTE_TEST_ROOT=&lt;SOMETHING_ELSE>
</pre>

Command Line
-------------

The 'jute_v8' command line requires 1 mandatory argument - the test file name - and one optional argument - generate code coverage or not

<pre>
% jute_v8 &lt;test_file_name> [ 1 ]
</pre>

If a '1' (or any true value) is provided after the test name then code coverage information for this test run is generated.

NOTE!
=====

You MUST have 'java' installed and in your PATH to generate code coverage.

JUTE Output
============

JUTE output all goes into the JUTE_OUTPUT_ROOT as specified above.  Within that directory will be a directory for each unit test.  The name of the directory is the NAME OF THE TEST SUITE as specified in your javascript test file.  This will be explained in more detail below.

Test Results
-------------

For each test an XML file will be created.  The name of the XML file is v8-test.xml.

The format of this file is JUnit XML style test output recognizable by most tools including Hudson.

This looks like:

<pre>
   &lt;?xml version="1.0" encoding="UTF-8"?>
   &lt;testsuites>
       &lt;testsuite name="Mozilla5.0.Macintosh.U.Intel.Mac.OS.X.10.5.8.en-US.AppleWebKit534.16.KHTML.like.Gecko.Chrome10.0.648.127.Safari534.16.initialization" tests="3" failures="0" time="0.021">
           &lt;testcase name="testLoggerNotInitialized" time="0.001">&lt;/testcase>
           &lt;testcase name="testInitRocketStats" time="0.001">&lt;/testcase>
           &lt;testcase name="testLoggerInititialized" time="0"> &lt;/testcase>
       &lt;/testsuite>
       &lt;testsuite name="Mozilla5.0.Macintosh.U.Intel.Mac.OS.X.10.5.8.en-US.AppleWebKit534.16.KHTML.like.Gecko.Chrome10.0.648.127.Safari534.16.logger" tests="4" failures="0" time="0.025">
           &lt;testcase name="testGetTheInitializedLoggerObject" time="0"> &lt;/testcase>
           &lt;testcase name="testLoggerHasCorrectLogLevels" time="0.001"> &lt;/testcase>                                                                                                                      
           &lt;testcase name="testLoggerHasRightNumberOfAppenders" time="0.001">&lt;/testcase>
           &lt;testcase name="testAddAppenderToLogger" time="0.001">&lt;/testcase>
       &lt;/testsuite>
   &lt;/testsuites>
</pre>


Coverage Output
----------------

The the same directory as the test result output will be a directory named 'lcov-report'.  In that directory will be an index.html file you can load into your browser to see coverage results.  JUTE uses yuitest_coverage to instrument and exact coverage information form the requested Javascript files.  See below for how to tell JUTE to instrument selected Javascript files for code coverage.


Writing Unit Tests for JUTE
============================

JUTE requires VERY LITTLE from the developer to have their unit tests incorporated into the JUTE framework.  Any new or already-written Unit Tests can easily be added to the JUTE framework.


Code Requirements
------------------

To utilize JUTE you need only to make small additions to your current HTML file and 1 small addition to your test Javascript file.


### HTML requirements

You must include YUI3 3.1.1+

Here is a standard test HTML file - we will examine all the important bits below.

<pre>
  1 &lt;!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 [Transitional//EN](Transitional//EN.html)">
  2 &lt;html lang="en">
  3 
  4 &lt;head>
  5   &lt;meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">
  6 &lt;/head>
  7 
  8 &lt;body class="yui3-skin-sam">
  9     &lt;div id="log">&lt;/div>
 10 
 11     &lt;div id="pagetoolbar">
 12         &lt;span class="btn left right" >
 13             &lt;a id="deleteLink" href="http://dont.go.here.com" title="{{str|replace_me}}" data-action="delete">Delete&lt;/a>
 14         &lt;/span>
 15         &lt;span class="btn menu" id="btn-move" data-action="menu">
 16             &lt;a id="moveLink" href="http://dont.go.here.com" title="{{str|replace_me}}">Move&lt;b>&lt;/b>&lt;/a>
 17         &lt;/span>
 18     &lt;/div>
 19 
 20     &lt;script src="http://yui.yahooapis.com/3.3.0/build/yui/yui.js">&lt;/script>
 21     &lt;script src="../../../../src/common/utils/utils.js">&lt;/script>
 22     &lt;script src="../../../../src/common/ui/toolbar/toolbar.js?coverage=1">&lt;/script>
 23     &lt;script src="../../../../src/mods/neo.js">&lt;/script>
 24     &lt;script src="../../../../src/templates/js/minty/module/toolbar/inbox.js">&lt;/script>
 25     &lt;script src="testToolbar.js">&lt;/script>
 26 &lt;/body>
 27 &lt;/html>   
</pre>

Line 8 - the class on the body tag tell YUI3 which skin we want to use.

Line 9 - we make a &lt;div&gt; for the console logger.

Lines 11-18 are the markup for out tests - you could also create this dynamically in your test Javascript file.

Lines 20-25 - Javascript files necessary to run the test suite(s)

Line 20 - we include the YUI3 seed

Line 22 - the querystring appended to toolbar.js - '?coverage=1' tells JUTE we want code coverage information for this file when we run with code coverage enabled.  You can append this to more than one Javascript file you load if you'd like coverage information generated for more than file during this unit test run.  Note you still MUST run the tests with coverage enabled for coverage information to be generated.  JUTE will automatically instrument files with '?coverage=1' with coverage data.

Line 25 - the test Javascript file is loaded.  We'll look at that next.


### Javascript Requirements

Your Javascript test file must 'use' the 'gallery-jute' module.

Below is the corresponding test file to the above HTML file - I'll point out the interesting lines below:

<pre>
  1 YUI({
  2     logInclude: { [TestRunner](TestRunner.html): true }
  3 }).use('io-base', 'node-event-simulate', 'common-ui-toolbar-base', 'gallery-jute', 'minty_module_toolbar_inbox', function(Y) {
  4 
  5 // Setup dummy strings object
  6 window.strings = {}
  7 
  8 var suite = new Y.Test.Suite('toolbar'); // 'toolbar' will be the name of the subdirectory created in JUTE_OUTPUT_ROOT directory for the output of these tests
  9 
 10 suite.add(new Y.Test.Case({
 11 
 12     name:'tool zot bar',
 13 
 14     setUp: function() {
 15         Y.Node.prototype.simulate = function(type, options) {
 16             Y.Event.simulate(Y.Node.getDOMNode(this), type, options);
 17         };
 18     },
 19 
 20     testNewToolbar_noParams : function() {
 21         var tb = new Y.mail.ui.Toolbar();
 22     },
 23     testNewToolbar_template : function() {
 24         var tb = new Y.mail.ui.Toolbar({ template: Y.ui.Templates.minty_module_toolbar_inbox.base });
 25     },
 26     testNewToolbar_root : function() {
 27         var tb = new Y.mail.ui.Toolbar({ root: Y.one("#pagetoolbar") });
 28     },
 29     testGetContent : function () {
 30         var tb = new Y.mail.ui.Toolbar({ template: Y.ui.Templates.minty_module_toolbar_inbox.base });                                                                                                 
 31         var node = tb.get('content');
 32         Y.Assert.isObject(node);
 33     },
 34
 35     testSelectButton : function() {
 36         var tb = new Y.mail.ui.Toolbar({ root: Y.one("#pagetoolbar") });
 37 
 38         tb.on('itemSelected', function(e) {
 39             Y.Assert.areEqual(e.dataAction, 'delete', "Click on toolbar link");
 40             tb.detach('itemSelected');
 41         });
 42 
 43         // Click the link!
 44         Y.one("#deleteLink").simulate("click");
 45     },
 46 
 47     testSelectMenu : function() {
 48         var tb = new Y.mail.ui.Toolbar({ root: Y.one("#pagetoolbar") });
 49 
 50         tb.on('itemSelected', function(e) {
 51             Y.Assert.areEqual(e.dataAction, 'menu', "Click on menu item");
 52             tb.detach('itemSelected');
 53         });
 54 
 55         // Click the link!
 56         Y.one("#moveLink").simulate("click");
 57     }
 58 }));
 59 
 60 Y.Test.Runner.add(suite);
 61 Y.Test.Runner.go();
 62                                                                                                                                                                                                       
 63 });
</pre>

Line 2 - Tell the logger to output [TestRunner](TestRunner.html) output

Line 3 - Ensure we use the 'gallery-jute' module.  And of course the actual modules you're testing and anything else you need.

Line 8 - We give a name to our Suite - this name is later used as the directory name under the JUTE_OUTPUT_ROOT where test results and code coverage will live.

Lines 10-58 - Our test functions and a setUp function - standard test stuff

Line 60 - We add our suite to the YUI3 [TestRunner](TestRunner.html)

Line 61 - We start our tests

That's IT!!  The only change you needed to make from a standard YUI3 test Javascript file was including the 'gallery-jute' module.

With this setup you can run your test thru any JUTE backend.


Installation
-------------

Even if you already have the 'jute' package installed you still need to:

<pre>
% npm install jute_v8
</pre>

Caveats
-------

Not all unit tests will run in the V8 backend!!  Event simulation is not supported.  Crazy iframe stuff can be problematic.  Anything expecting a real browser will be disappointed.  All the basic DOM manipulation is available, UI events are not.  No mouse events, No key events, No focus events.  So be safe out there!


Debugging
----------

If you set the JUTE_DEBUG environment variable:

<pre>
% export JUTE_DEBUG=1
</pre>

You'll see even more gory debug output.


Test File Setup
----------------

You should use relative paths in your HTML test files pointing to project files over in the 'src' tree that you're testing.

#### V8 Makefile rule

<pre>
submit_v8_tests:
    cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec /home/y/bin/jute_v8.js {} $(DO_COVERAGE} \\; 
</pre>

Viewing Test Results
---------------------


### Output Directory

All results are stored in JUTE_OUTPUT_ROOT - you can look at the *.xml files to view the raw JUnit XML output.  

#### Code Coverage

Running individual tests will generate a directory hierarchy rooted at JUTE_OUTPUT_ROOT.  The first thing you need to do is to aggregate all the individual coverage output into one mongo output files containing all the the individual output files.

This can be accomplished by a simple Makefile rule:

<pre>
LCOV_GENHTML = /home/y/bin/genhtml # from 'lcov' if not already installed on your system
TOTAL_LCOV_FILE = $(OUTPUT_DIR)/lcov.info
OUTPUT_DIR = JUTE_OUTPUT_ROOT
make_total_lcov:
  /bin/rm -f $(TOTAL_LCOV_FILE)
  @echo "OUTPUT DIR: ${OUTPUT_DIR}"
  @echo "TOTAL LCOV FILE: ${TOTAL_LCOV_FILE}"
  find $(OUTPUT_DIR) -name lcov.info -exec cat {} >> $(TOTAL_LCOV_FILE) \\;
  @ls ${OUTPUT_DIR}
  /bin/rm -rf $(OUTPUT_DIR)/lcov-report
  $(LCOV_GENHTML) -o $(OUTPUT_DIR)/lcov-report $(TOTAL_LCOV_FILE)
</pre>

Now to aggregate your coverage output for Hudson or other just:  

<pre>
% make make_total_lcov
</pre>

And JUTE_OUTPUT_ROOT/lcov-report/index.html will have the rolled-up code coverage information.
