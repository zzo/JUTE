if (typeof(strings) === 'undefined') {
    strings = {};
}
if (typeof(NeoConfig) === 'undefined') {
    NeoConfig = {};
}
if (typeof(Neo) === 'undefined') {
    Neo = {};
}

YUI.add('jute', function(Y) {
    Y.namespace('UnitTest').go = function() { Y.Test.Runner.run(); };
    Y.Test.Runner.subscribe(Y.Test.Runner.COMPLETE_EVENT,
        function(data) {
            var cover_out   = Y.Test.Runner.getCoverage(Y.Coverage.Format.JSON),
                report_data = Y.Test.Format.JUnitXML(data.results);

            window.__done(data, report_data, typeof(_yuitest_coverage) == 'object' ? _yuitest_coverage : null, cover_out);
        }
    );
}, '0.1', {requires: ['test']});

