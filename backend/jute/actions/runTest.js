module.exports = {
    Create:  function(hub) {
        // Javascript is single threaded!  We don't have to worry about concurrency!
        var path = require('path'),
            common = require(path.join(__dirname, 'common')).Create(hub)
        ;

        // Events I care about
        hub.addListener('action:run_test', runTest);

        function runTest(req, res, cache) {
            var report = '';
            req.on('data', function(chunk) {
                report += chunk;
            });

            req.on('end', function() {
                var qs = require('querystring'),
                    obj = qs.parse(report),
                    sys = require('sys'),
                    tests, multipleFromUI = false
                ;

                if (obj.test) {
                    // 'run multiple' from UI
                    if (typeof obj.test == 'object') {
                        multipleFromUI = true;
                        // take off lame ';' at end of each test
                        tests = [];
                        obj.test.forEach(function(test) {
                            tests.push(test.replace(/;$/, ''));
                        });
                    } else {
                        tests = [ obj.test ];
                    }
                } else if (obj.tests) {
                    tests = obj.tests.split(/\s+/);
                }

                console.log('TESTS: ' + sys.inspect(tests));
                console.log(Array.map);

                var pushed = false;
                for (var i = 0; i < tests.length; i++) {
                    var test = tests[i],
                        test_obj = {
                            url:            test,
                            running:        0,
                            sendOutput:     obj.send_output
                        };

                    if (obj.sel_host) {
                        // A Selenium Test! - meaning anyone can run it
                        cache.tests_to_run.push(test_obj);
                        pushed = true;
                    } else {
                        // Send to each test to each captured browser
                        //  only THIS browser can run this test
                        test_obj.browser = browser;
                        for (var browser in cache.browsers) {
                            cache.tests_to_run.push(test_obj);
                            pushed = true;
                        }
                    }
                }

                if (pushed) {
                    if (obj.sel_host) {
                        if (obj.send_output) {
                            common.sendToClient(req, "Opening " + obj.sel_browser + " on Selenium host " + obj.sel_host);
                        }

                        // Start up Selenium
                        hub.emit('action:startSelenium', req, res, cache, tests.length);
                    } else {
                        // UI wants to run multiple tests - redirect to it!
                        if (multipleFromUI) {
                            // Now tell browser to run the tests!
                            res.writeHead(302, { Location: "/jute_docs/run_tests.html" });
                            res.end("/jute_docs/run_tests.html");
                        } else {
                            // Command line client
                            res.end('Added ' + (obj.test || obj.tests) + ' tests');
                        }
                    }
                } else {
                    hub.emit(hub.LOG, 'error',  "No browsers listening!");
                    response.statusCode = 412; // Ye Olde Failed Precondition
                    res.end('No browsers listening!!  Test(s) not added!');
                }
            });
        }
    }
};

/*
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
*/
