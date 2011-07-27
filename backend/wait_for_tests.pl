#!/usr/local/bin/perl

use LWP::UserAgent;
use JSON;
use Sys::Hostname;

my $ua = LWP::UserAgent->new;
my $total_time;
my $MAX_WAIT = '$(total_wait_threshold)' * 60; # give up after 10 mins

my $host = '$(jute_server)' || hostname;

print "Connect to http://$host/jute/ to run tests...\n";

my $verbose = shift;
while(1) {

    my $response = $ua->get("http://$host/jute/_status");
    
    if ($response->is_success) {
        my $obj = from_json($response->decoded_content);
        die "No browsers: " . $response->decoded_content . "\n" if (!$obj->{browsers} || !%{$obj->{browsers}});
        my $tests = $obj->{tests_to_run};
        local($") = ", ";
        if (@$tests) {
            print "Waiting for " . $tests->[0]{url} . "...\n" if ($verbose);
        } else {
             exit;
        }
    }
    else {
        die $response->decoded_content;
    }
}  continue {
     $total_time += sleep(10);
     die "Timed out waiting for tests to finish\n" if ($total_time > $MAX_WAIT);
}
