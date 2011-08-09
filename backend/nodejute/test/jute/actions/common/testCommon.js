YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('common'),
        hub       = require('./test/mock/hub').getNewHub(),
        util      = require('util'),
        path      = require('path'),
        fs        = require('fs'),
        common    = require('./jute/actions/common', true).Create(hub); // 'true' here means do code coverae on it!

    suite.add(new Y.Test.Case({
        name: 'common'
        ,setUp: function() {
            this.req = { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:5.0) Gecko/20100101 Firefox/5.0 FirePHP/0.5' }, connection: { remoteAddress: '1.2.3.4' } };
        }
        ,testBrowserName : function() {
            var bn = common.browserName(this.req),
                sb = [this.req.headers['user-agent'], this.req.connection.remoteAddress].join('---');

            Y.Assert.areEqual(bn, sb, 'Correct browser name');
        }
        ,testSaneNames : function() {

            var names = common.makeSaneNames(common.browserName(this.req)),
                fileName = names[0], packageName = names[1];

            Y.Assert.areEqual(fileName.match(/[\/;]/, false, 'no funny chars!'));
            Y.Assert.areEqual(fileName.match(/[^_A-Za-z0-9-]/, false, 'no funny chars!'));

            try {
                fs.writeFileSync(path.join('/tmp', fileName), 'foobie', 'utf8');
            } catch(e) {
                Y.Assert.fail('Cannot make a file with sane name: ' + e);
            } finally {
                try {
                    fs.unlinkSync(path.join('/tmp', fileName));
                } catch(e) { }
            }

            Y.Assert.areEqual(packageName.match(/_/, false, 'no funny chars!'));

        }
        ,testDumpFile : function() {
            var vars = { key: 'DATA' };

            hub.config.outputDir = '/tmp';
            hub.on(hub.LOG, function(sev, mesg) {
                if(sev == hub.ERROR) {
                    Y.Assert.fail('dumpFile errored: ' + mesg);
                }
            });

            var ret = common.dumpFile(vars, 'key', 'fileName', 'componentName');

            Y.Assert.areEqual(ret[0], path.join('/tmp', 'componentName', 'fileName'), 'Matching file name');
            Y.Assert.areEqual(ret[1], path.join('/tmp', 'componentName'), 'Matching dir name');

            try {
                fs.unlinkSync(path.join('/tmp', 'componentName', 'fileName'));
                fs.rmdirSync(path.join('/tmp', 'componentName'));
            } catch(e) {}
        }
        ,testFailedTests: function() {
            var fname = path.join('/tmp', 'foo');

            fs.writeFileSync(fname, 'failures="19"', 'utf8');
            Y.assert(common.failedTests(fname));

            fs.writeFileSync(fname, 'failures="0"', 'utf8');
            Y.assert(!common.failedTests(fname));

            fs.writeFileSync(fname, 'failures="2230"', 'utf8');
            Y.assert(common.failedTests(fname));
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

