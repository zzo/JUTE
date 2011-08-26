YUI().add('jute', function(Y) {
    var totalLog = [];
    Y.Test.Runner.subscribe(Y.Test.Runner.COMPLETE_EVENT,
        function(data) {
            var cover_out = Y.Test.Runner.getCoverage(Y.Coverage.Format.JSON),
                report_data = Y.Test.Format.JUnitXML(data.results);

            Y.io('/jute/_test_report',
                {
                    method: 'PUT',
                    data: 'results=' + escape(report_data) + '&name=' + escape(data.results.name) + "&coverage=" + escape(cover_out) + "&log=" + escape(Y.JSON.stringify(totalLog)),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    on: {
                        end: function(tid, args) {
                            if (!window.location.toString().match("_one_shot")) {
                                window.location.href = '/jute_docs/run_tests.html';
                            }
                        }
                    }
                }
            );
        }
    );

    Y.Global.on('yui:log', function(log) {
        totalLog.push(log);
    });

    Y.on('yui:log', function(log) {
        totalLog.push(log);
    });

   // A helpful function - setup console & run tests
    Y.namespace('UnitTest').go = function() {

        //initialize the console
        var yconsole = new Y.Console({
            newestOnTop: false
        });
        yconsole.render('#log');
        Y.Test.Runner.run();
    };

}, '1.0', { requires: [ 'test', 'io-base', 'console', 'json-stringify' ] });

