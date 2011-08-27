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
    
    var pushBack = function(where, what, why) {
        Y.io('/jute/_' + where,
            {
                method: 'PUT',
                data: 'msg=' + escape(what) + '&why=' + escape(why),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
    };

    Y.Global.on('yui:log', function(log) {
        totalLog.push(log);
        pushBack('message', log.msg, 'Y.Global.log');
    });

    Y.on('yui:log', function(log) {
        totalLog.push(log);
        pushBack('message', log.msg, 'Y.log');
    });

    // Immediately push console message in case we never hear from this dude again
    if (typeof(console) == 'object') {
        var oCL = console.log,
            oCE = console.error;

        console.log = function(msg) {
            totalLog.push({ msg: 'console.log: ' + msg });
            oCL.apply(console, arguments);
            pushBack('message', msg, 'console.log');
        }

        console.error = function(msg) {
            totalLog.push({ msg: 'console.error: ' + msg });
            oCE.apply(console, arguments);
            pushBack('message', msg, 'console.error');
        }
    }

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

