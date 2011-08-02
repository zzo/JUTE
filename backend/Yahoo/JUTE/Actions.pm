package Yahoo::JUTE::Actions;

my $VERSION = '1.0';
my $ERROR   = q(<?xml version="1.0" encoding="UTF-8"?><testsuites><testsuite name="BROWSER" tests="0" failures="1" time="0">Test Timed Out: Most likely a Javascript parsing error - try loading URL in your browser</testsuite></testsuites>);

use IO::File;
use File::Temp qw(:POSIX);
use Fcntl qw(:flock SEEK_END);
use POSIX ":sys_wait_h";
use JSON;
use IPC::ShareLite qw(:lock);
use URI;
use URI::Escape;
use Sys::Hostname;
use File::Basename;
use Yahoo::JUTE::Settings;

use Net::hostent;
use Socket;

use Data::Dumper;

my $BROWSER_TIME_THRESHOLD  = $Yahoo::JUTE::Settings::heartbeat_interval || 20;
my $TEST_TIME_THRESHOLD     = $Yahoo::JUTE::Settings::test_wait_threshold || 60;
my $REMOTE_CHECK_INTERVAL   = 10; # seconds between checking for output/if selenium is done
my $TEST_RUN_CHECK_INTERVAL = 5; # seconds between checking if selenium is done
my $LOCAL_PORT              = 80;

sub get_yslow {
    my($args) = @_;

    my $params = $args->{params};
    my $cgi    = $args->{cgi};
    my $output_filename = tmpnam();
    warn "Writing yslow json output to $output_filename\n";

    my $sel_host = $params->{selenium_host};
    my $timing   = $params->{do_timing};
    my $url      = $params->{url};
    my $uri      = URI->new($url);

    fiddle_share($args,
        sub {
            my($obj) = @_;
            my $save_obj = { output_file => $output_filename };
            if ($timing) {
                $save_obj->{wait_for_timing} = 1;
            }
            $obj->{yslow}{$uri->host} = $save_obj;
        }
    );

    # add timing url if requested
    if ($timing) {
        $url .= '?timing_host=' . $cgi->server_name . '/jute/_yslow_timing';
        warn "Timing url is: $url\n";
    }

    require WWW::Selenium;
    my $selenium = WWW::Selenium->new(
        host        => $sel_host,
        port        => 4444, 
        browser     => '*firefox', 
        browser_url => $url,
    );

    $selenium->open($url);

    # Now wait...
    eval {
        $selenium->wait_for_page_to_load(2000000);
    };
    warn "Error waiting: $@\n" if ($@);

#    sleep(10);
    open(JSON, $output_filename);
    my $yslow_json = eval { from_json(<JSON>); };
    close(JSON);

    warn "Responding...!\n";
    my $response = $args->{response};
    $response->code(200);
    $response->content_type('application/x-json');
    $response->content(to_json({ yslow_data => $yslow_json }));
}

# YSLOW posting timing back to us
sub yslow_timing {
    my($args) = @_;

    my $params = $args->{get_p};
    my $render_time = $params->{renderTime};
    my $load_time   = $params->{loadTime};
    my $url         = $params->{url};
    my $uri         = URI->new($url);

    my ($obj, $output_obj) = fiddle_share($args,
        sub {
            my($obj) = @_;
            my $ys_obj = $obj->{yslow}{$uri->host};
            $ys_obj->{render_time} = $render_time;
            $ys_obj->{load_time}   = $load_time;
            delete $ys_obj->{wait_for_timing};
            if ($ys_obj->{yslow_object}) {
                return delete $obj->{yslow}{$uri->host};
            } else {
                return;
            }
        }
    );

    if ($output_obj) {
        dump_yslow_output($args, $output_obj);
    }

    my $response = $args->{response};
    $response->code( 200 );
    $response->content_type('text/plain');
    $response->content('OK');
}

# YSLOW posting back to us
sub yslow {
    my($args) = @_;

    my $params = $args->{params};
    my $yslow_var = $params->{POSTDATA};
    my $yslow_obj = eval { from_json(uri_unescape($yslow_var)); };
    my $url = $yslow_obj->{u};
    my $uri = URI->new($url);

    my ($obj, $output_obj) = fiddle_share($args,
        sub {
            my ($obj) = @_;
            my $ys_obj = $obj->{yslow}{$uri->host};
            if ($ys_obj->{wait_for_timing}) {
                $ys_obj->{yslow_object} = $yslow_obj;
                return;
            } else {
                $ys_obj->{yslow_object} = $yslow_obj;
                return delete $obj->{yslow}{$uri->host};
            }
        }
    );

    if ($output_obj) {
        dump_yslow_output($args, $output_obj);
    }

    my $response = $args->{response};
    $response->code( 200 );
    $response->content_type('text/plain');
    $response->content('OK');
}

sub dump_yslow_output {
    my($args, $output_obj) = @_;

    $output_obj->{yslow_object}{neo_load_time}   = $output_obj->{load_time};
    $output_obj->{yslow_object}{neo_render_time} = $output_obj->{render_time};

    my $dump_me = to_json($output_obj->{yslow_object});

    my $output_file = $output_obj->{output_file};
    if ($output_file && open(O, ">$output_file")) {
        print O $dump_me;
        close(O);
    } else {
        _dump_file({ dump_me => $dump_me }, 'dump_me', 'yslow.json', '', $args);
    }
}

sub make_sane_names {
    my($browser) = @_;

    # make a sane filename (especially for hudson)
    my ($filename, $ip) = split /---/, $browser;
    $filename =~ s/[\/;]//g;
    $filename =~ s/[^A-Z0-9a-z-]/_/g;

    # Make a hudson-happy java-like package name
    my $pkgname = $filename;
    $pkgname =~ s/\.//g;
    $pkgname =~ s/_+/./g;

    return ($filename, $pkgname);
}

sub test_report {
    my($args) = @_;

    my $params    = $args->{params};
    my $response  = $args->{response};
    my $xml       = $params->{results};
    my $browser   = _browser_key($args);

    my($filename, $pkgname) = make_sane_names(_browser_name($args));

    $xml =~ s/testsuite name="/testsuite name="$pkgname./g;
    $params->{results} = $xml;

    my $name = $params->{name} || 'remote_cover';

    my $succeeded = 1;

    if ($params->{name}) {
        my ($file) = _dump_file($params, 'results', $filename . '-test.xml', $name, $args);
        if (failed_tests($file)) {
            $succeeded = 0;
        }
        warn "Test Report for $name - succeeded: $succeeded";
    }

    if ($params->{coverage} && $params->{coverage} ne 'null') {
        my $cover_obj = from_json($params->{coverage});
        foreach my $file (keys %$cover_obj) {
            $new_file = join '/', 'output', $name, 'lcov-report', $file;
            $cover_obj->{$new_file} = delete $cover_obj->{$file};
        }
        $params->{coverage} = to_json($cover_obj);

        my ($file, $dir) = _dump_file($params, 'coverage', 'cover.json', $name, $args);
        system($args->{dirs}{java} . ' -jar ' . $args->{dirs}{jar_dir} . "/yuitest-coverage-report.jar -o $dir --format lcov $file");
        warn "Coverage Report for $name";
    } else {
        warn "Empty coverage Report";
    }

    fiddle_share($args,
        sub {
            my $obj = shift;
            my $total_tests = scalar(@{$obj->{tests_to_run}});
            for (my $i = 0; $i < @{$obj->{tests_to_run}}; $i++) {
                my $test = $obj->{tests_to_run}[$i];
                next unless ($test->{browser} eq $browser);
                if ($test->{send_output}) {
                    _send_remote_output($test->{send_output}, "$name finished - it ", ($succeeded ? 'SUCCEEDED' : 'FAILED'), ' it took ', (time - $test->{running}), ' seconds');
                    _send_remote_output($test->{send_output},  (scalar(@{$obj->{tests_to_run}}) - 1) . " tests left...");
                    my $total_time = ($total_tests - 1) * (time - $test->{running});
                    $params->{browsers} ||= 1;
                    $total_time /= $params->{browsers};
                    _send_remote_output($test->{send_output}, "At that rate it'll take about $total_time seconds (" . ($total_time/60.) . " minutes) to be done done.");
                }
                splice @{$obj->{tests_to_run}}, $i, 1;
                last;
            }
        }
    );

    $response->code( 200 );
    $response->content('OK');
}

sub clear_tests {
    my($args) = @_;

    my $response = $args->{response};
    fiddle_share($args,
        sub {
            shift->{tests_to_run} = [];
        }
    );

    $response->code( 200 );
    $response->content('OK');
}

###
# NEED TO FLOCK!!!
###
sub _send_remote_output {
    my($f) = shift;

    my $line = join '', @_, "\n";

    open(my $file, ">>$f")  or (warn "Can't open remote send: $!\n", return);
    _lock_file($file);
    $file->print($line);
    _unlock_file($file);

    warn "send_remote_output: $line";
}

sub _send_to_client {
    my($args) = shift;

    my $response = $args->{response};
    if (!$response->{already_sent_header}) {
        $response->content_type ? 1 : $response->content_type("text/html");
        unshift(@_, $response->{_headers}->as_string(), "\n");
        $response->{already_sent_header}++;
    }

    my $text = join '', @_;

    warn "To client ($ret): $text\n";
    my $ret = eval { *STDOUT->syswrite(join '', @_, "\n"); };
    if ($@) {
        warn "Client went away: $@\n";
    }

    *STDOUT->flush();
    if ($args->{fcgi}) {
        $args->{fcgi}->Flush;
    }

    return $ret;
}

sub clear_results {
    my($args) = @_;

    my $response = $args->{response};
    my $output_dir = $args->{dirs}{output_dir};

    system("/bin/rm -rf $output_dir/*");
    $response->code( 200 );
    $response->content('OK');
}

sub startSelenium {
    my($params, $url, $args, $num_tests) = @_;

    my $response = $args->{response};

    require WWW::Selenium;
    my $selenium = WWW::Selenium->new(
        host        => $params->{sel_host},
        port        => 4444, 
        browser     => $params->{browser},
        browser_url => $url,
    );

    $selenium->start;
    $selenium->open('/jute/');

    $selenium->wait_for_page_to_load(60000); # 60 seconds
    my $max_wait_time = $TEST_TIME_THRESHOLD * $num_tests; # give test time to run once the page loads - so stick around
    # While use IE, wait for a few seconds to let the test start
    if ($params->{browser} =~ /^\*ie/) {
        $max_wait_time -= sleep($TEST_RUN_CHECK_INTERVAL);
    }

    eval { $selenium->select_frame('run_tests'); };
    if ($@) {
        _send_to_client($args, "Got an exception when try to select the 'run_tests' frame.\n" . to_json({ error => $@ }));
        return;
    }

    my $is_test_finished = 0;
    do {
        $max_wait_time -= sleep($REMOTE_CHECK_INTERVAL);
        if ($params->{send_output}) {
             if (-s $params->{send_output}) {
                open(my $file, "+<" . $params->{send_output});
                if ($file) {
                    flock($file, LOCK_EX); ## don't call _lock_file as it seeks to the end...
                    my @out = <$file>;
                    $file->truncate(0);
                    $file->close();
                    _send_to_client($args, @out);
                }
            }
        } 

        # Verify if the test finished or not
        eval {
            $is_test_finished = $selenium->is_element_present('name=multiple_tests');
        };
        if ($@)  {
            # If catch any exception there, continue the work
            if ($params->{send_output}) {
                _send_to_client($args, "WARNING: Got an error when try to check if the test finished.\n" . to_json({ error => $@ }));
            }
        }
    } while (!$is_test_finished && ($max_wait_time > 0));

    my $base_dir  = $args->{dirs}{output_dir};
    my $map = {};
    while (my $component = <$base_dir/*>) {
        $component = basename($component);
        my @test_files = <$base_dir/$component/*.xml>;
        foreach (@test_files) {
            if (failed_tests($_)) {
                push @{$map->{FAILED}}, $component;
            } else {
                push @{$map->{SUCCEEDED}}, $component;
            }
        }
    }
    warn "DONE!";
    warn Dumper($map);

    if ($params->{send_output}) {
        _send_to_client($args, to_json({ results => $map }));
    }
}

sub run_test {
    my($args) = @_;

    my $response = $args->{response};
    my $params   = $args->{params};
    my $cgi      = $args->{cgi};
    my $browser_key = _browser_key($args);

    my @tests;
    if ($params->{test}) {
        push @tests, $params->{test};
    } elsif ($params->{tests}) {
        push @tests, split(/\s+/, $params->{tests});
    }

    $params->{send_output} = tmpnam() if ($params->{send_output});

    # Tell a browser to fetch
    my ($obj, $browsers) = fiddle_share($args,
        sub {
            my($obj) = @_;
            my $browsers;

            foreach my $test (@tests) {

                my $url = URI->new($test);
                if ($params->{sel_host}) {
                    my $base_url   = 'http://' . $cgi->server_name;
                    my $url_to_hit = $base_url . '/jute/'; #/capture.html' #?test=' . $url_test; # . '&_one_shot=1';
    
                    # Normalize this so we can hand out tests to it later
                    #   (we just gotta assume there's only 1 browser)
                    my $hostent = gethost($params->{sel_host});
                    my $sel_ip  = inet_ntoa($hostent->addr);
    
                    push @{$obj->{tests_to_run}}, 
                        { 
                            url         => $url->as_string,
                            sel_url     => $url_to_hit,
                            sel_host    => $params->{sel_host},
                            sel_ip      => $sel_ip,
                            sel_browser => $params->{browser},
                            running     => 0,
                            send_output => $params->{send_output},
                        };
    
                    $browsers = $url_to_hit;
                } else {
                    foreach my $browser (keys %{$obj->{browsers}}) {
                        # Don't add tests to any Selenium browsers - they go away...
                        next if ($browser->{is_selenium});
    
                        push @{$obj->{tests_to_run}}, 
                            { 
                                url     => $test,
                                browser => $browser,
                                running => 0,
                                send_output => $params->{send_output},
                            };
                        $browsers++;
                    }
                }
            }

            return $browsers;
        }
    );

    if ($browsers) {
        $response->code( 200 );

        if ($params->{sel_host}) {

            if ($params->{send_output}) {
                _send_to_client($args, sprintf("Opening %s on Selenium host %s...", $params->{browser}, $params->{sel_host}));
            }

            my $num_browsers = $params->{browsers} || 1;

            my @pids;
            while($num_browsers) {
                my $pid = Fork();
                next if (!defined($pid));
                if (!$pid) {
                    startSelenium($params, $browsers, $args, scalar(@tests));
                    exit();
                }

                push @pids, $pid;
                $num_browsers--;
            }

            do {
                sleep($TEST_RUN_CHECK_INTERVAL);
                my $wait = waitpid($pids[-1], &WNOHANG);
                pop @pids if ($wait);
            } while(@pids);
        } else {
            $response->content('Added ' . ($params->{test} || $params->{tests}) . ' to tests for ' . $browsers . ' browsers.');
        }
    } else {
        warn "No browsers listening!\n";
        $response->content('No browsers listening!!  Test not added!');
        $response->code( 500 );
    }
}

sub get_test {
    my($args) = @_;

    my $response = $args->{response};

    $response->content(to_json({}));

    my ($obj, $url) = fiddle_share($args,
        sub {
            my $obj = shift;
            my $browser = _browser_key($args);
            my $browser_name = _browser_name($args);
            $obj->{browsers}{$browser}{get_test} = time;

#            warn "Get test for $browser/$browser_name\n";
            FIND_TEST: for (my $i = 0; $i < @{$obj->{tests_to_run}}; $i++) {
                my $test = $obj->{tests_to_run}[$i];
                if (($test->{browser} eq $browser) && $test->{running}) {
                    # um you're already running this test!
                    #   must be something wrong with it - pop it
                    my $error = 'Skipping bad test: ' . $test->{url} . ': we thought it was running!';
                    warn "$error\n";
                    if ($test->{send_output}) {
                        _send_remote_output($test->{send_output}, $error);
                    }
                    splice @{$obj->{tests_to_run}}, $i, 1;
                    redo FIND_TEST;
                }
                # So either the browser matches OR it's a Selenium test
                #   so we match on remote IP
                if (!$test->{browser}) {
                    # A Selenium host
                    $test->{browser} = $browser;
                    $obj->{browsers}{$browser}{is_selenium} = 1;
                }
                next unless ($test->{browser} eq $browser);
#                if ($test->{send_output}) {
#                    _send_remote_output($test->{send_output}, "Going to run test ", $test->{url}, " in $browser_name/$browser");
#                }

                $test->{running} = time;
                return $test->{url};
            }

            return;  # nothing for this guy to do...
        }
    );

    if ($url) {
        $response->content(to_json({ testLocation => $url }));
        warn "Sending test url: $url";
    } else {
        # find all local tests
        my $prefix              = $args->{dirs}{test_dir};
        my $new_prefix          = join '/', $args->{dirs}{html_root}, $args->{dirs}{html_test_root};
        my $local_test_files    = $Yahoo::JUTE::Settings::test_files || '*.htm*';
        my $full_find           = $Yahoo::JUTE::Settings::full_find || "-not \\( -path '*/.svn/*' \\) -name '$local_test_files'";
        my @test_files          = `find $prefix $full_find -print`;
        chomp @test_files;
        my $data =  [];
        foreach (@test_files) {
            s#$prefix#/$new_prefix#;
            my @dirs = split '/', $_;
            push @$data, { test_url => $_, test_name => join('/', @dirs[-2..-1]) };
        }
        use Data::Dumper;
            warn "Found tests: " . Dumper($data) . "\n";
        $response->content(to_json({ availableTests => $data }));
    }

    $response->content_type('application/x-json');
    $response->code( 200 );
}

sub capture {
    my($args) = @_;

    my $add = $args->{get_p}->{_one_shot} ? '_one_shot=1' : '';
    if ($args->{get_p}{test}) {
        $args->{params}{test} = $args->{get_p}{test};
        $add = '_one_shot=1';
        run_test($args);
    }
    $args->{response}->code(302);
    $args->{response}->content("/jute_docs/capture.html?$add");
}

sub status {
    my($args) = @_;

    _dump_obj($args);
}

sub prune_tests {
    my ($args) = @_;

    return fiddle_share($args,
        sub {
            my ($obj, $now) = (shift, time);
            my $browser = _browser_key($args);
            for (my $i = 0; $i < @{$obj->{tests_to_run}}; $i++) {
                my $test = $obj->{tests_to_run}[$i];
                my $time_started = $test->{running};
                if ($time_started) {
                    if ($now - $time_started > $TEST_TIME_THRESHOLD) {
                        # take it out of ay tests it's supposed to be running
                        warn "Test running for longer than $TEST_TIME_THRESHOLD seconds!  Killing it...";
                        warn "$now - $time_started = " . ($now - $time_started) . " > $TEST_TIME_THRESHOLD\n";
                        my $failed_test = splice @{$obj->{tests_to_run}}, $i, 1;

                        my $url = $failed_test->{url};
                        if ($failed_test->{send_output}) {
                            _send_remote_output($failed_test->{send_output}, "$url finished - it timed out - javascript error?");
                        }

                        # Use test file name as the NAME of this test (vs. component name from test itself)
                        my @parts = split m#/#, $url;
                        my $name = pop @parts;
                        $name =~ s/\..*$//;

                        my($filename, $pkgname) = make_sane_names(_browser_name($args));
                        my $err = $ERROR;
                        $err    =~ s/BROWSER/$pkgname/;
                        $err    =~ s/URL/$url/;
                        my $params = { results => $err, name => $name };
                        warn "Dumped error unit test file $name / $filename (from $url)\n";
                        _dump_file($params, 'results', $filename . '-test.xml', $name, $args);

                        if ($obj->{browsers}{$browser}) {
                            $obj->{browsers}{$browser}{heart_beat} = $now;
                            $obj->{browsers}{$browser}{get_test}   = $now;
                            return 1;
                        }
                    }
                } else {
                    # make sure browser is still requesting tests
                    if ($obj->{browsers}{$browser}) {
                        my $last_got_test = $obj->{browsers}{$browser}{get_test};
                        if ($args->{action} ne 'get_test' && ($now - $last_got_test > $TEST_TIME_THRESHOLD)) {
                            warn "Been too long since you've requested a test: $browser\nKicking iframe...";
                            return 1;
                        }
                    }
                }
            }

            return;
        }
    );
}

sub prune_browsers {
    my ($args) = @_;

    fiddle_share($args,
        sub {
            my ($obj, $now) = (shift, time);
            my $me = _browser_key($args);
            if ($obj->{browsers} && ref $obj->{browsers} eq 'HASH') {
                foreach my $browser (keys %{$obj->{browsers}}) {
                    next if ($browser eq $me);
                    warn "ME: $me\n";
                    warn "browser: $browser\n";
                    my $b_time = $obj->{browsers}{$browser}{heart_beat};
                    if ($now - $b_time > $BROWSER_TIME_THRESHOLD) {
                        warn "We lost $browser!\n";
                        warn "Time since we last saw him: " . ($now - $b_time) . "\n";
                        delete $obj->{browsers}{$browser};
                        # take it out of ay tests it's supposed to be running
                        for (my $i = 0; $i < @{$obj->{tests_to_run}}; $i++) {
                            my $test = $obj->{tests_to_run}[$i];
                            next unless ($test->{browser} eq $browser);
                            splice @{$obj->{tests_to_run}}, $i, 1;
                            redo;
                        }
                    } 
                }
            }
        }
    );
}

sub prune {
    my($args) = shift;

    return if ($args->{action} eq 'status');

    prune_browsers($args);
    return prune_tests($args);
}

sub _browser_name {
    my($args) = @_;
    return join '---', $args->{env}{USER_AGENT}, $args->{env}{REMOTE_ADDR};
}

sub _browser_key {
    my($args) = @_;

    return $args->{session};
}

sub failed_tests {
    my($file) = @_;
    return `grep 'failures="[1-9]' $file`;
}

sub heart_beat {
    my($args) = @_;

    my $obj = fiddle_share($args,
        sub {
            my $obj = shift;
            $obj->{browsers}{_browser_key($args)}{heart_beat} = time;
            $obj->{browsers}{_browser_key($args)}{name} = _browser_name($args);
        }
    );

    my $return;
    my $base_dir  = $args->{dirs}{output_dir};
    while (my $component = <$base_dir/*>) {
        $component = basename($component);
        my @test_files = <$base_dir/$component/*.xml>;
        my $test_results = [];
        foreach (@test_files) {
            if (failed_tests($_)) {
                push @$test_results, { name => basename($_), failed => 1 }
            } else {
                push @$test_results, { name => basename($_), failed => 0 }
            }
        }
        my $coverage = -d "$base_dir/$component/lcov-report";
        $return->{current_results}{$component}{test_results} = $test_results;
        $return->{current_results}{$component}{coverage}     = $coverage;
    }

#    warn "SHARE: -" . $args->{share}->fetch() . "-\n";
    $return->{current_status} = from_json($args->{share}->fetch());

    my $response = $args->{response};
    $response->code( 200 );
    $response->content(to_json($return, {utf8 => 1, pretty => 1}));
    $response->content_type('text/plain');
}

sub pop {
    my($args) = @_;

    my $obj = fiddle_share($args,
        sub {
            shift @{shift->{tests_to_run}};
        }
    );

    _dump_obj($args);
}

sub run_multiple {
    my($args) = @_;

    my @tests = split /;/, $args->{params}{test};
    foreach my $test (@tests) {
        $test =~ s/[[:^print:]]//g;
        $args->{params}{test} = $test;
        run_test($args);
    }

    $args->{response}->code(302);
    $args->{response}->content("/jute_docs/run_tests.html");
}

sub _dump_file {
    my($vars, $data_key, $def_file, $component, $args) = @_;

    my $output_dir = $args->{dirs}{output_dir};
    my $dir  = join '/', $output_dir, (make_sane_names($component))[0];
    my $file = $def_file;
    my $data = $vars->{$data_key};

    warn "Dumping $file to $dir";

    system("mkdir -p $dir");
    open(C, ">$dir/$file") || die "Error making $dir/$file: $!";
    print C $data;
    close(C);


    system("chmod -R 777 $output_dir");
    return ("$dir/$file", $dir);
}

sub _get_share {
    my($args) = @_;

    my $share = $args->{share};
    $share->lock(LOCK_EX);
    return from_json($share->fetch());
}

sub _release_share {
    my($args, $val) = @_;

    my $share = $args->{share};
    eval { $share->store(to_json($val)) if ($val) };
    warn "error to_json: $@\n" if ($@);
    $share->unlock(LOCK_UN);
}

sub fiddle_share {
    my($args, $handler) = @_;

    my $obj = _get_share($args);
    my $ret = eval { $handler->($obj) } if ($handler);
    _release_share($args, $obj);

    return ($obj, $ret);
}

# A pretty dump of the shared object
sub _dump_obj {
    my($args) = @_;

    my $response = $args->{response};
    $response->code( 200 );
    $response->content(to_json(from_json($args->{share}->fetch()), {utf8 => 1, pretty => 1}));
    $response->content_type('text/plain');
}

sub _lock_file {
    my ($fh) = @_;
    flock($fh, LOCK_EX) or warn "Cannot lock - $!\n";

    # and, in case someone appended while we were waiting...
    seek($fh, 0, SEEK_END) or warn "Cannot seek - $!\n";
}

sub _unlock_file {
    my ($fh) = @_;
    flock($fh, LOCK_UN) or warn "Cannot unlock - $!\n";
}

################################################################################
# FROM Proc::Daemon....
# Fork(): Retries to fork over 30 seconds if possible to fork at all and
#   if necessary.
# Returns the child PID to the parent process and 0 to the child process.
#   If the fork is unsuccessful it C<warn>s and returns C<undef>.
################################################################################
sub Fork {
    my $pid;
    my $loop = 0;

    FORK: {
        if ( defined( $pid = fork ) ) {
            return $pid;
        }

        # EAGAIN - fork cannot allocate sufficient memory to copy the parent's
        #          page tables and allocate a task structure for the child.
        # ENOMEM - fork failed to allocate the necessary kernel structures
        #          because memory is tight.
        # Last the loop after 30 seconds
        if ( $loop < 6 && ( $! == EAGAIN() ||  $! == ENOMEM() ) ) {
            $loop++; sleep 5; redo FORK;
        }
    }

    warn "Can't fork: $!";

    return undef;
}

1;
