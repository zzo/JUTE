JUTE
====================

Javascript Unit Testing Environment (JUTE)


Abstract
=========

JUTE allows unobtrusive [JavaScript](JavaScript.html) YUI3 unit testing with code coverage. Command line and web-based interfaces make JUTE easy to integrate with Hudson, developers, and even (gasp!) managers. There are 3 backends available to test your code: Selenium, Capture, and V8.

Requirements

[NodeJS](http://nodejs.org) .4 compiled with SSL support
--------------------------------------------------------

[npm](http://http://npmjs.org) 1.x
--------------------------------------------------------

java (any modern version should do)
-----------------------------------

Super Quick Start
==================

Theory
-----

JUTE is a standalone HTTP server that serves your test files to a JUTE backend for testing.  Two of the three backends (Selenium and Capture) serve files to a browser, the third backend (V8) will run your tests directly in V8.
JUTE then collects and stores test output in JUnit XML format and code coverage information in 'lcov' format and generates pretty HTML to view your coverage results.  That is it!

Variable Setup
---------------

To do its magic JUTE need some information from you.  All configuration variables are provided by 'npm' using npm config variables.  See 

    % npm help config

For gory details.  But simply:

    % npm config set jute:port 80

Will set the port the JUTE webserver listens on to 80.

Here are some important JUTE configuration variables and their defaults:

                uid:            process.getuid(),
                gid:            process.getgid(),
                port:           8080,
                docRoot:        '/var/www/',
                testDir:        'test/',
                outputDir:      'output/',
                java:           '/usr/bin/java',
                logFile:        '/tmp/jute.log',

To set any of these do:

    % npm config set jute:<variable> <value>

Like:

    % npm config set jute:docRoot /var/htmlroot

What the variables mean:

* uid: UID/Username JUTE process should run as
* gid: GID/Groupname JUTE process should run as
* port: Port JUTE should listen on
* docRoot: Your document root
* testDir: A directory RELATIVE to docRoot where all your Javascript test files live
* outputDir: A directory REALTIVE to docRoot where JUTE will dump output (test results and code coverage information)
* java: Location of 'java' executable
* logFile: Where to dump logging info

Install JUTE
-------------

    % npm install jute -g

Start JUTE
----------

    % npm start jute

Connect to JUTE
---------------

Point your browser to the host your started JUTE on - make sure the port is correct (port 8080 by default)!

Click on a test & run it!
--------------------------


In-Depth Start
===============

JUTE output directory
----------------------

JUTE writes unit test results and optionally coverage information into an output directory. By default this output directory is docRoot/output. Ensure the user JUTE runs as can write to this directory! You can change the directory name by:

    % npm config set:outputDir juteOutput

Now it will put output files into docRoot/juteOutput

You must restart JUTE after changing this setting:

    % npm restart jute

JUTE test directory
--------------------

By default JUTE looks in docRoot/test for test HTML files. This can be changed:

    % npm config set:testDir juteTests

Now it will look for test files in docRoot/juteTests

You must restart JUTE after changing this setting:

    % npm restart jute

Starting and Stopping JUTE
---------------------------

JUTE is a standalone HTTP server. You control when JUTE is running

    % npm start jute
    % npm stop jute
    % npm restart jute

JUTE Backends
==============


Capture
--------

This is the default mode for the JUTE UI.  Any captured browsers (see 'Browsers' below) will run any submitted unit tests in parallel.  To capture a browser point it to:

    http://<JUTE_HOST>/

The browser is now 'captured'.  Any submitted unit tests will be run in parallel through all currently captured browsers.

Each captured browser will create a test results file whose name contains the modified user agent string of that browser (so you can tell them apart).

However only ONE code coverage output file will be created regardless of how many browsers are connected.

When you click to run (a) unit test(s) in the JUTE UI the test(s) will be run in 'capture' mode - meaning any captured browser will run the selected test(s).


Selenium
---------

This mode can currently only be accessed via the command line tool 'jute_submit_test'.  See below for documentation.


V8/NodeJS
----------

This mode can currently only be accessed via the command line tool 'jute_submit_test'.  See below for documentation.

Tests are expected to be in the standard test location and output will go into the standard output location as detailed above.  Note NOT all of your unit tests are guaranteed to run in the V8 backend!!  Tests which require browser-y features like event simulation will not run as mouseclicks and keyevents and the like do not exist in nodejs.


Using JUTE
===========


JUTE WebUI
--------------------

Now that JUTE is up and running you can contact it here:

    http://<JUTE_HOST>/

This browser is now 'captured' and is ready to run unit tests.


### JUTE UI Status


#### Browsers

This lists all the currently captured browsers.  Any submitted unit tests (that are not meant for Selenium (more below)) will be run in parallel in each of the captured browsers.


#### Tests

These are list of currently running/queued tests.  A highlighted row means that test is currently running.  You can watch tests running and being popped off the stack and subsequent tests run.  These are the tests for this captured browser specifically.  Browsers will run tests at different speeds.


### Test Files

The middle panel is the list of all the test files JUTE knows about.  If you do not see any files here JUTE is misconfigured.  Look above at the 'docRoot' and 'testDir' setting and ensure they are set properly.


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

    <bin>/jute_submit_test

Is the main command line interface to JUTE.  This script allows you to submit unit tests to JUTE to run either in capture or Selenium mode.  Do:

    % jute_submit_test --help

For help.

### jute_submit_test


#### Submitting Tests

There are several ways to submit unit tests.  You must specify ONLY relative path from the testDir directory you defined above.

##### One Test

    jute_submit_test --test path/to/my/test/index.html

Note the docRoot/testDir will be prepended to the specified file.


##### Multiple Tests

On command line:

    jute_submit_test --test path/to/my/test/index.html --test path/to/other/test/index.html --test path/to/other/other/test.html


##### Via STDIN

    jute_submit_test --test -

jute_submit_test accept a test filename per line until EOF

#### Running tests through Selenium

Specify --sel_host to run the submitted tests through Selenium.  You can optionally also supply -sel_browser to give a Selenium browser specification.  -sel_browser defaults to '*firefox'.

    jute_submit_test --sel_host 10.3.4.45 [ --sel_browser '*ieexplore' ] --test path/to/test/index.html

Of course --sel_host can either point to an individual Selenium RC host or a Selenium grid host.

Note the docRoot/testDir prepended to the specified test files.


#### Running tests through V8

Specify '--v8' on the command line and all of the specified tests will be run through V8.

    % jute_submit_test.pl --v8 --test path/to/test/index.html

OR any other permutation of test specification as outlined above.


#### Specifying code coverage

If you'd like your test(s) to run with code coverage enabled add the querystring '?do_coverage=1' to each test you want code coverage enabled for:

    % jute_submit_test --test path/to/my/test/index.html?do_coverage=1

OR

    % jute_submit_test --sel_host 10.3.4.45 --test path/to/test/index.html?do_coverage=1

OR

    % jute_submit_test --test path/to/my/test/index.html?do_coverage=1 --test path/to/other/test/index.html --test path/to/other/other/test.html


!! NOTE docRoot/testDir will be prepended to the specified test files. !!


JUTE Output
============

JUTE output all goes into the outputDir as specified above.  Within that directory will be a directory for each unit test.  The name of the directory is the NAME OF THE TEST SUITE as specified in your javascript test file.  This will be explained in more detail below.

Note both test results and coverage information are available for easy viewing via the JUTE WebUI


Test Results
-------------

For each browser an XML file will be created.  The name of the XML file is a modified version of the USER AGENT string of that browser.  An example:

    Mozilla5_0__Macintosh_U_Intel_Mac_OS_X_10_5_8_en-US__AppleWebKit534_16__KHTML__like_Gecko__Chrome10_0_648_127_Safari534_16-test.xml

This unit test was run in the Chrome browser an Intel Mac OS version 10.5.8.

The format of this file is JUnit XML style test output recognizable by most tools including Hudson.

This looks like:

<pre><code>
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
</code></pre>


Coverage Output
----------------

The the same directory as the test result output will be a directory named 'lcov-report'.  In that directory will be an index.html file you can load into your browser to see coverage results.  JUTE uses yuitest_coverage to instrument and exact coverage information form the requested Javascript files.  See below for how to tell JUTE to instrument selected Javascript files for code coverage.


Writing Unit Tests for JUTE
============================

JUTE requires VERY LITTLE from the developer to have their unit tests incorporated into the JUTE framework.  Any new or already-written Unit Tests can easily be added to the JUTE framework.


YUI3 'test' module
-------------------

The main requirement is using the YUI3 Test and Assertion Framework for running and creating your Unit Tests.  [Look here](http://developer.yahoo.com/yui/3/test/) for detailed information about getting started with YUI3 test module, including running, asserting, and potentially mocking objects for your unit tests.

Note you must use YUI3 version 3.1.1+.

Code Requirements
------------------

To utilize JUTE you need only to make 1 small addition to your test Javascript file.

### Javascript Requirements

Your Javascript test file must 'use' the 'gallery-jute' module:

    YUI({
        logInclude: { TestRunner: true },
        gallery:    'gallery-2011.06.22-20-13'
    }).use('gallery-jute', 'toolbar', function(Y) {


V8 Caveats
-----------

Not all unit tests will run in the V8 backend!!  Event simulation is not supported.  Crazy iframe stuff can be problematic.  Anything expecting a real browser will be disappointed.  All the basic DOM manipulation is available, UI events are not.  No mouse events, No key events, No focus events.  So be safe out there!


Debugging
----------

If you set the JUTE_DEBUG environment variable:

    % export JUTE_DEBUG=1

You'll see even more gory debug output.


Best Practices
===============

By default JUTE assumes a 'best practices' setup.  Using the JUTE yinst set variable outlined above this behavior can be changed.


Developer Environment
----------------------

Point jute.docRoot to your development environment - ideally your tests are set up in a separate directory tree that mirrors your source directory tree.  Regardless any *.html file will be picked up by JUTE under docRoot/testDir.

Developer Build Environment
----------------------------

### A Captured Browser

a local dev build can run all available unit tests - if they're all in a 'test' directory the command to run the tests can be as easy as:

    LOCAL_TEST_DIR = testDir
    run_unit_tests:
        cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec jute_submit_test --test {}?do_coverage=$(DO_COVERAGE) --wait \\; -print

DO_COVERAGE can be set to '1' to generate coverage reports:

    % make run_unit_tests DO_COVERAGE=1

Note this assumes you have at least 1 captured browser.  This will run all of your unit tests with code coverage.

You can of course also select all checkboxes in the webui and the result is the same.

### V8

    run_v8_unit_tests:
        cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec jute_submit_test --v8 --test {}?$(DO_COVERAGE) \\;

All output will go to STDOUT.


Hudson Build Environment
-------------------------

All of your tests can be run thru Selenium - they all need to submitted at once to run as one job:

    submit_selenium_tests:
        cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -printf '%p?do_coverage=$(DO_COVERAGE)\\n' | jute_submit_test.pl --test - --sel_host $(SEL_HOST) --sel_browser $(SEL_BROWSER) --send_output

This will return once all tests have run.  Ensure Hudson is configured correctly to look in the output directory for test results and code coverage.  If a unit test fails Hudson will label the build 'Unstable'.  Clicking thru the "Test Results" will reveal the failed test(s).

Build/Hudson integration
========================

Running tests and result and code coverage information are easily integrated into your builds and Hudson.

Running Tests
--------------

Where:

* LOCAL_TEST_DIR is the root of where your test files live on the build or local host (testDir)
* SEL_HOST is the hostname/IP of your Selenium box or grid
* SEL_BROWSER is '*firefox' or '*iexplore' or whatever browser specification you want to use
* DO_COVERAGE is 1 or 0 depending on if you want coverage (you probably do)

### Local

Running JUTE/browser tests locally is a simple Makefile rule.


#### Captured Browser(s)

    submit_tests:
        cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec jute_submit_test --test {}?do_coverage=$(DO_COVERAGE} --wait \\; -print


#### Selenium

    submit_selenium_tests:
        cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -printf '%p?do_coverage=$(DO_COVERAGE)\\n' | jute_submit_test --test - --sel_host $(SEL_HOST) --sel_browser $(SEL_BROWSER) --send_output 


#### V8

    submit_v8_tests:
        cd $(LOCAL_TEST_DIR) && find . -not \\( -path "*/.svn/*" \\) -name '*.html' -exec jute_submit_test --v8 --test {}?$(DO_COVERAGE} \\; 


Viewing Test Results
---------------------


### Output Directory

All results are stored in outputDir - you can look at the *.xml files to view the raw JUnit XML output.  

### Browser

    http://<jute host>/

& click on links in the 'Results' column - this will show results for captured, Selenium, and V8 tests.


#### Hudson Code Coverage

Running individual tests will generate a directory hierarchy rooted at your output_dir.  The first thing you need to do is to aggregate all the individual coverage output into one mongo output files containing all the the individual output files.

This can be accomplished by a simple Makefile rule:

    LCOV_GENHTML = /usr/local/bin/genhtml # Freely available - probably already installed!
    OUTPUT_DIR = <outputDir>
    TOTAL_LCOV_FILE = $(OUTPUT_DIR)/lcov.info
    make_total_lcov:
        /bin/rm -f /tmp/lcov.total
        @echo "OUTPUT DIR: ${OUTPUT_DIR}"
        @echo "TOTAL LCOV FILE: ${TOTAL_LCOV_FILE}"
        find $(OUTPUT_DIR) -name lcov.info -exec cat {} >> /tmp/lcov.total \\;
        @cp /tmp/lcov.total $(TOTAL_LCOV_FILE)
        @ls ${OUTPUT_DIR}
        /bin/rm -rf $(OUTPUT_DIR)/lcov-report
        $(LCOV_GENHTML) -o $(OUTPUT_DIR)/lcov-report $(TOTAL_LCOV_FILE)

Now simply point Hudson to this aggregated 'lcov.info' file - check 'Publish Lcov Coverage Report' and set 'lcov.info file mask' to something similar to '&lt;outputDir>/lcov.info' depending on where your outputDir is relative to your workspace root.


License
=======

This software is licensed under the BSD license available at http://developer.yahoo.com/yui/license.html
