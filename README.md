<!-- The code below creates a default page header by spacing out the topic name -->


JUTE
====================

<!-- %TOC% -->

Javascript Unit Testing Environment (JUTE)


Abstract
=========

JUTE allows unobtrusive [JavaScript](JavaScript.html) YUI3 unit testing with code coverage. Command line and web-based interfaces make JUTE easy to integrate with Hudson, developers, and even (gasp!) managers. There are 3 backends available to test your code: Selenium, Capture, and V8.

Requirements

[NodeJS](http://nodejs.org) .4 compiled with SSL support
--------------------------------------------------------

3.1.1+ of YUI3
---------------

Super Quick Start
==================

Theory
-----

JUTE is a standalone HTTP server that serves your test files to a JUTE backend   Two of the three backends (Selenium and Capture) serve files to a browser, the third backend (V8) will run your tests directly in V8.  'Serving files' simply means serving your test and source files and any other files necessary for your tests (e.g. CSS, images, &c).
JUTE then collects and stores test output in JUnit XML format and code coverage information in 'lcov' format and generates pretty HTML to view your coverage results.  That is  it!

Variable Setup
---------------

To do its magic JUTE need some information from you.  All configuration variables are provided by 'npm' using npm config variables.  See 

<verbatim>
% npm help config
</verbatim>

For gory details.  But simply:

<verbatim>
% npm config set jute:port 80
</verbatim>

Will set the port the JUTE webserver listens on to 80.

Here are some important JUTE configuration variables and their defaults:

<verbatim>
                uid:            process.getuid(),
                gid:            process.getgid(),
                port:           8080,
                docRoot:        '/var/www/',
                jutebase:       'jutebase/',
                testDir:        'test/',
                outputDir:      'output/',
                java:           '/usr/bin/java',
                logFile:        '/tmp/jute.log',
                logFormat:      '',
                testRegex:      '*.htm*'
</verbatim>

To set any of these do:

<verbatim>
% npm config set jute:<variable> <value>/var/www
</verbatim>

Like:

<verbatim>
% npm config set jute:docRoot /var/htmlroot/foobie
</verbatim>


JUTE is a standalone HTTP server - it needs to know where your document root is to serve your files
JUTE uses npm config varaibles for its configuration (for gory details: % npm config help)
JUTE assumes a symlink named '/home/y/share/htdocs/jutebase' to your real DOCUMENT_ROOT. For [Mail/Neo](Mail/Neo.html) that symlink points back into our home directories but that doesn't have to be the case. However whichever user JUTE runs as (which you specify, I'll show you how in a moment) needs to be able to write files in a sub-directory under your DOCUMENT_ROOT - by default in directory named %BLUE%<u>'</u>%ENDCOLOR%output'. Note all of this can be changed via yinst variables but the simplest case is:

* symlink /home/y/share/htdocs/jutebase to your DOCUMENT_ROOT (can/should? be somewhere in your home directory where you've checked out your subversion tree)

* All of your test files live in DOCUMENT_ROOT/test

* All of JUTE's output will go into DOCUMENT_ROOT/output


Install JUTE
-------------

% yinst install -b test jute


Include JUTE in your HTML
--------------------------

In your HTML files that you load into your browser to run your unit tests add another script tag BEFORE you load in your [JavaScript](JavaScript.html) file that contains your tests:

<script src="/jute/jute.js"></script>


Require JUTE module in your TEST Javascript
--------------------------------------------

Along with YUI3's 'test' module you must include the 'jute' module like:

<verbatim>
YUI({
     logInclude: { [TestRunner](TestRunner.html): true }
}).use('test', 'jute', ..., function(Y) {
 ....
});
</verbatim>


Connect to JUTE
----------------
 First, if you haven't done so, start JUTE:

% yinst start jute

Then point your browser to:

http://&lt;host where jute is running>/jute/

**Note:** In case jute has problems starting, try
<verbatim>sudo rm -rf /tmp/jute.socket</verbatim>


Click on a test & run it!
--------------------------


In-Depth Start
===============

The JUTE User
--------------

JUTE by default run as the user who yinst installs the JUTE package. JUTE needs to run as a 'real' user to write files (unit test results and optionally coverage information). For developers this real user is YOU. For Hudson this user should be the same user that Hudson runs as when doing your build. This will all be handled automatically when that user installs the 'jute' package.

If that doesn't work for you, you can force the user JUTE runs as using a yinst variable:

<verbatim>
% yinst set jute.as_user=<user you want JUTE to run as>
% yinst restart jute 
</verbatim>


The jutebase symlink
---------------------

JUTE expects your PROJECT ROOT to be available to it at /home/y/share/htdocs/jutebase. This path is typically a symlink to your real PROJECT ROOT. For developers this is typically somewhere in their home directory. For Hudson build this typically is either in the Hudson user's home directory or somewhere in /home/y/share/htdocs/&lt;SOMEWHERE&gt;

Regardless create a symlink to that spot:

<verbatim>
% ln -s PROJECT_ROOT /home/y/share/htdocs/jutebase
</verbatim>

If for whatever zany reason you do not like the directory name 'jutebase' or your PROJECT ROOT is already in /home/y/share/htdocs and you don't want to symlink you can change it:

<verbatim>
% yinst set jute.html_root=<SOMETHING_ELSE>
</verbatim>

Now JUTE will use /home/y/share/htdocs/&lt;SOMETHING_ELSE&gt; as your PROJECT ROOT. Note this PROJECT ROOT directory is used as the BASE directory for the OUTPUT and TEST directories explained below.

You must restart JUTE after changing this setting.


JUTE output directory
----------------------

JUTE writes unit test results and optionally coverage information into an output directory. By default this output directory is BASE/output. Ensure the user JUTE runs as can write to this directory! You can change the directory name by:

<verbatim>
% yinst set jute.output_dir=&lt;SOMETHING_ELSE&gt;
</verbatim>

Now it will put output files into BASE/&lt;SOMETHING_ELSE&gt;

You must restart JUTE after changing this setting.


JUTE test directory
--------------------

By default JUTE looks in BASE/test for test HTML files. This can be changed:

<verbatim>
% yinst set jute.test_dir=<SOMETHING_ELSE>
</verbatim>

Now JUTE will look for tests in BASE/&lt;SOMETHING_ELSE&gt;

You must restart JUTE after changing this setting.


Starting and Stopping JUTE
---------------------------

JUTE is a standalone ('external' in FCGI parlance) fastcgi server that listens on a UNIX socket. By default JUTE will automatically start itself when installed. It can be started, stopped, and restarted:

<verbatim>
% yinst start jute
% yinst stop jute
% yinst restart jute
</verbatim>

The UNIX socket is located at:

<verbatim>
srwxrwxrwx  1 trostler users 0 Mar 10 13:05 /tmp/jute.socket
</verbatim>

Ensure this socket is owned by who you expect JUTE to be running as. If it's owned by root or someone else unexpected and you're having trouble with JUTE you can manually delete this file and try to restart JUTE:

<verbatim>
% sudo rm /tmp/jute.socket
% yinst restart jute
</verbatim>


yapache
--------

JUTE requires yapache 1.x - it is expected to be installed and running (note if you ONLY want to run unit tests on V8 you do not need yapache - just install the 'jute_v8' package and NOT the 'jute' package).



JUTE Backends
==============


Capture
--------

This is the default mode for the JUTE UI.  Any captured browsers (see 'Browsers' below) will run any submitted unit tests in parallel.  To capture a browser point it to:

<verbatim>
http://<JUTE_HOST>/jute/
</verbatim>

The browser is now 'captured'.  Any submitted unit tests will be run in parallel through all currently captured browsers.

Each captured browser will create a test results file whose name contains the modified user agent string of that browser (so you can tell them apart).

However only ONE code coverage output file will be created regardless of how many browsers are connected.

When you click to run (a) unit test(s) in the JUTE UI the test(s) will be run in 'capture' mode - meaning any captured browser will run the selected test(s).


Selenium
---------

This mode can currently only be accessed via the command line.  Tests can be run serially or in parallel.


V8/NodeJS
----------

This is essentially a standalone backend as it does NOT require yapache running.  Tests are expected to be in the standard test location and output will go into the standard output location as detailed above.  Note not all of your unit tests are guaranteed to run in the V8 backend!!  Tests which require browser-y features like event simulation will not run as mouseclicks and keyevents and the like do not exist in [NodeJS](NodeJS.html).

Note to use V8 as a backend you MUST ALSO INSTALL THE jute_v8 PACKAGE.  

If you ONLY want to run unit tests on V8 you do not need the 'jute' package - just install the 'jute_v8' package and NOT the 'jute' package.


Using JUTE
===========


[WebUI](WebUI.html)
--------------------

Now that JUTE is up and running you can contact it here:

<verbatim>
http://<JUTE_HOST>/jute/
</verbatim>

THE SLASH ON THE END IS REQUIRED!!!!

You should see the JUTE UI:

<img src="%ATTACHURLPATH%/jute.jpg" alt="JUTE UI" />

This browser is now 'captured' and is ready to run unit tests.


### JUTE UI Status


#### Browsers

This lists all the currently captured browsers.  Any submitted unit tests (that are not meant for Selenium (more below)) will be run in parallel in each of the captured browsers.


#### Tests

These are list of currently running/queued tests.  A highlighted row means that test is currently running.  You can watch tests running and being popped off the stack and subsequent tests run.  These are the tests for this captured browser specifically.  Browsers will run tests at different speeds.


### Test Files

The middle panel is the list of all the test files JUTE knows about.  If you do not see any files here JUTE is misconfigured.  Look above at the 'html_dir' and 'test_dir' directory setting and ensure they're set properly.


#### Running a Single Test

Click on the test file link to run that test immediately without coverage.  When running a single test the output will remain in the center panel (so you can see it) until you click 'Kick Lower Frame' to go back to the test listing.


#### Running Multiple Tests

Clicking the checkboxes allows you to run multiple tests, either with or without coverage.

Clicking the top checkboxes will select or unselect all tests in that column.

Click 'Run Tests' to run selected tests.

After running multiple tests the middle panel will return to the list of unit tests.


#### Kick Lower Frame

This button reloads the list of unit tests in the center panel


#### Clear Tests

This button deletes any pending/queued unit tests


#### Clear Results

This will clear all results - both unit test results and coverage information


### Results

This column allows you to see the unit test results and code coverage information.  For each browser there will be unit test output.  Note this output is XML and the file contents may NOT be visible in your browser.  'View Source' if this is the case.  A green link means all tests passed successfully and red link means at least one test failed.


Command Line
-------------

The script

<verbatim>
/home/y/bin/submit_test.pl
</verbatim>

Is the main command line interface to JUTE.  This script allows you to submit unit tests to JUTE to run either in capture or Selenium mode.  After all of your tests are submitted you can wait around for them using:

<verbatim>
/home/y/bin/wait_for_tests.pl
</verbatim>

This script will exit when all unit tests have finished.

NOTE submit_test.pl will exit immediately after submitted the unit test(s)!  If you want to wait until all submitted tests are complete, after running submit_test.pl (which you can do multiple times) use wait_for_tests.pl.


### /home/y/bin/submit_test.pl


#### Submitting Tests

There are several ways to submit unit tests.  You must specify ONLY relative path from the TEST directory you defined above.


##### One Test

<verbatim>
/home/y/bin/submit_test.pl path/to/my/test/index.html
</verbatim>

Note the PROJECT_ROOT/TEST_DIR will be prepended to the specified file.


##### Multiple Tests

On command line:

<verbatim>
/home/y/bin/submit_test.pl -test path/to/my/test/index.html -test path/to/other/test/index.html -test path/to/other/other/test.html
</verbatim>

OR

If you have a filename with one test file per line:

<verbatim>
cat LIST_OF_TEST_FILES | /home/y/bin/submit_test.pl -
</verbatim>

Note the PROJECT_ROOT/TEST_DIR will be prepended to the specified test files.


#### Running tests through Selenium

Specify -sel_host to run the submitted tests through Selenium.  You can optionally also supply -sel_browser to give a Selenium browser specification.  -sel_browser defaults to '*firefox'.

<verbatim>
/home/y/bin/submit_test.pl -sel_host 10.3.4.45 [-sel_browser '*ieexplore'] path/to/test/index.html
</verbatim>

Of course -sel_host can either point to an individual Selenium host or a Selenium grid host.

Note the PROJECT_ROOT/TEST_DIR will be prepended to the specified test files.


##### Parallelization

Specifying the '-browsers' option.  This is '1' by default.  Specifying a larger number will spawn off that many Selenium browsers (as specified by '-sel_host' and '-sel_browser') in parallel to run all submitted tests in parallel.


#### Running tests through V8

IF you also have the 'jute_v8' package installed you can use /home/y/bin/submit_test.pl to also run tests thru the [NodeJS/V8](NodeJS/V8.html) backend.  Simply specify '-v8' on the command line and all of the specified tests given will be run through V8.

<verbatim>
/home/y/bin/submit_test.pl -v8 path/to/test/index.html
</verbatim>

OR any other permutation of test specification as outlined above.



#### Specifying code coverage

If you'd like your test(s) to run with code coverage enabled add the querystring '?do_coverage=1' to each test you want code coverage enabled for:

<verbatim>
/home/y/bin/submit_test.pl path/to/my/test/index.html?do_coverage=1
</verbatim>

OR

<verbatim>
/home/y/bin/submit_test.pl -sel_host 10.3.4.45 path/to/test/index.html?do_coverage=1
</verbatim>

OR

<verbatim>
/home/y/bin/submit_test.pl -test path/to/my/test/index.html?do_coverage=1 -test path/to/other/test/index.html -test path/to/other/other/test.html
</verbatim>

OR IF you have the 'jute_v8' package also installed:

<verbatim>
/home/y/bin/submit_test.pl -v8 path/to/my/test/index.html?do_coverage=1
</verbatim>

&c

Note that last example code coverage will ONLY be generated for that first test since it's the only one with the '?do_coverage=1' querystring.

Note the PROJECT_ROOT/TEST_DIR will be prepended to the specified test files.


wait_for_tests.pl
------------------

This script will exit once all currently submitted unit tests have finished running


JUTE Output
============

JUTE output all goes into the OUTPUT DIRECTORY as specified above.  Within that directory will be a directory for each unit test.  The name of the directory is the NAME OF THE TEST SUITE as specified in your javascript test file.  This will be explained in more detail below.

Note both test results and coverage information are available for easy viewing via the JUTE [WebUI](WebUI.html).


Test Results
-------------

For each browser an XML file will be created.  The name of the XML file is a modified version of the USER AGENT string of that browser.  An example:

<verbatim>
Mozilla5_0__Macintosh_U_Intel_Mac_OS_X_10_5_8_en-US__AppleWebKit534_16__KHTML__like_Gecko__Chrome10_0_648_127_Safari534_16-test.xml
</verbatim>

This unit test was run in the Chrome browser an Intel Mac OS version 10.5.8.

The format of this file is JUnit XML style test output recognizable by most tools including Hudson.

This looks like:

<verbatim>
   <?xml version="1.0" encoding="UTF-8"?>
   <testsuites>
       <testsuite name="Mozilla5.0.Macintosh.U.Intel.Mac.OS.X.10.5.8.en-US.AppleWebKit534.16.KHTML.like.Gecko.Chrome10.0.648.127.Safari534.16.initialization" tests="3" failures="0" time="0.021">
           <testcase name="testLoggerNotInitialized" time="0.001"></testcase>
           <testcase name="testInitRocketStats" time="0.001"></testcase>
           <testcase name="testLoggerInititialized" time="0"> </testcase>
       </testsuite>
       <testsuite name="Mozilla5.0.Macintosh.U.Intel.Mac.OS.X.10.5.8.en-US.AppleWebKit534.16.KHTML.like.Gecko.Chrome10.0.648.127.Safari534.16.logger" tests="4" failures="0" time="0.025">
           <testcase name="testGetTheInitializedLoggerObject" time="0"> </testcase>
           <testcase name="testLoggerHasCorrectLogLevels" time="0.001"> </testcase>                                                                                                                      
           <testcase name="testLoggerHasRightNumberOfAppenders" time="0.001"></testcase>
           <testcase name="testAddAppenderToLogger" time="0.001"></testcase>
       </testsuite>
   </testsuites>
</verbatim>


Coverage Output
----------------

The the same directory as the test result output will be a directory named 'lcov-report'.  In that directory will be an index.html file you can load into your browser to see coverage results.  JUTE uses yuitest_coverage to instrument and exact coverage information form the requested Javascript files.  See below for how to tell JUTE to instrument selected Javascript files for code coverage.


Writing Unit Tests for JUTE
============================

JUTE requires VERY LITTLE from the developer to have their unit tests incorporated into the JUTE framework.  Any new or already-written Unit Tests can easily be added to the JUTE framework.


YUI3 'test' module
-------------------

The main requirement is using the YUI3 [TestRunner](TestRunner.html) and Assertion Framework for running and creating your Unit Tests.  [Look here](http://developer.yahoo.com/yui/3/test/) for detailed information about getting started with YUI3 test module, including running, asserting, and potentially mocking objects for your unit tests.

Note you must use YUI3 version 3.1.1+.


Code Requirements
------------------

To utilize JUTE you need only to make small additions to your current HTML file and 1 small addition to your test Javascript file.


### HTML requirements

You must include '/jute_docs/jute.js' in a script tag BEFORE you load your test Javascript file.

Here is a standard test HTML file - we will examine all the important bits below.

<verbatim>
  1 <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 [Transitional//EN](Transitional//EN.html)">
  2 <html lang="en">
  3 
  4 <head>
  5   <meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">
  6 </head>
  7 
  8 <body class="yui3-skin-sam">
  9     <div id="log"></div>
 10 
 11     <div id="pagetoolbar">
 12         <span class="btn left right" >
 13             <a id="deleteLink" href="http://dont.go.here.com" title="{{str|replace_me}}" data-action="delete">Delete</a>
 14         </span>
 15         <span class="btn menu" id="btn-move" data-action="menu">
 16             <a id="moveLink" href="http://dont.go.here.com" title="{{str|replace_me}}">Move<b></b></a>
 17         </span>
 18     </div>
 19 
 20     <script src="http://yui.yahooapis.com/3.3.0/build/yui/yui.js"></script>
 21     <script src="/jute_docs/jute.js"></script>
 22     <script src="../../../../src/common/utils/utils.js"></script>
 23     <script src="../../../../src/common/ui/toolbar/toolbar.js?coverage=1"></script>
 24     <script src="../../../../src/mods/neo.js"></script>
 25     <script src="../../../../src/templates/js/minty/module/toolbar/inbox.js"></script>
 26     <script src="testToolbar.js"></script>
 27 </body>
 28 </html>   
</verbatim>

Line 8 - the class on the body tag tell YUI3 which skin we want to use.

Line 9 - we make a &lt;div&gt; for the console logger.

Lines 11-18 are the markup for out tests - you could also create this dynamically in your test Javascript file.

Lines 20-26 - Javascript files necessary to run the test suite(s)

Line 20 - we include the YUI3 seed

Line 21 - we include the required jute.js script.  JUTE will also put this file there so you can copy this line exactly.

Line 23 - the querystring appended to toolbar.js - '?coverage=1' tells JUTE we want code coverage information for this file when we run with code coverage enabled.  You can append this to more than one Javascript file you load if you'd like coverage information generated for more than file during this unit test run.  Note you still MUST run the tests with coverage enabled for coverage information to be generated.  JUTE will automatically instrument files with '?coverage=1' with coverage data.

Line 26 - the test Javascript file is loaded.  We'll look at that next.


### Javascript Requirements

Your Javascript test file must 'use' the 'jute' module.

Below is the corresponding test file to the above HTML file - I'll point out the interesting lines below:

<verbatim>
  1 YUI({
  2     logInclude: { [TestRunner](TestRunner.html): true }
  3 }).use('test', 'io-base', 'node-event-simulate', 'common-ui-toolbar-base', 'jute', 'minty_module_toolbar_inbox', function(Y) {
  4 
  5 // Setup dummy strings object
  6 window.strings = {}
  7 
  8 var suite = new Y.Test.Suite('toolbar');
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
 61 Y.UnitTest.go();
 62                                                                                                                                                                                                       
 63 });
</verbatim>

Line 2 - Tell the logger to output [TestRunner](TestRunner.html) output

Line 3 - Ensure we use BOTH the 'test' and 'jute' modules.  And of course the actual modules you're testing and anything else you need.

Line 8 - We give a name to our Suite - this name is later used as the directory name under the OUTPUT DIRECTORY where test results and code coverage will live.

Lines 10-58 - Our test functions and a setUp function - standard test stuff

Line 60 - We add our suite to the YUI3 [TestRunner](TestRunner.html)

Line 61 - We start our tests!  This is a convenience function provided by JUTE to initialize the console and start our tests.  If you want to handle that stuff yourself you can just call the standard 'Y.Test.Runner.run()' yourself.

That's IT!!  The only changes you needed to make from a standard YUI3 test Javascript file was including the 'jute' module (which you loaded in your HTML file) and optionally calling Y.UnitTest.go() instead of Y.Test.Runner.run().

With this setup you can run your test thru any JUTE backend.


JUTE V8
========

V8 support in JUTE is available in a separate yinst package:

<verbatim>
% yinst i -b test jute_v8
</verbatim>

This package mainly provides the /home/y/bin/jute_v8.js file used to run your unit test(s) thru V8.

You do NOT need to install the 'jute' package to install and use 'jute_v8'.


Installation
-------------

Even if you already have the 'jute' package installed you still need to:

<verbatim>
% yinst install -b test jute_v8
</verbatim>

Note you do NOT have to have the 'jute' package installed if you only want to run V8 unit tests.  If you want the [WebUI](WebUI.html) and the ability to use Selenium and Captured browsers then you must also install the 'jute' package'  See above for gory details.


Configuration
--------------

There are 3 yinst variables that must be set correctly:


### HTML_ROOT

This is the HTML_ROOT of your app:

<verbatim>
% yinst set jute_v8.HTML_ROOT=/home/y/share/htdocs/jutebase/src/
</verbatim>


### TEST_ROOT

This is the full path to the base of your test directory:

<verbatim>
% yinst set jute_v8.TEST_ROOT=/home/y/share/htdocs/jutebase/test/
</verbatim>


### OUTPUT_ROOT

This is the full path to the base of where your output files will live:

<verbatim>
% yinst set jute_v8.OUTPUT_ROOT=/home/y/share/htdocs/jutebase/output/
</verbatim>


Running
--------

IF you also have the 'jute' package installed you can use /home/y/bin/submit_test.pl to run V8 tests as outline above.

IF you do NOT have the 'jute' package installed or want to do something else you can use the [NodeJS](NodeJS.html) script in /home/y/bin/jute_v8.js

<verbatim>
/home/y/bin/jute_v8.js path/to/test/index.html [1]
</verbatim>

The script takes 2 arguments - the path to the test HTML file relative to TEST_ROOT and an optional boolean second argument for code coverage.  SO without code coverage:

<verbatim>
/home/y/bin/jute_v8.js path/to/test/index.html
</verbatim>

With code coverage:

<verbatim>
/home/y/bin/jute_v8.js path/to/test/index.html 1
</verbatim>


Results
--------

Results in JUnit XML format are stored in the OUTPUT_ROOT just like in the regular jute case.  Code coverage will be put there too as jute does.  If you have the [WebUI](WebUI.html) installed (in the 'jute' package) you can now see the V8 results.

Test run information, total test statistics and code coverage statistics are also available via STDOUT.


V8 Caveats
-----------

Not all unit tests will run in the V8 backend!!  Event simulation is not supported.  Crazy iframe stuff can be problematic.  Anything expecting a real browser will be disappointed.  All the basic DOM manipulation is available, UI events are not.  No mouse events, No key events, No focus events.  So be safe out there!


Debugging
----------

If you set the JUTE_DEBUG environment variable:

<verbatim>
% export JUTE_DEBUG=1
</verbatim>

You'll see even more gory debug output.


Best Practices
===============

By default JUTE assumes a 'best practices' setup.  Using the JUTE yinst set variable outlined above this behavior can be changed.


Directory Setup
----------------

Your PROJECT ROOT should be the parent directory of a 'src', 'test', and 'output' directory.  The 'test' directory should be a mirror of the 'src' directory hierarchy.  This eases the setup and keeps the directory structure simple and clean.


Test File Setup
----------------

You should use relative paths in your HTML test files pointing to project files over in the 'src' tree that you're testing.


Developer Environment
----------------------

Your local svn directory should be symlinked into /home/y/share/htdocs somewhere for local testing.  Your test files can be served from yapache or thru a file URL.  You can also run individual tests using the JUTE command line.


Developer Build Environment
----------------------------


### A Captured Browser

a local dev build can run all available unit tests - if they're all in a 'test' directory the command to run the tests can be as easy as:

<verbatim>
LOCAL_TEST_DIR = ../test                                                                                                                                                                              
run_unit_tests:
       cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec /home/y/bin/submit_test.pl {} do_coverage=$(DO_COVERAGE) \\; -print
       /home/y/bin/wait_for_tests.pl 1
</verbatim>

DO_COVERAGE can be set to '1' to generate coverage reports:

<verbatim>
% make run_unit_tests DO_COVERAGE=1
</verbatim>

Note this assumes you have at least 1 captured browser.  This will run all of your unit tests with code coverage.

You can of course also select all checkboxes in the webui and the result is the same.


### V8

<verbatim>
run_v8_unit_tests:
     cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec /home/y/bin/jute_v8.js {} $(DO_COVERAGE) \\;
</verbatim>

All output will go to STDOUT.


Hudson Build Environment
-------------------------

All of your tests can be run thru Selenium - they all need to submitted at once to run as one job:

<verbatim>
submit_selenium_tests:                                                                                                                                                                                
     cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -printf '%p?do_coverage=$(DO_COVERAGE)\\n' | /home/y/bin/submit_test.pl -test - -sel_host $(SEL_HOST) -sel_browser $(SEL_BROWSER) -send_output  
</verbatim>

This will return once all tests have run.  Ensure Hudson is configured correctly to look in the output directory for test results and cover coverage.  If a unit test fails Hudson will label the build 'Unstable'.  Clicking thru the "Test Results" will reveal the failed test(s).

Note you are not allowed to run a web server on your Hudson build machine.  You can use Stagecoach to run the unit tests remotely and return the results back to your Hudson build machine.  Alternatively you can use the V8 backend IF all of your unit tests can run under V8.


[Yahoo Continuous Integration Standards](http://twiki.corp.yahoo.com/view/ContinuousIntegration/WebHome)
=========================================================================================================


[Yahoo CI Unit Test Standards](http://twiki.corp.yahoo.com/view/ContinuousIntegration/UnitTesting)
===================================================================================================


[Build/Hudson](Build/Hudson.html) Integration
==============================================

Running tests and result and code coverage information are easily integrated into your builds and Hudson.


Running Tests
--------------

Where:

LOCAL_TEST_DIR is the root of where your test files live on the build or local host

SEL_HOST is the hostname/IP of your Selenium box or grid

SEL_BROWSER is '*firefox' or '*iexplore' or whatever browser specification you want to use

DO_COVERAGE is 1 or 0 depending on if you want coverage (you probably do)


### Local

Running JUTE/browser tests locally is a simple Makefile rule.


#### Captured Browser(s)

<verbatim>
submit_tests:                                                                                                                                                         
    cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec /home/y/bin/submit_test.pl {} do_coverage=$(DO_COVERAGE} \\; -print
    /home/y/bin/wait_for_tests.pl 1
</verbatim>


#### Selenium

<verbatim>
submit_selenium_tests:
    cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -printf '%p?do_coverage=$(DO_COVERAGE)\\n' | /home/y/bin/submit.pl -test - -sel_host $(SEL_HOST) -sel_browser $(SEL_BROWSER) -send_output 
</verbatim>


#### V8

<verbatim>
submit_v8_tests:
    cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec /home/y/bin/jute_v8.js {} $(DO_COVERAGE} \\; 
</verbatim>


### Hudson


#### Captured Browsers and Selenium

Running browser-based tests in Hudson is a little goofy due mainly to the restriction of not running a webserver on your Hudson slave.  One solution is to use Stagecoach to tar up your source tree (including tests) and scp it all over to another machine that will host your tests - which of course is running yapache.

On that remote box you install all necessary package for running your tests (jute & possibly others) and using Stagecoach run one of the captured or Selenium test Makefile rules.

After all tests are finished you need to tar up the results and scp them back to the Hudson host.  Just drop the results where ever output_dir is pointing to.


#### V8

Just call the 'submit_v8_tests' Makefile target!  There's no webserver or remote captured or Selenium host to run the tests so you're good to go!!


Viewing Test Results
---------------------


### Output Directory

All results are stored in output_dir - you can look at the *.xml files to view the raw JUnit XML output.  


### Browser

If the 'jute' package is installed you can visit:

<verbatim>
http://<jute host>/jute/
</verbatim>

& click on links in the 'Results' column - this will show results for captured, Selenium, and V8 tests.


### Hudson


#### Test Results

You need to configure your Hudson project to find the *.xml files the tests generated.

Check the 'Publish Test Results in Labeled Groups (recommended by Yahoo!)' and use 'trunk/output/**/*-test.xml' as your Result File Mask.  Note you may have to change this path to point to where under your svn root your output_dir lies.

Be sure to set 'Report Format' to 'JUnit Parser'


#### Code Coverage

Running individual tests will generate a directory hierarchy rooted at your output_dir.  The first thing you need to do is to aggregate all the individual coverage output into one mongo output files containing all the the individual output files.

This can be accomplished by a simple Makefile rule:

<verbatim>
LCOV_GENHTML = /home/y/bin/genhtml # from the 'lcov' yinst package   
TOTAL_LCOV_FILE = $(OUTPUT_DIR)/lcov.info  
OUTPUT_DIR = <jute.output_dir or jute_v8.OUTPUT_DIR>                                                                                                                                                                                                                                                           
make_total_lcov:
  /bin/rm -f $(TOTAL_LCOV_FILE)
  @echo "OUTPUT DIR: ${OUTPUT_DIR}"
  @echo "TOTAL LCOV FILE: ${TOTAL_LCOV_FILE}"
  find $(OUTPUT_DIR) -name lcov.info -exec cat {} >> $(TOTAL_LCOV_FILE) \\;
  @ls ${OUTPUT_DIR}
  /bin/rm -rf $(OUTPUT_DIR)/lcov-report
  $(LCOV_GENHTML) -o $(OUTPUT_DIR)/lcov-report $(TOTAL_LCOV_FILE)
</verbatim>

Now simply point Hudson to this aggregated 'lcov.info' file - check 'Publish Lcov Coverage Report' and set 'lcov.info file mask' to something similar to 'trunk/output/lcov.info' depending on where your output_dir is relative to your SVN root.

This software is licensed under the BSD license available at http://developer.yahoo.com/yui/license.html
