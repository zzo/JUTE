#!/usr/bin/env node

var connect  = require('connect'), conf,
    uuid     = require('node-uuid'),
    os       = require('os'),
    fs       = require('fs'),
    sys      = require('sys'),
    events   = require("events"),
    cFile    = '/etc/jute.conf', // Default config file location
    docRoot  = '/var/www/',
    jutebase  = 'jutebase/',
    testDir   = 'test/',
    outputDir = 'output/',
    coverageJarDir = '/usr/lib/yuitest_coverage',
    eventHubF  = function() { events.EventEmitter.call(this) };
    ;

    /**
     * Create our event hub
     */
    sys.inherits(eventHubF, events.EventEmitter);
    var eventHub = new eventHubF();

    eventHub.addListener('configure', configure);

if (process.argv[2]) {
    // 0 is 'node', 1 is this script
    cFile = process.argv[2];
}
    eventHub.emit('configure', cFile);

    function configure(cFile) {

        console.log('IN CONFIGURE with: ' + cFile);
try {
    conf = require(cFile) 
} catch(e) { 
    console.log('\n**Config file "' + cFile + '" does not exist or is invalid!**\n'); 
    console.log('Put the default config file in /etc/jute.conf');
    console.log("Format of config file is:\n\
module.exports = {\n\
    port: 8080,\n\
    uid: 'trostler',\n\
    gid: 'pg1090052',\n\
    docRoot: '/var/www/',\n\
    jutebase: 'jutebase/',\n\
    testDir: 'test/',\n\
    outputDir: 'output/',\n\
    coverageJarDir: '/usr/lib/yuitest_coverage'\n\
};\n\
");
    process.exit(1);
}

/**
 * SET UP CONFIG VARS
 */
// run as right person
if (conf.gid) {
    process.setgid(conf.gid);
}
if (conf.uid) {
    process.setuid(conf.uid);
}
if (conf.docRoot) {
    docRoot = conf.doc_root;
}
if (!docRoot.match(/\/$/)) {
        docRoot = docRoot + '/';
}
if (conf.jutebase) {
    jutebase = conf.jutebase;
}
if (!jutebase.match(/\/$/)) {
        jutebase = jutebase + '/';
}
if (conf.testDir) {
    testDir = conf.testDir;
}
if (!testDir.match(/\/$/)) {
        testDir = testDir + '/';
}
if (conf.outputDir) {
    outputDir = conf.outputDir;
}
if (!outputDir.match(/\/$/)) {
        outputDir = outputDir + '/';
}
if (conf.coverageJarDir) {
    coverageJarDir = conf.coverageJarDir;
}
if (!coverageJarDir.match(/\/$/)) {
        coverageJarDir = coverageJarDir + '/';
}
/**
 * END SET UP CONFIG VARS
 */
}

console.log("Running as " + process.getuid() + '/' + process.getgid());
console.log("Connect at http://" + os.hostname() + '/jute/');


connect(
    connect.cookieParser()
  , connect.session({ secret: 'jute rox', cookie: { maxAge: 5000 }})
  , connect.favicon()
  , function(req, res, next){
    var sess = req.session;
    console.log(sess);
    if (!sess.uuid) {
      sess.uuid = uuid();
      sess.cookie.expires = false;
    }
        res.setHeader('Content-Type', 'text/html');
        res.end('<p>views: ' + sess.uuid + '</p>');
  }
).listen(conf.port || 80);

