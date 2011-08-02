#!/usr/bin/perl

my $VERSION = '1.0';

use 5.008;
use strict;
use IO::File;
use Cwd;
use CGI;
use File::Basename;
use JSON;
use URI;
use IPC::ShareLite;
use HTTP::Response;
use Fcntl qw(:flock);
use Yahoo::JUTE::Actions;
use Yahoo::JUTE::Settings;
use URI::Escape;
use POSIX;
use Data::UUID;
use HTTP::Status;
use Socket;
use LWP::UserAgent;

my $ug = new Data::UUID;
my $me = $JUTE::Settings::as_user || $ENV{USER};

# set group and user
my ($uid, $gid) = (getpwnam($me))[2,3];
POSIX::setgid($gid);
POSIX::setuid($uid);

warn "Running as " . getpwuid($uid) . '/' . getgrgid($gid) . "\n";

# Run only 1 of me
open SELF, $0 or die "This is weird\n";
flock SELF, LOCK_EX | LOCK_NB  or exit;  # already running

$| = 1;

my $html_root = $Yahoo::JUTE::Settings::html_root_dir || 'jutebase';
my $root = $Yahoo::JUTE::Settings::doc_root . "/$html_root";
$root .= '/' unless $root =~ m/\/$/;

my $dirs = {};
$dirs->{root}           = $root;
$dirs->{html_root}      = $html_root;
$dirs->{html_test_root} = $Yahoo::JUTE::Settings::test_dir || 'test';
$dirs->{test_dir}       = $root . $dirs->{html_test_root};
$dirs->{jar_dir}        = $Yahoo::JUTE::Settings::jar_dir;
$dirs->{html_output_root} = $Yahoo::JUTE::Settings::output_dir || 'output';
$dirs->{output_dir}       = $root . $dirs->{html_output_root};

system("mkdir -p " . $dirs->{output_dir}) unless (-d $dirs->{output_dir});

my $java;
if (-d $ENV{JAVA_HOME}) {
    $java = join '/', $ENV{JAVA_HOME}, 'bin', 'java';
}
if (!$java || !-x $java) {
    $java = `which java`; 
    chomp($java);
}

die "Cannot find 'java' executable!!  Either set \$JAVA_HOME or \$PATH or install yjava_jdk (linux) or vespa_jdk (bsd)!!!\n\n" unless (-f $java && -x $java);

$dirs->{java} = $java;

my $share = IPC::ShareLite->new(
    -key     => 1971,
    -create  => 'yes',
    -destroy => 'no'
) or die $!;

# prime pump
$share->store(to_json({ tests_to_run => [] }));

my($socket, $request, $daemon, $proc_manager);
require FCGI;
require FCGI::ProcManager;

# Start FCGI party
umask(0);
$socket = FCGI::OpenSocket("/tmp/jute.socket", 5);
$request = FCGI::Request(\*STDIN, \*STDOUT, \*STDERR, \%ENV, $socket, &FCGI::FAIL_ACCEPT_ON_INTR);

daemon_fork();
$proc_manager = FCGI::ProcManager->new(
    {
        n_processes => $Yahoo::JUTE::Settings::fcgi_processes || 5,
        pid_fname   => '/tmp/jute.pid',
    }
);

# detach *before* the ProcManager inits
daemon_detach();

$proc_manager->pm_manage();

# Give each child its own RNG state.
srand;
do_fcgi_request_loop();

sub do_fcgi_request_loop() {
    while( $request->Accept() >= 0 ) {
        $proc_manager->pm_pre_dispatch();

        my $q = CGI->new;

    #    use Data::Dumper;
    #    warn Dumper(\%ENV);

        $ENV{REQUEST_URI} =~ s#^/jute/##;
        my $url = $ENV{REQUEST_URI} || '_capture.html';

        my $response = handleConnection($url, $q, \%ENV);
        my $output_buffer = handle_response($response);

        *STDOUT->syswrite($output_buffer);
        CGI->initialize_globals();

        $proc_manager->pm_post_dispatch();
    }
}

sub handle_response {
    my($response) = @_;
    my $output_buffer;
    if ($response->is_redirect) {
        warn "Redirect to " . $response->content . "\n";
        $output_buffer = 'Location: ' . $response->content() . "\n\n";
    } else {
        unless ($response->{already_sent_header}) {
            $response->content_type ? 1 : $response->content_type("text/html");

            $output_buffer = "Status: " . $response->code() . "\n";
            $output_buffer .= $response->{_headers}->as_string() . "\n";
        }

        if (ref $response->content() eq 'CODE') {
            while (my $buf = $response->content()->()) {
                $output_buffer .= $buf;
            }
        } else {
            $output_buffer .= $response->content();
        }
    }

    return $output_buffer;
}

sub handleConnection {
    my($url, $q, $env) = @_;

        my $response = new HTTP::Response(404, undef, undef, "404 - Not found.");

        my $session = $q->cookie('session') || $env->{SESSION_COOKIE};
        if (!$session) {
#            warn "CREATE NEW SESSION\n";
            $session = $ug->create_str(); # Guaranteed unique until 3400CE - Woo!!
        } else {
#            warn "reusing old session!\n";
        }

        $response->header(Set_Cookie => $q->cookie(-name=>'session', -value=>$session));

        $url =~ s/\?(.*)$//;
        my $get_p = CGI->new($1)->Vars || '';

        # Internal action
        $url =~ s#^_## if ($url !~ /\./);

        my $args = {
            params   => $q->Vars || {}, 
            get_p    => $get_p,
            response => $response, 
            share    => $share,
            root     => $root,
            action   => $url,
            env      => $env,
            dirs     => $dirs,
            fcgi     => $request,
            session  => $session,
            cgi      => $q,
        };

        # clear out any cruft
        if (Yahoo::JUTE::Actions::prune($args)) {
            warn "redirect!\n";
            $response->code( 200 );
            $response->content_type('text/plain');
            $response->content(to_json({ redirect_run_tests => '/jute_docs/run_tests.html' }));
        } elsif (Yahoo::JUTE::Actions->can($url)) {
            eval {
                no strict 'refs';
                "Yahoo::JUTE::Actions::$url"->($args);
            };
            if ($@) {
                $response->code(500);
                $response->content("<h1>Error: $@</h1>");
            }
        } else {
            return fetch($url, $q, $response, $env);
        }

    return $response;
}

sub fetch {
    my($url, $q, $response, $env) = @_;

#    warn "FETCH: $url\n";

    # for JS stuff I may coverage
    $url =~ s#^/$html_root/##;

    my $obj = from_json($share->fetch());

    # do coverage IF this is a coverage-able file AND Referer wants us to do coverage
    my $full_path_file;
    my $qp = $q->Vars;
    my $ref_qp = CGI->new(URI->new($env->{HTTP_REFERER})->query)->Vars;
    if ($qp->{coverage} && $url =~ /\.js$/ && $ref_qp->{do_coverage}) {
        # coverage-zie this file first
        my $cover_file = "${root}$url";
        $full_path_file = '/tmp/' . basename($url);
        chmod 0777, $full_path_file;
        warn "Generating coverage file $full_path_file for $cover_file...";
        system($dirs->{java} . ' -jar ' . $dirs->{jar_dir} . "/yuitest-coverage.jar -o $full_path_file $cover_file");
    }

    # a local meta-file
    if ($url =~ s/^_//) {
        $full_path_file =  $Yahoo::JUTE::Settings::doc_root . "/jute_docs/$url";
    }

    if ($url =~ m#/jute_docs/#) {
        $full_path_file =  $Yahoo::JUTE::Settings::doc_root . $url;
    }

    warn "URL: $url\n";

    my $local_file = $full_path_file || "${root}$url";
    warn "Local file: $local_file";
    my $file = IO::File->new("< $local_file");
    if (defined $file) {
        $response->code(200);
        binmode $file;
        my $buf = sysread($file, my ($buf), 16*1024); # No error checking ???
        $response->content($buf);
        $response->header(Content_Length => -s $file);
        if ($local_file =~ /\.js$/) {
            $response->content_type('application/javascript');
        }

        my $size = -s $file;

        my ($startrange, $endrange) = (0,$size-1);
        if (defined $env->{HTTP_RANGE}
                and $env->{HTTP_RANGE} =~ /bytes\s*=\s*(\d+)-(\d+)?/) {
            $response->code(206);
            ($startrange,$endrange) = ($1,$2 || $endrange);
        };
        $file->seek($startrange,0);

        $response->header(Content_Length => $endrange-$startrange);
        $response->header(Content_Range => "bytes $startrange-$endrange/$size");
        $response->content(
            sub {
                sysread($file, my ($buf), 16*1024); # No error checking ???
                return $buf;
            }
        );
    }

    return $response;
}

FCGI::CloseSocket( $socket );

sub daemon_fork {
    fork && exit;
}

sub daemon_detach {
    print "FastCGI daemon started (pid $$)\n";
    open STDIN,  "+</dev/null" or die $!;
    open STDOUT, ">&STDIN"     or die $!;
    open STDERR, ">&STDIN"     or die $!;
    POSIX::setsid();
}

