// Inject mini-jute into YUI

module.exports = {
    inject:  function(YUI) {
        YUI().add('jute', function(Y) {
            Y.namespace('UnitTest').go = function() { Y.Test.Runner.run(); };
            Y.Test.Runner.subscribe(Y.Test.Runner.COMPLETE_EVENT,
                function(data) {
                    var cover_out   = Y.Test.Runner.getCoverage(Y.Coverage.Format.JSON),
                        report_data = Y.Test.Format.JUnitXML(data.results);

                    testsDone(data, report_data, cover_out);
                }
            );
        }, '1.0', { requires: [ 'test' ] });
    }
};
