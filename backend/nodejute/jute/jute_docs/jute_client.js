YUI().add('jute', function(Y) {
    Y.Test.Runner.subscribe(Y.Test.Runner.COMPLETE_EVENT,
        function(data) {
            var cover_out = Y.Test.Runner.getCoverage(Y.Coverage.Format.JSON),
                report_data = Y.Test.Format.JUnitXML(data.results);

            Y.io('/jute/_test_report',
                {
                    method: 'PUT',
                    data: 'results=' + escape(report_data) + '&name=' + escape(data.results.name) + "&coverage=" + escape(cover_out),
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

}, '1.0', { requires: [ 'test', 'io-base' ] });
