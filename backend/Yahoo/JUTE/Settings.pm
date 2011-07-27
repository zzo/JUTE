package Yahoo::JUTE::Settings;

my $VERSION = '1.0';

use vars qw($as_user $html_root_dir $doc_root $test_dir $output_dir $fcgi_processes $heartbeat_interval $test_wait_threshold $test_files $full_find $port);

####
## Name of user to run the JUTE FCGI processes as
##   Bascially this username needs to have write permissions into $output_dir
##  DEFAULT 'nobody'
####
$as_user = 'nobody';

####
## Your document root directory
##  DEFAULT '/var/www'
####
$doc_root = '/var/www';

####
## Name of directory under $doc_root where yer code is
##   This is typically a symlink into your local code repo in your home dir
##  DEFAULT 'jutebase'
####
$html_root_dir = 'jutebase';

####
## Name of directory under $html_root_dir where your test files are
##  DEFAULT 'test'
####
$test_dir = 'test';

####
## Name of directory under $html_root_dir where test results and code coverage
##  output goes
##  DEFAULT 'output'
####
$output_dir = 'output';

####
## Number of FastCGI processes to start
##  DEFAULT 5
####
$fcgi_processes = 5;

####
## Number of seconds to wait before timing out a captured browser
##  DEFAULT 20
####
$heartbeat_interval = 20;

####
## How long we're willing to wait for a Selenium browser to connect
##  to us
##  DEFAULT 60
###
$test_wait_threshold = 60;

####
## Basic find expression to find your HTML test files
##      looks for these under $test_dir
## DEFAULT: *.html
####
$test_files = '';

###
# Arguments to 'find' for finer-grained control to find your test files
#      looks for these under $test_dir
# DEFAULT: -not \\( -path '*/.svn/*' \\) -name '$test_files'
###
$full_find = '';

###
# IF you're using the JUTE standalone webserver, port to listen on
# DEFAULT: 8080
###
$port = 8080;

##
# Directory where yuitest-coverage.jar and yuitest-coverage-report.jar live
# DEFAULT: /usr/local/lib/
###
$jar_dir = '/usr/local/lib/';

1;
