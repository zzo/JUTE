YUI({
    logInclude: { TestRunner: true }
}).use('jute', function(Y) {

    var suite     = new Y.Test.Suite('clearResults'),
        hub       = require('./test/mock/hub').getNewHub(),
        util      = require('util'),
        fs        = require('fs'),
        path      = require('path'),
        clearResults = require('./jute/actions/clearResults', true).Create(hub); // 'true' here means do code coverae on it!


    suite.add(new Y.Test.Case({
        name: 'clear results'
        ,setUp: function() {
            this.testFile = path.join('/tmp', '.blah', 'foo');

            try { fs.unlinkSync(this.testFile); } catch(e) {}
            try { fs.rmdirSync(path.dirname(this.testFile)); } catch(e) {}
        }
        ,testHookedUp : function(vals) {
            Y.Assert.areEqual(hub.listeners('action:clear_results').length, 1);
        }
        ,testVals : function(vals) {
            var res = Y.Mock();

            hub.config.outputDir = path.dirname(this.testFile);

            fs.mkdirSync(hub.config.outputDir, 0777);
            fs.writeFileSync(this.testFile, 'HI', 'utf8');

            Y.Mock.expect(res, { method: "end", args: ["OK"] });

            hub.emit('action:clear_results', {}, res, {});

            // Give it half a second & then verify
            this.wait(function() {
                Y.Mock.verify(res);
                // Make sure bogus file is gone
                try {
                    fs.statSync(this.testFile);
                    Y.Assert.fail('Test file still exists!!');
                } catch (e) {
                    Y.Assert.isNotUndefined(e, 'Test file is gone!!'); 
                }
            }, 500);
        }
    }));

    Y.Test.Runner.add(suite);
    Y.UnitTest.go();
});

