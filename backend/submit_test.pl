#!/usr/local/bin/perl

use Getopt::Long;
use Data::Dumper;
use HTTP::Request::Common;
use LWP::UserAgent;
my $ua = LWP::UserAgent->new(timeout => 30*60);

my(@tests, $sel_host, $sel_browser, $send_output, $v8, $browsers);
GetOptions(
        "test=s"        => \@tests,
        "sel_host=s"    => \$sel_host,
        "sel_browser=s" => \$sel_browser,
        "send_output"   => \$send_output,
        "v8"            => \$v8,
        "browsers=i"    => \$browsers,
);

my $args = {};
my $test = shift;

if (@tests) {
    my $run_tests = [];
    foreach $test (@tests) {
        if ($test eq '-') {
            my @stdin_tests = <STDIN>;
            foreach $test (@stdin_tests) {
                chomp $test;
                $test = fix_test($test);
                push @$run_tests, $test;
            }
        } else {
            $test = fix_test($test);
            push @$run_tests, $test;
        }
    }
    $args = { tests => "@$run_tests" };
} elsif ($test) {
    $sel_host = shift;
    $sel_browser = shift;

    $test = fix_test($test);
    $args = { test => $test };
} else {
    die "ERROR: Must specify a test!!\n";
}

if ($sel_host) {
    $sel_browser ||= '*firefox';
    $args->{sel_host} = $sel_host;
    $args->{browser}  = $sel_browser;
    $args->{browsers} = $browsers;
}

if ($v8) {
    foreach(@$run_tests, $test) {
        my($coverage) = $_ =~ s/\?do_coverage=1$//;
        if (-x '/home/y/bin/jute_v8.js') {
            print STDERR "ERROR: You must install the 'jute_v8' package to run V8 tests!!\n";
            exit(1);
        }
        system("/home/y/bin/jute_v8.js $_ $coverage");
    }
    exit;
}

$args->{send_output} = $send_output;

my $jute_server = 'http://dashr.net:8080';

print "Submitting: " . Dumper($args) . "\n";
my $bytes_received = 0;
my $response = $ua->request(POST("$jute_server/jute/_run_test", $args),
    sub {
        my($chunk, $res) = @_;
        $bytes_received += length($chunk);
        unless (defined $expected_length) {
            $expected_length = $res->content_length || 0;
        }
        print "The chunk is:\n" . $chunk;
    }
);

print "The response code is:\n" . $response->code . "\n";
print "The response decoded content is:\n" . $response->decoded_content . "\n";
exit if ($response->is_success);
die "ERROR: Failed to submit test\n";

sub fix_test {
    my($test) = @_;

    return $test if ($v8);

#    $test =~ s#^\.\.#/$(html_root)#;
#    if ($test !~ m#^/#) {
#        $test = '/$(html_root)/$(test_dir)/' . $test;
#    }

    return $test;
}

