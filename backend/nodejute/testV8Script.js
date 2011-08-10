#!/usr/bin/env node

var YUI = require("yui3").YUI
    ,fs  = require('fs')
    ,vm  = require('vm')
    ,path  = require('path')
    ,fname = process.argv[2]
    ,base =  path.dirname(fname)
    ;

    module.paths.push(__dirname);
    module.paths.push(path.join(__dirname, base));
    console.log(module);
    console.log(require);

YUI().add('jute', function(Y) {
     Y.namespace('UnitTest').go = function() { Y.Test.Runner.run(); };
     Y.Test.Runner.subscribe(Y.Test.Runner.COMPLETE_EVENT,
         function(data) { console.log('Tests Done!'); }
     );

}, '1.0', { requires: [ 'test' ] });

YUI().use('jute', function() {
    // start barebones
    var sandbox = { 
            YUI: YUI
            ,require: require
        },
        data = fs.readFileSync(fname, 'utf8');

    try {
        vm.runInNewContext(data, sandbox, fname);
    } catch(e) {
        console.error(e.message);
        console.error(e.stack);
    }
});
